/**
 * 123社区 · 每日签到领取经验和金币
 *
 * 抓取:用 Safari 登录 123网盘社区并打开任意页面，抓取 Cookie
 * 签到:cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-07-14
 *
 * ===== Loon =====
 * [MITM]
 * hostname = pan1.me
 *
 * [Script]
 * http-request ^https:\/\/pan1\.me\/(?:\?|$) tag=123社区 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png
 *
 * cron "10 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js, tag=123社区签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = %APPEND% pan1.me
 *
 * [Script]
 * 123社区 Cookie = type=http-request,pattern=^https:\/\/pan1\.me\/(?:\?|$),requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png
 *
 * 123社区签到 = type=cron,cronexp=10 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = pan1.me
 *
 * [rewrite_local]
 * ^https:\/\/pan1\.me\/(?:\?|$) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js
 *
 * [task_local]
 * 10 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js, tag=123社区签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 123社区签到
 *       cron: '10 8 * * *'
 *       timeout: 60
 *
 * http:
 *   mitm:
 *     - "pan1.me"
 *   script:
 *     - match: ^https:\/\/pan1\.me\/(?:\?|$)
 *       name: 123社区 Cookie
 *       type: request
 *       require-body: false
 *
 * script-providers:
 *   123社区签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js
 *     interval: 86400
 */

const $ = new Env("123社区");

const SCRIPT_VERSION = "2026-07-14.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = "pan1_data";
const CLEAR_KEY = "pan1_clear";
const DEBUG_KEY = "pan1_debug";
const SIGN_URL = "https://pan1.me/?my-sign.htm";
const UA_FALLBACK = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

if (typeof $request !== "undefined") {
    capture();
} else if (JSON.parse($.getdata(CLEAR_KEY) || "false")) {
    $.setdata("", CK_KEY);
    $.setdata("false", CLEAR_KEY);
    $.msg($.name, "", "✅ Cookie 已清除，请重新抓取");
    $.done();
} else {
    run().finally(() => $.done());
}

function capture() {
    $.log(`[INFO] 抓取钩子命中 ${String($request.url || "").replace(/\?.*$/, "")}`);
    const headers = $request.headers || {};
    const cookie = normalizeCookie(header(headers, "cookie"));
    const token = cookieValue(cookie, "bbs_token");
    if (!token || token === "deleted") {
        debug(`未找到有效 bbs_token，Cookie keys=${cookieKeys(cookie)}`);
        $.done();
        return;
    }

    const data = {
        cookie: `bbs_token=${token}`,
        ua: header(headers, "user-agent") || UA_FALLBACK,
        capturedAt: Date.now(),
    };
    const previous = $.getdata(CK_KEY);
    let changed = true;
    try {
        changed = JSON.parse(previous || "null").cookie !== data.cookie;
    } catch (_) {}
    const ok = $.setdata(JSON.stringify(data), CK_KEY);
    if (!ok || !$.getdata(CK_KEY)) {
        $.msg($.name, "❌ Cookie 保存失败", "请查看脚本日志后重试");
    } else if (changed) {
        $.msg($.name, "", "✅ 123社区 Cookie 获取成功");
    }
    $.done();
}

async function run() {
    const raw = $.getdata(CK_KEY);
    if (!raw) {
        $.msg($.name, "🚫 缺少 Cookie", "请先用 Safari 登录 123网盘社区并打开任意页面");
        return;
    }

    let auth;
    try {
        auth = JSON.parse(raw);
    } catch (_) {
        $.msg($.name, "🚫 Cookie 解析失败", "请在 BoxJS 清除后重新抓取");
        return;
    }
    if (!/^bbs_token=.+/.test(auth.cookie || "")) {
        $.msg($.name, "🚫 Cookie 不完整", "请重新登录 123网盘社区并打开任意页面");
        return;
    }

    const result = await sign(auth);
    if (!result) {
        $.msg($.name, "❌ 签到失败", "网络无响应，请稍后重试");
        return;
    }
    debug(`status=${result.status} body=${String(result.body).slice(0, 500)}`);
    if (result.status < 200 || result.status >= 300) {
        $.msg($.name, "❌ 签到失败", `HTTP ${result.status}，请稍后重试`);
        return;
    }

    let data;
    try {
        data = JSON.parse(result.body);
    } catch (_) {
        const text = stripHtml(result.body);
        if (/登录|login/i.test(text)) {
            $.msg($.name, "🚫 Cookie 已失效", "请重新登录 123网盘社区并打开任意页面");
        } else {
            $.msg($.name, "❌ 响应解析失败", text.slice(0, 120) || "服务端返回空响应");
        }
        return;
    }

    const message = String(data.message || data.msg || "").replace(/<br\s*\/?>/gi, " ").trim();
    if (String(data.code) === "0") {
        $.msg($.name, "✅ 签到成功", message || "经验和金币已到账");
    } else if (/已签到|已经签到|今日.*签|重复/i.test(message)) {
        $.msg($.name, "✨ 今日已签到", message);
    } else if (/登录|用户不存在|权限|login/i.test(message)) {
        $.msg($.name, "🚫 Cookie 已失效", "请重新登录 123网盘社区并打开任意页面");
    } else {
        $.msg($.name, "❌ 签到失败", message || `code=${data.code}`);
    }
}

function sign(auth) {
    return new Promise((resolve) => {
        $.post({
            url: SIGN_URL,
            headers: {
                accept: "application/json, text/javascript, */*; q=0.01",
                cookie: auth.cookie,
                origin: "https://pan1.me",
                referer: "https://pan1.me/",
                "user-agent": auth.ua || UA_FALLBACK,
                "x-requested-with": "XMLHttpRequest",
            },
            body: "",
        }, (err, resp, body) => {
            if (err) {
                debug(`request error=${String(err)}`);
                resolve(null);
                return;
            }
            resolve({
                status: Number((resp && (resp.status || resp.statusCode)) || 0),
                body: body || "",
            });
        });
    });
}

function header(headers, name) {
    const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === name.toLowerCase());
    return key ? String(headers[key] || "") : "";
}

function normalizeCookie(raw) {
    return String(raw || "")
        .replace(/\r?\n(?:cookie:\s*)?/gi, "; ")
        .split(";")
        .map((item) => item.trim().replace(/^cookie:\s*/i, ""))
        .filter(Boolean)
        .join("; ");
}

function cookieValue(cookie, name) {
    const prefix = `${name}=`;
    const item = String(cookie || "").split(/;\s*/).find((part) => part.startsWith(prefix));
    return item ? item.slice(prefix.length) : "";
}

function cookieKeys(cookie) {
    return String(cookie || "").split(/;\s*/).map((item) => item.split("=")[0]).filter(Boolean).join(",");
}

function stripHtml(text) {
    return String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function debug(message) {
    if (($.getdata(DEBUG_KEY) || "false") === "true") $.log(`[DEBUG] ${message}`);
}

function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== "undefined";
    this.isQuanX = () => typeof $task !== "undefined";
    this.isLoon = () => typeof $loon !== "undefined";
    this.log = (...a) => console.log(a.join("\n"));
    this.msg = (t = this.name, s = "", b = "") => {
        if (this.isSurge() || this.isLoon()) $notification.post(t, s, b);
        else if (this.isQuanX()) $notify(t, s, b);
        console.log(["", `====📣${t}====`, s, b].filter(Boolean).join("\n"));
    };
    this.getdata = (k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        return null;
    };
    this.setdata = (v, k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.write(v, k);
        if (this.isQuanX()) return $prefs.setValueForKey(v, k);
        return false;
    };
    this.post = (req, cb) => this.send(req, "POST", cb);
    this.send = (req, method, cb) => {
        if (this.isSurge() || this.isLoon()) {
            const fn = method === "POST" ? $httpClient.post : $httpClient.get;
            fn(req, (err, resp, data) => {
                if (resp) {
                    resp.body = data;
                    resp.statusCode = resp.status || resp.statusCode;
                }
                cb(err, resp, data);
            });
        } else if (this.isQuanX()) {
            req.method = method;
            $task.fetch(req).then(
                (r) => {
                    r.status = r.statusCode;
                    cb(null, r, r.body);
                },
                (e) => cb(e.error || e, null, null),
            );
        }
    };
    this.done = (v = {}) => {
        if (typeof $done !== "undefined") $done(v);
    };
}
