/**
 * 节点 IP 质量检测 · Loon generic 脚本
 *
 * 使用:在 Loon 的节点或策略组页面对目标执行「节点 IP 质量检测」
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Reference: @Roddy-D <https://github.com/Roddy-D/Loon_plugins>
 * @Reference: @xykt <https://github.com/xykt/IPQuality>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-07-19
 *
 * ===== Loon =====
 * [Script]
 * generic script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality/ipquality.js, tag=节点 IP 质量检测, timeout=50, img-url=shield.lefthalf.filled.system, enable=true
 */

const SCRIPT_VERSION = "2026-07-19.r3";
const IPPURE_URL = "https://my.ippure.com/v1/info";
const IPIFY_URL = "https://api4.ipify.org?format=json";
const IPAPI_URL = "https://api.ipapi.is/";
const IPAPI_COM_URL = "http://ip-api.com/json/";
const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
const DISNEY_CLIENT_TOKEN = "ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84";

const params = typeof $environment !== "undefined" && $environment.params
    ? $environment.params
    : {};
const nodeName = params.node || "";
const maskIP = readSwitch("MaskIP", false);
const mediaEnabled = readSwitch("MediaTest", true);

console.log(`[INFO] 节点 IP 质量检测 ${SCRIPT_VERSION}`);
console.log(`[INFO] 节点: ${nodeName || "未获取"}`);

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
    const mediaTask = mediaEnabled ? collectMedia() : Promise.resolve([]);
    const results = await Promise.all([databaseTask, mediaTask]);
    render(ip, results[0], results[1]);
}

async function discoverIP() {
    const definitions = [
        ["ip-api", requestJson(`${IPAPI_COM_URL}?fields=status,message,query`)],
        ["ipify", requestJson(IPIFY_URL)],
        ["ident.me", requestText("https://v4.ident.me/")],
        ["icanhazip", requestText("https://ipv4.icanhazip.com/")],
        ["IPPure", requestJson(IPPURE_URL)],
        ["ipapi", requestJson(IPAPI_URL)],
    ];
    const settled = await Promise.all(definitions.map((item) => capture(item[1])));
    const observations = [];
    let ippure = null;
    let ipapi = null;

    definitions.forEach((item, index) => {
        const result = settled[index];
        if (!result.ok) {
            console.log(`[WARN] 出口探针 ${item[0]}: ${result.error}`);
            return;
        }
        const value = result.value;
        if (item[0] === "IPPure") ippure = value;
        if (item[0] === "ipapi") ipapi = value;
        const candidate = item[0] === "ip-api"
            ? value && value.query
            : item[0] === "ipify"
                ? value && value.ip
                : item[0] === "IPPure" || item[0] === "ipapi"
                    ? value && value.ip
                    : String(value || "").trim();
        if (isIPAddress(candidate)) observations.push({
            source: item[0],
            ip: String(candidate).trim(),
        });
    });

    if (!observations.length) {
        return { ip: "", ippure: null, ipapi: null, probe: { matched: 0, total: 0 } };
    }

    const counts = {};
    observations.forEach((item) => {
        counts[item.ip] = (counts[item.ip] || 0) + 1;
    });
    const ip = observations.map((item) => item.ip).sort((left, right) => {
        const countDiff = counts[right] - counts[left];
        if (countDiff) return countDiff;
        const ipv4Diff = Number(isIPv4(right)) - Number(isIPv4(left));
        if (ipv4Diff) return ipv4Diff;
        return observations.findIndex((item) => item.ip === left)
            - observations.findIndex((item) => item.ip === right);
    })[0];
    const matchingIppure = ippure && String(ippure.ip) === ip ? ippure : null;
    const matchingIpapi = ipapi && String(ipapi.ip) === ip ? ipapi : null;
    const unique = Object.keys(counts);
    if (unique.length > 1) {
        console.log(`[WARN] 出口探针不一致: ${observations.map((item) => `${item.source}=${item.ip}`).join(", ")}`);
    }

    return {
        ip,
        ippure: matchingIppure,
        ipapi: matchingIpapi,
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
        ippure: discovery.ippure
            ? Promise.resolve(discovery.ippure)
            : requestJson(IPPURE_URL).then((value) => {
                if (!value || String(value.ip) !== ip) {
                    throw new Error("IPPure 出口与检测 IP 不一致");
                }
                return value;
            }),
        ipapi: discovery.ipapi
            ? Promise.resolve(discovery.ipapi)
            : requestJson(`${IPAPI_URL}?q=${pathIP}`),
        ipinfo: requestJson(`https://ipinfo.io/widget/demo/${pathIP}`),
        ipwhois: requestJson(`https://ipwho.is/${pathIP}`),
        ip2location: requestText(`https://www.ip2location.io/${pathIP}`),
        proxycheck: requestJson(`https://proxycheck.io/v2/${pathIP}?vpn=1&asn=1&risk=1`),
        dbip: requestText(`https://db-ip.com/${pathIP}`),
        ipregistry: requestText(`https://ipregistry.co/${pathIP}`),
    };
    if (isIPv4(ip)) {
        tasks.ipApiCom = requestJson(
            `${IPAPI_COM_URL}${pathIP}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting,query`
        );
    }

    const keys = Object.keys(tasks);
    const settled = await Promise.all(keys.map((key) => capture(tasks[key])));
    const data = {
        _errors: {},
        _probe: discovery.probe || { matched: 0, total: 0, unique: 0 },
    };
    keys.forEach((key, index) => {
        data[key] = settled[index].ok ? settled[index].value : null;
        if (!settled[index].ok) {
            data._errors[key] = settled[index].error;
            console.log(`[WARN] ${key}: ${settled[index].error}`);
        }
    });
    return data;
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
    if (region) return mediaResult("TikTok", "yes", region, "页面地区字段");
    if (response.status === 403 || /not available|access denied/i.test(response.body)) {
        return mediaResult("TikTok", "no", "", `HTTP ${response.status || "?"}`);
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
        return mediaResult("Netflix", "no", "", "HTTP 403");
    }
    const pages = responses.map((response) => response.body);
    const region = firstMatch(pages.join("\n"), [
        /"countryCode"\s*:\s*"([A-Z]{2})"/i,
        /"id"\s*:\s*"([A-Z]{2})"\s*,\s*"countryName"/i,
    ]);
    const unavailable = pages.map((body) => /Oh no!|NSEZ-404/i.test(body));
    if (unavailable[0] && unavailable[1]) {
        return mediaResult("Netflix", "partial", region, "两部测试片均返回不可用");
    }
    if (responses.some((response) => response.status >= 200 && response.status < 400)) {
        return mediaResult("Netflix", "yes", region, "测试片标题页可访问");
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
        return mediaResult("YouTube", "no", "CN", "重定向至 google.cn");
    }
    const region = firstMatch(response.body, [/"contentRegion"\s*:\s*"([A-Z]{2})"/i]);
    if (/Premium is not available in your country/i.test(response.body)) {
        return mediaResult("YouTube", "partial", region, "页面明确显示 Premium 不可用");
    }
    if (region && /YouTube Premium/i.test(response.body)) {
        return mediaResult("YouTube", "yes", region, "Premium 页面及地区字段");
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
    if (region) return mediaResult("Prime Video", "yes", region, "currentTerritory");
    if (response.status === 403 || /not available in your location/i.test(response.body)) {
        return mediaResult("Prime Video", "no", "", "地区受限");
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
    if (response.status === 200) return mediaResult("Reddit", "yes", region, "HTTP 200");
    if (response.status === 403) return mediaResult("Reddit", "no", "", "HTTP 403");
    return mediaResult("Reddit", "unknown", region, `HTTP ${response.status || "?"}`);
}

async function testChatGPT() {
    const tasks = await Promise.all([
        capture(request("GET", "https://api.openai.com/compliance/cookie_requirements", {
            allowHttpErrors: true,
            headers: browserHeaders(),
        })),
        capture(request("GET", "https://ios.chat.openai.com/", {
            allowHttpErrors: true,
            headers: browserHeaders(),
        })),
        capture(request("GET", "https://chat.openai.com/cdn-cgi/trace", {
            allowHttpErrors: true,
            headers: browserHeaders(),
        })),
    ]);
    const web = tasks[0].ok ? tasks[0].value : null;
    const app = tasks[1].ok ? tasks[1].value : null;
    const trace = tasks[2].ok ? tasks[2].value : null;
    const region = trace ? firstMatch(trace.body, [/^loc=([A-Z]{2})$/im]) : "";
    const webAvailable = !!(web && web.status >= 200 && web.status < 300
        && !/unsupported_country/i.test(web.body));
    const appAvailable = !!(app && app.status >= 200 && app.status < 300
        && !/unsupported_country|VPN/i.test(app.body));
    const webBlocked = !!(web && (/unsupported_country/i.test(web.body) || web.status === 403));
    const appBlocked = !!(app && (/unsupported_country|VPN/i.test(app.body) || app.status === 403));

    if (!web && !app) return mediaResult("ChatGPT", "unknown", region, "请求失败");
    if (webAvailable && appAvailable) {
        return mediaResult("ChatGPT", "yes", region, "Web/App 均通过");
    }
    if (webAvailable && appBlocked) {
        return mediaResult("ChatGPT", "partial", region, `仅 Web；App HTTP ${app.status}`);
    }
    if (appAvailable && webBlocked) {
        return mediaResult("ChatGPT", "partial", region, `仅 App；Web HTTP ${web.status}`);
    }
    if (webBlocked && appBlocked) {
        return mediaResult("ChatGPT", "no", region, "Web/App 均受限");
    }
    return mediaResult("ChatGPT", "unknown", region, "响应不足以确认");
}

function render(ip, data, media) {
    const basic = buildBasic(ip, data);
    const types = buildTypes(data);
    const risks = buildRisks(data);
    const factors = buildFactors(data);
    const audit = buildAudit(data);
    const titleColor = reportColor(risks);

    const html = [
        '<div style="font-family:-apple-system,BlinkMacSystemFont;font-size:14px;line-height:1.55;text-align:left">',
        '<div style="text-align:center;font-weight:700;font-size:18px;margin:2px 0 3px">节点 IP 质量报告</div>',
        `<div style="text-align:center;color:#8e8e93;font-size:12px;margin-bottom:12px">${escapeHtml(nodeName)}</div>`,
        summaryCard(basic),
        section("基础信息", renderBasic(basic)),
        section("多源风险", renderRiskList(risks)),
        section("网络类型", renderTypeList(types)),
        section("风险标记", renderFactorCards(factors)),
        section("流媒体与 AI", mediaEnabled
            ? renderMediaList(media)
            : mutedLine("流媒体检测已关闭")),
        section("数据状态", renderAudit(audit, data._probe)),
        '<div style="margin-top:12px;color:#8e8e93;font-size:11px;line-height:1.45">'
            + '评分和标记均为各数据源原始结果，不生成综合分。'
            + 'AbuseIPDB、IPQS、Scamalytics、ipdata 无法在当前无密钥直连条件下稳定取得，因此不展示空值。'
            + 'Loon 不提供节点 TCP/DNS API，25 端口与 DNSBL 未检测。</div>',
        "</div>",
    ].join("");

    $done({
        title: "节点 IP 质量检测",
        htmlMessage: html,
        icon: "shield.lefthalf.filled",
        "title-color": titleColor,
    });
}

function buildBasic(ip, data) {
    const ipapi = data.ipapi || {};
    const ippure = data.ippure || {};
    const ip2 = parseIp2location(data.ip2location) || {};
    const ipinfo = data.ipinfo && data.ipinfo.data ? data.ipinfo.data : {};
    const ipwhois = data.ipwhois && data.ipwhois.success !== false ? data.ipwhois : {};
    const ipApiCom = data.ipApiCom && data.ipApiCom.status === "success" ? data.ipApiCom : {};
    const proxycheck = proxycheckRecord(data.proxycheck) || {};
    const location = ipapi.location || {};
    const asn = ipapi.asn || {};
    const code = cleanValue(location.country_code) || cleanValue(ipinfo.country)
        || cleanValue(ipwhois.country_code) || cleanValue(ipApiCom.countryCode)
        || cleanValue(ippure.countryCode) || cleanValue(ip2.countryCode)
        || cleanValue(proxycheck.isocode);
    const country = cleanValue(location.country) || cleanValue(ipwhois.country)
        || cleanValue(ipApiCom.country) || cleanValue(ippure.country)
        || cleanValue(ip2.country) || cleanValue(proxycheck.country);
    const cityParts = uniqueValues([
        location.state,
        location.city,
        location.zip,
    ]);
    if (!cityParts.length) {
        uniqueValues([
            ipinfo.region,
            ipinfo.city,
            ipinfo.postal,
            ipwhois.region,
            ipwhois.city,
            ipwhois.postal,
            ipApiCom.regionName,
            ipApiCom.city,
            ipApiCom.zip,
            ippure.city,
            ip2.city,
        ]).forEach((value) => cityParts.push(value));
    }
    const asnNumber = cleanASN(asn.asn || valueAt(ipinfo, "asn.asn")
        || valueAt(ipwhois, "connection.asn") || proxycheck.asn || ip2.asn);
    const organization = cleanValue(asn.org) || cleanValue(valueAt(ipinfo, "asn.name"))
        || cleanValue(valueAt(ipwhois, "connection.org")) || cleanValue(ipApiCom.asname)
        || cleanValue(proxycheck.organisation) || cleanValue(ip2.asOrg)
        || cleanValue(ippure.asOrganization);
    const typeCode = cleanValue(ip2.usageType) || cleanValue(asn.type)
        || cleanValue(valueAt(ipinfo, "asn.type")) || cleanValue(proxycheck.type);
    const typeSource = cleanValue(ip2.usageType)
        ? "IP2Location"
        : cleanValue(asn.type)
            ? "ipapi"
            : cleanValue(valueAt(ipinfo, "asn.type"))
                ? "IPinfo"
                : cleanValue(proxycheck.type) ? "proxycheck" : "";
    const latitude = firstNumber([
        location.latitude,
        splitCoordinate(ipinfo.loc, 0),
        ipwhois.latitude,
        ipApiCom.lat,
        ippure.latitude,
        ip2.latitude,
        proxycheck.latitude,
    ]);
    const longitude = firstNumber([
        location.longitude,
        splitCoordinate(ipinfo.loc, 1),
        ipwhois.longitude,
        ipApiCom.lon,
        ippure.longitude,
        ip2.longitude,
        proxycheck.longitude,
    ]);
    const registeredCode = cleanValue(valueAt(ipinfo, "abuse.country"))
        || cleanValue(asn.country);
    const registeredName = registeredCode && code
        && registeredCode.toUpperCase() === code.toUpperCase()
        ? country
        : "";
    const nature = typeof ippure.isBroadcast === "boolean"
        ? ippure.isBroadcast ? "🟥 广播 IP" : "✅ 原生 IP"
        : "";
    const route = cleanValue(valueAt(ipinfo, "asn.route"))
        || cleanValue(asn.route) || cleanValue(proxycheck.range);

    return {
        ip: maskIPAddress(ip),
        asn: asnNumber ? `AS${asnNumber}` : "",
        organization,
        coordinates: latitude !== null && longitude !== null
            ? `${toDMS(latitude, true)}, ${toDMS(longitude, false)}`
            : "",
        map: latitude !== null && longitude !== null
            ? buildMapURL(latitude, longitude, null)
            : "",
        city: cityParts.join(" · "),
        actualRegion: code
            ? `${flagEmoji(code)} [${String(code).toUpperCase()}] ${country || ""}`.trim()
            : country,
        registeredRegion: registeredCode
            ? `[${String(registeredCode).toUpperCase()}] ${registeredName || ""}`.trim()
            : "",
        timezone: cleanValue(location.timezone) || cleanValue(ipinfo.timezone)
            || cleanValue(valueAt(ipwhois, "timezone.id")) || cleanValue(ipApiCom.timezone)
            || cleanValue(ippure.timezone) || cleanValue(proxycheck.timezone),
        nature,
        networkType: typeCode
            ? `${formatTypeWithRaw(typeCode)}${typeSource ? ` · ${typeSource}` : ""}`
            : "",
        route,
    };
}

function buildTypes(data) {
    const ipinfo = data.ipinfo && data.ipinfo.data ? data.ipinfo.data : null;
    const ipregistry = parseIpregistry(data.ipregistry);
    const ipapi = data.ipapi;
    const ip2 = parseIp2location(data.ip2location);
    const proxycheck = proxycheckRecord(data.proxycheck);
    return [
        typeRow("IPinfo", valueAt(ipinfo, "asn.type"), valueAt(ipinfo, "company.type")),
        typeRow("ipregistry", ipregistry && ipregistry.usageType, ipregistry && ipregistry.companyType),
        typeRow("ipapi", valueAt(ipapi, "asn.type"), valueAt(ipapi, "company.type")),
        typeRow("IP2Location", ip2 && ip2.usageType, null),
        typeRow("proxycheck", proxycheck && proxycheck.type, null),
    ].filter((row) => row.usage || row.company);
}

function buildRisks(data) {
    const ippureScore = numberOrNull(data.ippure && data.ippure.fraudScore);
    const ipapiText = data.ipapi && data.ipapi.company
        ? data.ipapi.company.abuser_score
        : "";
    const ipapiMatch = String(ipapiText || "").match(/([0-9.]+)\s*\(([^)]+)\)/);
    const ipapiRatio = ipapiMatch ? Number(ipapiMatch[1]) : NaN;
    const ipapiLevel = ipapiMatch ? ipapiMatch[2] : "";
    const ip2 = parseIp2location(data.ip2location);
    const ip2Score = numberOrNull(ip2 && ip2.fraudScore);
    const dbipRisk = parseDbipRisk(data.dbip);
    const proxycheck = proxycheckRecord(data.proxycheck);
    const proxyRisk = numberOrNull(proxycheck && proxycheck.risk);

    return [
        scoreRisk("IPPure", ippureScore, [
            [80, 4, "极高风险"],
            [70, 3, "高风险"],
            [40, 2, "中风险"],
            [0, 0, "低风险"],
        ]),
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
        dbipRisk
            ? {
                name: "DB-IP",
                available: true,
                severity: dbipRisk === "high" ? 3 : dbipRisk === "medium" ? 2 : 0,
                label: dbipRisk === "high" ? "高风险" : dbipRisk === "medium" ? "中风险" : "低风险",
                detail: dbipRisk,
            }
            : unavailableRisk("DB-IP"),
        proxyRisk !== null
            ? {
                name: "proxycheck",
                available: true,
                severity: null,
                label: "原始风险值",
                detail: `${round(proxyRisk, 2)}/100`,
            }
            : unavailableRisk("proxycheck"),
    ];
}

function buildFactors(data) {
    const ipinfo = data.ipinfo && data.ipinfo.data ? data.ipinfo.data : null;
    const ipregistry = parseIpregistry(data.ipregistry);
    const ipapi = data.ipapi;
    const ip2 = parseIp2location(data.ip2location);
    const dbip = parseDbip(data.dbip);
    const proxycheck = proxycheckRecord(data.proxycheck);
    const proxycheckProxy = proxycheck ? yesNoOrNull(proxycheck.proxy) : null;
    const ipApiCom = data.ipApiCom && data.ipApiCom.status === "success"
        ? data.ipApiCom
        : null;

    return [
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
        factorSource("IP2Location", ip2 ? {
            country: ip2.countryCode,
            checks: {
                代理: ip2.proxy,
            },
        } : null),
        factorSource("proxycheck", proxycheck ? {
            country: proxycheck.isocode,
            checks: {
                代理: proxycheckProxy,
                VPN: proxycheckProxy === null
                    ? null
                    : proxycheckProxy && String(proxycheck.type || "").toUpperCase() === "VPN",
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
        factorSource("ip-api", ipApiCom ? {
            country: ipApiCom.countryCode,
            checks: {
                代理: ipApiCom.proxy,
                机房: ipApiCom.hosting,
                移动网络: ipApiCom.mobile,
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

function parseIpregistry(html) {
    if (!html) return null;
    const fields = {
        abuser: "Abuser",
        attacker: "Attacker",
        bogon: "Bogon",
        server: "Cloud Provider",
        proxy: "Proxy",
        relay: "Relay",
        tor: "Tor",
        vpn: "VPN",
        anonymous: "Anonymous",
        threat: "Threat",
    };
    const result = {};
    let found = false;
    Object.keys(fields).forEach((key) => {
        const pattern = new RegExp(
            `${fields[key]}</span>[\\s\\S]{0,1800}?`
            + '<div class="(?:positive|negative)"[^>]*>[\\s\\S]{0,1200}?\\b(Yes|No)</div>',
            "i"
        );
        const match = String(html).match(pattern);
        if (match) {
            result[key] = match[1].toLowerCase() === "yes";
            found = true;
        }
    });
    if (!found) return null;
    result.abuser = anyTrue([result.abuser, result.attacker, result.threat]);
    const asType = String(html).match(/AS Type<\/span>[\s\S]{0,1800}?<td>\s*([^<\s][^<]*?)\s*<\/td>/i);
    const companyBlock = String(html).match(/<div class="card" id="company">([\s\S]{0,16000}?)<div class="card" id="security">/i);
    const companyType = companyBlock
        ? companyBlock[1].match(/>Type<\/span>[\s\S]{0,1800}?<td>\s*([^<\s][^<]*?)\s*<\/td>/i)
        : null;
    const country = String(html).match(/flags\/[^/]+\/\d+\/([a-z]{2})\.png/i);
    result.usageType = asType ? asType[1].trim() : null;
    result.companyType = companyType ? companyType[1].trim() : null;
    result.country = country ? country[1].toUpperCase() : null;
    return result;
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
    const checks = [
        ["IPPure", !!(data.ippure && data.ippure.ip)],
        ["ipapi", !!(data.ipapi && data.ipapi.ip)],
        ["IPinfo", !!(data.ipinfo && data.ipinfo.data)],
        ["IPWhois", !!(data.ipwhois && data.ipwhois.success !== false)],
        ["IP2Location", !!parseIp2location(data.ip2location)],
        ["proxycheck", !!proxycheckRecord(data.proxycheck)],
        ["ipregistry", !!parseIpregistry(data.ipregistry)],
        ["DB-IP", !!(parseDbipRisk(data.dbip) || parseDbip(data.dbip))],
    ];
    if (Object.prototype.hasOwnProperty.call(data, "ipApiCom")) {
        checks.push(["ip-api", !!(data.ipApiCom && data.ipApiCom.status === "success")]);
    }
    return {
        total: checks.length,
        success: checks.filter((item) => item[1]).map((item) => item[0]),
        failed: checks.filter((item) => !item[1]).map((item) => item[0]),
    };
}

function summaryCard(basic) {
    const location = [basic.actualRegion, basic.city].filter(Boolean).join(" · ");
    const asn = [basic.asn, basic.organization].filter(Boolean).join(" · ");
    const type = [basic.networkType, basic.nature].filter(Boolean).join(" · ");
    return '<div style="padding:10px 12px;margin-bottom:4px;background-color:rgba(120,120,128,0.12);border-radius:12px">'
        + `<div style="font-size:16px;font-weight:700">${escapeHtml(basic.ip)}</div>`
        + (location ? `<div style="margin-top:4px">${escapeHtml(location)}</div>` : "")
        + (asn ? `<div style="margin-top:2px;color:#8e8e93">${escapeHtml(asn)}</div>` : "")
        + (type ? `<div style="margin-top:2px">${escapeHtml(type)}</div>` : "")
        + "</div>";
}

function renderBasic(basic) {
    const rows = [
        ["网段", basic.route],
        ["时区", basic.timezone],
        ["注册地", basic.registeredRegion],
        ["坐标", basic.coordinates],
    ].filter((row) => row[1]);
    const body = rows.map((row) => infoLine(row[0], row[1])).join("");
    const map = basic.map
        ? `<div style="margin-top:5px"><a href="${escapeHtml(basic.map)}">在地图中查看</a></div>`
        : "";
    return body + map;
}

function renderRiskList(rows) {
    const available = rows.filter((row) => row.available);
    const unavailable = rows.filter((row) => !row.available).map((row) => row.name);
    const body = available.map((row) => {
        const color = row.severity === null ? "#0A84FF" : riskColor(row.severity);
        const icon = row.severity === null
            ? "🔵"
            : row.severity >= 3 ? "🔴" : row.severity >= 2 ? "🟠" : "🟢";
        return sourceCard(
            `${icon} ${row.name}`,
            [row.detail, row.label].filter(Boolean).join(" · "),
            color
        );
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
        if (row.usage) details.push(`使用：${row.usage}`);
        if (row.company) details.push(`公司：${row.company}`);
        return sourceCard(row.name, details.join(" · "), "#0A84FF");
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
        return sourceCardHtml(title, lines.join("<br/>"));
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
        return sourceCardHtml(
            `${icon} ${row.name}`,
            `<span style="color:${status.color};font-weight:600">${escapeHtml(summary)}</span>${detail}`
        );
    }).join("");
    const unknownLine = unknown.length
        ? mutedLine(`⚪ 未确认：${unknown.map((row) => row.name).join("、")}`)
        : "";
    return (body || mutedLine("本次没有确认任何服务状态")) + unknownLine;
}

function renderAudit(audit, probe) {
    const parts = [
        `直连来源 ${audit.success.length}/${audit.total}`,
        audit.success.length ? `成功：${audit.success.join("、")}` : "",
        audit.failed.length ? `失败：${audit.failed.join("、")}` : "",
        probe && probe.total
            ? `出口探针 ${probe.matched}/${probe.total} 一致${probe.unique > 1 ? "（存在分流差异）" : ""}`
            : "",
    ].filter(Boolean);
    return parts.map((part, index) => {
        return index === 0 ? infoLine("状态", part) : mutedLine(part);
    }).join("");
}

function mediaStatus(status) {
    if (status === "yes") return { text: "解锁", color: "#00a67d" };
    if (status === "partial") return { text: "部分可用", color: "#ff9500" };
    if (status === "no") return { text: "不可用", color: "#ff3b30" };
    return { text: "未确认", color: "#8e8e93" };
}

function riskColor(severity) {
    if (severity >= 4) return "#8e0000";
    if (severity >= 3) return "#ff3b30";
    if (severity >= 2) return "#ff9500";
    return "#00a67d";
}

function reportColor(rows) {
    const severities = rows.filter((row) => row.available && row.severity !== null)
        .map((row) => row.severity);
    const highest = severities.length ? Math.max.apply(null, severities) : 0;
    return highest >= 3 ? "#ff453a" : highest >= 2 ? "#ff9f0a" : "#30d158";
}

function mediaResult(name, status, region, detail) {
    return { name, status, region: region || "", detail: detail || "" };
}

function section(title, content) {
    return '<div style="margin-top:15px">'
        + `<div style="color:#0A84FF;font-weight:700;font-size:15px;margin-bottom:6px">${escapeHtml(title)}</div>`
        + `${content}</div>`;
}

function infoLine(label, value) {
    return `<div style="margin:3px 0"><b>${escapeHtml(label)}</b>　${escapeHtml(value)}</div>`;
}

function mutedLine(value) {
    return `<div style="color:#8e8e93;font-size:12px;margin:4px 0">${escapeHtml(value)}</div>`;
}

function sourceCard(name, detail, color) {
    return sourceCardHtml(
        name,
        `<span style="color:${color || "#8e8e93"}">${escapeHtml(detail)}</span>`
    );
}

function sourceCardHtml(name, htmlDetail) {
    return '<div style="padding:7px 9px;margin:5px 0;background-color:rgba(120,120,128,0.10);border-radius:9px">'
        + `<div style="font-weight:600">${escapeHtml(name)}</div>`
        + (htmlDetail ? `<div style="font-size:12px;margin-top:2px">${htmlDetail}</div>` : "")
        + "</div>";
}

function browserHeaders() {
    return {
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": USER_AGENT,
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
        const requestOptions = {
            url,
            node: nodeName,
            headers: config.headers || browserHeaders(),
        };
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
            resolve({ status, body: String(body || ""), response: response || {} });
        };
        if (String(method).toUpperCase() === "POST") {
            $httpClient.post(requestOptions, callback);
        } else {
            $httpClient.get(requestOptions, callback);
        }
    });
}

function capture(promise) {
    return Promise.resolve(promise).then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error: errorMessage(error) })
    );
}

function readSwitch(key, defaultValue) {
    const value = $persistentStore.read(key);
    if (value === null || typeof value === "undefined" || value === "") return defaultValue;
    return !(value === false || value === 0 || value === "false" || value === "0");
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
    const booleans = values.map(booleanOrNull).filter((value) => typeof value === "boolean");
    if (!booleans.length) return null;
    return booleans.some(Boolean);
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
        "MOBILE ISP": "移动网络",
        "CONTENT DELIVERY NETWORK": "CDN",
        "DATA CENTER/TRANSIT": "机房",
        "SEARCH ENGINE SPIDER": "搜索引擎",
        "UNIVERSITY/COLLEGE/SCHOOL": "教育",
    };
    if (phraseMap[clean.toUpperCase()]) return phraseMap[clean.toUpperCase()];
    const map = {
        DCH: "机房",
        WEB: "机房",
        SES: "机房",
        HOSTING: "机房",
        ISP: "家宽",
        RES: "住宅",
        RESIDENTIAL: "住宅",
        BUSINESS: "商业",
        COM: "商业",
        MOB: "移动网络",
        MOBILE: "移动网络",
        CDN: "CDN",
        EDU: "教育",
        GOVERNMENT: "政府",
        GOV: "政府",
        ORG: "组织",
    };
    return clean.split("/").map((part) => {
        const key = part.trim().toUpperCase();
        return map[key] || part.trim();
    }).filter(Boolean).join("/");
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

function toDMS(value, latitude) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    const absolute = Math.abs(number);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = round((minutesFloat - minutes) * 60, 2);
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
    return `https://check.place/${latitude},${longitude},${zoom},cn`;
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

function escapeHtml(value) {
    return String(value === null || typeof value === "undefined" ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
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
