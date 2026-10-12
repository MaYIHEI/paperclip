/**
 * 节点 IP 质量检测 · DNS 解析与污染
 *
 * 节点出口解析器：通过目标节点解析随机域名，查看实际解析器位置。
 * 本地 DNS 污染：手机本地对比系统 DNS 与加密 DNS 的解析归属。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-10-12
 */

const DNS_VERSION = "2026-10-12.poc13";
const SESSION_KEY = "paperclip.ipquality.web.session";
const SESSION_TTL_MS = 30 * 60 * 1000;
const TOTAL_BUDGET_MS = 15000;
const DOH_SERVER = "https://1.1.1.1/dns-query";
const TARGETS = [
    { domain: "www.google.com", owner: "Google", asns: [15169] },
    { domain: "www.youtube.com", owner: "Google", asns: [15169] },
    { domain: "www.wikipedia.org", owner: "Wikimedia", asns: [14907] },
];
const RESOLVERS = [
    { key: "system", label: "系统 DNS", options: { server: "system", timeout: 3000 } },
    { key: "doh", label: "加密 DNS", options: { protocol: "doh", server: DOH_SERVER, timeout: 4000 } },
];
const startedAt = Date.now();

const session = readSession();
const requestRun = queryValue($request && $request.url, "run");
const maskIP = queryValue($request && $request.url, "mask") === "1";

if (!session || !session.node || !requestRun || requestRun !== session.id) {
    respondJson(409, { ok: false, error: "检测会话无效，请返回 Loon 重新启动" });
} else if (Date.now() - Number(session.createdAt || 0) > SESSION_TTL_MS) {
    respondJson(410, { ok: false, error: "检测会话已过期，请返回 Loon 重新启动" });
} else {
    run(session.node).then(
        (result) => respondJson(200, {
            ok: true,
            module: "dns",
            title: "DNS 解析与污染",
            node: session.node,
            elapsedMs: Date.now() - startedAt,
            html: renderReport(result),
            version: DNS_VERSION,
        }),
        (error) => respondJson(500, {
            ok: false,
            module: "dns",
            title: "DNS 解析与污染",
            error: errorText(error),
        })
    );
}

async function run(nodeName) {
    const [exit, resolver, local] = await Promise.all([
        capture(requestJson("GET", "http://ip-api.com/json/?fields=status,message,country,countryCode,as,query", nodeName)),
        capture(requestJson("GET", `https://${randomLabel()}.edns.ip-api.com/json`, nodeName)),
        localQueries(),
    ]);

    let owners = {};
    let ownerError = "";
    const ips = local.available ? uniqueIPv4(local.results) : [];
    if (ips.length) {
        const lookup = await capture(requestJson("POST", "http://ip-api.com/batch?fields=status,query,as", nodeName, JSON.stringify(ips)));
        if (lookup.ok && Array.isArray(lookup.value)) {
            lookup.value.forEach((item) => {
                if (item && item.status === "success") owners[item.query] = item.as || "";
            });
        } else {
            ownerError = lookup.ok ? "归属查询返回格式异常" : lookup.error;
        }
    }
    return { exit, resolver, local, owners, ownerError };
}

async function localQueries() {
    if (typeof $dns === "undefined" || typeof $dns.query !== "function") {
        return { available: false, error: "需要 Loon 3.5.1(988) 或更高版本" };
    }
    const jobs = [];
    TARGETS.forEach((target) => {
        RESOLVERS.forEach((resolver) => {
            jobs.push(capture(dnsQuery(Object.assign({ domain: target.domain }, resolver.options))).then((result) => ({
                domain: target.domain,
                resolver: resolver.key,
                result,
            })));
        });
    });
    return { available: true, results: await Promise.all(jobs) };
}

function dnsQuery(options) {
    return new Promise((resolve, reject) => {
        $dns.query(options, (error, result) => {
            if (error) reject(new Error(`${error.code || "ERROR"} ${error.message || ""}`.trim()));
            else resolve(result || {});
        });
    });
}

function requestJson(method, url, nodeName, body) {
    return new Promise((resolve, reject) => {
        const timeoutMs = Math.max(500, Math.min(6000, remaining()));
        const options = {
            url,
            node: nodeName,
            timeout: timeoutMs,
            headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        };
        if (typeof body !== "undefined") {
            options.body = body;
            options.headers["Content-Type"] = "application/json";
        }
        const callback = (error, response, data) => {
            if (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
                return;
            }
            const status = Number(response && (response.status || response.statusCode));
            if (!Number.isFinite(status) || status < 200 || status >= 300) {
                reject(new Error(`HTTP ${status || "?"}`));
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (_) {
                reject(new Error("响应不是 JSON"));
            }
        };
        if (method === "POST") $httpClient.post(options, callback);
        else $httpClient.get(options, callback);
    });
}

function renderReport(result) {
    return '<style>'
        + '.report-root{font-family:-apple-system,BlinkMacSystemFont;font-size:14px;line-height:1.5;text-align:left;padding:18px 0 92px}'
        + '.report-title{font-size:20px;font-weight:700;margin-bottom:12px}.node-label{color:#8e8e93;font-size:11px;margin-bottom:10px}'
        + '.report-section{display:block;margin:8px 0;border-top:1px solid rgba(142,142,147,.2)}.section-summary{min-height:42px;color:#0A84FF;font-weight:700;font-size:15px;display:flex;align-items:center}'
        + '.sub{margin:12px 0 2px;color:#0A84FF;font-size:13px;font-weight:700}.metric{display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid rgba(142,142,147,.14)}.metric span{color:#8e8e93;flex-shrink:0}.metric b{text-align:right;overflow-wrap:anywhere}.metric small{display:block;color:#8e8e93;font-size:10px;font-weight:400}.good{color:#30d158}.warn{color:#ff9f0a}.bad{color:#ff453a}.muted-value{color:#8e8e93}.method-note{margin-top:10px;color:#8e8e93;font-size:11px;line-height:1.55;padding:9px 10px;border-radius:10px;background:rgba(142,142,147,.1)}.report-note{color:#8e8e93;font-size:10px;margin-top:12px}'
        + '</style><div class="report-root"><div class="report-title">DNS 解析与污染</div>'
        + `<div class="node-label">ip-api EDNS · $dns.query · ${DNS_VERSION}</div><section class="report-section"><div class="section-summary">▌DNS 解析与污染</div><div class="section-body">`
        + renderNode(result.exit, result.resolver)
        + renderLocal(result.local, result.owners, result.ownerError)
        + '</div></section><div class="report-note">节点部分经所选节点请求；本地部分在手机上经 Loon DNS 栈查询，不经过节点。</div></div>';
}

function renderNode(exit, resolver) {
    let html = '<div class="sub">节点出口解析器</div>';
    const exitData = exit.ok && exit.value && exit.value.status === "success" ? exit.value : null;
    html += exitData
        ? metric("出口 IP", `${escapeHtml(maskIPAddress(exitData.query))}<small>${escapeHtml(exitData.country)} · ${escapeHtml(exitData.as)}</small>`)
        : metric("出口 IP", `<span class="bad">未取得</span><small>${escapeHtml(exit.ok ? exit.value && exit.value.message : exit.error)}</small>`);

    const dns = resolver.ok && resolver.value && resolver.value.dns ? resolver.value.dns : null;
    if (!dns) {
        html += metric("解析器", `<span class="bad">未取得</span><small>${escapeHtml(resolver.ok ? "响应缺少解析器信息" : resolver.error)}</small>`);
        return html;
    }
    html += metric("解析器", `${escapeHtml(maskIPAddress(dns.ip))}<small>${escapeHtml(dns.geo)}</small>`);
    const ecs = resolver.value.edns;
    html += ecs && ecs.ip
        ? metric("ECS 网段", `${escapeHtml(maskIPAddress(ecs.ip))}<small>解析器向权威 DNS 透露的客户端网段 · ${escapeHtml(ecs.geo)}</small>`)
        : metric("ECS 网段", '<span class="muted-value">未携带</span>');

    if (exitData) {
        const resolverCountry = String(dns.geo || "").split(" - ")[0].trim();
        let verdict;
        if (resolverCountry === exitData.country) {
            verdict = '<span class="good">与出口同一国家</span>';
        } else if (resolverCountry === "China") {
            verdict = '<span class="bad">解析器在中国，域名可能由本地解析（DNS 泄漏）</span>';
        } else {
            verdict = `<span class="warn">与出口不同国家</span><small>CDN 可能按 ${escapeHtml(resolverCountry || "解析器")} 分配服务器</small>`;
        }
        html += metric("判断", verdict);
    }
    return html;
}

function renderLocal(local, owners, ownerError) {
    let html = '<div class="sub">本地 DNS 污染</div>';
    if (!local.available) return html + metric("状态", `<span class="bad">未执行</span><small>${escapeHtml(local.error)}</small>`);
    TARGETS.forEach((target) => {
        const lines = RESOLVERS.map((resolver) => {
            const item = local.results.find((entry) => entry.domain === target.domain && entry.resolver === resolver.key);
            return `${resolver.label}：${verdictFor(item.result, target, owners)}`;
        });
        html += metric(escapeHtml(target.domain), lines.map((line, index) => index ? `<small>${line}</small>` : line).join(""));
    });
    if (ownerError) html += metric("IP 归属", `<span class="bad">查询失败</span><small>${escapeHtml(ownerError)}</small>`);
    return html + `<div class="method-note">解析结果的 IP 不属于该网站自己的网络（Google AS15169、Wikimedia AS14907）时判为疑似污染。加密 DNS 使用 Cloudflare ${escapeHtml(DOH_SERVER)}。</div>`;
}

function verdictFor(result, target, owners) {
    if (!result.ok) return `<span class="bad">失败</span> ${escapeHtml(truncate(result.error, 40))}`;
    const ips = aRecords(result.value);
    if (!ips.length) return '<span class="muted-value">无 IPv4 结果</span>';
    const known = ips.filter((ip) => owners[ip]);
    if (!known.length) return `<span class="muted-value">${escapeHtml(ips[0])} · 归属未知</span>`;
    const foreign = known.find((ip) => target.asns.indexOf(asnNumber(owners[ip])) < 0);
    if (foreign) return `<span class="bad">疑似污染</span> ${escapeHtml(foreign)} · ${escapeHtml(owners[foreign])}`;
    return `<span class="good">正常</span> · ${escapeHtml(owners[known[0]])}`;
}

function metric(label, value) {
    return `<div class="metric"><span>${label}</span><b>${value}</b></div>`;
}

function aRecords(result) {
    return (result && Array.isArray(result.answers) ? result.answers : [])
        .filter((answer) => answer && answer.type === "A" && answer.value)
        .map((answer) => String(answer.value));
}

function uniqueIPv4(results) {
    const seen = [];
    results.forEach((entry) => {
        if (!entry.result.ok) return;
        aRecords(entry.result.value).forEach((ip) => {
            if (seen.indexOf(ip) < 0) seen.push(ip);
        });
    });
    return seen.slice(0, 100);
}

function asnNumber(asText) {
    const match = String(asText || "").match(/^AS(\d+)/);
    return match ? Number(match[1]) : null;
}

function maskIPAddress(ip) {
    if (!maskIP || !ip) return ip;
    const text = String(ip);
    const parts = text.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
    const v6 = text.split(":");
    return v6.length > 3 ? `${v6.slice(0, 4).join(":")}:*` : text;
}

function randomLabel() {
    let label = "";
    while (label.length < 32) label += Math.random().toString(36).slice(2);
    return label.slice(0, 32);
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

function remaining() {
    return Math.max(0, TOTAL_BUDGET_MS - (Date.now() - startedAt));
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
