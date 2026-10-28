/**
 * NodeSeek · 每日签到
 *
 * 抓取：用 Safari 打开 nodeseek.com 任意页面（触发 Cookie 抓取脚本）
 * 签到：cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-10-28
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

// 签到合集开启「统一通知」时不单独弹通知,结果由签到汇总统一发送
$.merge = typeof $argument === "object" && !!$argument && $argument.merge === true;
if ($.merge) $.msg = (...a) => console.log(a.filter((x) => typeof x === "string" && x).join("\n"));

// 补签入口:请求 http://1.1.1.1/checkin/nodeseek 时现跑一次签到,跑完把本脚本的签到状态作为响应返回
const CHECKIN_RUN = typeof $request !== "undefined" && /^http:\/\/1\.1\.1\.1\/checkin\//.test($request.url);
if (CHECKIN_RUN) { const end = $.done.bind($); $.done = () => end({ response: { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, body: $.getdata("nodeseek_status") || "{}" } }); }

const SCRIPT_VERSION = "2026-10-28.r3";
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
            saveStatus("ok", msg || "签到成功", res.current != null ? `鸡腿 ${res.current}` : undefined);
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

// 记录本次结果,供「签到汇总」:ok 正常 / cookie 需重新抓取 / fail 其他失败 / none 未使用
function saveStatus(s, msg, asset) {
    msg = String(msg).slice(0, 100);
    // 服务器明确提示登录过期的失败,按需要重新抓取处理
    if (s === "fail" && /过期|重新登录|未登录|请登录|登录失效|登录已失效|token\s*(失效|过期|无效)|not\s*login/i.test(msg)) s = "cookie";
    // 同一天已有带奖励的成功记录时,再次运行得到的「今日已签」不覆盖它的奖励文字,只合并本次的资产等信息
    let keep = null;
    if (s === "ok" && /^今日已/.test(msg)) {
        const day = (t) => new Date(t + 8 * 3600 * 1000).toISOString().slice(0, 10);
        let old = null;
        try { old = JSON.parse($.getdata("nodeseek_status") || "null"); } catch (e) {}
        if (old && old.s === "ok" && !/^今日已/.test(old.msg) && day(old.t) === day(Date.now())) keep = old;
    }
    checkinReport("nodeseek_status", keep ? keepReward(keep, { s, msg, asset }) : { s, msg, asset }, { name: "NodeSeek", author: "MaYIHEI", run: "http://1.1.1.1/checkin/nodeseek", open: "https://www.nodeseek.com" });
}

// 保留当天带奖励的旧记录(状态、奖励文字、时间),合并本次拿到的资产、过期时间等;本次没有的沿用旧值
function keepReward(old, rec) {
    const out = { s: old.s, msg: old.msg, t: old.t, asset: old.asset, exp: old.exp };
    for (const k in rec) if (rec[k] !== undefined && k !== "s" && k !== "msg") out[k] = rec[k];
    return out;
}

// 签到状态协议 v1:写本次结果,并把自己登记进公共索引 checkin_registry(Loon/Surge/QX/Stash 通用,不依赖 Env)
function checkinReport(key, rec, info) {
    const read = (k) => (typeof $prefs !== "undefined" ? $prefs.valueForKey(k) : $persistentStore.read(k));
    const write = (v, k) => (typeof $prefs !== "undefined" ? $prefs.setValueForKey(v, k) : $persistentStore.write(v, k));
    const registry = () => { try { return JSON.parse(read("checkin_registry") || "{}") || {}; } catch (e) { return {}; } };
    write(JSON.stringify(Object.assign({ v: 1, t: Date.now(), name: info.name, author: info.author }, rec)), key);
    const reg = registry();
    if (JSON.stringify(reg[key]) === JSON.stringify(info)) return;
    reg[key] = info;
    write(JSON.stringify(reg), "checkin_registry");
    if (!registry()[key]) console.log(`[checkin] ${key} 登记没写上,下次运行再补`);
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
