/**
 * NodeSeek · Cookie 抓取
 *
 * 抓取：用 Safari 打开 nodeseek.com 任意页面，自动保存 pjwt 登录凭证
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-25
 */

const $ = new Env("NodeSeek [Cookie]");

const CK_KEY = "nodeseek_cookie";
const UA_KEY = "nodeseek_ua";

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

    const ua      = ($request.headers["User-Agent"] || $request.headers["user-agent"] || "").trim();
    const old     = $.getdata(CK_KEY) || "";
    const oldPjwt = (old.match(/pjwt=([^;]+)/)          || [])[1] || "";
    const newPjwt = (cookie.match(/pjwt=([^;]+)/)        || [])[1] || "";
    const oldCf   = (old.match(/cf_clearance=([^;]+)/)   || [])[1] || "";
    const newCf   = (cookie.match(/cf_clearance=([^;]+)/) || [])[1] || "";

    // Always keep UA in sync (cf_clearance is UA-bound)
    if (ua) $.setdata(ua, UA_KEY);

    if (oldPjwt && oldPjwt === newPjwt) {
        // pjwt unchanged; but if Safari is sending a fresher cf_clearance, save it
        if (newCf && newCf !== oldCf) {
            let updated = old
                .replace(/;\s*cf_clearance=[^;]+/, "")
                .replace(/^cf_clearance=[^;]+;\s*/, "")
                .trimRight().replace(/;$/, "").trim();
            $.setdata(updated + "; cf_clearance=" + newCf, CK_KEY);
            $.msg("NodeSeek", "🔄 cf_clearance 已更新", "");
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
    $.msg("NodeSeek", "🔄 cf_clearance 已更新", "");
    $.log("[INFO] cf_clearance updated via response");
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
