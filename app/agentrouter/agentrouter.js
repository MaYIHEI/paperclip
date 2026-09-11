/**
 * AgentRouter · 每日登录签到并查看余额
 *
 * 抓取:无需抓包，Loon 在插件设置填写账号和密码，其他平台使用 BoxJS
 * 签到:cron 每天 09:00 自动运行，结果未确认时请到网站核对
 *
 * @Author: @773075692 <https://github.com/773075692/agentrouter-checkin>
 * @Modifier: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-09-11
 *
 * ===== Loon =====
 * [Argument]
 * username = input,"",tag=账号,desc=网站账号或邮箱
 * password = input,"",tag=密码,desc=网站登录密码；清除账号时清空这两个输入框
 * debug = switch,false,tag=调试模式,desc=仅记录请求状态和签到判定
 *
 * [Script]
 * cron "0 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.js, argument=[{username},{password},{debug}], tag=AgentRouter签到, timeout=60, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enable=true
 *
 * ===== Surge =====
 * [Script]
 * AgentRouter签到 = type=cron,cronexp=0 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png
 *
 * ===== Quantumult X =====
 * [task_local]
 * 0 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.js, tag=AgentRouter签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: AgentRouter签到
 *       cron: '0 9 * * *'
 *       timeout: 60
 *
 * script-providers:
 *   AgentRouter签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.js
 *     interval: 86400
 */

const $ = new Env("AgentRouter");
const SCRIPT_VERSION = "2026-09-11.r2";
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const USER_KEY = "agentrouter_username";
const PASSWORD_KEY = "agentrouter_password";
const CLEAR_KEY = "agentrouter_clear";
const DEBUG_KEY = "agentrouter_debug";
const IS_LOON = $.isLoon();
const PLUGIN = typeof $argument !== "undefined" && $argument && typeof $argument === "object" ? $argument : {};
const SETTINGS_PAGE = IS_LOON ? "Loon 插件设置" : "BoxJS";
const BASE_URL = "https://agentrouter.org";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

run().catch((error) => {
    // 只输出脚本主动生成的错误，不转储账号、请求和原始响应。
    $.msg($.name, "❌ 运行失败", error.message);
}).finally(() => $.done());

async function run() {
    const clear = IS_LOON ? null : $.getdata(CLEAR_KEY);
    if (clear === "true" || clear === "1") {
        const userCleared = $.setdata("", USER_KEY);
        const passwordCleared = $.setdata("", PASSWORD_KEY);
        if (!userCleared || !passwordCleared) {
            throw new Error("账号信息清除失败，请在 BoxJS 中检查并手动清空");
        }
        $.setdata("false", CLEAR_KEY);
        $.msg($.name, "✅ 账号信息已清除", "需要继续签到时，请在 BoxJS 重新填写账号和密码");
        return;
    }

    const username = ((IS_LOON ? PLUGIN.username : $.getdata(USER_KEY)) || "").trim();
    const password = (IS_LOON ? PLUGIN.password : $.getdata(PASSWORD_KEY)) || "";
    if (!username || !password) {
        $.msg($.name, "🚫 未配置账号", `请在 ${SETTINGS_PAGE} 的 AgentRouter 中分别填写账号和密码并保存`);
        return;
    }

    const headers = {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Origin: BASE_URL,
        Referer: `${BASE_URL}/login`,
    };
    const login = await request("POST", "/api/user/login", headers, JSON.stringify({ username, password }), "登录");
    if (login.json.success !== true) {
        $.msg($.name, "❌ 登录失败", `请先在 AgentRouter 网页确认账号、密码及是否需要验证码，再更新 ${SETTINGS_PAGE}`);
        return;
    }
    const data = login.json.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        $.msg($.name, "⚠️ 签到待确认", "登录成功，但响应缺少用户信息，请到网站使用日志中核对");
        return;
    }
    debug(`登录成功；checked_in=${data.checked_in === true ? "true" : data.checked_in === false ? "false" : "缺失或格式异常"}`);

    const quota = data.quota;
    const balance = typeof quota === "number" && Number.isFinite(quota) ? `余额（原始额度）：${quota}` : "余额：未返回";
    let confirmed = false;
    let detail;
    try {
        const cookie = sessionCookie(login.headers);
        if (!cookie || !Number.isInteger(data.id) || data.id <= 0) {
            throw new Error("登录响应缺少 Cookie 或用户编号，无法查询签到记录");
        }
        const logs = await request("GET", "/api/log/self/?p=1&page_size=20", {
            ...headers,
            Referer: `${BASE_URL}/console/log`,
            Cookie: cookie,
            "New-API-User": String(data.id),
        }, undefined, "签到记录查询");
        if (logs.json.success !== true || !logs.json.data || !Array.isArray(logs.json.data.items)) {
            throw new Error("签到记录查询未成功，请在网站使用日志中核对");
        }
        const items = logs.json.data.items;
        confirmed = hasTodayCheckin(items, Date.now());
        debug(`最近记录数=${items.length}；今日签到记录=${confirmed}`);
        if (!confirmed) detail = "最近 20 条日志中未找到今日签到记录";
    } catch (error) {
        detail = error.message;
    }

    if (confirmed) {
        $.msg($.name, "✅ 今日签到已确认", balance);
    } else {
        const state = data.checked_in === true ? "服务端返回已签到，但日志尚未确认" : "登录成功，签到状态尚未确认";
        $.msg($.name, "⚠️ 签到待确认", `${state}\n${detail}\n${balance}\n请到网站使用日志中核对`);
    }
}

function hasTodayCheckin(items, now) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return items.some((item) => item && item.type === 4
        && typeof item.content === "string" && item.content.includes("签到成功")
        && typeof item.created_at === "number" && Number.isFinite(item.created_at)
        && item.created_at * 1000 >= start.getTime() && item.created_at * 1000 <= now);
}

function sessionCookie(headers) {
    const key = Object.keys(headers).find((name) => name.toLowerCase() === "set-cookie");
    const raw = key ? [].concat(headers[key]).join("\n") : "";
    // 仅复用 session；不把 Expires 中的逗号或其他 Set-Cookie 属性当作 Cookie。
    const match = raw.match(/(?:^|[\n,])\s*(?:set-cookie:\s*)?(session=[^;\s,]+)/i);
    return match ? match[1] : "";
}

function request(method, path, headers, body, label) {
    return new Promise((resolve, reject) => {
        const options = { url: BASE_URL + path, headers };
        if (body !== undefined) options.body = body;
        // 账号密码只发给固定 HTTPS 站点；Loon 默认允许不受信任证书，需显式关闭。
        if ($.isLoon()) {
            options.insecure = false;
            options["auto-redirect"] = false;
        }
        $.send(options, method, (error, response, text) => {
            if (error) {
                reject(new Error(`${label}网络请求失败，请检查该网站的 Loon 分流或稍后重试`));
                return;
            }
            const status = Number(response && (response.status || response.statusCode));
            debug(`${label} HTTP ${status}`);
            if (status < 200 || status >= 300 || !status) {
                reject(new Error(`${label}返回 HTTP ${status || "未知"}，请在浏览器确认网站是否可访问或需要验证`));
                return;
            }
            let json;
            try {
                json = JSON.parse(text);
            } catch (_) {
                reject(new Error(`${label}返回非 JSON 内容，可能是网页验证或服务异常，请到网站检查`));
                return;
            }
            if (!json || typeof json !== "object" || Array.isArray(json)) {
                reject(new Error(`${label}响应格式异常，请到网站检查`));
                return;
            }
            resolve({ json, headers: response.headers || {} });
        });
    });
}

function debug(message) {
    if (IS_LOON ? PLUGIN.debug === true : $.getdata(DEBUG_KEY) === "true") $.log(`[DEBUG] ${message}`);
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
