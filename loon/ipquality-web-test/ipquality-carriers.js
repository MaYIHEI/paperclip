/**
 * 节点 IP 质量检测 · 三网连通性
 *
 * 通过目标节点并行探测电信、联通、移动公开测速点，仅报告可达性与小样本参考。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-08-03
 */

const CARRIER_VERSION = "2026-08-03.poc9";
const SESSION_KEY = "paperclip.ipquality.web.session";
const SESSION_TTL_MS = 30 * 60 * 1000;
const SAMPLE_BYTES = 65536;
const PROBE_TIMEOUT_MS = 1700;
const DOWNLOAD_TIMEOUT_MS = 2300;
const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
const startedAt = Date.now();

const TARGETS = [
    { carrier: "电信", city: "镇江", base: "http://5gzhenjiang.speedtest.jsinfo.net:8080/speedtest/" },
    { carrier: "电信", city: "苏州", base: "http://4gsuzhou1.speedtest.jsinfo.net:8080/speedtest/" },
    { carrier: "联通", city: "北京", base: "http://beijing.unicomtest.com:8080/speedtest/" },
    { carrier: "联通", city: "上海", base: "http://mobile.shunicomtest.com:8080/speedtest/" },
    { carrier: "移动", city: "苏州", base: "http://speedtest.jsqiuying.com:8080/speedtest/" },
    { carrier: "移动", city: "成都", base: "http://speedtest1.sc.chinamobile.com:8080/speedtest/" },
];
const CARRIERS = ["电信", "联通", "移动"];

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
            module: "carriers",
            title: "三网连通性",
            node: session.node,
            elapsedMs: Date.now() - startedAt,
            html: renderReport(results),
            version: CARRIER_VERSION,
        }),
        (error) => respondJson(500, {
            ok: false,
            module: "carriers",
            title: "三网连通性",
            error: errorText(error),
        })
    );
}

async function run(nodeName) {
    const probes = await Promise.all(TARGETS.map((target) => probeTarget(target, nodeName)));
    return CARRIERS.map((carrier) => {
        const candidates = probes.filter((item) => item.carrier === carrier);
        const reachable = candidates.filter((item) => item.reachable).sort((left, right) => {
            if (left.downloadValid !== right.downloadValid) return left.downloadValid ? -1 : 1;
            return left.latencyMs - right.latencyMs;
        });
        return { carrier, selected: reachable[0] || null, candidates };
    });
}

async function probeTarget(target, nodeName) {
    const latency = await capture(request("GET", `${target.base}latency.txt?r=${nonce()}`, {
        node: nodeName,
        timeout: PROBE_TIMEOUT_MS,
        headers: commonHeaders("text/plain"),
    }));
    if (!latency.ok) {
        return Object.assign({}, target, {
            reachable: false,
            latencyMs: null,
            downloadValid: false,
            downloadMbps: null,
            error: truncate(latency.error, 54),
        });
    }

    const download = await capture(request("GET", `${target.base}download?size=${SAMPLE_BYTES}&r=${nonce()}`, {
        node: nodeName,
        timeout: DOWNLOAD_TIMEOUT_MS,
        binaryMode: true,
        headers: commonHeaders("application/octet-stream"),
    }));
    if (!download.ok) {
        return Object.assign({}, target, {
            reachable: true,
            latencyMs: latency.value.elapsedMs,
            downloadValid: false,
            downloadMbps: null,
            error: `小样本下载：${truncate(download.error, 44)}`,
        });
    }
    const received = bodyLength(download.value.body);
    const complete = received >= SAMPLE_BYTES * 0.9;
    return Object.assign({}, target, {
        reachable: true,
        latencyMs: latency.value.elapsedMs,
        downloadValid: complete,
        downloadMbps: complete ? mbps(received, download.value.elapsedMs) : null,
        downloadBytes: received,
        downloadMs: download.value.elapsedMs,
        error: complete ? "" : `小样本仅实收 ${received} / ${SAMPLE_BYTES} 字节`,
    });
}

function request(method, url, options) {
    const config = options || {};
    return new Promise((resolve, reject) => {
        const beganAt = Date.now();
        let settled = false;
        const timeoutMs = Math.max(250, Number(config.timeout) || 2000);
        const timer = setTimeout(() => finish(new Error(`请求超时（${timeoutMs} ms）`)), timeoutMs + 80);
        const requestOptions = {
            url,
            node: config.node,
            timeout: timeoutMs,
            headers: config.headers || {},
        };
        if (config.binaryMode) requestOptions["binary-mode"] = true;

        function finish(error, response, body) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
                return;
            }
            const status = Number(response && (response.status || response.statusCode));
            if (!Number.isFinite(status) || status < 200 || status >= 400) {
                reject(new Error(`HTTP ${status || "?"}`));
                return;
            }
            resolve({ body, response: response || {}, elapsedMs: Math.max(1, Date.now() - beganAt) });
        }

        const callback = (error, response, body) => finish(error, response, body);
        if (String(method).toUpperCase() === "POST") $httpClient.post(requestOptions, callback);
        else $httpClient.get(requestOptions, callback);
    });
}

function renderReport(results) {
    const rows = results.map((group) => {
        const item = group.selected;
        if (!item) {
            const failures = group.candidates.map((candidate) => `${candidate.city}：${candidate.error || "未返回"}`).join("；");
            return '<div class="carrier-row">'
                + `<div class="carrier"><span class="state down"></span>${escapeHtml(group.carrier)}<b class="bad">未连通</b></div>`
                + `<div class="detail">${escapeHtml(failures)}</div></div>`;
        }
        const sample = item.downloadValid
            ? `<div class="metric"><span>小样本下载</span><b>${item.downloadMbps} Mbps <small>64 KB / ${item.downloadMs} ms</small></b></div>`
            : `<div class="metric"><span>小样本下载</span><b class="warn">未完成</b></div>`;
        const fallback = group.candidates.filter((candidate) => candidate !== item && !candidate.reachable)
            .map((candidate) => `${candidate.city}：${candidate.error}`).join("；");
        return '<div class="carrier-row">'
            + `<div class="carrier"><span class="state up"></span>${escapeHtml(group.carrier)}<b class="good">可达</b></div>`
            + `<div class="metric"><span>测速点</span><b>${escapeHtml(item.city)}</b></div>`
            + `<div class="metric"><span>响应耗时</span><b>${Math.round(item.latencyMs)} ms</b></div>${sample}`
            + (item.error ? `<div class="detail">${escapeHtml(item.error)}</div>` : "")
            + (fallback ? `<div class="detail">备用点未返回：${escapeHtml(fallback)}</div>` : "")
            + "</div>";
    }).join("");
    return '<style>'
        + '.report-root{font-family:-apple-system,BlinkMacSystemFont;font-size:14px;line-height:1.5;text-align:left;padding:18px 0 92px}'
        + '.report-title{font-size:20px;font-weight:700;margin-bottom:12px}.node-label{color:#8e8e93;font-size:11px;margin-bottom:10px}'
        + '.report-section{display:block;margin:8px 0;border-top:1px solid rgba(142,142,147,.2)}.section-summary{min-height:42px;color:#0A84FF;font-weight:700;font-size:15px;display:flex;align-items:center}'
        + '.carrier-row{padding:10px 0;border-bottom:1px solid rgba(142,142,147,.16)}.carrier-row:last-child{border:0}.carrier{display:flex;align-items:center;gap:7px;font-weight:700;margin-bottom:7px}.carrier b{margin-left:auto;font-size:12px}.state{width:9px;height:9px;border-radius:50%}.up{background:#30d158}.down{background:#ff453a}.good{color:#16824f}.bad{color:#ff453a}.warn{color:#ff9f0a}.metric{display:flex;justify-content:space-between;gap:14px;margin:5px 0}.metric span,.detail,.metric small{color:#8e8e93;font-size:11px}.metric b{text-align:right}.metric small{display:block;font-weight:400}.detail{margin-top:7px;line-height:1.5}.method-note{margin-top:10px;padding:9px 10px;border-radius:10px;background:rgba(142,142,147,.1);color:#8e8e93;font-size:11px;line-height:1.5}.report-note{color:#8e8e93;font-size:10px;margin-top:12px}'
        + '</style><div class="report-root"><div class="report-title">三网连通性</div>'
        + `<div class="node-label">并行探测 · ${CARRIER_VERSION}</div><section class="report-section"><div class="section-summary">▌三网连通性</div><div class="section-body">${rows}<div class="method-note">固定公开测速点的可达性与 64 KB 下载参考；测速点失败不代表节点故障，也不是三网正式带宽。</div></div></section>`
        + '<div class="report-note">这里只检测目标节点能否访问固定的电信、联通、移动公开测速点，并用 64 KB 下载作轻量参考；不上传、不等同于 xykt NetQuality 的 VPS 本机 Ookla 测速。测速点失败也不代表节点本身不可用。</div></div>';
}

function commonHeaders(accept) {
    return { Accept: accept, "Accept-Encoding": "identity", "Cache-Control": "no-cache", "User-Agent": USER_AGENT };
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

function bodyLength(body) {
    if (body === null || typeof body === "undefined") return 0;
    if (typeof body.byteLength === "number") return body.byteLength;
    if (typeof body.length === "number") return body.length;
    return 0;
}

function mbps(bytes, ms) {
    return Math.round(((Number(bytes) * 8) / (Math.max(1, Number(ms)) * 1000)) * 100) / 100;
}

function nonce() {
    return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
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
