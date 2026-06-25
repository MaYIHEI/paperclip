/**
 * NodeSeek · 每日签到
 *
 * 抓取：用 Safari 打开 nodeseek.com 任意页面（需先配置 Cookie 抓取脚本）
 * 签到：cron 定时自动签到，随机/固定奖励可在 BoxJS 中切换
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

const SCRIPT_VERSION = "2026-06-25.r1";
$.log("[INFO] 脚本版本 " + SCRIPT_VERSION);

const CK_KEY = "nodeseek_cookie";
const PING_URL = "https://www.nodeseek.com/edge-cgi/ping";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1";
const REFRACT_VERSION = "0.3.33";
const REFRACT_INIT_KEY = "CHICZkKViFoZmVbIH1Y6";

const useRandom = ($.getdata("nodeseek_random") || "false") === "true";
const ATTEND_URL = "https://www.nodeseek.com/api/attendance?random=" + (useRandom ? "true" : "false");

(async () => {
    const cookie = $.getdata(CK_KEY) || "";
    if (!cookie) {
        $.msg("NodeSeek", "🚫 缺少 Cookie", "请先用 Safari 打开 nodeseek.com 触发 Cookie 抓取");
        $.done();
        return;
    }

    $.log("[INFO] 正在获取 refract-key...");
    let newKey;
    try {
        newKey = await ping(cookie);
    } catch (e) {
        $.msg("NodeSeek", "❌ 网络异常", String(e));
        $.done();
        return;
    }
    if (!newKey) {
        $.msg("NodeSeek", "❌ 获取 refract-key 失败", "ping 无响应");
        $.done();
        return;
    }

    $.log("[INFO] refract-key 已获取，开始签到...");
    try {
        await attend(cookie, newKey);
    } catch (e) {
        $.msg("NodeSeek", "❌ 签到异常", String(e));
    }

    $.done();
})();

function ping(cookie) {
    return new Promise((resolve, reject) => {
        const sign = refractSign("GET", PING_URL, "", REFRACT_INIT_KEY);
        $.get({
            url: PING_URL,
            headers: {
                "User-Agent": UA,
                "refract-version": REFRACT_VERSION,
                "refract-key": REFRACT_INIT_KEY,
                "refract-sign": sign,
                "accept": "*/*",
                "cookie": cookie,
            },
        }, (err, resp, data) => {
            if (err) return reject(err);
            const h = resp.headers || {};
            const key = h["refract-key-update"] || h["Refract-Key-Update"] || h["REFRACT-KEY-UPDATE"] || "";
            $.log("[INFO] ping status=" + resp.status + " key=" + (key ? key.substring(0, 16) + "..." : "none"));
            resolve(key);
        });
    });
}

function attend(cookie, key) {
    return new Promise((resolve) => {
        const sign = refractSign("POST", ATTEND_URL, "", key);
        $.post({
            url: ATTEND_URL,
            headers: {
                "User-Agent": UA,
                "refract-version": REFRACT_VERSION,
                "refract-key": key,
                "refract-sign": sign,
                "content-type": "text/plain;charset=UTF-8",
                "accept": "*/*",
                "cookie": cookie,
                "origin": "https://www.nodeseek.com",
                "referer": "https://www.nodeseek.com/sw.js?v=" + REFRACT_VERSION,
            },
            body: "",
        }, (err, resp, data) => {
            if (err) { $.msg("NodeSeek", "❌ 签到请求失败", String(err)); return resolve(); }

            $.log("[INFO] attend status=" + resp.status);
            $.log("[INFO] attend body=" + String(data).substring(0, 200));

            let result;
            try { result = JSON.parse(atob(String(data))); } catch (e) {
                try { result = JSON.parse(data); } catch (e2) {
                    $.msg("NodeSeek", "❌ 响应解析失败", "status=" + resp.status + "\n" + String(data).substring(0, 100));
                    return resolve();
                }
            }

            if (result.success) {
                $.msg("NodeSeek", "✅ 签到成功", result.message + "\n积分+" + result.gain + " 当前" + result.current);
            } else {
                $.msg("NodeSeek", "❌ 签到失败", result.message || ("status=" + resp.status));
            }
            resolve();
        });
    });
}

function refractSign(method, url, body, key) {
    return sha1hex([method, url, UA, body, key].join("\n\n"));
}

function sha1hex(str) {
    function rotl(n, s) { return (n << s) | (n >>> (32 - s)); }
    function toHex(n) { return ("00000000" + (n >>> 0).toString(16)).slice(-8); }
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c < 0x80) { bytes.push(c); }
        else if (c < 0x800) { bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F)); }
        else { bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F)); }
    }
    const len = bytes.length;
    const words = new Array(Math.ceil((len + 9) / 64) * 16).fill(0);
    for (let i = 0; i < len; i++) words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
    words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
    words[words.length - 1] = len * 8;
    let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    for (let i = 0; i < words.length; i += 16) {
        const w = words.slice(i, i + 16);
        while (w.length < 80) {
            w.push(rotl(w[w.length-16] ^ w[w.length-14] ^ w[w.length-8] ^ w[w.length-3], 1));
        }
        let a = h0, b = h1, c = h2, d = h3, e = h4;
        for (let j = 0; j < 80; j++) {
            let f, k;
            if      (j < 20) { f = (b & c) | (~b & d);           k = 0x5A827999; }
            else if (j < 40) { f = b ^ c ^ d;                    k = 0x6ED9EBA1; }
            else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
            else             { f = b ^ c ^ d;                    k = 0xCA62C1D6; }
            const t = (rotl(a, 5) + f + e + k + w[j]) & 0xFFFFFFFF;
            e = d; d = c; c = rotl(b, 30); b = a; a = t;
        }
        h0 = (h0 + a) & 0xFFFFFFFF; h1 = (h1 + b) & 0xFFFFFFFF;
        h2 = (h2 + c) & 0xFFFFFFFF; h3 = (h3 + d) & 0xFFFFFFFF;
        h4 = (h4 + e) & 0xFFFFFFFF;
    }
    return [h0, h1, h2, h3, h4].map(toHex).join("");
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
