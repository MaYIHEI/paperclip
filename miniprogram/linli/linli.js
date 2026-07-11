/**
 * 林里 · 每日签到领积分
 *
 * 抓取:打开「林里」小程序 → 进入签到页,自动抓取 Cookie
 * 签到:cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-07-11
 *
 * ===== Loon =====
 * [MITM]
 * hostname = webapi.qmai.cn
 * [Script]
 * http-request ^https:\/\/webapi\.qmai\.cn\/web\/cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar) tag=林里 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png
 * cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js, tag=林里签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = webapi.qmai.cn
 * [Script]
 * 林里 Cookie = type=http-request,pattern=^https:\/\/webapi\.qmai\.cn\/web\/cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png
 * 林里签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = webapi.qmai.cn
 * [rewrite_local]
 * ^https:\/\/webapi\.qmai\.cn\/web\/cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js
 * [task_local]
 * 15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js, tag=林里签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 林里签到
 *       cron: '15 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "webapi.qmai.cn"
 *   script:
 *     - match: ^https:\/\/webapi\.qmai\.cn\/web\/cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar)
 *       name: 林里 Cookie
 *       type: request
 *       require-body: true
 * script-providers:
 *   林里签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js
 *     interval: 86400
 */

const $ = new Env("林里");

const SCRIPT_VERSION = "2026-07-11.r3"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = "linli_data";
const CK_CLEAR = "linli_clear";
const CK_DEBUG = "linli_debug";
const BASE = "https://webapi.qmai.cn/web/cmk-center/sign";
const DROP_HEADERS = ["content-length", "host", "connection", "accept-encoding"];

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata(CK_DEBUG)) || "false";
$.messages = [];

function captureCookie() {
    try {
        const headers = cleanHeaders($request.headers || {});
        const lower = lowerKeys(headers);
        const token = lower["qm-user-token"] || "";
        const body = parseJSON($request.body, {});
        const activityId = body.activityId || "";
        const appid = body.appid || "";
        const storeId = lower["store-id"] || body.storeId || "";

        $.log(`[capture] token=${token ? "有" : "无"} activityId=${activityId || "无"} storeId=${storeId || "无"}`);
        if (!token || !activityId || !storeId || !appid) {
            $.log("[capture] 字段不完整,请重新进入签到页");
            return;
        }

        const data = { headers, activityId: String(activityId), storeId: String(storeId), appid: String(appid) };
        const saved = $.setdata(JSON.stringify(data), CK_KEY);
        const checked = parseJSON($.getdata(CK_KEY), {});
        if (!saved || checked.activityId !== data.activityId) {
            throw new Error("Cookie 写入失败");
        }
        $.msg($.name, "✅ 林里 Cookie 获取成功", "可关闭抓包,cron 自动签到");
    } catch (e) {
        $.log(`[ERROR] Cookie 抓取异常: ${e.message || e}`);
    }
}

function maybeClear() {
    if (($.getdata(CK_CLEAR) || "false") !== "true") return false;
    $.setdata("", CK_KEY);
    $.setdata("false", CK_CLEAR);
    $.msg($.name, "🗑 已清除 Cookie", "重新进入林里小程序签到页抓取");
    return true;
}

async function checkin() {
    const raw = $.isNode() ? process.env.LINLI_DATA : $.getdata(CK_KEY);
    const auth = parseJSON(raw, null);
    if (!auth || !auth.headers || !auth.activityId || !auth.storeId || !auth.appid) {
        throw new Error("未配置 Cookie,请进入林里小程序签到页抓取");
    }

    const headers = cleanHeaders(auth.headers);
    const common = { activityId: auth.activityId, appid: auth.appid };
    const before = await api("/userSignStatistics", headers, common);
    debug(before, "userSignStatistics(before)");
    assertAuth(before);

    if (isSigned(before)) {
        $.messages.push(formatStatus("✨ 今日已签到", before));
        return;
    }

    const sign = await api("/takePartInSign", headers, {
        activityId: auth.activityId,
        storeId: auth.storeId,
        appid: auth.appid,
    });
    debug(sign, "takePartInSign");
    assertAuth(sign);

    if (sign && sign.status === true) {
        const rewards = rewardText(sign.data && sign.data.rewardDetailList);
        const after = await api("/userSignStatistics", headers, common);
        debug(after, "userSignStatistics(after)");
        $.messages.push(formatStatus(`✅ 签到成功${rewards ? `: ${rewards}` : ""}`, after));
        return;
    }

    const message = String((sign && sign.message) || "");
    if (/已签到|重复签到/.test(message)) {
        $.messages.push("✨ 今日已签到");
        return;
    }
    throw new Error(`签到失败: ${message || short(sign)}`);
}

function api(path, headers, body) {
    return new Promise((resolve) => {
        const opts = { url: BASE + path, headers, body: JSON.stringify(body) };
        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] POST ${path}: ${short(err)}`);
                resolve(null);
                return;
            }
            const result = parseJSON(data, null);
            if (!result) $.log(`[ERROR] ${path} 响应解析失败: ${String(data || "").slice(0, 300)}`);
            resolve(result);
        });
    });
}

function assertAuth(res) {
    if (!res) throw new Error("网络无响应,请稍后重试");
    const message = String(res.message || "");
    if ([9001, 10008, 41000].includes(Number(res.code)) || /token|登录|鉴权|未授权|失效|过期/i.test(message)) {
        throw new Error(`Cookie 已失效,请重新进入签到页抓取: ${message || `code=${res.code}`}`);
    }
}

function isSigned(res) {
    return !!(res && res.status === true && res.data && Number(res.data.signStatus) === 1);
}

function formatStatus(prefix, res) {
    const data = (res && res.data) || {};
    const days = Number(data.signDays);
    return Number.isFinite(days) && days > 0 ? `${prefix} · 连续 ${days} 天` : prefix;
}

function rewardText(list) {
    if (!Array.isArray(list)) return "";
    return list.map((item) => item && item.rewardName ? `+${item.sendNum || 1} ${item.rewardName}` : "").filter(Boolean).join("、");
}

function cleanHeaders(raw) {
    const out = {};
    Object.keys(raw || {}).forEach((key) => {
        if (key.startsWith(":")) return;
        if (DROP_HEADERS.includes(key.toLowerCase())) return;
        out[key] = raw[key];
    });
    if (!lowerKeys(out)["content-type"]) out["content-type"] = "application/json";
    return out;
}

function lowerKeys(obj) {
    const out = {};
    Object.keys(obj || {}).forEach((key) => { out[key.toLowerCase()] = obj[key]; });
    return out;
}

function parseJSON(value, fallback) {
    if (value && typeof value === "object") return value;
    try { return JSON.parse(value); } catch (_) { return fallback; }
}

function short(value) {
    return (typeof value === "string" ? value : JSON.stringify(value || {})).slice(0, 300);
}

function debug(content, title) {
    if ($.is_debug !== "true") return;
    $.log(`\n----- ${title} -----`);
    $.log(short(content));
    $.log("----- end -----\n");
}

if (typeof $request !== "undefined") {
    captureCookie();
    $.done();
} else {
    (async () => {
        if (maybeClear()) return;
        await checkin();
    })().catch((e) => {
        $.messages.push(`❌ ${e.message || e}`);
        $.logErr(e);
    }).finally(() => {
        if ($.messages.length) $.msg($.name, "", $.messages.join("\n"));
        $.done();
    });
}

function Env(name) {
    this.name = name;
    this.startTime = Date.now();
    this.isNode = () => typeof module !== "undefined" && !!module.exports;
    this.isQuanX = () => typeof $task !== "undefined";
    this.isLoon = () => typeof $loon !== "undefined";
    this.isSurge = () => typeof $environment !== "undefined" && !!$environment["surge-version"];
    this.getdata = (key) => this.isNode() ? null : this.isQuanX() ? $prefs.valueForKey(key) : $persistentStore.read(key);
    this.setdata = (value, key) => this.isNode() ? false : this.isQuanX() ? $prefs.setValueForKey(value, key) : $persistentStore.write(value, key);
    this.post = (opts, callback) => {
        if (this.isNode()) {
            const https = require("https");
            const target = new URL(opts.url);
            const request = https.request({
                hostname: target.hostname,
                path: target.pathname + target.search,
                method: "POST",
                headers: opts.headers,
                timeout: 12000,
            }, (resp) => {
                let body = "";
                resp.on("data", (chunk) => { body += chunk; });
                resp.on("end", () => callback(null, resp, body));
            });
            request.on("timeout", () => request.destroy(new Error("请求超时")));
            request.on("error", (err) => callback(err));
            request.end(opts.body || "");
        } else if (this.isQuanX()) {
            opts.method = "POST";
            $task.fetch(opts).then((resp) => callback(null, resp, resp.body), (err) => callback(err));
        } else {
            $httpClient.post(opts, (err, resp, body) => callback(err, resp, body));
        }
    };
    this.msg = (title = name, subtitle = "", body = "") => this.isNode() ? this.log(title, subtitle, body) : this.isQuanX() ? $notify(title, subtitle, body) : $notification.post(title, subtitle, body);
    this.log = (...args) => console.log(args.join(" "));
    this.logErr = (err) => this.log(`[ERROR] ${err && err.stack ? err.stack : err}`);
    this.done = (value = {}) => {
        this.log(`[INFO] 运行耗时 ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`);
        if (typeof $done !== "undefined") $done(value);
    };
}
