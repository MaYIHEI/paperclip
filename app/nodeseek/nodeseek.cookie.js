/**
 * NodeSeek · Cookie 抓取
 *
 * 抓取：用 Safari 打开 nodeseek.com 任意页面，停留片刻自动保存 Cookie
 * 签到：nodeseek.js 每日自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-25
 *
 * ===== Loon =====
 * [MITM]
 * hostname = www.nodeseek.com
 * [Script]
 * # 抓 pjwt（请求头）
 * http-request ^https://www\.nodeseek\.com/ tag=NodeSeek Cookie, script-path=nodeseek.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png
 * # 抓 cf_clearance（响应头 Set-Cookie）
 * http-response ^https://www\.nodeseek\.com/ tag=NodeSeek CF, script-path=nodeseek.cookie.js, requires-body=false
 *
 * ===== Surge =====
 * [MITM]
 * hostname = www.nodeseek.com
 * [Script]
 * NodeSeek Cookie = type=http-request,pattern=^https://www\.nodeseek\.com/,requires-body=false,max-size=0,script-path=nodeseek.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png
 * NodeSeek CF = type=http-response,pattern=^https://www\.nodeseek\.com/,requires-body=false,max-size=0,script-path=nodeseek.cookie.js
 */

const $ = new Env("NodeSeek [Cookie]");

const CK_KEY = "nodeseek_cookie";

(function main() {
    if (typeof $response !== "undefined") {
        // http-response: extract cf_clearance from Set-Cookie header
        handleResponse();
        return;
    }
    // http-request: extract pjwt from Cookie header
    handleRequest();
})();

function handleRequest() {
    const cookie = ($request.headers["Cookie"] || $request.headers["cookie"] || "").trim();
    if (!cookie.includes("pjwt")) {
        $.done(); return;
    }

    const old    = $.getdata(CK_KEY) || "";
    const oldPjwt = (old.match(/pjwt=([^;]+)/)          || [])[1] || "";
    const newPjwt = (cookie.match(/pjwt=([^;]+)/)        || [])[1] || "";
    const oldCf   = (old.match(/cf_clearance=([^;]+)/)   || [])[1] || "";
    const newCf   = (cookie.match(/cf_clearance=([^;]+)/) || [])[1] || "";

    if (oldPjwt && oldPjwt === newPjwt) {
        // pjwt unchanged; but if Safari is sending a fresher cf_clearance, save it
        if (newCf && newCf !== oldCf) {
            let updated = old
                .replace(/;\s*cf_clearance=[^;]+/, "")
                .replace(/^cf_clearance=[^;]+;\s*/, "")
                .trimRight().replace(/;$/, "").trim();
            $.setdata(updated + "; cf_clearance=" + newCf, CK_KEY);
            $.log("[INFO] cf_clearance refreshed from request");
        }
        $.done(); return;
    }

    // pjwt changed: save full new cookie, preserving cf_clearance if not present
    let savedCookie = cookie;
    if (!newCf && oldCf) savedCookie = cookie + "; cf_clearance=" + oldCf;

    $.setdata(savedCookie, CK_KEY);
    $.msg("NodeSeek", "✅ NodeSeek Cookie 获取成功", "");
    $.done();
}

function handleResponse() {
    const headers = $response.headers || {};
    // Loon may present Set-Cookie as string or array
    let setCookies = headers["Set-Cookie"] || headers["set-cookie"] || [];
    if (typeof setCookies === "string") setCookies = [setCookies];

    let cfClearance = null;
    for (const h of setCookies) {
        const m = (h || "").match(/cf_clearance=([^;,\s]+)/);
        if (m) { cfClearance = m[1]; break; }
    }

    if (!cfClearance) { $.done({}); return; }

    const stored = $.getdata(CK_KEY) || "";
    if (!stored.includes("pjwt")) { $.done({}); return; } // need pjwt first

    // Update or append cf_clearance in stored cookie
    let updated = stored
        .replace(/;\s*cf_clearance=[^;]+/, "")
        .replace(/^cf_clearance=[^;]+;\s*/, "")
        .trimRight().replace(/;$/, "").trim();
    updated = updated + "; cf_clearance=" + cfClearance;
    $.setdata(updated, CK_KEY);
    $.log("[INFO] cf_clearance updated");
    $.done({});
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
    this.done = (v = {}) => { if (typeof $done !== "undefined") $done(v); };
}
