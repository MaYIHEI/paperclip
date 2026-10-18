/**
 * NodeSeek · 每日签到
 *
 * 抓取：用 Safari 打开 nodeseek.com 任意页面（触发 Cookie 抓取脚本）
 * 签到：cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-10-18
 *
 * ===== Loon =====
 * [MITM]
 * hostname = www.nodeseek.com
 * [Script]
 * request if ${url} ~= /^https:\/\/www\.nodeseek\.com\//i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js") with tag="NodeSeek Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png"
 * cron "0 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js") with tag="NodeSeek签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png"
 *
 * ===== Surge =====
 * [MITM]
 * hostname = www.nodeseek.com
 * [Script]
 * NodeSeek Cookie = type=http-request,pattern=^https://www\.nodeseek\.com/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png
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
 * script-providers:
 *   NodeSeek签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js
 *     interval: 86400
 *   NodeSeek Cookie:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js
 *     interval: 86400
 */

const $ = new Env("NodeSeek");

// Loon 签到合集插件传入的设置优先,未传或留空时读 BoxJS
if (typeof $argument === "object" && $argument) {
    const readStore = $.getdata.bind($);
    $.getdata = (key) => ($argument[key] === undefined || $argument[key] === "" ? readStore(key) : String($argument[key]));
}

const SCRIPT_VERSION = "2026-10-18.r1";
$.log("[INFO] 脚本版本 " + SCRIPT_VERSION);

const UA_FALLBACK = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

const cookie = $.getdata("nodeseek_cookie") || "";
if (!cookie.includes("pjwt=")) {
    saveStatus("none", "未抓取 Cookie");
    $.msg("NodeSeek", "🚫 缺少 Cookie", "请先用浏览器打开 nodeseek.com 并登录");
    $.done();
} else {
    const random = $.getdata("nodeseek_random") === "true";
    $.post({
        url: "https://www.nodeseek.com/api/attendance?random=" + random,
        headers: {
            "Cookie": cookie,
            "User-Agent": $.getdata("nodeseek_ua") || UA_FALLBACK,
            "Content-Type": "text/plain;charset=UTF-8",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh-Hans;q=0.9",
            "Origin": "https://www.nodeseek.com",
            "Referer": "https://www.nodeseek.com/board",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
        },
        body: "",
    }, (err, resp, data) => {
        const status = resp && resp.status;
        const h = (resp && resp.headers) || {};
        $.log("[INFO] status=" + status + " cf-ray=" + (h["cf-ray"] || h["CF-RAY"] || "") + " body=" + String(data).slice(0, 200));
        if (err) {
            saveStatus("fail", "网络错误");
            $.msg("NodeSeek", "❌ 网络错误", String(err));
            return $.done();
        }
        let res;
        try { res = JSON.parse(data); } catch (_) {
            const cf = /Just a moment|challenge-platform/.test(data || "");
            saveStatus(cf ? "cookie" : "fail", cf ? "被 Cloudflare 拦截" : "响应异常 " + status);
            $.msg("NodeSeek", cf ? "❌ 被 Cloudflare 拦截" : "❌ 响应异常", cf ? "用浏览器打开 nodeseek.com 刷新 Cookie 后重试" : "status=" + status);
            return $.done();
        }
        const msg = res.message || "";
        if (res.success === true) {
            saveStatus("ok", "签到成功");
            $.msg("NodeSeek", "✅ 签到成功", msg + (res.current != null ? "\n当前鸡腿 " + res.current : ""));
        } else if (/已.*签到|重复/.test(msg)) {
            saveStatus("ok", "今日已签到");
            $.msg("NodeSeek", "ℹ️ 今日已签到", msg);
        } else {
            const relogin = /登录|login/i.test(msg);
            saveStatus(relogin ? "cookie" : "fail", msg || "签到失败");
            $.msg("NodeSeek", "❌ 签到失败", msg || "status=" + status);
        }
        $.done();
    });
}

// 记录本次结果,供「Cookie 体检」汇总:ok 正常 / cookie 需重新抓取 / fail 其他失败 / none 未使用
function saveStatus(s, msg) {
    $.setdata(JSON.stringify({ s, msg: String(msg).slice(0, 100), t: Date.now() }), "nodeseek_status");
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
