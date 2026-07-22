/**
 * 节点 IP 质量检测 · Loon generic 脚本
 *
 * 使用:在 Loon 的节点或策略组页面对目标执行「节点 IP 质量检测」
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Reference: @Roddy-D <https://github.com/Roddy-D/Loon_plugins>
 * @Reference: @xykt <https://github.com/xykt/IPQuality>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-07-22
 *
 * ===== Loon =====
 * [Script]
 * generic script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality/ipquality.js, tag=节点 IP 质量检测, timeout=50, img-url=shield.lefthalf.filled.system, enable=true
 */

const SCRIPT_VERSION = "2026-07-22.r23";
const IPPURE_URL = "https://my.ippure.com/v1/info";
const IPIFY_URL = "https://api4.ipify.org?format=json";
const IPAPI_URL = "https://api.ipapi.is/";
const IPQUALITY_BACKEND = "https://ipinfo.check.place";
const RUN_DEADLINE_MS = 45000;
const DEFAULT_REQUEST_TIMEOUT = 7000;
const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
const DISNEY_CLIENT_TOKEN = "ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84";
const ARGUMENT_KEYS_R13 = [
    "MaskIP", "MediaTest", "MapNotification", "ShowBasic", "ShowTypes",
    "ShowRiskScores", "ShowRiskFactors", "ShowMedia", "ShowDataStatus",
];
const ARGUMENT_KEYS_R14 = [
    "MaskIP", "MediaTest", "MapNotification", "ShowBasic", "ShowEgressMatrix",
    "ShowTypes", "ShowRiskScores", "ShowRiskFactors", "ShowMedia", "ShowDataStatus",
];
const ARGUMENT_KEYS_R17 = [
    "MaskIP", "MediaTest", "MapNotification", "ShowBasic", "ShowEgressMatrix",
    "ShowTypes", "ShowRiskScores", "ShowRiskFactors", "ShowMedia",
    "ShowRegionConsistency", "ShowDataStatus",
];
const ARGUMENT_KEYS = [
    "MaskIP", "MediaTest", "MapNotification", "ShowBasic", "ShowEgressMatrix",
    "ShowBGP", "ShowTypes", "ShowRiskScores", "ShowRiskFactors", "ShowMedia",
    "ShowRegionConsistency", "ShowDataStatus", "ShowBGPPath", "ShowChinaHttp",
    "ShowInboundRoute", "ShowProbePing", "ShowProbeMTR", "ShowStability",
    "FoldSections",
];
const ARGUMENT_ALIASES = {
    MaskIP: "a",
    MediaTest: "b",
    MapNotification: "c",
    ShowBasic: "d",
    ShowEgressMatrix: "e",
    ShowBGP: "f",
    ShowBGPPath: "g",
    ShowChinaHttp: "h",
    ShowInboundRoute: "i",
    ShowProbePing: "j",
    ShowTypes: "k",
    ShowRiskScores: "l",
    ShowRiskFactors: "m",
    ShowMedia: "n",
    ShowRegionConsistency: "o",
    ShowDataStatus: "p",
    ShowProbeMTR: "q",
    ShowStability: "r",
    FoldSections: "s",
};
const pluginArguments = parsePluginArguments(
    typeof $argument !== "undefined" ? $argument : null
);
const runtimeStats = {
    startedAt: Date.now(),
    requests: [],
};

const params = typeof $environment !== "undefined" && $environment.params
    ? $environment.params
    : {};
const nodeName = params.node || "";
const maskIP = readSwitch("MaskIP", false);
const mediaEnabled = readSwitch("MediaTest", true);
const mapNotificationEnabled = readSwitch("MapNotification", false);
const foldSections = readSwitch("FoldSections", true);
const sectionVisibility = {
    basic: readSwitch("ShowBasic", true),
    types: readSwitch("ShowTypes", false),
    riskScores: readSwitch("ShowRiskScores", true),
    riskFactors: readSwitch("ShowRiskFactors", false),
    media: readSwitch("ShowMedia", true),
    regionConsistency: readSwitch("ShowRegionConsistency", false),
    dataStatus: readSwitch("ShowDataStatus", false),
    egressMatrix: readSwitch("ShowEgressMatrix", false),
    bgp: readSwitch("ShowBGP", false),
    bgpPath: readSwitch("ShowBGPPath", false),
    chinaHttp: readSwitch("ShowChinaHttp", false),
    inboundRoute: readSwitch("ShowInboundRoute", false),
    probePing: readSwitch("ShowProbePing", false),
    probeMTR: readSwitch("ShowProbeMTR", false),
    stability: readSwitch("ShowStability", false),
};

console.log(`[INFO] 节点 IP 质量检测 ${SCRIPT_VERSION}`);
console.log(`[INFO] 节点: ${nodeName || "未获取"}`);
console.log(`[INFO] 插件开关参数: ${pluginArguments ? "已读取" : "未传入，使用兼容值或默认值"}`);

if (!nodeName) {
    finishError("未获取到节点或策略组名称");
} else {
    run().catch((error) => finishError(`检测异常: ${errorMessage(error)}`));
}

async function run() {
    const discovery = await discoverIP();
    if (!discovery.ip) throw new Error("无法获取所选节点的出口 IP");

    const ip = discovery.ip;
    const databaseTask = collectDatabases(ip, discovery);
    const mediaTask = mediaEnabled
        && (sectionVisibility.media || sectionVisibility.regionConsistency)
        ? collectMedia()
        : Promise.resolve([]);
    const bgpTask = sectionVisibility.bgp || sectionVisibility.bgpPath
        ? collectBGP(ip, sectionVisibility.bgpPath)
        : Promise.resolve(null);
    const chinaHttpTask = sectionVisibility.chinaHttp
        ? collectChinaHttp()
        : Promise.resolve(null);
    const inboundTask = sectionVisibility.inboundRoute
        ? collectInboundRoutes(ip)
        : Promise.resolve(null);
    const probePingTask = sectionVisibility.probePing
        ? collectProbePing(ip)
        : Promise.resolve(null);
    const probeMTRTask = sectionVisibility.probeMTR
        ? collectProbeMTR(ip)
        : Promise.resolve(null);
    const stabilityTask = sectionVisibility.stability
        ? collectStability()
        : Promise.resolve(null);
    const results = await Promise.all([
        databaseTask, mediaTask, bgpTask, chinaHttpTask, inboundTask,
        probePingTask, probeMTRTask, stabilityTask,
    ]);
    results[0]._bgp = results[2];
    results[0]._chinaHttp = results[3];
    results[0]._inboundRoutes = results[4];
    results[0]._probePing = results[5];
    results[0]._probeMTR = results[6];
    results[0]._stability = results[7];
    render(ip, results[0], results[1]);
}

async function collectBGP(ip, includePaths) {
    if (!isIPv4(ip)) return { error: "仅查询 IPv4 网络身份" };
    const networkResult = await capture(requestRipeStat("network-info", { resource: ip }));
    if (!networkResult.ok) return { error: `网络信息未返回：${networkResult.error}` };
    const network = networkResult.value;
    const prefix = cleanValue(network.prefix);
    const asns = uniqueValues(Array.isArray(network.asns) ? network.asns.map(cleanASN) : []);
    if (!prefix) return { error: "RIPEstat 未返回可路由前缀" };

    const tasks = [
        capture(requestRipeStat("prefix-overview", { resource: prefix })),
        capture(requestRipeStat("reverse-dns-ip", { resource: ip })),
    ];
    if (includePaths) {
        tasks.push(capture(requestRipeStat("looking-glass", { resource: prefix })));
        tasks.push(capture(requestRipeStat("routing-status", { resource: prefix })));
    }
    const fixedTaskCount = tasks.length;
    asns.forEach((asn) => {
        tasks.push(capture(requestRipeStat("rpki-validation", {
            resource: asn,
            prefix,
        })));
    });
    const settled = await Promise.all(tasks);
    const overview = settled[0].ok ? settled[0].value : {};
    const reverse = settled[1].ok ? settled[1].value : {};
    const overviewAsns = Array.isArray(overview.asns) ? overview.asns : [];
    const holderByAsn = {};
    overviewAsns.forEach((item) => {
        const asn = cleanASN(item && item.asn);
        if (asn) holderByAsn[asn] = cleanValue(item.holder);
    });
    const rpki = asns.map((asn, index) => {
        const result = settled[index + fixedTaskCount];
        return {
            asn,
            status: result && result.ok ? String(result.value.status || "").trim().toLowerCase() : "",
        };
    });
    const block = overview.block || {};
    const errors = [];
    if (!settled[0].ok) errors.push("前缀概览");
    if (!settled[1].ok) errors.push("PTR");
    if (rpki.some((item) => !item.status)) errors.push("RPKI");
    const lookingGlass = includePaths && settled[2] && settled[2].ok ? settled[2].value : null;
    const routingStatus = includePaths && settled[3] && settled[3].ok ? settled[3].value : null;
    if (includePaths && !lookingGlass) errors.push("AS Path");
    if (includePaths && !routingStatus) errors.push("路由可见性");
    return {
        prefix,
        asns,
        holders: asns.map((asn) => holderByAsn[asn]).filter(Boolean),
        announced: overview.announced === true,
        rir: cleanValue(block.name),
        registryDescription: cleanValue(block.desc),
        rpki,
        ptr: cleanValue(reverse.result),
        queryTime: cleanValue(overview.query_time),
        pathAnalysis: includePaths ? buildBGPPathAnalysis(lookingGlass, routingStatus) : null,
        errors,
    };
}

async function requestRipeStat(endpoint, params) {
    const query = Object.keys(params).map((key) => {
        return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
    }).join("&");
    const payload = await requestJson(
        `https://stat.ripe.net/data/${endpoint}/data.json?${query}&sourceapp=paperclip-ipquality`,
        { node: "DIRECT", timeout: 8000 }
    );
    if (!payload || payload.status !== "ok" || !payload.data) {
        throw new Error(cleanValue(payload && payload.message) || "RIPEstat 响应无效");
    }
    return payload.data;
}

function buildBGPPathAnalysis(lookingGlass, routingStatus) {
    const paths = [];
    const collectors = Array.isArray(lookingGlass && lookingGlass.rrcs)
        ? lookingGlass.rrcs : [];
    collectors.forEach((collector) => {
        const peers = Array.isArray(collector && collector.peers) ? collector.peers : [];
        peers.forEach((peer) => {
            const path = normalizeASPath(peer && peer.as_path);
            if (!path.length) return;
            paths.push({
                collector: cleanValue(collector.location) || cleanValue(collector.rrc),
                path,
            });
        });
    });
    const uniquePaths = [];
    const seen = {};
    paths.forEach((item) => {
        const key = item.path.join(" ");
        if (seen[key]) return;
        seen[key] = true;
        uniquePaths.push(item);
    });
    const allAsns = uniqueValues(paths.reduce((list, item) => list.concat(item.path), []));
    const clues = CHINA_ROUTE_ASNS.map((definition) => {
        const count = paths.filter((item) => item.path.indexOf(definition.asn) !== -1).length;
        return count ? { asn: definition.asn, name: definition.name, count } : null;
    }).filter(Boolean);
    const visibility = valueAt(routingStatus, "visibility.v4") || {};
    const firstOrigin = cleanASN(valueAt(routingStatus, "first_seen.origin"));
    const lastOrigin = cleanASN(valueAt(routingStatus, "last_seen.origin"));
    return {
        collectorCount: collectors.length,
        pathCount: paths.length,
        uniquePaths: uniquePaths.slice(0, 4),
        allAsns,
        clues,
        peersSeeing: numberOrNull(visibility.ris_peers_seeing),
        totalPeers: numberOrNull(visibility.total_ris_peers),
        firstOrigin,
        lastOrigin,
        originChanged: !!(firstOrigin && lastOrigin && firstOrigin !== lastOrigin),
        queryTime: cleanValue(routingStatus && routingStatus.query_time)
            || cleanValue(lookingGlass && lookingGlass.latest_time),
    };
}

function normalizeASPath(value) {
    const values = Array.isArray(value) ? value : String(value || "").match(/\d+/g) || [];
    return uniqueConsecutive(values.map(cleanASN).filter(Boolean));
}

const CHINA_ROUTE_ASNS = [
    { asn: "4809", name: "电信 CN2 相关" },
    { asn: "9929", name: "联通 9929 相关" },
    { asn: "4134", name: "电信 163" },
    { asn: "4837", name: "联通 169" },
    { asn: "58453", name: "移动 CMI" },
    { asn: "58807", name: "移动 CMIN2" },
    { asn: "23764", name: "电信 CTGNet" },
];

const CHINA_HTTP_TARGETS = [
    { region: "北京", carrier: "电信", url: "https://bj.189.cn/" },
    { region: "上海", carrier: "电信", url: "https://sh.189.cn/" },
    { region: "广东", carrier: "电信", url: "https://gd.189.cn/" },
    { region: "北京", carrier: "联通", url: "https://bj.10010.com/" },
    { region: "上海", carrier: "联通", url: "https://sh.10010.com/" },
    { region: "广东", carrier: "联通", url: "https://gd.10010.com/" },
    { region: "北京", carrier: "移动", url: "https://bj.10086.cn/" },
    { region: "上海", carrier: "移动", url: "https://www.sh.10086.cn/" },
    { region: "广东", carrier: "移动", url: "https://gd.10086.cn/" },
];

const GLOBALPING_LOCATIONS = [
    { magic: "AS4134+China", limit: 1 },
    { magic: "AS4837+China", limit: 1 },
    { magic: "AS9808+China", limit: 1 },
];

const STABILITY_TARGETS = [
    { name: "Cloudflare", url: "https://cp.cloudflare.com/generate_204" },
    { name: "Google", url: "https://www.gstatic.com/generate_204" },
    { name: "Apple", url: "https://captive.apple.com/hotspot-detect.html" },
];

async function collectChinaHttp() {
    const settled = await Promise.all(CHINA_HTTP_TARGETS.map(async (target) => {
        const startedAt = Date.now();
        const result = await capture(request("GET", target.url, {
            timeout: 6500,
            allowHttpErrors: true,
            headers: browserHeaders(),
        }));
        const response = result.ok ? result.value : null;
        return {
            region: target.region,
            carrier: target.carrier,
            host: requestHost(target.url),
            ok: !!(response && response.status),
            status: response ? response.status : 0,
            ms: Math.max(0, Date.now() - startedAt),
            error: result.ok ? "" : result.error,
        };
    }));
    return settled;
}

async function collectInboundRoutes(ip) {
    if (!isIPv4(ip)) return { error: "仅支持 IPv4 目标" };
    const measurement = await createGlobalpingMeasurement(
        "traceroute", ip, { protocol: "ICMP" }, 4
    );
    if (measurement.error) return measurement;
    return parseInboundMeasurement(measurement);
}

async function createGlobalpingMeasurement(type, target, measurementOptions, attempts) {
    const body = JSON.stringify({
        type,
        target,
        locations: GLOBALPING_LOCATIONS,
        measurementOptions: measurementOptions || {},
    });
    const created = await capture(requestJson("https://api.globalping.io/v1/measurements", {
        method: "POST",
        node: "DIRECT",
        timeout: 8000,
        body,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "paperclip-ipquality/1.0",
        },
    }));
    if (!created.ok || !created.value || !created.value.id) {
        return { error: `Globalping 创建测量失败：${created.error || "未返回任务编号"}` };
    }
    let measurement = null;
    const maxAttempts = Math.max(1, attempts || 4);
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (deadlineRemaining() < 1200) break;
        await delay(attempt ? 1400 : 900);
        const polled = await capture(requestJson(
            `https://api.globalping.io/v1/measurements/${encodeURIComponent(created.value.id)}`,
            { node: "DIRECT", timeout: 8000 }
        ));
        if (polled.ok) measurement = polled.value;
        if (measurement && measurement.status !== "in-progress") break;
    }
    if (!measurement) return { error: "Globalping 测量结果未返回" };
    return measurement;
}

function parseInboundMeasurement(measurement) {
    const routes = (Array.isArray(measurement && measurement.results)
        ? measurement.results : []).map((item) => {
        const probe = item.probe || {};
        const result = item.result || {};
        const hops = Array.isArray(result.hops) ? result.hops : [];
        const lastHop = hops.slice().reverse().find((hop) => {
            return Array.isArray(hop && hop.timings) && hop.timings.some((timing) => {
                return numberOrNull(timing && timing.rtt) !== null;
            });
        });
        const rtts = lastHop && Array.isArray(lastHop.timings)
            ? lastHop.timings.map((timing) => numberOrNull(timing && timing.rtt)).filter((v) => v !== null)
            : [];
        const hopAsns = uniqueValues(hops.reduce((values, hop) => {
            const provided = Array.isArray(hop && hop.asn) ? hop.asn.map(cleanASN) : [];
            const hopIP = normalizeIPAddress(hop && hop.resolvedAddress);
            const fallback = hopIP ? loonNetworkProfile(hopIP).asn : "";
            return values.concat(provided, fallback || []);
        }, []).filter(Boolean));
        const lastAddress = normalizeIPAddress(lastHop && lastHop.resolvedAddress);
        return {
            carrier: carrierByASN(cleanASN(probe.asn)),
            asn: cleanASN(probe.asn),
            network: cleanValue(probe.network),
            location: uniqueValues([probe.city, probe.state, probe.country]).join(" · "),
            status: cleanValue(result.status),
            hopCount: hops.length,
            reached: !!lastAddress && lastAddress === normalizeIPAddress(measurement.target),
            lastRtt: rtts.length ? round(rtts.reduce((sum, value) => sum + value, 0) / rtts.length, 2) : null,
            routeClues: classifyASNList(hopAsns),
        };
    });
    return {
        id: cleanValue(measurement.id),
        target: cleanValue(measurement.target),
        status: cleanValue(measurement.status),
        routes,
        missing: ["电信", "联通", "移动"].filter((carrier) => !routes.some((route) => route.carrier === carrier)),
    };
}

async function collectProbePing(ip) {
    if (!isIPv4(ip)) return { error: "仅支持 IPv4 目标" };
    const measurement = await createGlobalpingMeasurement(
        "ping", ip, { protocol: "ICMP", packets: 4 }, 4
    );
    if (measurement.error) return measurement;
    const rows = (Array.isArray(measurement.results) ? measurement.results : []).map((item) => {
        const probe = item.probe || {};
        const result = item.result || {};
        const stats = result.stats || {};
        const timings = Array.isArray(result.timings)
            ? result.timings.map((timing) => numberOrNull(timing && timing.rtt)).filter((v) => v !== null)
            : [];
        return {
            carrier: carrierByASN(cleanASN(probe.asn)),
            asn: cleanASN(probe.asn),
            location: uniqueValues([probe.city, probe.state, probe.country]).join(" · "),
            status: cleanValue(result.status),
            avg: numberOrNull(stats.avg),
            min: numberOrNull(stats.min),
            max: numberOrNull(stats.max),
            loss: numberOrNull(stats.loss),
            jitter: timings.length > 1 ? round(standardDeviation(timings), 2) : null,
        };
    });
    return {
        id: cleanValue(measurement.id),
        status: cleanValue(measurement.status),
        rows,
        missing: ["电信", "联通", "移动"].filter((carrier) => !rows.some((row) => row.carrier === carrier)),
    };
}

async function collectProbeMTR(ip) {
    if (!isIPv4(ip)) return { error: "仅支持 IPv4 目标" };
    const measurement = await createGlobalpingMeasurement(
        "mtr", ip, { protocol: "ICMP", packets: 5 }, 6
    );
    if (measurement.error) return measurement;
    const rows = (Array.isArray(measurement.results) ? measurement.results : []).map((item) => {
        const probe = item.probe || {};
        const result = item.result || {};
        const hops = Array.isArray(result.hops) ? result.hops : [];
        const lastHop = hops.slice().reverse().find((hop) => hop && hop.resolvedAddress);
        const stats = lastHop && lastHop.stats || {};
        const lastAddress = normalizeIPAddress(lastHop && lastHop.resolvedAddress);
        return {
            carrier: carrierByASN(cleanASN(probe.asn)),
            asn: cleanASN(probe.asn),
            location: uniqueValues([probe.city, probe.state, probe.country]).join(" · "),
            status: cleanValue(result.status),
            reached: !!lastAddress && lastAddress === normalizeIPAddress(measurement.target),
            hopCount: hops.length,
            avg: numberOrNull(stats.avg),
            loss: numberOrNull(stats.loss),
            jitter: numberOrNull(stats.jAvg),
        };
    });
    return {
        id: cleanValue(measurement.id),
        status: cleanValue(measurement.status),
        rows,
        missing: ["电信", "联通", "移动"].filter((carrier) => !rows.some((row) => row.carrier === carrier)),
    };
}

async function collectStability() {
    const rows = await Promise.all(STABILITY_TARGETS.map(async (target) => {
        const samples = [];
        for (let roundIndex = 0; roundIndex < 3; roundIndex += 1) {
            if (deadlineRemaining() < 1200) break;
            const startedAt = Date.now();
            const separator = target.url.indexOf("?") === -1 ? "?" : "&";
            const result = await capture(request("GET", `${target.url}${separator}r=${Date.now()}-${roundIndex}`, {
                timeout: 6000,
                allowHttpErrors: true,
                headers: browserHeaders(),
            }));
            const status = result.ok && result.value ? result.value.status : 0;
            samples.push({
                ok: status >= 200 && status < 400,
                status,
                ms: Math.max(0, Date.now() - startedAt),
            });
        }
        const successful = samples.filter((sample) => sample.ok).map((sample) => sample.ms);
        return {
            name: target.name,
            host: requestHost(target.url),
            total: samples.length,
            success: successful.length,
            median: percentile(successful, 50),
            p95: percentile(successful, 95),
            jitter: successful.length > 1 ? round(standardDeviation(successful), 2) : null,
        };
    }));
    return rows;
}

function classifyASNList(asns) {
    const values = uniqueValues(asns || []);
    return CHINA_ROUTE_ASNS.filter((item) => values.indexOf(item.asn) !== -1)
        .map((item) => item.name);
}

function carrierByASN(asn) {
    const values = { "4134": "电信", "4837": "联通", "9808": "移动", "58453": "移动国际" };
    return values[asn] || (asn ? `AS${asn}` : "未知探针");
}

async function discoverIP() {
    const definitions = [
        ["ipinfo.check.place", requestText(`${IPQUALITY_BACKEND}/cdn-cgi/trace`)],
        ["myip.check.place", requestText("https://myip.check.place")],
        ["ipify", requestJson(IPIFY_URL)],
        ["ident.me", requestText("https://v4.ident.me/")],
        ["icanhazip", requestText("https://ipv4.icanhazip.com/")],
        ["IPPure", requestIppure()],
        ["ipapi", requestJson(IPAPI_URL)],
    ];
    const settled = await Promise.all(definitions.map((item) => capture(item[1])));
    const observations = [];
    let ippure = null;
    let ippureError = "";
    let ipapi = null;

    definitions.forEach((item, index) => {
        const result = settled[index];
        if (!result.ok) {
            if (item[0] === "IPPure") ippureError = result.error;
            console.log(`[WARN] 出口探针 ${item[0]}: ${result.error}`);
            return;
        }
        const value = result.value;
        if (item[0] === "IPPure") ippure = value;
        if (item[0] === "ipapi") ipapi = value;
        const candidate = item[0] === "ipinfo.check.place"
            ? cloudflareTraceIP(value)
            : item[0] === "ipify"
                    ? value && value.ip
                    : item[0] === "IPPure" || item[0] === "ipapi"
                        ? value && value.ip
                        : String(value || "").trim();
        const normalizedCandidate = normalizeIPAddress(candidate);
        if (normalizedCandidate) observations.push({
            source: item[0],
            ip: normalizedCandidate,
        });
    });

    if (!observations.length) {
        return {
            ip: "",
            ippure: null,
            ipapi: null,
            observations: [],
            probe: { matched: 0, total: 0, unique: 0 },
        };
    }

    const counts = {};
    observations.forEach((item) => {
        counts[item.ip] = (counts[item.ip] || 0) + 1;
    });
    const backendObservation = observations.find((item) => item.source === "ipinfo.check.place")
        || observations.find((item) => item.source === "myip.check.place");
    const ip = backendObservation ? backendObservation.ip : observations.map((item) => item.ip)
        .sort((left, right) => {
            const countDiff = counts[right] - counts[left];
            if (countDiff) return countDiff;
            const ipv4Diff = Number(isIPv4(right)) - Number(isIPv4(left));
            if (ipv4Diff) return ipv4Diff;
            return observations.findIndex((item) => item.ip === left)
                - observations.findIndex((item) => item.ip === right);
        })[0];
    const matchingIpapi = ipapi && normalizeIPAddress(ipapi.ip) === ip ? ipapi : null;
    const unique = Object.keys(counts);
    if (unique.length > 1) {
        console.log(`[WARN] 出口探针不一致: ${observations.map((item) => `${item.source}=${maskIPAddress(item.ip)}`).join(", ")}`);
    }

    return {
        ip,
        ippure,
        ippureError,
        ipapi: matchingIpapi,
        observations,
        probe: {
            matched: counts[ip],
            total: observations.length,
            unique: unique.length,
        },
    };
}

async function collectDatabases(ip, discovery) {
    const pathIP = encodeURIComponent(ip);
    const tasks = {
        maxmind: requestBackendJson(`${IPQUALITY_BACKEND}/${pathIP}?lang=cn`),
        maxmindBackup: requestBackendJson(`${IPQUALITY_BACKEND}/${pathIP}?lang=en`),
        ippure: discovery.ippure
            ? Promise.resolve(discovery.ippure)
            : Promise.reject(new Error(discovery.ippureError || "IPPure 请求失败")),
        ipapi: discovery.ipapi
            ? Promise.resolve(discovery.ipapi)
            : requestJson(`${IPAPI_URL}?q=${pathIP}`, { node: "DIRECT" }),
        ipinfo: requestJson(`https://ipinfo.io/widget/demo/${pathIP}`, { node: "DIRECT" }),
        ipwhois: requestJson(`https://ipwho.is/${pathIP}`, { node: "DIRECT" }),
    };
    const needsTypes = sectionVisibility.types;
    const needsScores = sectionVisibility.riskScores;
    const needsFactors = sectionVisibility.riskFactors;
    if (needsTypes || needsScores || needsFactors) {
        tasks.ip2locationFull = requestBackendJson(`${IPQUALITY_BACKEND}/${pathIP}?db=ip2location`);
        tasks.ip2location = requestText(`https://www.ip2location.io/${pathIP}`, { node: "DIRECT" });
    }
    if (needsTypes || needsScores) {
        tasks.abuseipdb = requestBackendJson(`${IPQUALITY_BACKEND}/${pathIP}?db=abuseipdb`);
    }
    if (needsScores || needsFactors) {
        tasks.scamalytics = requestScamalytics(pathIP);
        tasks.ipqs = requestBackendJson(`${IPQUALITY_BACKEND}/${pathIP}?db=ipqualityscore`);
        tasks.proxycheck = requestJson(`https://proxycheck.io/v2/${pathIP}?vpn=1&asn=1&risk=1`, {
            node: "DIRECT",
        });
        tasks.dbip = requestText(`https://db-ip.com/${pathIP}`, { node: "DIRECT" });
    }
    if (needsTypes || needsFactors) {
        tasks.ipregistry = requestIpregistry(pathIP);
    }
    if (needsFactors) {
        tasks.ipdata = requestBackendJson(`${IPQUALITY_BACKEND}/${pathIP}?db=ipdata`);
    }

    const keys = Object.keys(tasks);
    const settled = await Promise.all(keys.map((key) => capture(tasks[key])));
    const data = {
        _errors: {},
        _warnings: {},
        _probe: discovery.probe || { matched: 0, total: 0, unique: 0 },
        _egress: buildEgressGroups(discovery.observations, ip),
        _attempted: keys.slice(),
    };
    keys.forEach((key, index) => {
        const value = settled[index].ok ? settled[index].value : null;
        const mismatch = value ? databaseIPMismatch(key, value, ip) : "";
        if (key === "ippure" && value && !normalizeIPAddress(value.ip)) {
            data[key] = null;
            data._errors[key] = "IPPure 未返回可核验的出口 IP";
            console.log(`[WARN] ${key}: ${data._errors[key]}`);
            return;
        }
        if (key === "ippure" && value && mismatch) {
            data[key] = Object.assign({}, value, { _egressMismatch: true });
            data._warnings[key] = mismatch;
            console.log(`[WARN] ${key}: ${mismatch}，保留为分流出口结果`);
            return;
        }
        data[key] = mismatch ? null : value;
        if (!settled[index].ok || mismatch) {
            data._errors[key] = mismatch || settled[index].error;
            console.log(`[WARN] ${key}: ${data._errors[key]}`);
        }
    });
    return data;
}

async function requestBackendJson(url) {
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
            return await requestJson(url);
        } catch (error) {
            lastError = error;
            if (!/HTTP 403\b/i.test(errorMessage(error)) || attempt >= 2) throw error;
            console.log(`[WARN] 聚合接口返回 403，第 ${attempt} 次重试`);
        }
    }
    throw lastError || new Error("聚合接口请求失败");
}

async function requestIppure() {
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
            const value = await requestJson(IPPURE_URL, {
                headers: {},
                timeout: 6000,
            });
            if (!normalizeIPAddress(value && value.ip)) {
                throw new Error("未返回可核验的出口 IP");
            }
            const fraudScore = numberOrNull(value.fraudScore);
            if (fraudScore === null || fraudScore < 0 || fraudScore > 100) {
                throw new Error("风险评分无效");
            }
            return value;
        } catch (error) {
            lastError = error;
            if (attempt < 2) {
                console.log(`[WARN] IPPure 第 ${attempt} 次请求失败，正在重试: ${errorMessage(error)}`);
            }
        }
    }
    throw lastError || new Error("IPPure 请求失败");
}

async function requestScamalytics(pathIP) {
    try {
        const backend = await requestBackendJson(`${IPQUALITY_BACKEND}/${pathIP}?db=scamalytics`);
        if (numberOrNull(valueAt(backend, "scamalytics.scamalytics_score")) === null) {
            throw new Error("聚合接口未返回评分");
        }
        return backend;
    } catch (backendError) {
        console.log(`[WARN] Scamalytics 聚合接口失败，尝试经节点访问官网: ${errorMessage(backendError)}`);
        const html = await requestText(`https://scamalytics.com/ip/${pathIP}`, {
            headers: browserHeaders(),
        });
        const parsed = parseScamalyticsHtml(html, decodeURIComponent(pathIP));
        if (!parsed) throw new Error("Scamalytics 官网页面解析失败");
        return parsed;
    }
}

async function requestIpregistry(pathIP) {
    const homepage = await requestText("https://ipregistry.co", { node: "DIRECT" });
    const match = String(homepage).match(/apiKey=["']([a-zA-Z0-9]+)["']/i);
    if (!match) throw new Error("ipregistry 页面未公开演示密钥");
    const key = match[1];
    return requestJson(`https://api.ipregistry.co/${pathIP}?hostname=true&key=${key}`, {
        node: "DIRECT",
        headers: {
            Accept: "application/json",
            Origin: "https://ipregistry.co",
            Referer: "https://ipregistry.co/",
            "User-Agent": USER_AGENT,
        },
    });
}

function databaseIPMismatch(key, value, expectedIP) {
    const paths = {
        maxmind: ["IP", "ip"],
        maxmindBackup: ["IP", "ip"],
        ippure: ["ip"],
        ipapi: ["ip"],
        ipinfo: ["data.ip"],
        ipwhois: ["ip"],
        scamalytics: ["ip"],
        abuseipdb: ["data.ipAddress"],
        ip2locationFull: ["ip"],
        ipdata: ["ip"],
        ipregistry: ["ip"],
    };
    const candidates = paths[key] || [];
    let reported = "";
    if (key === "proxycheck") {
        reported = Object.keys(value || {}).find((name) => isIPAddress(name)) || "";
    }
    for (let i = 0; i < candidates.length; i += 1) {
        const candidate = cleanValue(valueAt(value, candidates[i]));
        if (candidate) {
            reported = candidate;
            break;
        }
    }
    if (!reported) return "";
    const normalizedReported = normalizeIPAddress(reported);
    const normalizedExpected = normalizeIPAddress(expectedIP);
    return normalizedReported && normalizedExpected && normalizedReported === normalizedExpected
        ? ""
        : `响应 IP ${maskIPAddress(reported)} 与检测 IP ${maskIPAddress(expectedIP)} 不一致`;
}

async function collectMedia() {
    const tests = [
        ["TikTok", testTikTok()],
        ["Disney+", testDisneyPlus()],
        ["Netflix", testNetflix()],
        ["YouTube", testYouTube()],
        ["Prime Video", testPrimeVideo()],
        ["Reddit", testReddit()],
        ["ChatGPT", testChatGPT()],
    ];
    const settled = await Promise.all(tests.map((item) => capture(item[1])));
    return tests.map((item, index) => {
        if (settled[index].ok) return settled[index].value;
        console.log(`[WARN] ${item[0]}: ${settled[index].error}`);
        return mediaResult(item[0], "unknown", "", "请求失败");
    });
}

async function testTikTok() {
    const response = await request("GET", "https://www.tiktok.com/", {
        allowHttpErrors: true,
        headers: browserHeaders(),
    });
    const region = firstMatch(response.body, [
        /"region"\s*:\s*"([A-Z]{2})"/i,
        /"storeCountry"\s*:\s*"([A-Z]{2})"/i,
    ]);
    if (region) return mediaResult("TikTok", "yes", region, "页面端点返回地区字段");
    if (response.status === 403 || /not available|access denied/i.test(response.body)) {
        return mediaResult("TikTok", "unknown", "", `HTTP ${response.status || "?"} · 可能受限或反爬`);
    }
    return mediaResult("TikTok", "unknown", "", "地区未识别");
}

async function testDisneyPlus() {
    const device = await requestJson("https://disney.api.edge.bamgrid.com/devices", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${DISNEY_CLIENT_TOKEN}`,
            "Content-Type": "application/json; charset=UTF-8",
            "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({
            deviceFamily: "browser",
            applicationRuntime: "chrome",
            deviceProfile: "windows",
            attributes: {},
        }),
    });
    if (!device.assertion) return mediaResult("Disney+", "unknown", "", "设备注册失败");

    const form = [
        "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange",
        "latitude=0",
        "longitude=0",
        "platform=browser",
        `subject_token=${encodeURIComponent(device.assertion)}`,
        "subject_token_type=urn%3Abamtech%3Aparams%3Aoauth%3Atoken-type%3Adevice",
    ].join("&");
    const token = await requestJson("https://disney.api.edge.bamgrid.com/token", {
        method: "POST",
        allowHttpErrors: true,
        headers: {
            Authorization: `Bearer ${DISNEY_CLIENT_TOKEN}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
        },
        body: form,
    });
    if (token.error_description === "forbidden-location") {
        return mediaResult("Disney+", "no", "", "地区受限");
    }
    if (!token.refresh_token) return mediaResult("Disney+", "unknown", "", "令牌获取失败");

    const graphBody = JSON.stringify({
        query: "mutation refreshToken($input: RefreshTokenInput!) { refreshToken(refreshToken: $input) { activeSession { sessionId } } }",
        variables: { input: { refreshToken: token.refresh_token } },
    });
    const graph = await requestJson("https://disney.api.edge.bamgrid.com/graph/v1/device/graphql", {
        method: "POST",
        allowHttpErrors: true,
        headers: {
            Authorization: DISNEY_CLIENT_TOKEN,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        body: graphBody,
    });
    const session = graph && graph.extensions && graph.extensions.sdk
        ? graph.extensions.sdk.session || {}
        : {};
    const region = session.location && session.location.countryCode
        ? session.location.countryCode
        : "";
    if (session.inSupportedLocation === true) {
        return mediaResult("Disney+", "yes", region, "inSupportedLocation=true");
    }
    if (session.inSupportedLocation === false) {
        return mediaResult("Disney+", "no", region, "inSupportedLocation=false");
    }
    return mediaResult("Disney+", "unknown", region, "状态未识别");
}

async function testNetflix() {
    const urls = [
        "https://www.netflix.com/title/81280792",
        "https://www.netflix.com/title/70143836",
    ];
    const responses = await Promise.all(urls.map((url) => request("GET", url, {
        allowHttpErrors: true,
        headers: browserHeaders(),
    })));
    if (responses.some((response) => response.status === 403)) {
        return mediaResult("Netflix", "unknown", "", "HTTP 403 · 可能受限或反爬");
    }
    const pages = responses.map((response) => response.body);
    const region = firstMatch(pages.join("\n"), [
        /"countryCode"\s*:\s*"([A-Z]{2})"/i,
        /"id"\s*:\s*"([A-Z]{2})"\s*,\s*"countryName"/i,
    ]);
    const unavailable = pages.map((body) => /Oh no!|NSEZ-404/i.test(body));
    if (unavailable[0] && unavailable[1]) {
        return mediaResult("Netflix", "partial", region, "两部测试片标题页均显示不可用");
    }
    if (responses.some((response) => response.status >= 200 && response.status < 400)) {
        return mediaResult("Netflix", "yes", region, "测试片标题页可达，不代表登录后可播放");
    }
    return mediaResult("Netflix", "unknown", region, "状态未识别");
}

async function testYouTube() {
    const response = await request("GET", "https://www.youtube.com/premium", {
        allowHttpErrors: true,
        headers: Object.assign(browserHeaders(), {
            "Accept-Language": "en-US,en;q=0.9",
            Cookie: "CONSENT=YES+cb.20220301-11-p0.en+FX+700",
        }),
    });
    if (/www\.google\.cn/i.test(response.body)) {
        return mediaResult("YouTube", "partial", "CN", "重定向至 google.cn");
    }
    const region = firstMatch(response.body, [/"contentRegion"\s*:\s*"([A-Z]{2})"/i]);
    if (/Premium is not available in your country/i.test(response.body)) {
        return mediaResult("YouTube", "partial", region, "页面明确显示 Premium 不可用");
    }
    if (region && /YouTube Premium/i.test(response.body)) {
        return mediaResult("YouTube", "yes", region, "Premium 页面可达并返回地区字段，不代表可购买");
    }
    return mediaResult("YouTube", "unknown", region, "状态未识别");
}

async function testPrimeVideo() {
    const response = await request("GET", "https://www.primevideo.com/", {
        allowHttpErrors: true,
        headers: browserHeaders(),
    });
    const region = firstMatch(response.body, [
        /"currentTerritory"\s*:\s*"([A-Z]{2})"/i,
        /currentTerritory\\?"\s*:\s*\\?"([A-Z]{2})/i,
    ]);
    if (region) return mediaResult("Prime Video", "yes", region, "端点返回 currentTerritory，不代表实际播放");
    if (/not available in your location/i.test(response.body)) {
        return mediaResult("Prime Video", "no", "", "页面明确显示地区受限");
    }
    if (response.status === 403) {
        return mediaResult("Prime Video", "unknown", "", "HTTP 403 · 可能受限或反爬");
    }
    return mediaResult("Prime Video", "unknown", "", "地区未识别");
}

async function testReddit() {
    const response = await request("GET", "https://www.reddit.com/", {
        allowHttpErrors: true,
        headers: browserHeaders(),
    });
    const region = firstMatch(response.body, [
        /country\s*=\s*"([A-Z]{2})"/i,
        /"countryCode"\s*:\s*"([A-Z]{2})"/i,
    ]);
    if (response.status === 200) return mediaResult("Reddit", "yes", region, "首页端点 HTTP 200，不代表账号功能");
    if (response.status === 403) return mediaResult("Reddit", "unknown", "", "HTTP 403 · 可能受限或反爬");
    return mediaResult("Reddit", "unknown", region, `HTTP ${response.status || "?"}`);
}

async function testChatGPT() {
    const tasks = await Promise.all([
        capture(request("GET", "https://api.openai.com/compliance/cookie_requirements", {
            allowHttpErrors: true,
            headers: Object.assign(browserHeaders(), {
                Accept: "*/*",
                Authorization: "Bearer null",
                "Content-Type": "application/json",
                Origin: "https://platform.openai.com",
                Referer: "https://platform.openai.com/",
            }),
        })),
        capture(request("GET", "https://ios.chat.openai.com/", {
            allowHttpErrors: true,
            headers: browserHeaders(),
        })),
        capture(request("GET", "https://chatgpt.com/cdn-cgi/trace", {
            allowHttpErrors: true,
            headers: browserHeaders(),
        })),
    ]);
    const web = tasks[0].ok ? tasks[0].value : null;
    const app = tasks[1].ok ? tasks[1].value : null;
    const trace = tasks[2].ok ? tasks[2].value : null;
    const region = trace ? firstMatch(trace.body, [/^loc=([A-Z]{2})$/im]) : "";
    const webState = classifyChatGPTWeb(web);
    const appState = classifyChatGPTApp(app);

    if (!web && !app) return mediaResult("ChatGPT", "unknown", region, "请求失败");
    if (webState === "available" && appState === "available") {
        return mediaResult("ChatGPT", "yes", region, "Web/App 探测端点均可达，不代表登录后功能");
    }
    if (webState === "available" && appState === "blocked") {
        return mediaResult("ChatGPT", "partial", region, `仅 Web 端点可达；App HTTP ${app.status}`);
    }
    if (appState === "available" && webState === "blocked") {
        return mediaResult("ChatGPT", "partial", region, `仅 App 端点可达；Web HTTP ${web.status}`);
    }
    if (webState === "blocked" && appState === "blocked") {
        return mediaResult("ChatGPT", "partial", region, "Web/App 均拒绝或受限，无法区分地区限制与风控");
    }
    if (webState === "available") {
        return mediaResult("ChatGPT", "partial", region, "Web 端点可达；App 未确认");
    }
    if (appState === "available") {
        return mediaResult("ChatGPT", "partial", region, "App 端点可达；Web 未确认");
    }
    const details = [];
    if (webState === "blocked") details.push("Web 受限");
    if (appState === "blocked") details.push("App 受限");
    return mediaResult("ChatGPT", "unknown", region,
        details.length ? `${details.join("；")}；另一端未确认` : "响应不足以确认");
}

function classifyChatGPTWeb(response) {
    if (!response) return "unknown";
    const body = String(response.body || "");
    if (/unsupported_country/i.test(body)
        || /sorry,\s*you have been blocked|access denied|cf-error/i.test(body)) {
        return "blocked";
    }
    if (/cookie_consent_required/i.test(body)) return "available";
    if (response.status >= 200 && response.status < 300) return "available";
    return "unknown";
}

function classifyChatGPTApp(response) {
    if (!response) return "unknown";
    const body = String(response.body || "");
    if (/request is not allowed\.\s*please try again later\./i.test(body)) {
        return "available";
    }
    if (/you may be connected to a disallowed isp|\bVPN\b|unsupported_country/i.test(body)
        || /sorry,\s*you have been blocked|access denied|cf-error/i.test(body)) {
        return "blocked";
    }
    if (response.status >= 200 && response.status < 400) return "available";
    return "unknown";
}

function render(ip, data, media) {
    const basic = buildBasic(ip, data);
    const types = sectionVisibility.types ? buildTypes(data) : [];
    const risks = sectionVisibility.riskScores ? buildRisks(data) : [];
    const factors = sectionVisibility.riskFactors ? buildFactors(data) : [];
    const audit = buildAudit(data);
    const regionConsistency = buildRegionConsistency(basic, media);
    const titleColor = reportColor(risks);
    const displayNodeName = truncateText(nodeName, 30);

    const visibleSections = [];
    if (sectionVisibility.basic) {
        visibleSections.push(section("基础信息", renderBasic(basic)));
    }
    if (sectionVisibility.bgp) {
        visibleSections.push(section("BGP 网络身份", renderBGP(data._bgp)));
    }
    if (sectionVisibility.bgpPath) {
        visibleSections.push(section("目标前缀 BGP 可见路径", renderBGPPath(data._bgp && data._bgp.pathAnalysis)));
    }
    if (sectionVisibility.egressMatrix) {
        visibleSections.push(section("出口分流", renderEgressMatrix(data._egress, basic)));
    }
    if (sectionVisibility.chinaHttp) {
        visibleSections.push(section("运营商地区门户 HTTP（实验）", renderChinaHttp(data._chinaHttp)));
    }
    if (sectionVisibility.inboundRoute) {
        visibleSections.push(section("指定 ASN 外部探针入站路径", renderInboundRoutes(data._inboundRoutes)));
    }
    if (sectionVisibility.probePing) {
        visibleSections.push(section("指定 ASN 外部探针 Ping", renderProbePing(data._probePing)));
    }
    if (sectionVisibility.probeMTR) {
        visibleSections.push(section("指定 ASN 外部探针 MTR", renderProbeMTR(data._probeMTR)));
    }
    if (sectionVisibility.stability) {
        visibleSections.push(section("端到端 HTTPS 稳定性", renderStability(data._stability)));
    }
    if (sectionVisibility.types) {
        visibleSections.push(section("IP 类型属性", renderTypeList(types)));
    }
    if (sectionVisibility.riskScores) {
        visibleSections.push(section("风险评分", renderRiskList(risks)));
    }
    if (sectionVisibility.riskFactors) {
        visibleSections.push(section("风险因素", renderFactorCards(factors)));
    }
    if (sectionVisibility.media) {
        visibleSections.push(section("流媒体与 AI 可达性", mediaEnabled
            ? renderMediaList(media)
            : mutedLine("流媒体检测已关闭")));
    }
    if (sectionVisibility.regionConsistency) {
        visibleSections.push(section("服务地区一致性", mediaEnabled
            ? renderRegionConsistency(regionConsistency)
            : mutedLine("流媒体与 AI 检测已关闭，没有可比较的地区数据")));
    }
    if (sectionVisibility.dataStatus) {
        visibleSections.push(section("数据状态", renderAudit(audit, data._probe, runtimeStats)));
    }
    if (!visibleSections.length) {
        visibleSections.push(mutedLine("请在插件设置中选择报告分区"));
    }

    const html = [
        reportStyle(),
        '<div class="report-root">',
        '<div class="report-title">节点 IP 质量检测</div>',
        `<div class="node-label">节点 · ${escapeHtml(displayNodeName)}</div>`,
        summaryCard(basic),
        visibleSections.join(""),
        '<div class="report-note">'
            + '类型名称、评分分档与风险字段遵循 xykt/IPQuality 的展示口径；各库结果独立展示，不生成综合结论。'
            + '聚合来源不可用时保留直连结果。BGP 属于控制面观察，Globalping 属于外部探针到出口 IP 的入站/往返测量；均不代表机场节点真实回程。</div>',
        "</div>",
    ].join("");

    postMapNotification(basic, displayNodeName);
    $done({
        title: "\u200B",
        htmlMessage: html,
        icon: "shield.lefthalf.filled",
        "title-color": titleColor,
    });
}

function buildBasic(ip, data) {
    const ipapi = data.ipapi || {};
    const ippure = data.ippure && !data.ippure._egressMismatch ? data.ippure : {};
    const ip2 = getIp2location(data) || {};
    const ipinfo = data.ipinfo && data.ipinfo.data ? data.ipinfo.data : {};
    const ipwhois = data.ipwhois && data.ipwhois.success !== false ? data.ipwhois : {};
    const proxycheck = proxycheckRecord(data.proxycheck) || {};
    const maxmind = mergeFallback(data.maxmind, data.maxmindBackup) || {};
    const maxmindASN = maxmind.ASN || {};
    const maxmindCity = maxmind.City || {};
    const maxmindCountry = maxmind.Country || {};
    const maxmindRegistered = maxmindCountry.RegisteredCountry || {};
    const location = ipapi.location || {};
    const asn = ipapi.asn || {};
    const maxmindRegion = cleanValue(maxmindCountry.IsoCode) || cleanValue(maxmindCountry.Name)
        ? maxmindCountry
        : valueAt(maxmindCity, "Country") || {};
    const maxmindCityParts = [];
    if (Array.isArray(maxmindCity.Subdivisions)) {
        maxmindCity.Subdivisions.forEach((item) => {
            const name = cleanValue(item && item.Name);
            if (name && maxmindCityParts.indexOf(name) === -1) maxmindCityParts.push(name);
        });
    }
    const preferredCity = cleanValue(maxmindCity.Name);
    if (preferredCity && maxmindCityParts.indexOf(preferredCity) === -1) {
        maxmindCityParts.push(preferredCity);
    }

    // 基础信息按整组来源选择，避免把不同数据库的国家、坐标、ASN 拼成一条合成记录。
    const profiles = [
        {
            source: "MaxMind",
            countryCode: cleanValue(maxmindRegion.IsoCode),
            countryName: cleanValue(maxmindRegion.Name),
            registeredCode: cleanValue(maxmindRegistered.IsoCode),
            registeredName: cleanValue(maxmindRegistered.Name),
            cityParts: maxmindCityParts,
            asn: cleanASN(maxmindASN.AutonomousSystemNumber),
            organization: cleanValue(maxmindASN.AutonomousSystemOrganization),
            latitude: numberOrNull(maxmindCity.Latitude),
            longitude: numberOrNull(maxmindCity.Longitude),
            timezone: cleanValue(valueAt(maxmindCity, "Location.TimeZone")),
            route: cleanValue(maxmindASN.Network) || cleanValue(maxmind.Network),
        },
        {
            source: "IPinfo",
            countryCode: cleanValue(ipinfo.country),
            countryName: cleanValue(ipinfo.country_name),
            registeredCode: cleanValue(valueAt(ipinfo, "abuse.country")),
            registeredName: "",
            cityParts: uniqueValues([ipinfo.region, ipinfo.city]),
            asn: cleanASN(valueAt(ipinfo, "asn.asn")),
            organization: cleanValue(valueAt(ipinfo, "asn.name")),
            latitude: numberOrNull(splitCoordinate(ipinfo.loc, 0)),
            longitude: numberOrNull(splitCoordinate(ipinfo.loc, 1)),
            timezone: cleanValue(ipinfo.timezone),
            route: cleanValue(valueAt(ipinfo, "asn.route")),
        },
        {
            source: "ipapi",
            countryCode: cleanValue(location.country_code),
            countryName: cleanValue(location.country),
            registeredCode: "",
            registeredName: "",
            cityParts: uniqueValues([location.state, location.city]),
            asn: cleanASN(asn.asn),
            organization: cleanValue(asn.org),
            latitude: numberOrNull(location.latitude),
            longitude: numberOrNull(location.longitude),
            timezone: cleanValue(location.timezone),
            route: cleanValue(asn.route),
        },
        {
            source: "IPWhois",
            countryCode: cleanValue(ipwhois.country_code),
            countryName: cleanValue(ipwhois.country),
            registeredCode: "",
            registeredName: "",
            cityParts: uniqueValues([ipwhois.region, ipwhois.city]),
            asn: cleanASN(valueAt(ipwhois, "connection.asn")),
            organization: cleanValue(valueAt(ipwhois, "connection.org")),
            latitude: numberOrNull(ipwhois.latitude),
            longitude: numberOrNull(ipwhois.longitude),
            timezone: cleanValue(valueAt(ipwhois, "timezone.id")),
            route: "",
        },
        {
            source: "IPPure",
            countryCode: cleanValue(ippure.countryCode),
            countryName: cleanValue(ippure.country),
            registeredCode: "",
            registeredName: "",
            cityParts: uniqueValues([ippure.city]),
            asn: cleanASN(ippure.asn),
            organization: cleanValue(ippure.asOrganization),
            latitude: numberOrNull(ippure.latitude),
            longitude: numberOrNull(ippure.longitude),
            timezone: cleanValue(ippure.timezone),
            route: "",
        },
        {
            source: "IP2Location",
            countryCode: cleanValue(ip2.country_code),
            countryName: cleanValue(ip2.country_name),
            registeredCode: "",
            registeredName: "",
            cityParts: uniqueValues([ip2.city_name]),
            asn: cleanASN(ip2.asn),
            organization: cleanValue(ip2.as),
            latitude: numberOrNull(ip2.latitude),
            longitude: numberOrNull(ip2.longitude),
            timezone: cleanValue(ip2.time_zone),
            route: "",
        },
        {
            source: "proxycheck",
            countryCode: cleanValue(proxycheck.isocode),
            countryName: cleanValue(proxycheck.country),
            registeredCode: "",
            registeredName: "",
            cityParts: uniqueValues([proxycheck.region, proxycheck.city]),
            asn: cleanASN(proxycheck.asn),
            organization: cleanValue(proxycheck.organisation),
            latitude: numberOrNull(proxycheck.latitude),
            longitude: numberOrNull(proxycheck.longitude),
            timezone: cleanValue(proxycheck.timezone),
            route: cleanValue(proxycheck.range),
        },
    ];
    const profile = profiles.find((item) => item.countryCode || item.countryName)
        || profiles.find((item) => item.asn || item.organization || item.cityParts.length)
        || { source: "", cityParts: [] };
    const loonNetwork = loonNetworkProfile(ip);
    const networkProfile = profiles.find((item) => item.asn)
        || (loonNetwork.asn ? loonNetwork : null)
        || profiles.find((item) => item.organization)
        || (loonNetwork.organization ? loonNetwork : null)
        || profile;
    const networkOrganization = cleanValue(networkProfile.organization)
        || (networkProfile.asn && networkProfile.asn === loonNetwork.asn
            ? cleanValue(loonNetwork.organization)
            : "");
    const sourceParts = [cleanValue(profile.source)];
    if (networkProfile.source && networkProfile.source !== profile.source) {
        sourceParts.push(`网络 ${networkProfile.source}`);
    }
    const code = cleanValue(profile.countryCode);
    const country = cleanValue(profile.countryName);
    const registeredCode = cleanValue(profile.registeredCode);
    const registeredName = cleanValue(profile.registeredName)
        || (registeredCode && code && registeredCode.toUpperCase() === code.toUpperCase()
            ? country
            : "");
    const latitude = numberOrNull(profile.latitude);
    const longitude = numberOrNull(profile.longitude);
    const hasCoordinates = latitude !== null && longitude !== null;
    const nature = code && registeredCode
        ? code.toUpperCase() === registeredCode.toUpperCase()
            ? "使用地与注册地一致"
            : "使用地与注册地不一致"
        : "";

    return {
        ip: maskIPAddress(ip),
        source: sourceParts.filter(Boolean).join(" · "),
        asn: networkProfile.asn ? `AS${networkProfile.asn}` : "",
        organization: networkOrganization,
        coordinates: hasCoordinates
            ? `${toDMS(latitude, true)}, ${toDMS(longitude, false)}`
            : "",
        map: hasCoordinates
            ? buildMapURL(latitude, longitude, null)
            : "",
        city: uniqueValues(profile.cityParts).slice(0, 2).join(" · "),
        actualRegion: code
            ? `${flagEmoji(code)} [${String(code).toUpperCase()}] ${country || ""}`.trim()
            : country,
        countryCode: code ? String(code).toUpperCase() : "",
        registeredRegion: registeredCode
            ? `[${String(registeredCode).toUpperCase()}] ${registeredName || ""}`.trim()
            : "",
        timezone: cleanValue(profile.timezone),
        nature,
        route: cleanValue(networkProfile.route),
    };
}

function buildTypes(data) {
    const ipinfo = data.ipinfo && data.ipinfo.data ? data.ipinfo.data : null;
    const ipregistry = parseIpregistry(data.ipregistry);
    const ipapi = data.ipapi;
    const ip2 = getIp2location(data);
    const abuse = data.abuseipdb && data.abuseipdb.data ? data.abuseipdb.data : null;
    return [
        typeRow("IPinfo", valueAt(ipinfo, "asn.type"), valueAt(ipinfo, "company.type")),
        typeRow("ipregistry", ipregistry && ipregistry.usageType, ipregistry && ipregistry.companyType),
        typeRow("ipapi", valueAt(ipapi, "asn.type"), valueAt(ipapi, "company.type")),
        typeRow("IP2Location", ip2 && ip2.usage_type, valueAt(ip2, "as_info.as_usage_type")),
        typeRow("AbuseIPDB", abuse && abuse.usageType, null),
    ].filter((row) => row.usage || row.company);
}

function buildRisks(data) {
    const ippureScore = numberOrNull(data.ippure && data.ippure.fraudScore);
    const ippureMismatch = !!(data.ippure && data.ippure._egressMismatch);
    const ipapiText = data.ipapi && data.ipapi.company
        ? data.ipapi.company.abuser_score
        : "";
    const ipapiMatch = String(ipapiText || "").match(/([0-9.]+)\s*\(([^)]+)\)/);
    const ipapiRatio = ipapiMatch ? Number(ipapiMatch[1]) : NaN;
    const ipapiLevel = ipapiMatch ? ipapiMatch[2] : "";
    const ip2 = getIp2location(data);
    const ip2Score = numberOrNull(ip2 && ip2.fraud_score);
    const scam = data.scamalytics && data.scamalytics.scamalytics
        ? data.scamalytics.scamalytics
        : null;
    const scamScore = numberOrNull(scam && scam.scamalytics_score);
    const abuseScore = numberOrNull(valueAt(data, "abuseipdb.data.abuseConfidenceScore"));
    const ipqsScore = numberOrNull(data.ipqs && data.ipqs.success !== false
        ? data.ipqs.fraud_score
        : null);
    const ipqsSkipped = ipqsUpstreamUnavailable(data);
    const dbipRisk = parseDbipRisk(data.dbip);

    const ippureRisk = scoreRisk(ippureMismatch ? "IPPure（分流出口）" : "IPPure（补充）", ippureScore, [
            [80, 4, "极高风险"],
            [70, 3, "高风险"],
            [40, 2, "中风险"],
            [0, 0, "低风险"],
        ]);
    if (ippureRisk.available && ippureMismatch) {
        ippureRisk.detail = `${ippureRisk.detail} · ${maskIPAddress(data.ippure.ip)}`;
        ippureRisk.affectsReport = false;
    }

    return [
        ippureRisk,
        ipapiMatch && Number.isFinite(ipapiRatio)
            ? {
                name: "ipapi",
                available: true,
                severity: ipapiSeverity(ipapiLevel),
                label: translateRisk(ipapiLevel),
                detail: `${round(ipapiRatio * 100, 2)}%`,
            }
            : unavailableRisk("ipapi"),
        scoreRisk("IP2Location", ip2Score, [
            [66, 3, "高风险"],
            [33, 2, "中风险"],
            [0, 0, "低风险"],
        ]),
        scoreRisk("Scamalytics", scamScore, [
            [90, 4, "极高风险"],
            [60, 3, "高风险"],
            [20, 2, "中风险"],
            [0, 0, "低风险"],
        ]),
        scoreRisk("AbuseIPDB", abuseScore, [
            [75, 4, "建议封禁"],
            [25, 3, "高风险"],
            [0, 0, "低风险"],
        ]),
        ipqsSkipped ? null : scoreRisk("IPQS", ipqsScore, [
            [90, 4, "高风险"],
            [85, 3, "存在风险"],
            [75, 2, "可疑"],
            [0, 0, "低风险"],
        ]),
        dbipRisk
            ? {
                name: "DB-IP",
                available: true,
                severity: dbipRisk === "high" ? 3 : dbipRisk === "medium" ? 2 : 0,
                label: dbipRisk === "high" ? "高风险" : dbipRisk === "medium" ? "中风险" : "低风险",
                detail: dbipRisk,
            }
            : unavailableRisk("DB-IP"),
    ].filter(Boolean);
}

function buildFactors(data) {
    const ipinfo = data.ipinfo && data.ipinfo.data ? data.ipinfo.data : null;
    const ipregistry = parseIpregistry(data.ipregistry);
    const ipapi = data.ipapi;
    const ip2 = getIp2location(data);
    const dbip = parseDbip(data.dbip);
    const ip2Proxy = ip2 && ip2.proxy ? ip2.proxy : {};
    const ipqs = data.ipqs && data.ipqs.success !== false ? data.ipqs : null;
    const scamRoot = data.scamalytics;
    const scam = scamRoot && scamRoot.scamalytics ? scamRoot.scamalytics : null;
    const ipdata = data.ipdata;

    return [
        factorSource("IP2Location", ip2 ? {
            country: ip2.country_code,
            checks: {
                代理: anyTrue([ip2.is_proxy, ip2Proxy.is_public_proxy, ip2Proxy.is_web_proxy]),
                Tor: ip2Proxy.is_tor,
                VPN: ip2Proxy.is_vpn,
                机房: ip2Proxy.is_data_center,
                滥用: ip2Proxy.is_spammer,
                机器人: anyTrue([ip2Proxy.is_web_crawler, ip2Proxy.is_scanner, ip2Proxy.is_botnet]),
            },
        } : null),
        factorSource("ipapi", ipapi ? {
            country: valueAt(ipapi, "location.country_code"),
            checks: {
                VPN: ipapi.is_vpn,
                代理: ipapi.is_proxy,
                Tor: ipapi.is_tor,
                机房: ipapi.is_datacenter,
                滥用: ipapi.is_abuser,
                爬虫: ipapi.is_crawler,
            },
        } : null),
        factorSource("ipregistry", ipregistry ? {
            country: ipregistry.country,
            checks: {
                VPN: ipregistry.vpn,
                代理: ipregistry.proxy,
                Tor: ipregistry.tor,
                中继: ipregistry.relay,
                机房: ipregistry.server,
                滥用: ipregistry.abuser,
                匿名: ipregistry.anonymous,
                威胁: ipregistry.threat,
            },
        } : null),
        factorSource("IPQS", ipqs ? {
            country: ipqs.country_code,
            checks: {
                代理: ipqs.proxy,
                Tor: ipqs.tor,
                VPN: ipqs.vpn,
                机房: null,
                滥用: ipqs.recent_abuse,
                机器人: ipqs.bot_status,
            },
        } : null),
        factorSource("Scamalytics", scam ? {
            country: valueAt(scamRoot, "external_datasources.maxmind_geolite2.ip_country_code"),
            checks: {
                代理: valueAt(scamRoot, "external_datasources.firehol.is_proxy"),
                Tor: valueAt(scamRoot, "external_datasources.x4bnet.is_tor"),
                VPN: valueAt(scam, "scamalytics_proxy.is_vpn"),
                机房: valueAt(scam, "scamalytics_proxy.is_datacenter"),
                滥用: scam.is_blacklisted_external,
                机器人: anyTrue([
                    valueAt(scamRoot, "external_datasources.x4bnet.is_blacklisted_spambot"),
                    valueAt(scamRoot, "external_datasources.x4bnet.is_bot_operamini"),
                    valueAt(scamRoot, "external_datasources.x4bnet.is_bot_semrush"),
                ]),
            },
        } : null),
        factorSource("ipdata", ipdata ? {
            country: ipdata.country_code,
            checks: {
                代理: valueAt(ipdata, "threat.is_proxy"),
                Tor: valueAt(ipdata, "threat.is_tor"),
                机房: valueAt(ipdata, "threat.is_datacenter"),
                滥用: anyTrue([
                    valueAt(ipdata, "threat.is_threat"),
                    valueAt(ipdata, "threat.is_known_abuser"),
                    valueAt(ipdata, "threat.is_known_attacker"),
                ]),
                匿名: valueAt(ipdata, "threat.is_anonymous"),
            },
        } : null),
        factorSource("IPinfo", ipinfo ? {
            country: ipinfo.country,
            checks: {
                VPN: valueAt(ipinfo, "privacy.vpn"),
                代理: valueAt(ipinfo, "privacy.proxy"),
                Tor: valueAt(ipinfo, "privacy.tor"),
                中继: valueAt(ipinfo, "privacy.relay"),
                机房: valueAt(ipinfo, "privacy.hosting"),
            },
        } : null),
        factorSource("DB-IP", dbip ? {
            country: dbip.country,
            checks: {
                代理: dbip.proxy,
                爬虫: dbip.robot,
                攻击源: dbip.abuser,
            },
        } : null),
    ].filter((source) => source.available);
}

function factorSource(name, values) {
    const source = Object.assign({
        name,
        country: null,
        checks: {},
    }, values || {});
    const booleanCount = Object.keys(source.checks).filter((key) => {
        return booleanOrNull(source.checks[key]) !== null;
    }).length;
    source.available = booleanCount > 0;
    return source;
}

function parseIpregistry(payload) {
    if (!payload || typeof payload !== "object") return null;
    const security = payload.security || {};
    const result = {
        usageType: cleanValue(valueAt(payload, "connection.type")),
        companyType: cleanValue(valueAt(payload, "company.type")),
        country: cleanValue(valueAt(payload, "location.country.code"))
            || cleanValue(valueAt(payload, "location.country_code")),
        proxy: booleanOrNull(security.is_proxy),
        tor: anyTrue([security.is_tor, security.is_tor_exit]),
        vpn: booleanOrNull(security.is_vpn),
        server: booleanOrNull(security.is_cloud_provider),
        abuser: booleanOrNull(security.is_abuser),
        relay: null,
        anonymous: null,
        threat: null,
    };
    const hasData = result.usageType || result.companyType || result.country
        || Object.keys(result).some((key) => typeof result[key] === "boolean");
    return hasData ? result : null;
}

function parseIp2location(html) {
    if (!html) return null;
    const text = String(html);
    const usage = text.match(/Usage\s*Type<\/label>\s*<p[^>]*>\s*\(([A-Z]+(?:\/[A-Z]+)*)\)/i)
        || text.match(/Usage\s*Type<\/label>\s*<p[^>]*>\s*([A-Z]+(?:\/[A-Z]+)*)\b/i);
    const fraud = text.match(/Fraud\s*Score<\/label>\s*<p[^>]*>\s*(\d+(?:\.\d+)?)/i);
    const proxyBlock = text.match(/>Proxy<\/label>\s*<p[^>]*>([\s\S]{0,300}?)<\/p>/i);
    const proxy = proxyBlock ? proxyBlock[1].match(/\b(Yes|No)\b/i) : null;
    const proxyType = text.match(/Proxy\s*Type<\/label>\s*<p[^>]*>\s*([^<]+)/i);
    const threat = text.match(/>Threat<\/label>\s*<p[^>]*>\s*([^<]+)/i);
    const addressType = text.match(/Address\s*Type<\/label>\s*<p[^>]*>\s*([^<]+)/i);
    const country = text.match(/>Country<\/label>[\s\S]{0,400}?<a[^>]*>([^(<]+)\(([A-Z]{2})\)<\/a>/i);
    const city = text.match(/>City<\/label>\s*<p[^>]*>\s*([^<]+)<\/p>/i);
    const asn = text.match(/>ASN<\/label>[\s\S]{0,400}?<a[^>]*>\s*(?:AS)?(\d+)<\/a>/i);
    const asOrg = text.match(/>AS<\/label>[\s\S]{0,400}?<a[^>]*>\s*([^<]+)<\/a>/i);
    const latitude = text.match(/>Latitude<\/label>\s*<p[^>]*>\s*(-?\d+(?:\.\d+)?)/i);
    const longitude = text.match(/>Longitude<\/label>\s*<p[^>]*>\s*(-?\d+(?:\.\d+)?)/i);
    if (!usage && !fraud && !proxy && !country && !asn) return null;
    return {
        usageType: usage ? usage[1].toUpperCase() : null,
        fraudScore: fraud ? Number(fraud[1]) : null,
        proxy: proxy ? proxy[1].toLowerCase() === "yes" : null,
        proxyType: proxyType ? cleanValue(proxyType[1]) : null,
        threat: threat ? cleanValue(threat[1]) : null,
        addressType: addressType ? cleanValue(addressType[1]) : null,
        country: country ? cleanValue(country[1]) : null,
        countryCode: country ? country[2].toUpperCase() : null,
        city: city ? cleanValue(city[1]) : null,
        asn: asn ? asn[1] : null,
        asOrg: asOrg ? cleanValue(asOrg[1]) : null,
        latitude: latitude ? Number(latitude[1]) : null,
        longitude: longitude ? Number(longitude[1]) : null,
    };
}

function parseScamalyticsHtml(html, ip) {
    if (!html || /Attention Required|unable to access|cf-error-details/i.test(String(html))) {
        return null;
    }
    const text = String(html);
    const targetIP = normalizeIPAddress(ip);
    const ipPattern = targetIP
        ? new RegExp(`(^|[^0-9a-f:.])${escapeRegExp(targetIP)}([^0-9a-f:.]|$)`, "i")
        : null;
    if (!ipPattern || !/Scamalytics/i.test(text) || !ipPattern.test(text)) return null;
    const score = text.match(/Fraud\s*Score\s*[:：]?\s*(?:<[^>]+>\s*){0,3}(\d{1,3})(?!\d)/i);
    if (!score) return null;
    const scoreValue = Number(score[1]);
    if (!Number.isFinite(scoreValue) || scoreValue < 0 || scoreValue > 100) return null;
    return {
        ip,
        scamalytics: {
            scamalytics_score: scoreValue,
            scamalytics_proxy: {
                is_vpn: null,
                is_datacenter: null,
            },
            is_blacklisted_external: null,
        },
        _fallback: true,
    };
}

function getIp2location(data) {
    const full = data && data.ip2locationFull;
    if (full && typeof full === "object"
        && (cleanValue(full.ip) || cleanValue(full.usage_type)
            || numberOrNull(full.fraud_score) !== null || full.proxy)) {
        return full;
    }
    const parsed = parseIp2location(data && data.ip2location);
    if (!parsed) return null;
    return {
        country_code: parsed.countryCode,
        country_name: parsed.country,
        city_name: parsed.city,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        asn: parsed.asn,
        as: parsed.asOrg,
        usage_type: parsed.usageType,
        fraud_score: parsed.fraudScore,
        as_info: { as_usage_type: null },
        is_proxy: parsed.proxy,
        proxy: {
            is_public_proxy: null,
            is_web_proxy: null,
            is_tor: null,
            is_vpn: null,
            is_data_center: null,
            is_spammer: null,
            is_web_crawler: null,
            is_scanner: null,
            is_botnet: null,
        },
        _fallback: true,
    };
}

function parseDbip(html) {
    if (!html) return null;
    const start = String(html).search(/<th class=['"]text-center['"]>Crawler/i);
    if (start < 0) return null;
    const block = String(html).slice(start, start + 8000);
    const matches = [];
    const pattern = /<span class="sr-only">\s*(Yes|No)(?:&nbsp;|\s)*<\/span>/gi;
    let match;
    while ((match = pattern.exec(block)) && matches.length < 3) {
        matches.push(match[1].toLowerCase() === "yes");
    }
    const country = String(html).match(/"countryCode"\s*:\s*"([A-Z]{2})"/i)
        || String(html).match(/\/img\/flags\/([A-Z]{2})\.png/i);
    return {
        country: country ? country[1].toUpperCase() : null,
        robot: matches.length > 0 ? matches[0] : null,
        proxy: matches.length > 1 ? matches[1] : null,
        tor: null,
        vpn: null,
        server: null,
        abuser: matches.length > 2 ? matches[2] : null,
    };
}

function parseDbipRisk(html) {
    if (!html) return "";
    const match = String(html).match(/Estimated threat level for this IP address is\s*<span[^>]*>\s*([^<\s]+)/i);
    return match ? String(match[1]).toLowerCase() : "";
}

function scoreRisk(name, score, thresholds) {
    if (score === null) return unavailableRisk(name);
    for (let i = 0; i < thresholds.length; i += 1) {
        if (score >= thresholds[i][0]) {
            return {
                name,
                available: true,
                severity: thresholds[i][1],
                label: thresholds[i][2],
                detail: String(round(score, 2)),
            };
        }
    }
    return unavailableRisk(name);
}

function unavailableRisk(name) {
    return { name, available: false, severity: 0, label: "", detail: "" };
}

function ipqsUpstreamUnavailable(data) {
    return !!(data && data.ipqs && data.ipqs.success === false
        && /insufficient\s+credits?/i.test(data.ipqs.message || ""));
}

function ipapiSeverity(level) {
    const value = String(level || "").toLowerCase();
    if (value === "very high") return 4;
    if (value === "high") return 3;
    if (value === "elevated") return 2;
    return 0;
}

function translateRisk(level) {
    const map = {
        "very low": "极低风险",
        low: "低风险",
        elevated: "较高风险",
        high: "高风险",
        "very high": "极高风险",
    };
    return map[String(level || "").toLowerCase()] || String(level || "未知");
}

function typeRow(name, usage, company) {
    const cleanUsage = cleanValue(usage);
    const cleanCompany = cleanValue(company);
    return {
        name,
        usage: cleanUsage ? formatTypeWithRaw(cleanUsage) : "",
        company: cleanCompany ? formatTypeWithRaw(cleanCompany) : "",
    };
}

function buildAudit(data) {
    const ipqsSkipped = ipqsUpstreamUnavailable(data);
    const ippureMismatch = !!(data.ippure && data.ippure._egressMismatch);
    const attempted = Array.isArray(data._attempted) ? data._attempted : [];
    const wasAttempted = (keys) => keys.some((key) => attempted.indexOf(key) !== -1);
    const definitions = [
        { keys: ["maxmind", "maxmindBackup"], name: "MaxMind", ok: !!((data.maxmind && (data.maxmind.Country || data.maxmind.ASN))
            || (data.maxmindBackup && (data.maxmindBackup.Country || data.maxmindBackup.ASN))) },
        { keys: ["ippure"], name: "IPPure", ok: !!(data.ippure && data.ippure.ip), supplemental: ippureMismatch },
        { keys: ["ipapi"], name: "ipapi", ok: !!(data.ipapi && data.ipapi.ip) },
        { keys: ["ipinfo"], name: "IPinfo", ok: !!(data.ipinfo && data.ipinfo.data) },
        { keys: ["ipwhois"], name: "IPWhois", ok: !!(data.ipwhois && data.ipwhois.success !== false
            && (data.ipwhois.ip || data.ipwhois.country_code || data.ipwhois.connection)) },
        { keys: ["ip2locationFull", "ip2location"], name: "IP2Location", ok: !!getIp2location(data) },
        { keys: ["scamalytics"], name: "Scamalytics", ok: !!(data.scamalytics
            && numberOrNull(valueAt(data.scamalytics, "scamalytics.scamalytics_score")) !== null) },
        { keys: ["abuseipdb"], name: "AbuseIPDB", ok: !!(data.abuseipdb && data.abuseipdb.data
            && (cleanValue(data.abuseipdb.data.usageType)
                || numberOrNull(data.abuseipdb.data.abuseConfidenceScore) !== null)) },
        { keys: ["ipqs"], name: "IPQS", ok: !!(data.ipqs && data.ipqs.success !== false
            && numberOrNull(data.ipqs.fraud_score) !== null), skipped: ipqsSkipped },
        { keys: ["ipdata"], name: "ipdata", ok: !!(data.ipdata && (data.ipdata.ip || data.ipdata.country_code)) },
        { keys: ["proxycheck"], name: "proxycheck", ok: !!proxycheckRecord(data.proxycheck) },
        { keys: ["ipregistry"], name: "ipregistry", ok: !!parseIpregistry(data.ipregistry) },
        { keys: ["dbip"], name: "DB-IP", ok: !!(parseDbipRisk(data.dbip) || parseDbip(data.dbip)) },
    ];
    const included = definitions.filter((item) => wasAttempted(item.keys) && !item.supplemental);
    const checks = included.filter((item) => !item.skipped).map((item) => [item.name, item.ok]);
    return {
        total: checks.length,
        success: checks.filter((item) => item[1]).map((item) => item[0]),
        failed: checks.filter((item) => !item[1]).map((item) => item[0]),
        skipped: included.filter((item) => item.skipped).map((item) => `${item.name}（上游额度不足）`),
        supplemental: ippureMismatch
            ? [`IPPure（分流出口 ${maskIPAddress(data.ippure.ip)}）`]
            : [],
        fragile: [
            attempted.indexOf("ipinfo") !== -1 ? "IPinfo demo" : "",
            attempted.some((key) => key === "ip2location" || key === "ip2locationFull")
                ? "IP2Location 聚合/页面" : "",
            attempted.indexOf("scamalytics") !== -1 ? "Scamalytics 聚合/页面回退" : "",
            attempted.indexOf("dbip") !== -1 ? "DB-IP 页面解析" : "",
            attempted.indexOf("ipregistry") !== -1 ? "ipregistry 演示端点" : "",
        ].filter(Boolean),
    };
}

function buildRegionConsistency(basic, media) {
    const reference = cleanValue(basic && basic.countryCode).toUpperCase();
    const services = (Array.isArray(media) ? media : []).map((item) => {
        const region = cleanValue(item && item.region).toUpperCase();
        if (!/^[A-Z]{2}$/.test(region)) return null;
        return {
            name: cleanValue(item.name),
            region,
            matches: reference ? region === reference : null,
        };
    }).filter(Boolean);
    return {
        reference,
        services,
        matched: services.filter((item) => item.matches === true).length,
        different: services.filter((item) => item.matches === false),
    };
}

function buildEgressGroups(observations, primaryIP) {
    const groups = {};
    (Array.isArray(observations) ? observations : []).forEach((item) => {
        const ip = normalizeIPAddress(item && item.ip);
        if (!isIPv4(ip)) return;
        if (!groups[ip]) {
            const network = loonNetworkProfile(ip);
            groups[ip] = {
                ip,
                primary: ip === normalizeIPAddress(primaryIP),
                sources: [],
                asn: network.asn,
                organization: network.organization,
                country: network.country,
            };
        }
        const source = egressSourceName(item && item.source);
        if (source && groups[ip].sources.indexOf(source) === -1) {
            groups[ip].sources.push(source);
        }
    });
    return Object.keys(groups).map((ip) => groups[ip]).sort((left, right) => {
        if (left.primary !== right.primary) return left.primary ? -1 : 1;
        return right.sources.length - left.sources.length;
    });
}

function egressSourceName(source) {
    const names = {
        "ipinfo.check.place": "Check.Place",
        "myip.check.place": "MyIP.Check.Place",
        ipify: "ipify",
        "ident.me": "ident.me",
        icanhazip: "icanhazip",
        IPPure: "IPPure",
        ipapi: "ipapi",
    };
    return names[source] || cleanValue(source);
}

function reportStyle() {
    return '<style>'
        + '.report-root{font-family:-apple-system,BlinkMacSystemFont;font-size:14px;line-height:1.5;text-align:left;word-break:break-word;padding:18px 0 92px}'
        + '.report-title{font-size:20px;font-weight:700;line-height:1.25;margin-bottom:16px}'
        + '.node-label{color:#8e8e93;font-size:11px;margin-bottom:10px}'
        + '.summary-card{margin-bottom:14px;contain:layout paint style}'
        + '.summary-ip{font-size:24px;font-weight:800;line-height:1.15;letter-spacing:.2px}'
        + '.summary-nature{margin-top:5px;color:#0A84FF;font-size:12px;font-weight:600}'
        + '.summary-region{margin-top:7px;font-size:14px;font-weight:600;line-height:1.35}'
        + '.summary-city{margin-top:2px;color:#8e8e93;font-size:12px;line-height:1.4}'
        + '.summary-asn{margin-top:5px;color:#8e8e93;font-size:11px;line-height:1.35}'
        + '.report-section{display:block;margin:8px 0;border-top:1px solid rgba(142,142,147,.2);content-visibility:auto;contain-intrinsic-size:auto 180px}'
        + '.section-summary{display:flex;align-items:center;justify-content:space-between;min-height:42px;color:#0A84FF;font-weight:700;font-size:15px;line-height:1.3;list-style:none;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'
        + '.section-summary::-webkit-details-marker{display:none}'
        + '.section-summary::after{content:"›";color:#8e8e93;font-size:19px;font-weight:400;margin-left:10px}'
        + '.section-static::after{display:none}'
        + 'details[open]>.section-summary::after{content:"⌄"}'
        + '.section-body{padding:2px 0 7px;contain:layout paint style}'
        + '.info-line{margin-bottom:8px;line-height:1.4}'
        + '.info-label{color:#8e8e93;font-size:12px;margin-right:8px}'
        + '.info-value{font-weight:600}'
        + '.muted-line{color:#8e8e93;font-size:11px;margin:5px 0;line-height:1.45}'
        + '.report-note{color:#8e8e93;font-size:10px;line-height:1.45;margin-top:14px;content-visibility:auto}'
        + '</style>';
}

function summaryCard(basic) {
    const asn = [basic.asn, basic.organization].filter(Boolean).join(" · ");
    return '<div class="summary-card">'
        + `<div class="summary-ip">${escapeHtml(basic.ip)}</div>`
        + (basic.nature
            ? `<div class="summary-nature">${escapeHtml(basic.nature)}</div>`
            : "")
        + (basic.actualRegion
            ? `<div class="summary-region">${escapeHtml(basic.actualRegion)}</div>`
            : "")
        + (basic.city
            ? `<div class="summary-city">${escapeHtml(basic.city)}</div>`
            : "")
        + (asn ? `<div class="summary-asn">${escapeHtml(asn)}</div>` : "")
        + "</div>";
}

function renderBasic(basic) {
    const rows = [
        ["来源", basic.source],
        ["网段", basic.route],
        ["时区", basic.timezone],
        ["注册地", basic.registeredRegion],
        ["坐标", basic.coordinates],
    ].filter((row) => row[1]);
    return rows.map((row) => infoLine(row[0], row[1])).join("");
}

function renderEgressMatrix(groups, basic) {
    const rows = Array.isArray(groups) ? groups : [];
    if (!rows.length) return mutedLine("本次没有可显示的 IPv4 出口观测");
    const probeCount = rows.reduce((total, item) => total + item.sources.length, 0);
    const summary = rows.length > 1
        ? `<span style="color:#ff9500;font-weight:700">检测到 ${rows.length} 个出口</span>`
        : '<span style="color:#00a67d;font-weight:700">探针出口一致</span>';
    const header = `<div style="margin-bottom:10px">${summary}`
        + `<span style="color:#8e8e93;font-size:11px"> · ${probeCount} 个探针</span></div>`;
    const content = rows.map((item, index) => {
        const isPrimary = item.primary;
        const asn = item.asn || (isPrimary && basic ? basic.asn : "");
        const organization = item.organization || (isPrimary && basic ? basic.organization : "");
        const identity = uniqueValues([asn, organization, item.country]).join(" · ");
        const label = isPrimary ? "主出口" : `分流出口 ${index}`;
        return '<div style="margin-bottom:11px">'
            + `<div><span style="color:${isPrimary ? "#0A84FF" : "#ff9500"};font-size:11px;font-weight:700">${label}</span>`
            + `&nbsp;&nbsp;<b>${escapeHtml(maskIPAddress(item.ip))}</b></div>`
            + (identity
                ? `<div style="margin-top:2px;color:#8e8e93;font-size:11px">${escapeHtml(identity)}</div>`
                : "")
            + `<div style="margin-top:3px;font-size:11px">${escapeHtml(item.sources.join("、"))}</div>`
            + "</div>";
    }).join("");
    return header + content;
}

function renderBGP(bgp) {
    if (!bgp || bgp.error) return mutedLine(bgp && bgp.error || "本次没有 BGP 网络信息");
    const origins = bgp.asns && bgp.asns.length
        ? bgp.asns.map((asn) => `AS${asn}`).join("、")
        : "";
    const rpki = (bgp.rpki || []).map((item) => {
        return `${item.asn ? `AS${item.asn} ` : ""}${rpkiStatusText(item.status)}`.trim();
    }).join("、");
    const rows = [
        ["前缀", bgp.prefix],
        ["Origin", origins],
        ["Origin 状态", bgp.asns && bgp.asns.length > 1
            ? `检测到 ${bgp.asns.length} 个 Origin，可能是 MOAS 或路由切换`
            : ""],
        ["持有者", uniqueValues(bgp.holders || []).join("、")],
        ["注册机构", [bgp.rir, bgp.registryDescription].filter(Boolean).join(" · ")],
        ["路由状态", bgp.announced ? "已公告" : "未确认公告"],
        ["RPKI", rpki],
        ["PTR", bgp.ptr],
        ["数据时间", bgp.queryTime],
    ].filter((row) => row[1]);
    const missing = bgp.errors && bgp.errors.length
        ? mutedLine(`本次未返回 · ${uniqueValues(bgp.errors).join("、")}`)
        : "";
    return rows.map((row) => infoLine(row[0], row[1])).join("")
        + mutedLine("来源 · RIPE NCC RIPEstat；公开路由身份不等于本次实际回程路径")
        + missing;
}

function renderBGPPath(analysis) {
    if (!analysis || !analysis.pathCount) {
        return mutedLine("RIPE RIS 本次没有返回可分析的 AS Path");
    }
    const visibility = analysis.peersSeeing !== null && analysis.totalPeers !== null
        ? `${analysis.peersSeeing} / ${analysis.totalPeers} 个 RIS 全表邻居`
        : "未返回";
    const clues = analysis.clues && analysis.clues.length
        ? analysis.clues.map((item) => `${item.name}（AS${item.asn}，${item.count} 条）`).join("、")
        : "样本未包含所列中国网络 ASN";
    const paths = (analysis.uniquePaths || []).map((item, index) => {
        return '<div style="margin:7px 0">'
            + `<div style="color:#8e8e93;font-size:10px">样本 ${index + 1}${item.collector ? ` · ${escapeHtml(item.collector)}` : ""}</div>`
            + `<div style="font-size:11px;line-height:1.5">${escapeHtml(item.path.map((asn) => `AS${asn}`).join(" → "))}</div>`
            + "</div>";
    }).join("");
    return infoLine("RIS 可见性", visibility)
        + infoLine("路径样本", `${analysis.pathCount} 条 · ${analysis.collectorCount} 个采集器`)
        + (analysis.originChanged
            ? infoLine("历史 Origin 变化", `AS${analysis.firstOrigin} → AS${analysis.lastOrigin}`)
            : "")
        + infoLine("样本包含 ASN", clues)
        + paths
        + mutedLine("方向为 RIPE RIS 采集器/对等体看到目标前缀的控制面路径，不是节点发出的数据路径。样本包含 AS4809/AS9929 也不证明机场节点回程经过或线路品质。 ");
}

function renderChinaHttp(results) {
    const rows = Array.isArray(results) ? results : [];
    if (!rows.length) return mutedLine("本次没有运营商地区门户 HTTPS 结果");
    const success = rows.filter((item) => item.ok).length;
    const header = infoLine("连通", `${success} / ${rows.length} 个地区门户返回 HTTP 响应`);
    const regions = ["北京", "上海", "广东"].map((region) => {
        const items = rows.filter((item) => item.region === region);
        const detail = items.map((item) => {
            const status = item.ok ? `${item.ms} ms · HTTP ${item.status}` : `失败 · ${truncateText(item.error, 24)}`;
            const color = item.ok ? latencyColor(item.ms) : "#ff3b30";
            return `<div style="margin-top:3px"><span style="display:inline-block;width:34px;color:#8e8e93">${escapeHtml(item.carrier)}</span>`
                + `<span style="color:${color};font-weight:600">${escapeHtml(status)}</span>`
                + `<div style="margin-left:34px;color:#8e8e93;font-size:10px">${escapeHtml(item.host)}</div></div>`;
        }).join("");
        return `<div style="margin:9px 0"><div style="font-size:12px;font-weight:700">${escapeHtml(region)}</div>${detail}</div>`;
    }).join("");
    return header + regions
        + mutedLine("实验目标是运营商品牌地区门户，可能使用 CDN、重定向或反爬，不保证服务器位于标称地区。结果仅表示手机 → 所选节点 → 该域名的 HTTPS 可达性和总耗时；单站失败不代表运营商线路失败。 ");
}

function renderInboundRoutes(result) {
    if (!result || result.error) return mutedLine(result && result.error || "本次没有入站路径结果");
    const rows = Array.isArray(result.routes) ? result.routes : [];
    const content = rows.map((route) => {
        const identity = uniqueValues([
            route.carrier,
            route.asn ? `AS${route.asn}` : "",
            route.location,
        ]).join(" · ");
        const status = route.reached
            ? `到达目标 · ${route.hopCount} 跳${route.lastRtt !== null ? ` · ${route.lastRtt} ms` : ""}`
            : `未确认到达 · ${route.status || "未完成"} · ${route.hopCount} 跳`;
        const clues = route.routeClues && route.routeClues.length
            ? `<div style="margin-top:2px;color:#ff9500;font-size:10px">跳点 ASN 样本 · ${escapeHtml(route.routeClues.join("、"))}</div>`
            : "";
        return '<div style="margin:9px 0">'
            + `<div style="font-size:12px;font-weight:700">${escapeHtml(identity)}</div>`
            + `<div style="margin-top:2px;font-size:11px;color:${route.reached ? "#00a67d" : "#8e8e93"}">${escapeHtml(status)}</div>`
            + clues + "</div>";
    }).join("");
    const missing = result.missing && result.missing.length
        ? mutedLine(`当前无可用探针 · ${result.missing.join("、")}`) : "";
    return content + missing
        + mutedLine(`Globalping 测量 ${result.id || "--"}；探针筛选为 AS4134+China、AS4837+China、AS9808+China。方向是外部探针 → 出口 IP，仅表示入站路径；出口 IP 不响应 ICMP 时可能无法到达。`);
}

function renderProbePing(result) {
    if (!result || result.error) return mutedLine(result && result.error || "本次没有外部探针 Ping 结果");
    const rows = Array.isArray(result.rows) ? result.rows : [];
    const content = rows.map((row) => {
        const name = uniqueValues([row.carrier, row.asn ? `AS${row.asn}` : "", row.location]).join(" · ");
        const stats = row.avg !== null
            ? `${row.avg} ms · 丢包 ${row.loss !== null ? `${row.loss}%` : "--"}`
                + `${row.jitter !== null ? ` · 抖动 ${row.jitter} ms` : ""}`
            : `${row.status || "未完成"} · 未返回 RTT`;
        return infoLine(name || "外部探针", stats);
    }).join("");
    const missing = result.missing && result.missing.length
        ? mutedLine(`当前无可用探针 · ${result.missing.join("、")}`) : "";
    return (content || mutedLine("本次没有探针返回 Ping 统计")) + missing
        + mutedLine(`Globalping 测量 ${result.id || "--"}；数据是指定 ASN 中国探针与出口 IP 之间的 ICMP 往返 RTT、丢包和抖动，无法拆分去程与回程。`);
}

function renderProbeMTR(result) {
    if (!result || result.error) return mutedLine(result && result.error || "本次没有外部探针 MTR 结果");
    const rows = Array.isArray(result.rows) ? result.rows : [];
    const content = rows.map((row) => {
        const name = uniqueValues([row.carrier, row.asn ? `AS${row.asn}` : "", row.location]).join(" · ");
        const state = row.reached ? "到达出口 IP" : row.status === "failed" ? "测量失败" : "未确认到达";
        const stats = `${state} · ${row.hopCount} 跳`
            + `${row.avg !== null ? ` · 末跳 ${row.avg} ms` : ""}`
            + `${row.loss !== null ? ` · 表观丢包 ${row.loss}%` : ""}`
            + `${row.jitter !== null ? ` · 抖动 ${row.jitter} ms` : ""}`;
        return infoLine(name || "外部探针", stats);
    }).join("");
    const missing = result.missing && result.missing.length
        ? mutedLine(`当前无可用探针 · ${result.missing.join("、")}`) : "";
    return (content || mutedLine("本次没有探针返回 MTR 统计")) + missing
        + mutedLine(`Globalping 测量 ${result.id || "--"}；方向为外部探针 → 出口 IP。中间路由器可能限速或不回 ICMP，单跳表观丢包不能直接视为真实业务丢包。`);
}

function renderStability(rows) {
    const results = Array.isArray(rows) ? rows : [];
    if (!results.length) return mutedLine("本次没有 HTTPS 稳定性结果");
    const content = results.map((row) => {
        const stats = `${row.success}/${row.total} 成功`
            + `${row.median !== null ? ` · 中位 ${row.median} ms` : ""}`
            + `${row.p95 !== null ? ` · P95 ${row.p95} ms` : ""}`
            + `${row.jitter !== null ? ` · 波动 ${row.jitter} ms` : ""}`;
        return infoLine(`${row.name} · ${row.host}`, stats);
    }).join("");
    return content + mutedLine("每个 HTTPS 小响应目标经所选节点请求 3 次；结果表示手机 → 节点 → 目标站的端到端体验，包含 DNS、TCP/TLS、代理与服务端耗时，不是节点自身 RTT。 ");
}

function latencyColor(ms) {
    if (ms < 300) return "#00a67d";
    if (ms < 900) return "#ff9500";
    return "#ff3b30";
}

function rpkiStatusText(status) {
    const values = {
        valid: "有效",
        invalid_asn: "无效 · ASN 不匹配",
        invalid_length: "无效 · 前缀长度",
        unknown: "未找到 ROA",
    };
    return values[String(status || "").trim().toLowerCase()] || "未确认";
}

function renderRegionConsistency(result) {
    const data = result || { reference: "", services: [], matched: 0, different: [] };
    if (!data.services.length) return mutedLine("本次没有服务返回可确认的地区");
    const reference = data.reference
        ? `${flagEmoji(data.reference)} [${data.reference}]`
        : "未确认";
    const comparable = data.reference ? data.services.length : 0;
    const summary = comparable
        ? data.different.length
            ? `<span style="color:#ff9500;font-weight:700">一致 ${data.matched}/${comparable}</span>`
            : `<span style="color:#00a67d;font-weight:700">地区全部一致 · ${data.matched}/${comparable}</span>`
        : '<span style="color:#8e8e93;font-weight:700">缺少出口地区参照</span>';
    const rows = data.services.map((item) => {
        const state = item.matches === false
            ? '<span style="color:#ff9500">地区不同</span>'
            : item.matches === true
                ? '<span style="color:#00a67d">一致</span>'
                : '<span style="color:#8e8e93">仅展示</span>';
        return '<div style="margin-bottom:8px">'
            + `<span style="font-weight:700">${escapeHtml(item.name)}</span>&nbsp;&nbsp;`
            + `${flagEmoji(item.region)} <span style="font-weight:600">[${escapeHtml(item.region)}]</span>&nbsp;&nbsp;${state}`
            + "</div>";
    }).join("");
    return infoLine("出口地区", reference)
        + `<div style="margin:2px 0 10px">${summary}</div>`
        + rows;
}

function postMapNotification(basic, displayNodeName) {
    if (!mapNotificationEnabled || !basic || !basic.map) return;
    $notification.post(
        "节点 IP 地图",
        displayNodeName || basic.ip || "",
        basic.coordinates || "点击查看出口 IP 坐标",
        { openUrl: basic.map }
    );
}

function renderRiskList(rows) {
    const available = rows.filter((row) => row.available);
    const unavailable = rows.filter((row) => !row.available).map((row) => row.name);
    const body = available.map((row) => {
        const color = row.severity === null ? "#0A84FF" : riskColor(row.severity);
        return '<div style="margin-bottom:9px">'
            + `<span style="color:${color};font-size:11px">●</span>&nbsp;`
            + `<span style="font-weight:700">${escapeHtml(row.name)}</span>&nbsp;&nbsp;`
            + `<span style="color:${color};font-weight:600">${escapeHtml([row.detail, row.label].filter(Boolean).join(" · "))}</span>`
            + "</div>";
    }).join("");
    const missing = unavailable.length
        ? mutedLine(`本次未返回：${unavailable.join("、")}`)
        : "";
    return (body || mutedLine("本次没有可验证的风险评分")) + missing;
}

function renderTypeList(rows) {
    if (!rows.length) return mutedLine("本次没有可验证的网络类型");
    return rows.map((row) => {
        const details = [];
        if (row.usage) details.push(`<span style="color:#8e8e93">使用</span>&nbsp;${escapeHtml(row.usage)}`);
        if (row.company) details.push(`<span style="color:#8e8e93">公司</span>&nbsp;${escapeHtml(row.company)}`);
        return '<div style="margin-bottom:11px">'
            + `<div style="font-weight:700">${escapeHtml(row.name)}</div>`
            + `<div style="margin-top:2px;font-size:12px;line-height:1.5">${details.join('<br/>')}</div>`
            + "</div>";
    }).join("");
}

function renderFactorCards(sources) {
    if (!sources.length) return mutedLine("本次没有可验证的风险标记");
    return sources.map((source) => {
        const hit = [];
        const clear = [];
        Object.keys(source.checks).forEach((key) => {
            const value = booleanOrNull(source.checks[key]);
            if (value === true) hit.push(key);
            if (value === false) clear.push(key);
        });
        const region = cleanValue(source.country);
        const lines = [];
        if (hit.length) {
            lines.push(`<span style="color:#ff453a;font-weight:600">命中 ${escapeHtml(hit.join("、"))}</span>`);
        }
        if (clear.length) {
            lines.push(`<span style="color:#30d158">未命中 ${escapeHtml(clear.join("、"))}</span>`);
        }
        const title = region && region.length === 2
            ? `${source.name} · ${flagEmoji(region)} [${region.toUpperCase()}]`
            : source.name;
        return '<div style="margin-bottom:11px">'
            + `<div style="font-weight:700">${escapeHtml(title)}</div>`
            + `<div style="margin-top:2px;font-size:12px;line-height:1.5">${lines.join('<br/>')}</div>`
            + "</div>";
    }).join("");
}

function renderMediaList(rows) {
    const confirmed = rows.filter((row) => row.status !== "unknown");
    const unknown = rows.filter((row) => row.status === "unknown");
    const body = confirmed.map((row) => {
        const status = mediaStatus(row.status);
        const icon = row.status === "yes" ? "✅" : row.status === "partial" ? "🟠" : "❌";
        const summary = `${status.text}${row.region ? ` · [${row.region}]` : ""}`;
        const detail = row.detail
            ? `<div style="font-size:11px;color:#8e8e93;margin-top:1px">${escapeHtml(row.detail)}</div>`
            : "";
        return '<div style="margin-bottom:10px">'
            + `<span>${icon}</span>&nbsp;<span style="font-weight:700">${escapeHtml(row.name)}</span>&nbsp;&nbsp;`
            + `<span style="color:${status.color};font-weight:600">${escapeHtml(summary)}</span>${detail}`
            + "</div>";
    }).join("");
    const unknownLine = unknown.length
        ? mutedLine(`⚪ 未确认：${unknown.map((row) => row.name).join("、")}`)
        : "";
    return (body || mutedLine("本次没有确认任何服务状态")) + unknownLine;
}

function renderAudit(audit, probe, stats) {
    const sourceStatus = `来源 ${audit.success.length}/${audit.total}`;
    const probeStatus = probe && probe.total
        ? `出口 ${probe.matched}/${probe.total}${probe.unique > 1 ? " · 存在分流差异" : " · 一致"}`
        : "";
    const summary = [sourceStatus, probeStatus].filter(Boolean).join("　");
    const missing = audit.failed.length
        ? mutedLine(`未返回 · ${audit.failed.join("、")}`)
        : mutedLine("全部数据来源已返回");
    const skipped = audit.skipped && audit.skipped.length
        ? mutedLine(`已跳过 · ${audit.skipped.join("、")}`)
        : "";
    const supplemental = audit.supplemental && audit.supplemental.length
        ? mutedLine(`补充来源 · ${audit.supplemental.join("、")}`)
        : "";
    const fragile = audit.fragile && audit.fragile.length
        ? mutedLine(`实验/易变来源 · ${audit.fragile.join("、")}`)
        : "";
    return infoLine("状态", summary)
        + renderRuntimeStats(stats)
        + missing + skipped + supplemental + fragile;
}

function renderRuntimeStats(stats) {
    const requests = stats && Array.isArray(stats.requests) ? stats.requests : [];
    const totalMs = Math.max(0, Date.now() - (stats && stats.startedAt || Date.now()));
    const success = requests.filter((item) => item.ok).length;
    const slowestByHost = {};
    requests.forEach((item) => {
        if (!slowestByHost[item.host] || item.ms > slowestByHost[item.host].ms) {
            slowestByHost[item.host] = item;
        }
    });
    const slowest = Object.keys(slowestByHost).map((key) => slowestByHost[key])
        .sort((left, right) => right.ms - left.ms).slice(0, 3);
    const lines = [
        infoLine("耗时", formatDuration(totalMs)),
        infoLine("请求", `${success}/${requests.length} 成功`),
        infoLine("版本", SCRIPT_VERSION),
    ];
    if (totalMs >= RUN_DEADLINE_MS - 500) {
        lines.push(mutedLine("已接近 45 秒总时限；未完成来源按部分结果或未返回处理"));
    }
    if (slowest.length) {
        lines.push(mutedLine(`最慢 · ${slowest.map((item) => `${item.host} ${formatDuration(item.ms)}`).join("、")}`));
    }
    return lines.join("");
}

function mediaStatus(status) {
    if (status === "yes") return { text: "端点可达/地区支持", color: "#00a67d" };
    if (status === "partial") return { text: "受限或部分确认", color: "#ff9500" };
    if (status === "no") return { text: "明确地区受限", color: "#ff3b30" };
    return { text: "未确认", color: "#8e8e93" };
}

function riskColor(severity) {
    if (severity >= 4) return "#8e0000";
    if (severity >= 3) return "#ff3b30";
    if (severity >= 2) return "#ff9500";
    return "#00a67d";
}

function reportColor(rows) {
    const severities = rows.filter((row) => {
        return row.available && row.severity !== null && row.affectsReport !== false;
    })
        .map((row) => row.severity);
    if (!severities.length) return "#8e8e93";
    const highest = Math.max.apply(null, severities);
    return highest >= 3 ? "#ff453a" : highest >= 2 ? "#ff9f0a" : "#30d158";
}

function mediaResult(name, status, region, detail) {
    return { name, status, region: region || "", detail: detail || "" };
}

function section(title, content) {
    const heading = `<div class="section-summary section-static">▌${escapeHtml(title)}</div>`;
    if (!foldSections) {
        return `<section class="report-section">${heading}<div class="section-body">${content}</div></section>`;
    }
    return `<details class="report-section" name="ipquality-report"><summary class="section-summary">▌${escapeHtml(title)}</summary>`
        + `<div class="section-body">${content}</div></details>`;
}

function infoLine(label, value) {
    return '<div class="info-line">'
        + `<span class="info-label">${escapeHtml(label)}</span>`
        + `<span class="info-value">${escapeHtml(value)}</span>`
        + "</div>";
}

function mutedLine(value) {
    return `<div class="muted-line">${escapeHtml(value)}</div>`;
}

function browserHeaders() {
    return {
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": USER_AGENT,
    };
}

function backendHeaders() {
    return {
        Accept: "application/json",
        "User-Agent": "curl/8.7.1",
    };
}

function requestJson(url, options) {
    const config = options || {};
    return request(config.method || "GET", url, config).then((response) => {
        try {
            return JSON.parse(response.body);
        } catch (_) {
            throw new Error("JSON 响应解析失败");
        }
    });
}

function requestText(url, options) {
    const config = options || {};
    return request(config.method || "GET", url, config).then((response) => response.body);
}

function request(method, url, options) {
    const config = options || {};
    return new Promise((resolve, reject) => {
        const remaining = deadlineRemaining();
        if (remaining <= 250) {
            reject(new Error("已达到本次检测总时限"));
            return;
        }
        const startedAt = Date.now();
        const backendRequest = String(url).indexOf(IPQUALITY_BACKEND) === 0;
        const requestOptions = {
            url,
            node: cleanValue(config.node) || nodeName,
            headers: config.headers || (backendRequest ? backendHeaders() : browserHeaders()),
        };
        if (backendRequest) requestOptions.alpn = "h2";
        const configuredTimeout = numberOrNull(config.timeout) !== null
            ? Number(config.timeout) : DEFAULT_REQUEST_TIMEOUT;
        requestOptions.timeout = Math.max(250, Math.min(configuredTimeout, remaining));
        if (typeof config.body !== "undefined") requestOptions.body = config.body;
        const callback = (error, response, body) => {
            const status = Number(response && (response.status || response.statusCode));
            recordRuntimeRequest(url, startedAt, error, status, config.allowHttpErrors);
            if (error) {
                reject(new Error(String(error)));
                return;
            }
            if (!config.allowHttpErrors && (!Number.isFinite(status) || status < 200 || status >= 300)) {
                reject(new Error(`HTTP ${status || "?"}`));
                return;
            }
            resolve({ status, body: String(body || ""), response: response || {} });
        };
        if (String(method).toUpperCase() === "POST") {
            $httpClient.post(requestOptions, callback);
        } else {
            $httpClient.get(requestOptions, callback);
        }
    });
}

function recordRuntimeRequest(url, startedAt, error, status, allowHttpErrors) {
    const validStatus = Number.isFinite(status);
    runtimeStats.requests.push({
        host: requestHost(url),
        ms: Math.max(0, Date.now() - startedAt),
        status: validStatus ? status : 0,
        ok: !error && validStatus && (allowHttpErrors || (status >= 200 && status < 300)),
    });
}

function requestHost(url) {
    const match = String(url || "").match(/^https?:\/\/([^/?#]+)/i);
    return match ? match[1] : "未知来源";
}

function formatDuration(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value < 0) return "--";
    if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} 秒`;
    return `${Math.round(value)} ms`;
}

function capture(promise) {
    return Promise.resolve(promise).then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error: errorMessage(error) })
    );
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function deadlineRemaining() {
    return Math.max(0, RUN_DEADLINE_MS - (Date.now() - runtimeStats.startedAt));
}

function readSwitch(key, defaultValue) {
    let value;
    if (pluginArguments && Object.prototype.hasOwnProperty.call(pluginArguments, key)) {
        value = pluginArguments[key];
    }
    if (value === null || typeof value === "undefined" || value === "") {
        value = $persistentStore.read(key);
    }
    if (value === null || typeof value === "undefined" || value === "") return defaultValue;
    return !(value === false || value === 0 || value === "false" || value === "0");
}

function parsePluginArguments(raw) {
    if (raw === null || typeof raw === "undefined" || raw === "") return null;
    let value = raw;
    if (typeof value === "string") {
        const text = value.trim();
        if (!text) return null;
        try {
            value = JSON.parse(text);
        } catch (_) {
            if (text.indexOf("=") !== -1) {
                const named = {};
                text.split(/[,&;]/).forEach((part) => {
                    const index = part.indexOf("=");
                    if (index <= 0) return;
                    named[part.slice(0, index).trim()] = part.slice(index + 1).trim();
                });
                value = named;
            } else {
                value = text.replace(/^\[|\]$/g, "").split(",").map((item) => {
                    return item.trim().replace(/^['"]|['"]$/g, "");
                });
            }
        }
    }
    if (Array.isArray(value)) return positionalPluginArguments(value);
    if (!value || typeof value !== "object") return null;

    const rawKeys = Object.keys(value);
    const numericKeys = rawKeys.filter((key) => /^\d+$/.test(key))
        .sort((left, right) => Number(left) - Number(right));
    if (numericKeys.length === rawKeys.length && numericKeys.length) {
        return positionalPluginArguments(numericKeys.map((key) => value[key]));
    }

    const result = {};
    ARGUMENT_KEYS.forEach((key) => {
        const alias = ARGUMENT_ALIASES[key];
        const matched = rawKeys.find((rawKey) => {
            return rawKey.toLowerCase() === key.toLowerCase()
                || (alias && rawKey.toLowerCase() === alias);
        });
        if (matched) result[key] = value[matched];
    });
    return Object.keys(result).length ? result : null;
}

function positionalPluginArguments(values) {
    const keys = values.length === ARGUMENT_KEYS_R13.length
        ? ARGUMENT_KEYS_R13
        : values.length === ARGUMENT_KEYS_R14.length
            ? ARGUMENT_KEYS_R14
            : values.length === ARGUMENT_KEYS_R17.length
                ? ARGUMENT_KEYS_R17
                : ARGUMENT_KEYS;
    const result = {};
    keys.forEach((key, index) => {
        if (index < values.length) result[key] = values[index];
    });
    return result;
}

function isIPAddress(value) {
    if (!value) return false;
    const text = String(value).trim();
    return isIPv4(text) || (/^[0-9a-f:]+$/i.test(text) && text.indexOf(":") >= 0);
}

function isIPv4(value) {
    const parts = String(value || "").trim().split(".");
    return parts.length === 4 && parts.every((part) => {
        return /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255;
    });
}

function normalizeIPAddress(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!isIPAddress(text)) return "";
    if (isIPv4(text)) return text;
    try {
        return new URL(`http://[${text}]/`).hostname.replace(/^\[|\]$/g, "").toLowerCase();
    } catch (_) {
        return text;
    }
}

function loonNetworkProfile(ip) {
    const result = {
        source: "Loon",
        asn: "",
        organization: "",
        route: "",
        country: "",
    };
    if (typeof $utils === "undefined") return result;
    try {
        if (typeof $utils.ipasn === "function") result.asn = cleanASN($utils.ipasn(ip));
    } catch (error) {
        console.log(`[WARN] Loon ASN 查询失败: ${errorMessage(error)}`);
    }
    try {
        if (typeof $utils.ipaso === "function") {
            result.organization = cleanValue($utils.ipaso(ip));
        }
    } catch (error) {
        console.log(`[WARN] Loon ASO 查询失败: ${errorMessage(error)}`);
    }
    try {
        if (typeof $utils.geoip === "function") {
            const country = cleanValue($utils.geoip(ip)).toUpperCase();
            result.country = country ? `${flagEmoji(country)} ${country}` : "";
        }
    } catch (error) {
        console.log(`[WARN] Loon GeoIP 查询失败: ${errorMessage(error)}`);
    }
    return result;
}

function cloudflareTraceIP(value) {
    const match = String(value || "").match(/(?:^|\n)ip=([^\r\n]+)/);
    return match ? match[1].trim() : "";
}

function maskIPAddress(ip) {
    if (!maskIP || !ip) return ip;
    const text = String(ip);
    const parts = text.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
    const v6 = text.split(":");
    return v6.length > 3 ? `${v6.slice(0, 4).join(":")}:*` : text;
}

function valueAt(object, path) {
    if (!object) return null;
    const keys = String(path).split(".");
    let value = object;
    for (let i = 0; i < keys.length; i += 1) {
        if (value === null || typeof value === "undefined") return null;
        value = value[keys[i]];
    }
    return value;
}

function proxycheckRecord(payload) {
    if (!payload || String(payload.status || "").toLowerCase() !== "ok") return null;
    const key = Object.keys(payload).find((name) => {
        return name !== "status" && name !== "query time" && name !== "message"
            && payload[name] && typeof payload[name] === "object";
    });
    return key ? payload[key] : null;
}

function uniqueValues(values) {
    const result = [];
    (values || []).forEach((value) => {
        const clean = cleanValue(value);
        if (clean && result.indexOf(clean) < 0) result.push(clean);
    });
    return result;
}

function uniqueConsecutive(values) {
    return (Array.isArray(values) ? values : []).filter((value, index, list) => {
        return index === 0 || value !== list[index - 1];
    });
}

function mergeFallback(primary, fallback) {
    if (Array.isArray(primary)) {
        if (!primary.length) return Array.isArray(fallback) ? fallback : primary;
        if (!Array.isArray(fallback)) return primary;
        return primary.map((item, index) => mergeFallback(item, fallback[index]));
    }
    if (primary && typeof primary === "object") {
        const result = {};
        const backup = fallback && typeof fallback === "object" ? fallback : {};
        const keys = uniqueValues(Object.keys(primary).concat(Object.keys(backup)));
        keys.forEach((key) => {
            result[key] = mergeFallback(primary[key], backup[key]);
        });
        return result;
    }
    return cleanValue(primary) ? primary : fallback;
}

function cleanASN(value) {
    const clean = cleanValue(value).replace(/^AS/i, "");
    const match = clean.match(/^\d+/);
    return match ? match[0] : "";
}

function splitCoordinate(value, index) {
    const parts = String(value || "").split(",");
    return parts.length > index ? parts[index] : null;
}

function firstNumber(values) {
    for (let i = 0; i < values.length; i += 1) {
        const number = numberOrNull(values[i]);
        if (number !== null) return number;
    }
    return null;
}

function anyTrue(values) {
    const normalized = values.map(booleanOrNull);
    if (normalized.some((value) => value === true)) return true;
    if (normalized.length && normalized.every((value) => value === false)) return false;
    return null;
}

function booleanOrNull(value) {
    if (value === true || value === "true" || value === 1 || value === "1") return true;
    if (value === false || value === "false" || value === 0 || value === "0") return false;
    return null;
}

function yesNoOrNull(value) {
    const text = String(value === null || typeof value === "undefined" ? "" : value)
        .trim().toLowerCase();
    if (text === "yes") return true;
    if (text === "no") return false;
    return booleanOrNull(value);
}

function formatType(type) {
    const clean = cleanValue(type);
    if (!clean) return "未取到";
    const phraseMap = {
        "DATA CENTER/WEB HOSTING/TRANSIT": "机房",
        "FIXED LINE ISP": "家宽",
        "MOBILE ISP": "手机",
        "CONTENT DELIVERY NETWORK": "CDN",
        "DATA CENTER/TRANSIT": "机房",
        "SEARCH ENGINE SPIDER": "搜索引擎",
        "UNIVERSITY/COLLEGE/SCHOOL": "教育",
    };
    if (phraseMap[clean.toUpperCase()]) return phraseMap[clean.toUpperCase()];
    const map = {
        DCH: "机房",
        WEB: "机房",
        SES: "搜索引擎",
        HOSTING: "机房",
        ISP: "家宽",
        RES: "住宅",
        RESIDENTIAL: "住宅",
        BUSINESS: "商业",
        COMMERCIAL: "商业",
        BANKING: "银行",
        COM: "商业",
        MOB: "手机",
        MOBILE: "手机",
        CDN: "CDN",
        EDU: "教育",
        MIL: "军队",
        MILITARY: "军队",
        LIB: "图书馆",
        LIBRARY: "图书馆",
        RSV: "保留",
        RESERVED: "保留",
        GOVERNMENT: "政府",
        GOV: "政府",
        ORG: "组织",
        ORGANIZATION: "组织",
    };
    const first = clean.split("/")[0].trim();
    const key = first.toUpperCase();
    return map[key] || first;
}

function formatTypeWithRaw(type) {
    const clean = cleanValue(type);
    if (!clean) return "—";
    const formatted = formatType(clean);
    return formatted.toLowerCase() === clean.toLowerCase()
        ? formatted
        : `${formatted} (${clean})`;
}

function cleanValue(value) {
    if (value === null || typeof value === "undefined") return "";
    const text = String(value).trim();
    if (!text || /^(null|undefined|n\/a|unknown|-)$/i.test(text)) return "";
    return text;
}

function truncateText(value, maxLength) {
    const text = String(value || "");
    const limit = Number(maxLength) || 0;
    return limit > 1 && text.length > limit
        ? `${text.slice(0, limit - 1)}…`
        : text;
}

function toDMS(value, latitude) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    const absolute = Math.abs(number);
    let degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    let minutes = Math.floor(minutesFloat);
    let seconds = round((minutesFloat - minutes) * 60, 2);
    if (seconds >= 60) {
        seconds = 0;
        minutes += 1;
    }
    if (minutes >= 60) {
        minutes = 0;
        degrees += 1;
    }
    const direction = latitude
        ? number >= 0 ? "N" : "S"
        : number >= 0 ? "E" : "W";
    return `${degrees}°${minutes}′${seconds}″${direction}`;
}

function buildMapURL(latitude, longitude, radius) {
    let zoom = 15;
    const accuracy = numberOrNull(radius);
    if (accuracy !== null && accuracy > 1000) zoom = 12;
    else if (accuracy !== null && accuracy > 500) zoom = 13;
    else if (accuracy !== null && accuracy > 250) zoom = 14;
    const label = encodeURIComponent("节点 IP 出口");
    return `https://maps.apple.com/?ll=${latitude},${longitude}&q=${label}&z=${zoom}&t=m`;
}

function firstMatch(text, patterns) {
    for (let i = 0; i < patterns.length; i += 1) {
        const match = String(text || "").match(patterns[i]);
        if (match && match[1]) return String(match[1]).toUpperCase();
    }
    return "";
}

function flagEmoji(code) {
    const value = String(code || "").toUpperCase();
    if (value.length !== 2) return "";
    return String.fromCodePoint(value.charCodeAt(0) + 127397, value.charCodeAt(1) + 127397);
}

function numberOrNull(value) {
    if (value === null || typeof value === "undefined" || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function round(value, digits) {
    const factor = Math.pow(10, digits || 0);
    return Math.round(value * factor) / factor;
}

function percentile(values, percent) {
    const rows = (Array.isArray(values) ? values : []).map(Number)
        .filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
    if (!rows.length) return null;
    const index = Math.min(rows.length - 1, Math.max(0,
        Math.ceil((percent / 100) * rows.length) - 1));
    return round(rows[index], 2);
}

function standardDeviation(values) {
    const rows = (Array.isArray(values) ? values : []).map(Number)
        .filter((value) => Number.isFinite(value));
    if (rows.length < 2) return 0;
    const average = rows.reduce((sum, value) => sum + value, 0) / rows.length;
    const variance = rows.reduce((sum, value) => {
        return sum + Math.pow(value - average, 2);
    }, 0) / rows.length;
    return Math.sqrt(variance);
}

function escapeHtml(value) {
    return String(value === null || typeof value === "undefined" ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function errorMessage(error) {
    return error && error.message ? String(error.message) : String(error);
}

function finishError(message) {
    $done({
        title: "节点 IP 质量检测",
        content: message,
        icon: "network.slash",
    });
}
