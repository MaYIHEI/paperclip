/**
 * NodeSeek · 每日签到
 *
 * 抓取：用 Safari 打开 nodeseek.com 任意页面（需先配置 Cookie 抓取脚本）
 * 签到：cron 定时自动签到；需在 BoxJS 中配置 VPS 服务地址与密钥
 *
 * BoxJS 配置项：
 *   nodeseek_vps_url  — VPS 服务地址，例：https://ns-attend.example.com
 *   nodeseek_vps_key  — VPS API 密钥（与服务端 API_KEY 一致）
 *   nodeseek_random   — true/false，是否随机积分（默认 false）
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
 * cron "0 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js, tag=NodeSeek签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png, enable=true
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
 */

const $ = new Env("NodeSeek");

const SCRIPT_VERSION = "2026-06-25.r4";
$.log("[INFO] 脚本版本 " + SCRIPT_VERSION);

const CK_KEY      = "nodeseek_cookie";
const VPS_URL_KEY = "nodeseek_vps_url";
const VPS_KEY_KEY = "nodeseek_vps_key";

const useRandom = ($.getdata("nodeseek_random") || "false") === "true";

(async () => {
    const cookie = $.getdata(CK_KEY) || "";
    if (!cookie) {
        $.msg("NodeSeek", "🚫 缺少 Cookie", "请先用 Safari 打开 nodeseek.com 触发 Cookie 抓取");
        $.done();
        return;
    }
    if (!cookie.includes("pjwt")) {
        $.msg("NodeSeek", "🚫 Cookie 无效", "缺少 pjwt，请重新抓取");
        $.done();
        return;
    }

    const vpsUrl = ($.getdata(VPS_URL_KEY) || "").trim().replace(/\/$/, "");
    const vpsKey = ($.getdata(VPS_KEY_KEY) || "").trim();

    if (!vpsUrl) {
        $.msg("NodeSeek", "🚫 未配置 VPS 服务", "请在 BoxJS 中填写 nodeseek_vps_url");
        $.done();
        return;
    }

    $.log("[INFO] 调用 VPS 签到服务...");

    try {
        await attend(cookie, vpsUrl, vpsKey, useRandom);
    } catch (e) {
        $.msg("NodeSeek", "❌ 签到异常", String(e));
    }

    $.done();
})();

function attend(cookie, vpsUrl, vpsKey, random) {
    return new Promise((resolve) => {
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };
        if (vpsKey) headers["x-api-key"] = vpsKey;

        $.post({
            url: vpsUrl + "/attend",
            headers: headers,
            body: JSON.stringify({ cookie: cookie, random: random }),
            timeout: 60000,
        }, (err, resp, data) => {
            if (err) {
                $.msg("NodeSeek", "❌ VPS 请求失败", String(err));
                return resolve();
            }

            $.log("[INFO] VPS status=" + resp.status);
            $.log("[INFO] VPS body=" + String(data).substring(0, 200));

            let result;
            try {
                result = JSON.parse(data);
            } catch (e) {
                $.msg("NodeSeek", "❌ VPS 响应解析失败", "status=" + resp.status + "\n" + String(data).substring(0, 100));
                return resolve();
            }

            if (result.success) {
                $.msg("NodeSeek", "✅ 签到成功", result.message + "\n积分+" + result.gain + " 当前" + result.current);
            } else {
                $.msg("NodeSeek", "❌ 签到失败", result.message || "未知错误");
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
