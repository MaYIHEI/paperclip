/**
 * 节点 IP 质量检测 · Loon generic 脚本
 *
 * 使用:在 Loon 的节点或策略组页面对目标执行「节点 IP 质量检测」
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Reference: @Roddy-D <https://github.com/Roddy-D/Loon_plugins>
 * @Reference: @xykt <https://github.com/xykt/IPQuality>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-07-18
 *
 * ===== Loon =====
 * [Script]
 * generic script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality/ipquality.js, tag=节点 IP 质量检测, timeout=50, img-url=shield.lefthalf.filled.system, enable=true
 */

const SCRIPT_VERSION = "2026-07-18.r2";
const IPPURE_URL = "https://my.ippure.com/v1/info";
const IPIFY_URL = "https://api.ipify.org?format=json";
const IPAPI_URL = "https://api.ipapi.is/";
const IPQUALITY_BACKEND = "https://ipinfo.check.place";
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
    const databaseTask = collectDatabases(ip, discovery.ippure, discovery.basic);
    const mediaTask = mediaEnabled ? collectMedia() : Promise.resolve([]);
    const results = await Promise.all([databaseTask, mediaTask]);
    render(ip, results[0], results[1]);
}

async function discoverIP() {
    const probes = await Promise.all([
        capture(requestText(`${IPQUALITY_BACKEND}/cdn-cgi/trace`)),
        capture(requestJson(IPPURE_URL)),
        capture(requestJson(IPIFY_URL)),
        capture(requestJson(IPAPI_URL)),
        capture(requestText("https://icanhazip.com/")),
    ]);
    const backendIP = probes[0].ok
        ? firstMatch(probes[0].value, [/^ip=([0-9a-f:.]+)$/im])
        : "";
    const ippure = probes[1].ok ? probes[1].value : null;
    const candidates = [
        backendIP,
        ippure && ippure.ip,
        probes[2].ok && probes[2].value.ip,
        probes[3].ok && probes[3].value.ip,
        probes[4].ok && String(probes[4].value).trim(),
    ].filter(isIPAddress).map(String).filter((value, index, values) => {
        return values.indexOf(value) === index;
    });
    if (!candidates.length) return { ip: "", ippure: null, basic: null };

    const basicChecks = await Promise.all(candidates.map((ip) => {
        return capture(requestJson(`${IPQUALITY_BACKEND}/${encodeURIComponent(ip)}?lang=cn`));
    }));
    const acceptedIndex = basicChecks.findIndex((result) => result.ok);
    const ip = acceptedIndex >= 0 ? candidates[acceptedIndex] : candidates[0];
    const basic = acceptedIndex >= 0 ? basicChecks[acceptedIndex].value : null;
    const matchingIppure = ippure && String(ippure.ip) === ip ? ippure : null;

    if (acceptedIndex < 0) {
        console.log("[WARN] IPQuality 后端未接受任何出口 IP 候选");
    } else if (acceptedIndex > 0) {
        console.log(`[INFO] 出口 IP 探针不一致，采用后端确认的 ${ip}`);
    }
    return { ip, ippure: matchingIppure, basic };
}

async function collectDatabases(ip, cachedIppure, cachedBasic) {
    const pathIP = encodeURIComponent(ip);
    const tasks = {
        basic: cachedBasic
            ? Promise.resolve(cachedBasic)
            : requestJson(`${IPQUALITY_BACKEND}/${pathIP}?lang=cn`),
        ippure: cachedIppure
            ? Promise.resolve(cachedIppure)
            : requestJson(IPPURE_URL).then((value) => {
                if (!value || String(value.ip) !== ip) {
                    throw new Error("IPPure 出口与检测 IP 不一致");
                }
                return value;
            }),
        ipapi: requestJson(`${IPAPI_URL}?q=${pathIP}`),
        ipinfo: requestJson(`https://ipinfo.io/widget/demo/${pathIP}`),
        scamalytics: requestJson(`${IPQUALITY_BACKEND}/${pathIP}?db=scamalytics`),
        abuseipdb: requestJson(`${IPQUALITY_BACKEND}/${pathIP}?db=abuseipdb`),
        ip2location: requestJson(`${IPQUALITY_BACKEND}/${pathIP}?db=ip2location`),
        ipdata: requestJson(`${IPQUALITY_BACKEND}/${pathIP}?db=ipdata`),
        ipqs: requestJson(`${IPQUALITY_BACKEND}/${pathIP}?db=ipqualityscore`),
        dbip: requestText(`https://db-ip.com/${pathIP}`),
        ipregistry: requestText(`https://ipregistry.co/${pathIP}`),
    };

    const keys = Object.keys(tasks);
    const settled = await Promise.all(keys.map((key) => capture(tasks[key])));
    const data = {};
    keys.forEach((key, index) => {
        data[key] = settled[index].ok ? settled[index].value : null;
        if (!settled[index].ok) {
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

    const html = [
        '<div style="font-family:-apple-system;font-size:14px;line-height:1.45;text-align:left">',
        '<div style="text-align:center;font-weight:700;font-size:17px;margin-bottom:8px">节点 IP 质量报告</div>',
        `<div style="text-align:center;color:#8e8e93;font-size:12px">${escapeHtml(nodeName)} · ${escapeHtml(maskIPAddress(ip))}</div>`,
        section("基础信息", [
            line("IP", maskIPAddress(ip)),
            line("自治系统号", basic.asn),
            line("组织", basic.organization),
            line("坐标", basic.coordinates),
            richLine("地图", basic.map
                ? `<a href="${escapeHtml(basic.map)}">${escapeHtml(basic.map)}</a>`
                : "未取到"),
            line("城市", basic.city),
            line("使用地", basic.actualRegion),
            line("注册地", basic.registeredRegion),
            line("时区", basic.timezone),
            line("IP 属性", basic.nature),
            line("网络类型", basic.networkType),
        ].join("")),
        section("IP 类型属性", renderTypeTable(types)),
        section("风险评分", renderRiskTable(risks)),
        section("风险因素矩阵", renderFactorMatrix(factors)),
        section("流媒体与 AI", mediaEnabled
            ? renderMediaTable(media)
            : line("检测", "已在插件参数中关闭")),
        section("邮件与黑名单", renderCapabilityTable()),
        section("数据完整性", [
            line("有效来源", `${audit.success.length}/${audit.total}`),
            line("已取得", audit.success.join("、") || "无"),
            line("未取得", audit.failed.join("、") || "无"),
        ].join("")),
        '<div style="margin-top:10px;color:#8e8e93;font-size:11px">所有结论均保留原始来源；缺失数据不参与判断。“未取到/未确认”不代表低风险或不可用。</div>',
        "</div>",
    ].join("");

    $done({
        title: "节点 IP 质量检测",
        htmlMessage: html,
        icon: "shield.lefthalf.filled",
        "title-color": "#007AFF",
    });
}

function buildBasic(ip, data) {
    const ipapi = data.ipapi || {};
    const ippure = data.ippure || {};
    const ip2 = data.ip2location || {};
    const ipinfo = data.ipinfo && data.ipinfo.data ? data.ipinfo.data : {};
    const basic = data.basic || {};
    const basicASN = basic.ASN || {};
    const basicCity = basic.City || {};
    const basicCountry = basic.Country || {};
    const location = ipapi.location || {};
    const asn = ipapi.asn || {};
    const continent = basicCity.Continent || {};
    const cityCountry = basicCity.Country || {};
    const registered = basicCountry.RegisteredCountry || {};
    const code = cleanValue(basicCountry.IsoCode) || cleanValue(cityCountry.IsoCode)
        || cleanValue(location.country_code) || cleanValue(ippure.countryCode)
        || cleanValue(ip2.country_code) || cleanValue(ipinfo.country);
    const country = cleanValue(basicCountry.Name) || cleanValue(cityCountry.Name)
        || cleanValue(location.country) || cleanValue(ippure.country)
        || cleanValue(ip2.country_name) || "";
    const cityParts = [];
    if (Array.isArray(basicCity.Subdivisions)) {
        basicCity.Subdivisions.forEach((item) => {
            const name = cleanValue(item && item.Name);
            if (name && cityParts.indexOf(name) === -1) cityParts.push(name);
        });
    }
    [
        basicCity.Name,
        ipinfo.city,
        location.city,
        ippure.city,
        ip2.city_name,
        basicCity.PostalCode,
        ipinfo.postal,
    ].forEach((value) => {
        const clean = cleanValue(value);
        if (clean && cityParts.indexOf(clean) === -1) cityParts.push(clean);
    });
    const asnNumber = asn.asn || ippure.asn || ip2.asn || basicASN.AutonomousSystemNumber;
    const organization = asn.org || ippure.asOrganization || ip2.as
        || basicASN.AutonomousSystemOrganization || "";
    const typeCode = ip2.usage_type || (asn.type ? String(asn.type).toUpperCase() : "");
    const latitude = numberOrNull(basicCity.Latitude) !== null
        ? Number(basicCity.Latitude)
        : numberOrNull(location.latitude) !== null
            ? Number(location.latitude)
            : numberOrNull(ippure.latitude);
    const longitude = numberOrNull(basicCity.Longitude) !== null
        ? Number(basicCity.Longitude)
        : numberOrNull(location.longitude) !== null
            ? Number(location.longitude)
            : numberOrNull(ippure.longitude);
    const radius = numberOrNull(basicCity.AccuracyRadius);
    const registeredCode = cleanValue(registered.IsoCode);
    const registeredName = cleanValue(registered.Name) || registeredCode;
    const nature = code && registeredCode
        ? code.toUpperCase() === registeredCode.toUpperCase()
            ? "✅ 原生 IP (MaxMind)"
            : "🟥 广播 IP (MaxMind)"
        : typeof ippure.isBroadcast === "boolean"
            ? ippure.isBroadcast ? "🟥 广播 IP (IPPure)" : "✅ 原生 IP (IPPure)"
            : "未取到";

    return {
        ip,
        asn: asnNumber ? `AS${asnNumber}` : "未取到",
        organization: cleanValue(organization) || "未取到",
        coordinates: latitude !== null && longitude !== null
            ? `${toDMS(latitude, true)}, ${toDMS(longitude, false)}`
            : "未取到",
        map: latitude !== null && longitude !== null
            ? buildMapURL(latitude, longitude, radius)
            : "",
        city: cityParts.join(", ") || "未取到",
        actualRegion: [
            code ? `[${String(code).toUpperCase()}]${country || ""}` : "",
            cleanValue(continent.Code)
                ? `[${String(continent.Code).toUpperCase()}]${cleanValue(continent.Name) || ""}`
                : "",
        ].filter(Boolean).join(", ") || "未取到",
        registeredRegion: registeredCode
            ? `[${String(registeredCode).toUpperCase()}]${registeredName || ""}`
            : "未取到",
        timezone: cleanValue(valueAt(basicCity, "Location.TimeZone"))
            || cleanValue(location.timezone) || cleanValue(ipinfo.timezone) || "未取到",
        nature,
        networkType: typeCode
            ? `${formatTypeWithRaw(typeCode)} · ${ip2.usage_type ? "IP2Location" : "ipapi"}`
            : "未取到",
    };
}

function buildTypes(data) {
    const ipinfo = data.ipinfo && data.ipinfo.data ? data.ipinfo.data : null;
    const ipregistry = parseIpregistry(data.ipregistry);
    const ipapi = data.ipapi;
    const ip2 = data.ip2location;
    const abuse = data.abuseipdb && data.abuseipdb.data ? data.abuseipdb.data : null;
    return [
        typeRow("IPinfo", valueAt(ipinfo, "asn.type"), valueAt(ipinfo, "company.type")),
        typeRow("ipregistry", ipregistry && ipregistry.usageType, ipregistry && ipregistry.companyType),
        typeRow("ipapi", valueAt(ipapi, "asn.type"), valueAt(ipapi, "company.type")),
        typeRow("IP2Location", ip2 && ip2.usage_type, valueAt(ip2, "as_info.as_usage_type")),
        typeRow("AbuseIPDB", abuse && abuse.usageType, null),
    ];
}

function buildRisks(data) {
    const ippureScore = numberOrNull(data.ippure && data.ippure.fraudScore);
    const ipapiText = data.ipapi && data.ipapi.company
        ? data.ipapi.company.abuser_score
        : "";
    const ipapiMatch = String(ipapiText || "").match(/([0-9.]+)\s*\(([^)]+)\)/);
    const ipapiRatio = ipapiMatch ? Number(ipapiMatch[1]) : NaN;
    const ipapiLevel = ipapiMatch ? ipapiMatch[2] : "";
    const ip2Score = numberOrNull(data.ip2location && data.ip2location.fraud_score);
    const scam = data.scamalytics && data.scamalytics.scamalytics
        ? data.scamalytics.scamalytics
        : null;
    const scamScore = numberOrNull(scam && scam.scamalytics_score);
    const abuseScore = numberOrNull(data.abuseipdb && data.abuseipdb.data
        ? data.abuseipdb.data.abuseConfidenceScore
        : null);
    const ipqsScore = numberOrNull(data.ipqs && data.ipqs.success !== false
        ? data.ipqs.fraud_score
        : null);
    const dbipRisk = parseDbipRisk(data.dbip);

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
        scoreRisk("Scamalytics", scamScore, [
            [90, 4, "极高风险"],
            [60, 3, "高风险"],
            [20, 2, "中风险"],
            [0, 0, "低风险"],
        ]),
        scoreRisk("AbuseIPDB", abuseScore, [
            [75, 4, "极高风险"],
            [25, 3, "高风险"],
            [0, 0, "低风险"],
        ]),
        scoreRisk("IPQS", ipqsScore, [
            [90, 4, "极高风险"],
            [85, 3, "高风险"],
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
    ];
}

function buildFactors(data) {
    const ipinfo = data.ipinfo && data.ipinfo.data ? data.ipinfo.data : null;
    const ipregistry = parseIpregistry(data.ipregistry);
    const ipapi = data.ipapi;
    const ip2 = data.ip2location;
    const ipdata = data.ipdata;
    const ipqs = data.ipqs;
    const scamRoot = data.scamalytics;
    const scam = scamRoot && scamRoot.scamalytics ? scamRoot.scamalytics : null;
    const dbip = parseDbip(data.dbip);

    return [
        factorSource("IP2Location", "I2L", ip2 ? {
            country: ip2.country_code,
            proxy: anyTrue([
                booleanOrNull(ip2.is_proxy),
                booleanOrNull(valueAt(ip2, "proxy.is_public_proxy")),
                booleanOrNull(valueAt(ip2, "proxy.is_web_proxy")),
            ]),
            tor: valueAt(ip2, "proxy.is_tor"),
            vpn: valueAt(ip2, "proxy.is_vpn"),
            server: valueAt(ip2, "proxy.is_data_center"),
            abuser: valueAt(ip2, "proxy.is_spammer"),
            robot: anyTrue([
                valueAt(ip2, "proxy.is_web_crawler"),
                valueAt(ip2, "proxy.is_scanner"),
                valueAt(ip2, "proxy.is_botnet"),
            ]),
        } : null),
        factorSource("ipapi", "ipapi", ipapi ? {
            country: valueAt(ipapi, "location.country_code"),
            proxy: ipapi.is_proxy,
            tor: ipapi.is_tor,
            vpn: ipapi.is_vpn,
            server: ipapi.is_datacenter,
            abuser: ipapi.is_abuser,
            robot: ipapi.is_crawler,
        } : null),
        factorSource("ipregistry", "ipreg", ipregistry),
        factorSource("IPQS", "IPQS", ipqs ? {
            country: ipqs.country_code,
            proxy: ipqs.proxy,
            tor: ipqs.tor,
            vpn: ipqs.vpn,
            server: null,
            abuser: ipqs.recent_abuse,
            robot: ipqs.bot_status,
        } : null),
        factorSource("Scamalytics", "Scam", scam ? {
            country: valueAt(scamRoot, "external_datasources.maxmind_geolite2.ip_country_code"),
            proxy: valueAt(scamRoot, "external_datasources.firehol.is_proxy"),
            tor: valueAt(scamRoot, "external_datasources.x4bnet.is_tor"),
            vpn: valueAt(scam, "scamalytics_proxy.is_vpn"),
            server: valueAt(scam, "scamalytics_proxy.is_datacenter"),
            abuser: scam.is_blacklisted_external,
            robot: anyTrue([
                valueAt(scamRoot, "external_datasources.x4bnet.is_blacklisted_spambot"),
                valueAt(scamRoot, "external_datasources.x4bnet.is_bot_operamini"),
                valueAt(scamRoot, "external_datasources.x4bnet.is_bot_semrush"),
            ]),
        } : null),
        factorSource("ipdata", "ipdata", ipdata ? {
            country: ipdata.country_code,
            proxy: valueAt(ipdata, "threat.is_proxy"),
            tor: valueAt(ipdata, "threat.is_tor"),
            vpn: null,
            server: valueAt(ipdata, "threat.is_datacenter"),
            abuser: anyTrue([
                valueAt(ipdata, "threat.is_threat"),
                valueAt(ipdata, "threat.is_known_abuser"),
                valueAt(ipdata, "threat.is_known_attacker"),
            ]),
            robot: null,
        } : null),
        factorSource("IPinfo", "IPinfo", ipinfo ? {
            country: ipinfo.country,
            proxy: valueAt(ipinfo, "privacy.proxy"),
            tor: valueAt(ipinfo, "privacy.tor"),
            vpn: valueAt(ipinfo, "privacy.vpn"),
            server: valueAt(ipinfo, "privacy.hosting"),
            abuser: null,
            robot: null,
        } : null),
        factorSource("DB-IP", "DB-IP", dbip),
    ];
}

function factorSource(name, short, values) {
    return Object.assign({
        name,
        short,
        country: null,
        proxy: null,
        tor: null,
        vpn: null,
        server: null,
        abuser: null,
        robot: null,
    }, values || {});
}

function parseIpregistry(html) {
    if (!html) return null;
    const fields = {
        abuser: "Abuser",
        attacker: "Attacker",
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
        const pattern = new RegExp(`${fields[key]}</span>[\\s\\S]{0,9000}?<div class="(?:positive|negative)"[^>]*>[\\s\\S]{0,5000}?\\b(Yes|No)</div>`, "i");
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
    return {
        name,
        usage: formatTypeWithRaw(usage),
        company: formatTypeWithRaw(company),
    };
}

function renderTypeTable(rows) {
    const body = rows.map((row) => {
        return `<tr>${tableCell(row.name, true)}${tableCell(row.usage)}${tableCell(row.company)}</tr>`;
    }).join("");
    return table(
        `<tr>${tableHead("来源")}${tableHead("使用类型")}${tableHead("公司类型")}</tr>`,
        body,
        "11px"
    );
}

function renderRiskTable(rows) {
    const body = rows.map((row) => {
        if (!row.available) {
            return `<tr>${tableCell(row.name, true)}${tableCell("—")}${tableCell("⚪ 未取到")}</tr>`;
        }
        const color = riskColor(row.severity);
        return `<tr>${tableCell(row.name, true)}${tableCell(row.detail || "—")}`
            + `<td style="padding:3px 2px;color:${color};font-weight:600">${escapeHtml(row.label)}</td></tr>`;
    }).join("");
    return table(
        `<tr>${tableHead("数据库")}${tableHead("原始值")}${tableHead("该库判定")}</tr>`,
        body,
        "11px"
    );
}

function renderFactorMatrix(sources) {
    const fields = [
        ["country", "地区"],
        ["proxy", "代理"],
        ["tor", "Tor"],
        ["vpn", "VPN"],
        ["server", "服务器"],
        ["abuser", "滥用"],
        ["robot", "机器人"],
    ];
    const header = `<tr>${tableHead("项目")}${sources.map((source) => {
        return tableHead(source.short);
    }).join("")}</tr>`;
    const body = fields.map((field) => {
        const cells = sources.map((source) => {
            return `<td style="padding:3px 1px;text-align:center">${formatFactorCell(field[0], source[field[0]])}</td>`;
        }).join("");
        return `<tr>${tableCell(field[1], true)}${cells}</tr>`;
    }).join("");
    const legend = '<div style="font-size:9px;color:#8e8e93;margin-top:4px">'
        + 'I2L=IP2Location，ipreg=ipregistry，Scam=Scamalytics；— 表示该来源未提供此字段。</div>';
    return table(header, body, "9px") + legend;
}

function renderMediaTable(rows) {
    const body = rows.map((row) => {
        const status = mediaStatus(row.status);
        return `<tr>${tableCell(row.name, true)}`
            + `<td style="padding:3px 2px;color:${status.color};font-weight:600">${escapeHtml(status.text)}</td>`
            + `${tableCell(row.region ? `[${row.region}]` : "—")}`
            + `${tableCell(row.detail || "—")}</tr>`;
    }).join("");
    return table(
        `<tr>${tableHead("服务")}${tableHead("状态")}${tableHead("地区")}${tableHead("判定依据")}</tr>`,
        body,
        "10px"
    ) + '<div style="font-size:9px;color:#8e8e93;margin-top:4px">请求方式均为所选节点的 HTTP；Loon 无 DNS API，不能判定“原生/DNS”解锁方式。</div>';
}

function renderCapabilityTable() {
    const rows = [
        ["本地 25 端口", "未检测", "generic 无任意 TCP/socket API"],
        ["邮件服务商 25 端口", "未检测", "无法进行 SMTP 握手"],
        ["DNSBL 黑名单", "未检测", "无节点 DNS API；公共 DoH 结果不等价"],
        ["解锁方式", "未检测", "无法区分原生解析与 DNS 解锁"],
    ];
    const body = rows.map((row) => {
        return `<tr>${tableCell(row[0], true)}${tableCell(row[1])}${tableCell(row[2])}</tr>`;
    }).join("");
    return table(
        `<tr>${tableHead("项目")}${tableHead("结果")}${tableHead("真实原因")}</tr>`,
        body,
        "10px"
    );
}

function buildAudit(data) {
    const checks = [
        ["MaxMind", !!(data.basic && data.basic.Country)],
        ["IPPure", !!(data.ippure && data.ippure.ip)],
        ["ipapi", !!(data.ipapi && data.ipapi.ip)],
        ["IPinfo", !!(data.ipinfo && data.ipinfo.data)],
        ["IP2Location", !!(data.ip2location && data.ip2location.ip)],
        ["Scamalytics", !!(data.scamalytics && data.scamalytics.scamalytics)],
        ["AbuseIPDB", !!(data.abuseipdb && data.abuseipdb.data)],
        ["IPQS", numberOrNull(data.ipqs && data.ipqs.fraud_score) !== null],
        ["ipdata", !!(data.ipdata && data.ipdata.ip)],
        ["ipregistry", !!parseIpregistry(data.ipregistry)],
        ["DB-IP", !!(parseDbipRisk(data.dbip) || parseDbip(data.dbip))],
    ];
    return {
        total: checks.length,
        success: checks.filter((item) => item[1]).map((item) => item[0]),
        failed: checks.filter((item) => !item[1]).map((item) => item[0]),
    };
}

function formatFactorCell(field, value) {
    if (field === "country") {
        const code = cleanValue(value);
        return code && code.length === 2
            ? `<span style="color:#34c759">[${escapeHtml(code.toUpperCase())}]</span>`
            : '<span style="color:#8e8e93">—</span>';
    }
    const boolean = booleanOrNull(value);
    if (boolean === true) return '<span style="color:#ff3b30;font-weight:700">是</span>';
    if (boolean === false) return '<span style="color:#34c759">否</span>';
    return '<span style="color:#8e8e93">—</span>';
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

function table(header, body, fontSize) {
    return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:${fontSize}">${header}${body}</table>`;
}

function tableHead(value) {
    return `<th style="padding:3px 1px;border-bottom:1px solid #d1d1d6;text-align:center;color:#8e8e93">${escapeHtml(value)}</th>`;
}

function tableCell(value, bold) {
    return `<td style="padding:3px 2px;border-bottom:1px solid #eeeeef;text-align:center${bold ? ";font-weight:600" : ""}">${escapeHtml(value)}</td>`;
}

function mediaResult(name, status, region, detail) {
    return { name, status, region: region || "", detail: detail || "" };
}

function section(title, content) {
    return `<div style="margin-top:12px"><div style="color:#ff6347;font-weight:700;margin-bottom:4px">—— ${escapeHtml(title)} ——</div>${content}</div>`;
}

function line(label, value) {
    return `<div><b>${escapeHtml(label)}</b>：${escapeHtml(value)}</div>`;
}

function richLine(label, htmlValue) {
    return `<div><b>${escapeHtml(label)}</b>：${htmlValue}</div>`;
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
        if (String(url).indexOf(IPQUALITY_BACKEND) === 0) requestOptions.alpn = "h2";
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
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(text) || /^[0-9a-f:]+$/i.test(text);
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

function formatType(type) {
    const clean = cleanValue(type);
    if (!clean) return "未取到";
    const phraseMap = {
        "DATA CENTER/WEB HOSTING/TRANSIT": "机房",
        "FIXED LINE ISP": "家宽",
        "MOBILE ISP": "移动网络",
        "CONTENT DELIVERY NETWORK": "CDN",
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
