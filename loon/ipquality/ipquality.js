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

const SCRIPT_VERSION = "2026-07-18.r1";
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
        capture(requestJson(IPPURE_URL)),
        capture(requestJson(IPIFY_URL)),
        capture(requestJson(IPAPI_URL)),
        capture(requestText("https://icanhazip.com/")),
    ]);
    const ippure = probes[0].ok ? probes[0].value : null;
    const candidates = [
        ippure && ippure.ip,
        probes[1].ok && probes[1].value.ip,
        probes[2].ok && probes[2].value.ip,
        probes[3].ok && String(probes[3].value).trim(),
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
    if (region) return mediaResult("TikTok", "yes", region);
    if (response.status === 403 || /not available|access denied/i.test(response.body)) {
        return mediaResult("TikTok", "no", "", "不可用");
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
    if (session.inSupportedLocation === true) return mediaResult("Disney+", "yes", region);
    if (session.inSupportedLocation === false) return mediaResult("Disney+", "no", region, "地区受限");
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
        return mediaResult("Netflix", "no", "", "被拒绝");
    }
    const pages = responses.map((response) => response.body);
    const region = firstMatch(pages.join("\n"), [
        /"countryCode"\s*:\s*"([A-Z]{2})"/i,
        /"id"\s*:\s*"([A-Z]{2})"\s*,\s*"countryName"/i,
    ]);
    const unavailable = pages.map((body) => /Oh no!|NSEZ-404/i.test(body));
    if (unavailable[0] && unavailable[1]) {
        return mediaResult("Netflix", "partial", region, "仅自制剧");
    }
    if (responses.some((response) => response.status >= 200 && response.status < 400)) {
        return mediaResult("Netflix", "yes", region);
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
        return mediaResult("YouTube", "no", "CN", "中国大陆");
    }
    const region = firstMatch(response.body, [/"contentRegion"\s*:\s*"([A-Z]{2})"/i]);
    if (region && /ad-free|YouTube Premium/i.test(response.body)) {
        return mediaResult("YouTube", "yes", region);
    }
    if (/Premium is not available in your country/i.test(response.body)) {
        return mediaResult("YouTube", "partial", region, "无 Premium");
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
    if (region) return mediaResult("Prime Video", "yes", region);
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
    if (response.status === 200) return mediaResult("Reddit", "yes", region);
    if (response.status === 403) return mediaResult("Reddit", "no", "", "被拒绝");
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
    const webBlocked = !!(web && /unsupported_country/i.test(web.body));
    const appBlocked = !!(app && /unsupported_country|VPN/i.test(app.body));

    if (!web && !app) return mediaResult("ChatGPT", "unknown", region, "请求失败");
    if (webBlocked && appBlocked) return mediaResult("ChatGPT", "no", region, "Web/App 受限");
    if (webBlocked) return mediaResult("ChatGPT", "partial", region, "仅 App");
    if (appBlocked) return mediaResult("ChatGPT", "partial", region, "仅 Web");
    return mediaResult("ChatGPT", "yes", region);
}

function render(ip, data, media) {
    const basic = buildBasic(ip, data);
    const risks = buildRisks(data);
    const factors = buildFactors(data);
    const maxSeverity = risks.reduce((max, item) => {
        return item.available ? Math.max(max, item.severity) : max;
    }, 0);
    const meta = severityMeta(maxSeverity);

    const riskLines = risks.map((item) => {
        if (!item.available) return line(item.name, "⚪ 未取到");
        return line(item.name, `${riskIcon(item.severity)} ${item.label}${item.detail ? ` (${item.detail})` : ""}`);
    }).join("");

    const factorLines = factors.map((item) => {
        return line(item.name, item.text);
    }).join("");

    const mediaLines = mediaEnabled
        ? media.map((item) => line(item.name, formatMedia(item))).join("")
        : line("流媒体", "已关闭");

    const html = [
        '<div style="font-family:-apple-system;font-size:15px;line-height:1.55;text-align:left">',
        section("基础信息", [
            line("IP", maskIPAddress(ip)),
            line("ASN", basic.asn),
            line("位置", basic.location),
            line("类型", basic.type),
            line("节点", nodeName),
        ].join("")),
        section("多源风险评分", riskLines),
        section("风险因素", factorLines),
        section("流媒体与 AI", mediaLines),
        section("邮件与黑名单", [
            line("25 端口", "⚪ Loon 不支持原始 TCP，未检测"),
            line("DNSBL", "⚪ 公共 DoH 易误报，未检测"),
        ].join("")),
        '<div style="margin-top:10px;color:#8e8e93;font-size:12px">各数据库口径不同；“未取到”不代表低风险。</div>',
        "</div>",
    ].join("");

    $done({
        title: "节点 IP 质量检测",
        htmlMessage: html,
        icon: meta.icon,
        "title-color": meta.color,
    });
}

function buildBasic(ip, data) {
    const ipapi = data.ipapi || {};
    const ippure = data.ippure || {};
    const ip2 = data.ip2location || {};
    const basic = data.basic || {};
    const basicASN = basic.ASN || {};
    const basicCity = basic.City || {};
    const basicCountry = basic.Country || {};
    const location = ipapi.location || {};
    const asn = ipapi.asn || {};
    const code = location.country_code || ippure.countryCode || ip2.country_code
        || (basicCountry.IsoCode || "");
    const country = location.country || ippure.country || ip2.country_name
        || basicCountry.Name || "";
    const city = location.city || ippure.city || ip2.city_name || basicCity.Name || "";
    const asnNumber = asn.asn || ippure.asn || ip2.asn || basicASN.AutonomousSystemNumber;
    const organization = asn.org || ippure.asOrganization || ip2.as
        || basicASN.AutonomousSystemOrganization || "";
    const typeCode = ip2.usage_type || (asn.type ? String(asn.type).toUpperCase() : "");

    return {
        ip,
        asn: asnNumber ? `AS${asnNumber} ${organization}`.trim() : "未取到",
        location: [flagEmoji(code), country, city].filter(Boolean).join(" ") || "未取到",
        type: formatType(typeCode),
    };
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
    const abuse = data.abuseipdb && data.abuseipdb.data ? data.abuseipdb.data : null;
    const ipdata = data.ipdata;
    const ipqs = data.ipqs;
    const scam = data.scamalytics && data.scamalytics.scamalytics
        ? data.scamalytics.scamalytics
        : null;

    return [
        factorLine("IPinfo", ipinfo ? {
            proxy: valueAt(ipinfo, "privacy.proxy"),
            tor: valueAt(ipinfo, "privacy.tor"),
            vpn: valueAt(ipinfo, "privacy.vpn"),
            server: valueAt(ipinfo, "privacy.hosting"),
            relay: valueAt(ipinfo, "privacy.relay"),
        } : null, sourceType(ipinfo && ipinfo.asn, ipinfo && ipinfo.company)),
        factorLine("ipregistry", ipregistry, ""),
        factorLine("ipapi", ipapi ? {
            proxy: ipapi.is_proxy,
            tor: ipapi.is_tor,
            vpn: ipapi.is_vpn,
            server: ipapi.is_datacenter,
            abuser: ipapi.is_abuser,
            robot: ipapi.is_crawler,
        } : null, sourceType(ipapi && ipapi.asn, ipapi && ipapi.company)),
        factorLine("IP2Location", ip2 ? {
            proxy: ip2.is_proxy,
            tor: valueAt(ip2, "proxy.is_tor"),
            vpn: valueAt(ip2, "proxy.is_vpn"),
            server: valueAt(ip2, "proxy.is_data_center"),
            abuser: valueAt(ip2, "proxy.is_spammer"),
            robot: anyTrue([
                valueAt(ip2, "proxy.is_web_crawler"),
                valueAt(ip2, "proxy.is_scanner"),
                valueAt(ip2, "proxy.is_botnet"),
            ]),
        } : null, typePair(ip2 && ip2.usage_type, valueAt(ip2, "as_info.as_usage_type"))),
        factorLine("AbuseIPDB", abuse ? {
            tor: abuse.isTor,
            server: /Data Center|Hosting|Transit/i.test(abuse.usageType || ""),
            abuser: numberOrNull(abuse.abuseConfidenceScore) > 0,
        } : null, abuse && abuse.usageType),
        factorLine("ipdata", ipdata ? {
            proxy: valueAt(ipdata, "threat.is_proxy"),
            tor: valueAt(ipdata, "threat.is_tor"),
            server: valueAt(ipdata, "threat.is_datacenter"),
            abuser: anyTrue([
                valueAt(ipdata, "threat.is_threat"),
                valueAt(ipdata, "threat.is_known_abuser"),
                valueAt(ipdata, "threat.is_known_attacker"),
            ]),
        } : null, valueAt(ipdata, "asn.type")),
        factorLine("IPQS", ipqs ? {
            proxy: ipqs.proxy,
            tor: ipqs.tor,
            vpn: ipqs.vpn,
            abuser: ipqs.recent_abuse,
            robot: ipqs.bot_status,
        } : null, ""),
        factorLine("Scamalytics", scam ? {
            proxy: valueAt(scam, "scamalytics_proxy.is_proxy"),
            vpn: valueAt(scam, "scamalytics_proxy.is_vpn"),
            server: valueAt(scam, "scamalytics_proxy.is_datacenter"),
            relay: valueAt(scam, "scamalytics_proxy.is_apple_icloud_private_relay"),
        } : null, ""),
    ];
}

function factorLine(name, flags, type) {
    if (!flags) return { name, text: "⚪ 未取到" };
    const labels = {
        proxy: "代理",
        tor: "Tor",
        vpn: "VPN",
        server: "机房",
        abuser: "滥用",
        robot: "机器人",
        relay: "中继",
    };
    const known = Object.keys(labels).filter((key) => typeof flags[key] === "boolean");
    const marked = known.filter((key) => flags[key]).map((key) => labels[key]);
    const prefix = type ? `${formatType(type)} · ` : "";
    return {
        name,
        text: marked.length ? `${prefix}🟠 ${marked.join(" / ")}` : `${prefix}✅ 无标记`,
    };
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
    return result;
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

function formatMedia(item) {
    const region = item.region ? ` [${escapeHtml(item.region)}]` : "";
    const detail = item.detail ? ` · ${escapeHtml(item.detail)}` : "";
    if (item.status === "yes") return `✅ 解锁${region}${detail}`;
    if (item.status === "partial") return `🟡 部分可用${region}${detail}`;
    if (item.status === "no") return `❌ 不可用${region}${detail}`;
    return `⚪ 未确认${region}${detail}`;
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
    const booleans = values.filter((value) => typeof value === "boolean");
    if (!booleans.length) return null;
    return booleans.some(Boolean);
}

function sourceType(asn, company) {
    return typePair(asn && asn.type, company && company.type);
}

function typePair(left, right) {
    const values = [left, right].filter(Boolean).map((value) => String(value));
    return values.filter((value, index) => values.indexOf(value) === index).join("/");
}

function formatType(type) {
    if (!type) return "未取到";
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
    return String(type).split("/").map((part) => {
        const key = part.trim().toUpperCase();
        return map[key] || part.trim();
    }).filter(Boolean).join("/");
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

function riskIcon(severity) {
    if (severity >= 4) return "🛑";
    if (severity >= 3) return "⚠️";
    if (severity >= 2) return "🔶";
    return "✅";
}

function severityMeta(severity) {
    if (severity >= 4) return { icon: "xmark.octagon.fill", color: "#8E0000" };
    if (severity >= 3) return { icon: "exclamationmark.triangle.fill", color: "#FF3B30" };
    if (severity >= 2) return { icon: "exclamationmark.circle.fill", color: "#FF9500" };
    return { icon: "checkmark.shield.fill", color: "#34C759" };
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
