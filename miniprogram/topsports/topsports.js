/**
 * 滔搏运动 · 每日签到(每日中心签到领积分)  [📦 已归档]
 *
 * 归档原因:Authorization(小程序 Bearer)~1h + QZ_SID(H5 公众号 OAuth)< 1 天,
 *           两道 auth 均依赖微信前台交互续命,纯后台 cron 无解。
 *
 * 抓取:首次进「每日中心」页完整抓 Cookie;此后开小程序任意页即自动刷新 Authorization
 *       微信内打开任意滔搏 H5 链接 → 自动捕获 QZ_SID(H5 会话)
 * 签到:cron 定时自动签到;Authorization 失效时自动降级到 H5 会话(QZ_SID)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-07
 *
 * ===== Loon =====
 * [MITM]
 * hostname = m.topsports.com.cn, wxmall.topsports.com.cn
 * [Script]
 * http-request ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo tag=滔搏 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
 * http-request ^https:\/\/wxmall\.topsports\.com\.cn\/shopMember\/ tag=滔搏 Auth, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
 * http-response ^https:\/\/m\.topsports\.com\.cn\/ tag=滔搏 H5, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
 * cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, tag=滔搏签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = m.topsports.com.cn, wxmall.topsports.com.cn
 * [Script]
 * 滔搏 Cookie = type=http-request,pattern=^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
 * 滔搏 Auth = type=http-request,pattern=^https:\/\/wxmall\.topsports\.com\.cn\/shopMember\/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
 * 滔搏 H5 = type=http-response,pattern=^https:\/\/m\.topsports\.com\.cn\/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
 * 滔搏签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = m.topsports.com.cn, wxmall.topsports.com.cn
 * [rewrite_local]
 * ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
 * ^https:\/\/wxmall\.topsports\.com\.cn\/shopMember\/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
 * ^https:\/\/m\.topsports\.com\.cn\/ url script-response-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
 * [task_local]
 * 15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, tag=滔搏签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 滔搏签到
 *       cron: '15 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "m.topsports.com.cn"
 *     - "wxmall.topsports.com.cn"
 *   script:
 *     - match: ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo
 *       name: 滔搏 Cookie
 *       type: request
 *       require-body: false
 *     - match: ^https:\/\/wxmall\.topsports\.com\.cn\/shopMember\/
 *       name: 滔搏 Auth
 *       type: request
 *       require-body: false
 *     - match: ^https:\/\/m\.topsports\.com\.cn\/
 *       name: 滔搏 H5
 *       type: response
 *       require-body: false
 * script-providers:
 *   滔搏签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
 *     interval: 86400
 */

const $ = new Env("滔搏");

const SCRIPT_VERSION = "2026-06-07.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_COOKIE = "topsports_cookie"; // 完整 Cookie(含 Authorization=UUID, memberId)
const CK_QZSID = "topsports_qzsid";  // H5 WeChat 公众号会话,有效期通常远超 1 小时

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("topsports_debug")) || "false";
$.messages = [];

const HOST = "https://m.topsports.com.cn";
const BRAND = "TS";
// 小程序 WebView UA(含 miniProgram 标识)
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.74(0x18004a24) NetType/WIFI Language/zh_CN miniProgram/wx71a6af1f91734f18";
// 微信浏览器 UA(不含 miniProgram,用于 H5 会话请求)
const UA_H5 = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.74(0x18004a24) NetType/WIFI Language/zh_CN";

// ============ Cookie 抓取 ============

function getCookie() {
    try {
        const url = $request.url || "";

        // 原生小程序(wxmall.topsports.com.cn):开 app 即触发,静默刷新 Authorization
        if (/wxmall\.topsports\.com\.cn/.test(url)) {
            updateAuth();
            return;
        }

        // H5 WebView(m.topsports.com.cn/h5/act/signIn/actInfo):首次完整抓取
        const headers = lowerKeys($request.headers);
        // HTTP/2 下滔搏用多个独立 cookie: 头,Loon 合并时会残留 "cookie:" 脏前缀,
        // 不清理的话回放只能解出最前面的 Authorization,doSign 缺 appletsSource/memberId 会 50010(踩坑 #29)
        const cookie = normalizeCookie(headers["cookie"]);
        if (!/Authorization=/i.test(cookie)) {
            $.log("[WARN] Cookie 里没有 Authorization,跳过");
            return;
        }
        // doSign 额外校验小程序来源(appletsSource)+ 会员(memberId),缺了就权限不足
        if (!/appletsSource=/i.test(cookie) || !/memberId=/i.test(cookie)) {
            $.log("[WARN] Cookie 缺 appletsSource/memberId,doSign 可能 50010,建议重进每日中心页重抓");
        }
        if (cookie === $.getdata(CK_COOKIE)) {
            $.log("[INFO] Cookie 未变化");
            return;
        }
        $.setdata(cookie, CK_COOKIE);
        $.msg($.name, "🎉 Cookie 已抓取", "可关闭抓包,主脚本自动签到");
    } catch (e) {
        $.log(`[ERROR] cookie 抓取异常: ${e}`);
    }
}

// 原生小程序每次开 app 都带最新 Bearer token,比对存储后静默覆盖
// 登录前的请求仍用旧 token(与存储相同 → 跳过);登录后首个请求换新 token → 自动更新
function updateAuth() {
    try {
        const bearer = ((lowerKeys($request.headers)["authorization"]) || "")
            .replace(/^Bearer\s+/i, "").trim();
        if (!bearer) return;

        const stored = $.getdata(CK_COOKIE);
        if (!stored) return; // 尚未做过初始 H5 抓取

        const cur = (/Authorization=([^;]+)/i.exec(stored) || [])[1] || "";
        if (cur === bearer) return; // 未变化

        const updated = cur
            ? stored.replace(/Authorization=[^;]+/i, `Authorization=${bearer}`)
            : `${stored}; Authorization=${bearer}`;
        $.setdata(updated, CK_COOKIE);
        $.log(`[INFO] Authorization 已自动刷新 (…${bearer.slice(-6)})`);
    } catch (e) {
        $.log(`[ERROR] updateAuth: ${e}`);
    }
}

// 微信 H5 OAuth 回调会在响应头带 Set-Cookie: QZ_SID(服务端会话,有效期通常远超 1 小时)
// http-response 规则触发,仅检查响应头,无需响应体
function captureQzSid() {
    try {
        const sc = $response.headers && ($response.headers["Set-Cookie"] || $response.headers["set-cookie"]);
        if (!sc) return;
        const m = /QZ_SID=([^;,\s]+)/i.exec(String(sc));
        if (!m) return;
        const val = m[1];
        if (val === $.getdata(CK_QZSID)) return; // 未变化,静默退出
        $.setdata(val, CK_QZSID);
        $.msg($.name, "🔐 H5 会话已更新", `QZ_SID 已捕获,签到将自动使用(…${val.slice(-6)})`);
        $.log(`[INFO] QZ_SID 已捕获 (…${val.slice(-6)})`);
    } catch (e) {
        $.log(`[ERROR] captureQzSid: ${e}`);
    }
}

// ============ 业务 ============

function commonHeaders() {
    // 对齐小程序真实请求头(version + sec-fetch-* 等),与浏览器一致即可。
    // 注:doSign 50010 的真正原因是 acw_tc 过期(见 refreshAcwTc),不是这些头。
    // version 从 cookie 里取,app 升版自动跟,兜底 4.15.1。
    const version = getCookieVal("version") || "4.15.1";
    return {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        brandcode: BRAND,
        version,
        origin: HOST,
        Referer: `${HOST}/m/dailycenter?brandCode=${BRAND}&share=true&minienv=1`,
        "accept-language": "zh-CN,zh-Hans;q=0.9",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        priority: "u=3, i",
        "User-Agent": UA,
        Cookie: $.cookie,
    };
}

function h5Headers(cookie) {
    // H5 微信浏览器请求头:无 minienv,无小程序标识,加 originH5Flag
    return {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        brandcode: BRAND,
        originH5Flag: "true",
        origin: HOST,
        Referer: `${HOST}/m/dailycenter?brandCode=${BRAND}`,
        "accept-language": "zh-CN,zh-Hans;q=0.9",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        "User-Agent": UA_H5,
        Cookie: cookie,
    };
}

async function checkin() {
    // 0) 先刷新 acw_tc(详见 refreshAcwTc 注释):doSign 受阿里云 WAF 保护,
    //    需有效 acw_tc,而它只由会话入口下发、签到接口不刷新,cron 旧值过 30 分钟即失效。
    await refreshAcwTc();

    // 1) 取活动信息(动态 activityId)
    const actInfo = await request("GET", `/h5/act/signIn/actInfo?brandCode=${BRAND}`, null);
    debug(actInfo, "actInfo");
    if (!actInfo || actInfo.code !== 1 || !actInfo.data || !actInfo.data.activityId) {
        throw new Error(`取活动信息失败(可能 Cookie 失效): ${$.toStr(actInfo)}`);
    }
    const activityId = actInfo.data.activityId;
    $.log(`[INFO] activityId=${activityId}`);

    // 2) 签到
    const res = await request("POST", "/h5/act/signIn/doSign", { activityId, brandCode: BRAND });
    debug(res, "doSign");

    if (res && res.data && res.data.signInSuccess === true) {
        const prize = (res.data.signInPrizeSendResultDTOList || [])
            .map((p) => `${p.prizeName || ""}+${p.prizeValue || ""}`)
            .join(", ");
        $.messages.push(`✅ 签到成功${prize ? ": " + prize : ""}`);
    } else if (res && (res.bizCode === 20001 || /已签|重复/.test(res.bizMsg || ""))) {
        $.messages.push("✨ 今日已签到");
    } else if (res && res.errorCode === 50010) {
        // 50010 = Authorization 已失效(1 小时服务端 TTL)。尝试 H5 会话降级。
        const qzSid = $.getdata(CK_QZSID);
        if (qzSid) {
            $.log("[INFO] Authorization 失效,降级到 H5 会话(QZ_SID)…");
            await checkinH5(activityId, qzSid);
        } else {
            $.messages.push(
                "❌ Authorization 已失效,且无 H5 会话\n" +
                "👉 在微信中打开以下链接触发自动捕获:\n" +
                "https://m.topsports.com.cn/h5/act/signIn/index"
            );
        }
    } else {
        $.messages.push(`❌ 签到失败: ${res ? res.message || res.bizMsg || $.toStr(res) : "无响应"}`);
    }
}

// Authorization 失效后降级:用 H5 会话(QZ_SID)重试 doSign
async function checkinH5(activityId, qzSid) {
    const cookie = `QZ_SID=${qzSid}`;
    const res = await requestH5("POST", "/h5/act/signIn/doSign", { activityId, brandCode: BRAND }, cookie);
    debug(res, "doSign(H5)");

    if (!res) {
        $.log(`[DEBUG] H5 doSign 无响应,QZ_SID=…${qzSid.slice(-6)}`);
        $.messages.push("❌ H5 签到无响应 (详情见日志)");
        return;
    }
    if (res.data && res.data.signInSuccess === true) {
        const prize = (res.data.signInPrizeSendResultDTOList || [])
            .map((p) => `${p.prizeName || ""}+${p.prizeValue || ""}`)
            .join(", ");
        $.messages.push(`✅ 签到成功(H5)${prize ? ": " + prize : ""}`);
    } else if (res.bizCode === 20001 || /已签|重复/.test(res.bizMsg || "")) {
        $.messages.push("✨ 今日已签到(H5)");
    } else if (res.errorCode === 50010) {
        // H5 会话也失效了,清空等待重捕
        $.setdata("", CK_QZSID);
        $.messages.push(
            "❌ H5 会话也已失效\n" +
            "👉 在微信中打开以下链接触发重新捕获:\n" +
            "https://m.topsports.com.cn/h5/act/signIn/index"
        );
    } else {
        $.log(`[DEBUG] H5 doSign 前200: ${$.toStr(res).substring(0, 200)}`);
        $.messages.push(`❌ H5 签到失败: ${res.message || res.bizMsg || $.toStr(res).substring(0, 100)}`);
    }
}

// ============ 请求 ============

function request(method, path, body) {
    return new Promise((resolve) => {
        const opts = { url: `${HOST}${path}`, headers: commonHeaders() };
        if (method === "POST" && body) opts.body = JSON.stringify(body);

        debug({ method, url: opts.url, body: opts.body }, `${method} request`);

        const fn = method === "POST" ? $.post : $.get;
        fn.call($, opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] ${method} ${path}: ${$.toStr(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(typeof data === "string" ? JSON.parse(data) : data);
            } catch (e) {
                $.log(`[ERROR] 响应解析失败: ${(data || "").substring(0, 300)}`);
                resolve(null);
            }
        });
    });
}

function requestH5(method, path, body, cookie) {
    return new Promise((resolve) => {
        const opts = { url: `${HOST}${path}`, headers: h5Headers(cookie) };
        if (method === "POST" && body) opts.body = JSON.stringify(body);

        debug({ method, url: opts.url, cookie }, `${method} H5 request`);

        const fn = method === "POST" ? $.post : $.get;
        fn.call($, opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] H5 ${method} ${path}: ${$.toStr(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(typeof data === "string" ? JSON.parse(data) : data);
            } catch (e) {
                $.log(`[ERROR] H5 响应解析失败: ${(data || "").substring(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// ============ acw_tc 刷新 ============

// doSign 受阿里云 WAF 保护,必须带有效 acw_tc(Set-Cookie 下发,Max-Age=1800/30 分钟、HttpOnly)。
// 关键:acw_tc 只由会话入口 /static/setCookieApplets.html 下发,签到接口本身不刷新它。
// 所以小程序每次进「每日中心」页都先请求这个入口拿新 acw_tc;而 cron 用的是抓包时存下的旧 acw_tc,
// 过 30 分钟即失效 → doSign 被 WAF 拦 50010「权限不足」(actInfo 校验宽松仍能过,所以只挂 doSign)。
// 这里在签到前重放该入口请求,拿新 acw_tc 回写进 $.cookie。
// 同时探测 Set-Cookie 是否也带 QZ_SID(如果有则同步更新 H5 会话)。
function refreshAcwTc() {
    return new Promise((resolve) => {
        const auth = getCookieVal("Authorization");
        const src = getCookieVal("appletsSource");
        const mid = getCookieVal("memberId");
        const ver = getCookieVal("version") || "4.15.1";
        if (!auth) {
            $.log("[WARN] cookie 缺 Authorization,无法刷新 acw_tc");
            return resolve(false);
        }
        const landing = encodeURIComponent(`${HOST}/m/dailycenter?brandCode=${BRAND}&share=true&minienv=1`);
        const url =
            `${HOST}/static/setCookieApplets.html?url=${landing}` +
            `&Authorization=${auth}&appletsSource=${src}&memberId=${mid}&version=${ver}`;
        // 不带旧 acw_tc 请求,逼 WAF 重新下发(WAF 在 acw_tc 缺失/过期时才 Set-Cookie)
        const ckNoAcw = ($.cookie || "").replace(/(^|;\s*)acw_tc=[^;]*/i, "").replace(/^;\s*/, "");
        const headers = {
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "zh-CN,zh-Hans;q=0.9",
            "User-Agent": UA,
            Cookie: ckNoAcw,
        };
        $.get({ url, headers }, (err, resp) => {
            if (err || !resp) {
                $.log(`[WARN] 刷新 acw_tc 请求失败,doSign 可能仍 50010: ${$.toStr(err)}`);
                return resolve(false);
            }
            const sc = resp.headers && (resp.headers["Set-Cookie"] || resp.headers["set-cookie"]);
            const scStr = String(sc || "");
            $.log(`[DEBUG] setCookieApplets Set-Cookie 前100: ${scStr.substring(0, 100)}`);

            const acwM = /acw_tc=([^;,\s]+)/i.exec(scStr);
            if (acwM) {
                setCookieVal("acw_tc", acwM[1]);
                $.log(`[INFO] acw_tc 已刷新 (…${acwM[1].slice(-6)})`);
                resolve(true);
            } else {
                // 代理内核可能未把 HttpOnly 的 Set-Cookie 暴露给脚本,此时无解,需重抓 cookie
                $.log("[WARN] 响应未拿到 acw_tc(内核可能屏蔽 Set-Cookie),doSign 可能仍 50010");
                resolve(false);
            }

            // 顺便检查是否下发了 QZ_SID(明确 setCookieApplets 是否创建 H5 会话)
            const sidM = /QZ_SID=([^;,\s]+)/i.exec(scStr);
            if (sidM) {
                const val = sidM[1];
                if (val !== $.getdata(CK_QZSID)) {
                    $.setdata(val, CK_QZSID);
                    $.log(`[INFO] QZ_SID 同步更新 (…${val.slice(-6)})`);
                }
            } else {
                $.log("[INFO] setCookieApplets 未下发 QZ_SID");
            }
        });
    });
}

// ============ 工具 ============

// 从 $.cookie 取某字段值
function getCookieVal(name) {
    const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, "i").exec($.cookie || "");
    return m ? m[1] : "";
}

// 替换或追加 $.cookie 里的某字段
function setCookieVal(name, value) {
    const re = new RegExp(`(^|;\\s*)${name}=[^;]*`, "i");
    if (re.test($.cookie || "")) {
        $.cookie = $.cookie.replace(re, `$1${name}=${value}`);
    } else {
        $.cookie = ($.cookie ? $.cookie + "; " : "") + `${name}=${value}`;
    }
}

function lowerKeys(obj) {
    if (!obj) return {};
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

// 清理 Loon 合并多 cookie 头时残留的 "cookie:" 脏前缀,拼回标准 "k=v; k=v"
function normalizeCookie(raw) {
    if (!raw) return "";
    const parts = Array.isArray(raw) ? raw : String(raw).split(/\r?\n/);
    return parts
        .map((p) => String(p).replace(/^cookie\s*:\s*/i, "").trim())
        .filter(Boolean)
        .join("; ");
}

function debug(content, title = "debug") {
    if ($.is_debug !== "true") return;
    $.log(`\n----- ${title} -----`);
    $.log(typeof content === "string" ? content : $.toStr(content));
    $.log(`----- end -----\n`);
}

async function sendMsg(message) {
    if (!message) return;
    if ($.isNode()) {
        try {
            const notify = require("./sendNotify");
            await notify.sendNotify($.name, message);
        } catch (e) {
            $.log(`\n${$.name}\n${message}`);
        }
    } else {
        $.msg($.name, "", message);
    }
}

// ============ 入口 ============

if (typeof $request !== "undefined") {
    if (typeof $response !== "undefined") {
        // http-response:捕获 H5 OAuth 回调下发的 QZ_SID
        captureQzSid();
    } else {
        // http-request:抓取完整 Cookie 或静默刷新 Authorization
        getCookie();
    }
    $.done();
} else {
    (async () => {
        $.cookie = $.isNode() ? process.env.TOPSPORTS_COOKIE : $.getdata(CK_COOKIE);
        if (!$.cookie) {
            throw new Error("未配置 Cookie,请先进小程序'每日中心/签到'页抓取");
        }
        await checkin();
    })()
        .catch((e) => {
            $.messages.push(e.message || String(e));
            $.logErr(e);
        })
        .finally(async () => {
            await sendMsg($.messages.join("\n"));
            $.done();
        });
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}getdata(t){return this.getval(t)}setdata(t,e){return this.setval(t,e)}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
