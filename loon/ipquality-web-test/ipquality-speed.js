/**
 * 节点 IP 质量检测 · 三网自适应轻量吞吐
 *
 * 独立于完整 r32：并行选择可达测速点，按运营商顺序测试，避免争抢同一节点带宽。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-08-03
 */

const SPEED_VERSION = "2026-08-03.poc8";
const SESSION_KEY = "paperclip.ipquality.web.session";
const SESSION_TTL_MS = 30 * 60 * 1000;
const TOTAL_BUDGET_MS = 26000;
const CARRIER_BUDGET_MS = 8000;
const SMALL_DOWNLOAD_BYTES = 262144;
const LARGE_DOWNLOAD_BYTES = 1048576;
const SMALL_UPLOAD_BYTES = 131072;
const LARGE_UPLOAD_BYTES = 524288;
const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
const startedAt = Date.now();

const TARGETS = [
    {
        carrier: "电信",
        candidates: [
            { city: "镇江", base: "http://5gzhenjiang.speedtest.jsinfo.net:8080/speedtest/" },
            { city: "苏州", base: "http://4gsuzhou1.speedtest.jsinfo.net:8080/speedtest/" },
        ],
    },
    {
        carrier: "联通",
        candidates: [
            { city: "北京", base: "http://beijing.unicomtest.com:8080/speedtest/" },
            { city: "上海", base: "http://mobile.shunicomtest.com:8080/speedtest/" },
        ],
    },
    {
        carrier: "移动",
        candidates: [
            { city: "苏州", base: "http://speedtest.jsqiuying.com:8080/speedtest/" },
            { city: "成都", base: "http://speedtest1.sc.chinamobile.com:8080/speedtest/" },
        ],
    },
];

const session = readSession();
const requestRun = queryValue($request && $request.url, "run");

if (!session || !session.node || !requestRun || requestRun !== session.id) {
    respondJson(409, { ok: false, error: "检测会话无效，请返回 Loon 重新启动" });
} else if (Date.now() - Number(session.createdAt || 0) > SESSION_TTL_MS) {
    respondJson(410, { ok: false, error: "检测会话已过期，请返回 Loon 重新启动" });
} else {
    run(session.node).then(
        (results) => respondJson(200, {
            ok: true,
            module: "speed",
            title: "三网轻量吞吐",
            node: session.node,
            elapsedMs: Date.now() - startedAt,
            html: renderReport(results),
            version: SPEED_VERSION,
        }),
        (error) => respondJson(500, {
            ok: false,
            module: "speed",
            title: "三网轻量吞吐",
            error: errorText(error),
        })
    );
}

async function run(nodeName) {
    const selected = await Promise.all(TARGETS.map((definition) => selectTarget(definition, nodeName)));
    const results = [];
    for (let index = 0; index < selected.length; index += 1) {
        const item = selected[index];
        if (!item.target) {
            results.push({
                carrier: item.carrier,
                city: "",
                latencyMs: null,
                download: null,
                upload: null,
                error: item.error || "测速服务器不可达",
            });
            continue;
        }
        if (remainingTotal() < 1800) {
            results.push({
                carrier: item.carrier,
                city: item.target.city,
                latencyMs: item.latencyMs,
                download: null,
                upload: null,
                error: "整体时间预算已用尽",
            });
            continue;
        }
        results.push(await testCarrier(item, nodeName));
    }
    return results;
}

async function selectTarget(definition, nodeName) {
    const probes = await Promise.all(definition.candidates.map(async (target) => {
        const result = await capture(request("GET", `${target.base}latency.txt?r=${Date.now()}`, {
            node: nodeName,
            timeout: 1800,
            allowHttpErrors: true,
            headers: { Accept: "text/plain", "Cache-Control": "no-cache", "User-Agent": USER_AGENT },
        }));
        const status = result.ok ? Number(result.value.status) : 0;
        return {
            target,
            ok: result.ok && status >= 200 && status < 400,
            latencyMs: result.ok ? result.value.elapsedMs : null,
            error: result.ok ? `HTTP ${status || "?"}` : result.error,
        };
    }));
    const reachable = probes.filter((item) => item.ok)
        .sort((left, right) => left.latencyMs - right.latencyMs);
    if (reachable.length) {
        return {
            carrier: definition.carrier,
            target: reachable[0].target,
            latencyMs: reachable[0].latencyMs,
        };
    }
    return {
        carrier: definition.carrier,
        target: null,
        latencyMs: null,
        error: probes.map((item) => `${item.target.city}：${truncate(item.error, 28)}`).join("；"),
    };
}

async function testCarrier(selected, nodeName) {
    const carrierStartedAt = Date.now();
    const deadline = Math.min(startedAt + TOTAL_BUDGET_MS, carrierStartedAt + CARRIER_BUDGET_MS);
    const target = selected.target;
    const notes = [];

    let download = await downloadSample(target, nodeName, SMALL_DOWNLOAD_BYTES, deadline);
    if (download && download.valid && download.elapsedMs < 700 && timeUntil(deadline) >= 2400) {
        const larger = await downloadSample(target, nodeName, LARGE_DOWNLOAD_BYTES, deadline);
        if (larger && larger.valid) download = larger;
        else if (larger && larger.error) notes.push(`大样本下载未完成：${larger.error}`);
    }

    let upload = await uploadSample(target, nodeName, SMALL_UPLOAD_BYTES, deadline);
    if (upload && upload.valid && upload.elapsedMs < 700 && timeUntil(deadline) >= 2400) {
        const larger = await uploadSample(target, nodeName, LARGE_UPLOAD_BYTES, deadline);
        if (larger && larger.valid) upload = larger;
        else if (larger && larger.error) notes.push(`大样本上传未完成：${larger.error}`);
    }

    if (!download || !download.valid) notes.push(`下载未完成：${download && download.error || "时间不足"}`);
    if (!upload || !upload.valid) notes.push(`上传未完成：${upload && upload.error || "时间不足"}`);
    return {
        carrier: selected.carrier,
        city: target.city,
        host: hostOf(target.base),
        latencyMs: selected.latencyMs,
        download: download && download.valid ? download : null,
        upload: upload && upload.valid ? upload : null,
        error: notes.join("；"),
    };
}

async function downloadSample(target, nodeName, bytes, deadline) {
    if (timeUntil(deadline) < 500) return null;
    const result = await capture(request("GET", `${target.base}download?size=${bytes}&r=${Date.now()}`, {
        node: nodeName,
        timeout: Math.min(4000, timeUntil(deadline)),
        binaryMode: true,
        headers: { Accept: "application/octet-stream", "Accept-Encoding": "identity", "User-Agent": USER_AGENT },
    }));
    if (!result.ok) return { valid: false, bytes, error: result.error };
    const received = bodyLength(result.value.body);
    const declared = contentLength(result.value.response);
    const complete = received >= bytes * 0.9 && (!declared || declared >= bytes * 0.9);
    return {
        valid: complete,
        bytes: received,
        requestedBytes: bytes,
        elapsedMs: result.value.elapsedMs,
        mbps: complete ? mbps(received, result.value.elapsedMs) : null,
        error: complete ? "" : `实收 ${received} 字节${declared ? `，声明 ${declared} 字节` : ""}`,
    };
}

async function uploadSample(target, nodeName, bytes, deadline) {
    if (timeUntil(deadline) < 500) return null;
    const body = repeatBody(bytes);
    const result = await capture(request("POST", `${target.base}upload.php?r=${Date.now()}`, {
        node: nodeName,
        timeout: Math.min(4000, timeUntil(deadline)),
        headers: { "Content-Type": "application/octet-stream", "User-Agent": USER_AGENT },
        body,
    }));
    if (!result.ok) return { valid: false, bytes, error: result.error };
    const confirmed = confirmedUploadBytes(result.value.body);
    const complete = confirmed === bytes;
    return {
        valid: complete,
        bytes: confirmed,
        requestedBytes: bytes,
        elapsedMs: result.value.elapsedMs,
        mbps: complete ? mbps(confirmed, result.value.elapsedMs) : null,
        error: complete ? "" : `服务器仅确认 ${confirmed} / ${bytes} 字节`,
    };
}

function request(method, url, options) {
    const config = options || {};
    return new Promise((resolve, reject) => {
        const beganAt = Date.now();
        const requestOptions = {
            url,
            node: config.node,
            timeout: Math.max(250, Number(config.timeout) || 3000),
            headers: config.headers || {},
        };
        if (config.binaryMode) requestOptions["binary-mode"] = true;
        if (typeof config.body !== "undefined") requestOptions.body = config.body;
        const callback = (error, response, body) => {
            if (error) {
                reject(new Error(String(error)));
                return;
            }
            const status = Number(response && (response.status || response.statusCode));
            if (!config.allowHttpErrors && (!Number.isFinite(status) || status < 200 || status >= 300)) {
                reject(new Error(`HTTP ${status || "?"}`));
                return;
            }
            resolve({
                status,
                body,
                response: response || {},
                elapsedMs: Math.max(1, Date.now() - beganAt),
            });
        };
        if (String(method).toUpperCase() === "POST") $httpClient.post(requestOptions, callback);
        else $httpClient.get(requestOptions, callback);
    });
}

function renderReport(results) {
    const rows = results.map((item) => {
        const download = item.download
            ? `${item.download.mbps} Mbps <small>${sampleLabel(item.download)}</small>` : "未完成";
        const upload = item.upload
            ? `${item.upload.mbps} Mbps <small>${sampleLabel(item.upload)}</small>` : "未完成";
        return '<div class="speed-row">'
            + `<div class="carrier">${escapeHtml(item.carrier)}${item.city ? ` · ${escapeHtml(item.city)}` : ""}</div>`
            + `<div class="metric"><span>延迟</span><b>${item.latencyMs !== null ? `${Math.round(item.latencyMs)} ms` : "未返回"}</b></div>`
            + `<div class="metric"><span>下载</span><b>${download}</b></div>`
            + `<div class="metric"><span>上传</span><b>${upload}</b></div>`
            + (item.error ? `<div class="note">${escapeHtml(item.error)}</div>` : "")
            + "</div>";
    }).join("");
    return '<style>'
        + '.report-root{font-family:-apple-system,BlinkMacSystemFont;font-size:14px;line-height:1.5;text-align:left;padding:18px 0 92px}'
        + '.report-title{font-size:20px;font-weight:700;margin-bottom:12px}.node-label{color:#8e8e93;font-size:11px;margin-bottom:10px}'
        + '.report-section{display:block;margin:8px 0;border-top:1px solid rgba(142,142,147,.2)}.section-summary{min-height:42px;color:#0A84FF;font-weight:700;font-size:15px;display:flex;align-items:center}'
        + '.speed-row{padding:10px 0;border-bottom:1px solid rgba(142,142,147,.16)}.speed-row:last-child{border:0}.carrier{font-weight:700;margin-bottom:7px}'
        + '.metric{display:flex;justify-content:space-between;gap:12px;margin:4px 0}.metric span,.note,small{color:#8e8e93;font-size:11px}.metric b{text-align:right}.note{margin-top:7px;line-height:1.45}.report-note{color:#8e8e93;font-size:10px;margin-top:12px}'
        + '</style><div class="report-root"><div class="report-title">三网轻量吞吐</div>'
        + `<div class="node-label">版本 · ${SPEED_VERSION}</div><section class="report-section"><div class="section-summary">▌三网轻量吞吐</div><div class="section-body">${rows}</div></section>`
        + '<div class="report-note">结果按真实收发字节与请求耗时计算；小样本仅用于轻量估算，不等同于专业带宽测试。上传必须由服务器确认完整字节数。</div></div>';
}

function readSession() {
    try {
        const raw = $persistentStore.read(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

function queryValue(url, key) {
    const match = String(url || "").match(new RegExp(`[?&]${key}=([^&#]*)`));
    if (!match) return "";
    try {
        return decodeURIComponent(match[1].replace(/\+/g, " "));
    } catch (_) {
        return match[1];
    }
}

function contentLength(response) {
    const headers = response && response.headers || {};
    const key = Object.keys(headers).find((name) => name.toLowerCase() === "content-length");
    const value = key ? Number(headers[key]) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function bodyLength(body) {
    if (body === null || typeof body === "undefined") return 0;
    if (typeof body.byteLength === "number") return body.byteLength;
    if (typeof body.length === "number") return body.length;
    return 0;
}

function confirmedUploadBytes(body) {
    const match = String(body || "").match(/(?:^|\b)size=(\d+)(?:\b|$)/i);
    return match ? Number(match[1]) : 0;
}

function repeatBody(bytes) {
    const unit = "0123456789abcdef";
    return unit.repeat(Math.ceil(bytes / unit.length)).slice(0, bytes);
}

function sampleLabel(sample) {
    const size = sample.bytes >= 1048576
        ? `${(sample.bytes / 1048576).toFixed(1)} MB`
        : `${Math.round(sample.bytes / 1024)} KB`;
    return `${size} / ${sample.elapsedMs} ms`;
}

function mbps(bytes, ms) {
    return Math.round(((Number(bytes) * 8) / (Math.max(1, Number(ms)) * 1000)) * 100) / 100;
}

function timeUntil(deadline) {
    return Math.max(0, Math.min(deadline - Date.now(), remainingTotal()));
}

function remainingTotal() {
    return Math.max(0, TOTAL_BUDGET_MS - (Date.now() - startedAt));
}

function hostOf(url) {
    const match = String(url || "").match(/^https?:\/\/([^/?#]+)/i);
    return match ? match[1] : "";
}

function capture(promise) {
    return Promise.resolve(promise).then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error: errorText(error) })
    );
}

function truncate(value, maxLength) {
    const text = String(value || "");
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function errorText(error) {
    return error && (error.message || error.toString()) || "未知错误";
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function respondJson(status, value) {
    $done({
        response: {
            status,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Access-Control-Allow-Origin": "*",
                "X-Content-Type-Options": "nosniff",
            },
            body: JSON.stringify(value),
        },
    });
}
