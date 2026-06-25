/**
 * NodeSeek · Cookie 抓取
 *
 * 抓取：用 Safari 打开 nodeseek.com 任意页面，停留片刻自动保存 Cookie
 * 签到：nodeseek.js 每日自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-25
 */

const $ = new Env("NodeSeek [Cookie]");

const CK_KEY = "nodeseek_cookie";

(function main() {
    if (!$request) {
        $.log("[ERROR] 该脚本仅作为 http-request 重写脚本运行");
        $.done();
        return;
    }

    const cookie = ($request.headers["Cookie"] || $request.headers["cookie"] || "").trim();
    if (!cookie.includes("pjwt")) {
        $.done();
        return;
    }

    const old = $.getdata(CK_KEY) || "";
    const oldPjwt = (old.match(/pjwt=([^;]+)/) || [])[1] || "";
    const newPjwt = (cookie.match(/pjwt=([^;]+)/) || [])[1] || "";
    if (oldPjwt && oldPjwt === newPjwt) {
        $.done();
        return;
    }

    $.setdata(cookie, CK_KEY);
    $.msg("NodeSeek", "✅ NodeSeek Cookie 获取成功", "");
})();

$.done();

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
