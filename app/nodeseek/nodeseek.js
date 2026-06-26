/**
 * NodeSeek · 每日签到
 *
 * 抓取：用 Safari 打开 nodeseek.com 任意页面（触发 Cookie 抓取脚本）
 * 签到：cron 定时自动签到；需在 BoxJS 配置中继地址和密钥
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-25
 *
 * ===== Loon =====
 * [MITM]
 * hostname = www.nodeseek.com
 * [Script]
 * http-request ^https://www\.nodeseek\.com/ tag=NodeSeek Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png
 * http-response ^https://www\.nodeseek\.com/ tag=NodeSeek CF, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js, requires-body=false
 * cron "0 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js, tag=NodeSeek签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = www.nodeseek.com
 * [Script]
 * NodeSeek Cookie = type=http-request,pattern=^https://www\.nodeseek\.com/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png
 * NodeSeek CF = type=http-response,pattern=^https://www\.nodeseek\.com/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js
 * NodeSeek签到 = type=cron,cronexp=0 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = www.nodeseek.com
 * [rewrite_local]
 * ^https://www\.nodeseek\.com/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js
 * [task_local]
 * 0 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js, tag=NodeSeek签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: NodeSeek签到
 *       cron: '0 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "www.nodeseek.com"
 *   script:
 *     - match: ^https://www\.nodeseek\.com/
 *       name: NodeSeek Cookie
 *       type: request
 *       require-body: false
 *     - match: ^https://www\.nodeseek\.com/
 *       name: NodeSeek CF
 *       type: response
 *       require-body: false
 * script-providers:
 *   NodeSeek签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js
 *     interval: 86400
 *   NodeSeek Cookie:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js
 *     interval: 86400
 */

const $ = new Env("NodeSeek");

const SCRIPT_VERSION = "2026-06-25.r12";
$.log("[INFO] 脚本版本 " + SCRIPT_VERSION);

const CK_KEY        = "nodeseek_cookie";
const UA_KEY        = "nodeseek_ua";
const RANDOM_KEY    = "nodeseek_random";
const RELAY_URL_KEY = "nodeseek_relay_url";
const RELAY_KEY_KEY = "nodeseek_relay_key";

const UA_FALLBACK = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

(async () => {
    const cookie = $.getdata(CK_KEY) || "";
    if (!cookie) {
        $.msg("NodeSeek", "🚫 缺少 Cookie", "请先用 Safari 打开 nodeseek.com 触发 Cookie 抓取");
        $.done(); return;
    }
    if (!cookie.includes("pjwt")) {
        $.msg("NodeSeek", "🚫 Cookie 无效", "缺少 pjwt，请重新抓取");
        $.done(); return;
    }

    const relayUrl = $.getdata(RELAY_URL_KEY) || "";
    const relayKey = $.getdata(RELAY_KEY_KEY) || "";
    if (!relayUrl || !relayKey) {
        $.msg("NodeSeek", "🚫 未配置中继", "请在 BoxJS 中设置 nodeseek_relay_url 和 nodeseek_relay_key");
        $.done(); return;
    }

    const UA     = $.getdata(UA_KEY) || UA_FALLBACK;
    const random = ($.getdata(RANDOM_KEY) || "false") === "true";

    const cookieKeys = cookie.split(";").map(c => c.trim().split("=")[0]).join(", ");
    $.log("[INFO] cookie keys=" + cookieKeys);
    $.log("[INFO] ua=" + UA.substring(0, 60));

    try {
        await attend(cookie, UA, random, relayUrl, relayKey);
    } catch (e) {
        $.msg("NodeSeek", "❌ 签到异常", String(e));
    }

    $.done();
})();

function attend(cookie, UA, random, relayUrl, relayKey) {
    return new Promise((resolve) => {
        $.post({
            url: relayUrl,
            headers: {
                "x-api-key": relayKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ cookie, ua: UA, random }),
            timeout: 35000,
        }, (err, resp, data) => {
            if (err) {
                $.msg("NodeSeek", "❌ 中继请求失败", String(err));
                return resolve();
            }
            $.log("[INFO] relay status=" + (resp && resp.status) + " body=" + String(data).substring(0, 200));

            if ((resp && resp.status) === 502) {
                $.msg("NodeSeek", "❌ CF 拦截", "中继被 CF 拦截，请检查 VPS");
                return resolve();
            }

            let result;
            try { result = JSON.parse(atob(data)); } catch (_) {
                try { result = JSON.parse(data); } catch (_2) {
                    $.msg("NodeSeek", "❌ 响应异常", "status=" + (resp && resp.status) + "\n" + String(data).substring(0, 120));
                    return resolve();
                }
            }

            if (result.error) {
                $.msg("NodeSeek", "❌ 中继错误", result.error);
                return resolve();
            }
            // NodeSeek returns {} on success (no success:true), {"success":false,...} on failure
            if (result.success === false) {
                $.msg("NodeSeek", "❌ 签到失败", result.message || "未知错误");
            } else {
                const detail = result.message
                    ? result.message + (result.gain != null ? "\n积分+" + result.gain + " 当前" + result.current : "")
                    : "";
                $.msg("NodeSeek", "✅ 签到成功", detail);
            }
            resolve();
        });
    });
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
        console.log(["", "====📣" + t + "====", s, b].filter(Boolean).join("\n"));
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
    this.get = (req, cb) => this.send(req, "GET", cb);
    this.post = (req, cb) => this.send(req, "POST", cb);
    this.send = (req, method, cb) => {
        if (this.isSurge() || this.isLoon()) {
            const fn = method === "POST" ? $httpClient.post : $httpClient.get;
            fn(req, (err, resp, data) => {
                if (resp) { resp.body = data; resp.statusCode = resp.status || resp.statusCode; }
                cb(err, resp, data);
            });
        } else if (this.isQuanX()) {
            req.method = method;
            $task.fetch(req).then(
                (r) => { r.status = r.statusCode; cb(null, r, r.body); },
                (e) => cb(e.error || e, null, null)
            );
        }
    };
    this.done = (v = {}) => { if (typeof $done !== "undefined") $done(v); };
}
