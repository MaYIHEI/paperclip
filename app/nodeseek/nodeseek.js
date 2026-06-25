/**
 * NodeSeek · 每日签到
 *
 * 抓取：用 Safari 打开 nodeseek.com 任意页面（需先配置 Cookie 抓取脚本）
 * 签到：cron 定时自动签到；Cookie 中须包含 pjwt + cf_clearance
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

const SCRIPT_VERSION = "2026-06-25.r10";
$.log("[INFO] 脚本版本 " + SCRIPT_VERSION);

const CK_KEY     = "nodeseek_cookie";
const UA_KEY     = "nodeseek_ua";
const RANDOM_KEY = "nodeseek_random";

// Fallback UA; real UA captured from Safari by nodeseek.cookie.js (cf_clearance is UA-bound)
const UA_FALLBACK = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const REFRACT_VERSION     = "0.3.33";
const REFRACT_KEY_DEFAULT = "CHICZkKViFoZmVbIH1Y6"; // from sw.js: this.refractKey="..."

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
    const UA     = $.getdata(UA_KEY) || UA_FALLBACK;
    const random = ($.getdata(RANDOM_KEY) || "false") === "true";

    const cookieKeys = cookie.split(";").map(c => c.trim().split("=")[0]).join(", ");
    $.log("[INFO] cookie keys=" + cookieKeys);
    $.log("[INFO] ua=" + UA.substring(0, 60));

    // Diagnose exit IP — compare with browser IP to check proxy usage
    await new Promise(r => $.get({ url: "https://api.ipify.org?format=json", timeout: 5000 }, (e, _, d) => {
        $.log("[INFO] script exit IP=" + (d || e)); r();
    }));

    try {
        const { key: refractKey, cfBm } = await ping(cookie, UA);
        await attend(cookie, refractKey, random, UA, cfBm);
    } catch (e) {
        $.msg("NodeSeek", "❌ 签到异常", String(e));
    }

    $.done();
})();

// GET /edge-cgi/ping with default key → returns updated key from refract-key-update header
function ping(cookie, UA) {
    return new Promise((resolve) => {
        const url = "https://www.nodeseek.com/edge-cgi/ping";
        const sign = refractSign("GET", url, "", REFRACT_KEY_DEFAULT, UA);
        $.get({
            url,
            headers: {
                "Cookie": cookie,
                "User-Agent": UA,
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Dest": "empty",
                "refract-sign": sign,
                "refract-version": REFRACT_VERSION,
                "refract-key": REFRACT_KEY_DEFAULT,
            },
            timeout: 15000,
        }, (err, resp) => {
            const h = (resp && resp.headers) || {};
            const updated = h["refract-key-update"] || h["Refract-Key-Update"];
            const cfBm = extractCfBm(h["Set-Cookie"] || h["set-cookie"]);
            $.log("[INFO] ping status=" + (resp && resp.status) + " updated=" + (updated ? "yes" : "no") + " cfbm=" + (cfBm ? "yes" : "no"));
            resolve({ key: updated || REFRACT_KEY_DEFAULT, cfBm });
        });
    });
}

// POST /api/attendance; cfBm is optional __cf_bm from ping or prior attempt
function attend(cookie, refractKey, random, UA, cfBm) {
    return new Promise((resolve) => {
        const url = "https://www.nodeseek.com/api/attendance?random=" + random;

        function doPost(extraCfBm, attempt) {
            // Merge __cf_bm: strip stale one (if any) then add fresh
            let reqCookie = cookie.replace(/;\s*__cf_bm=[^;]+/g, "").replace(/^__cf_bm=[^;]+;\s*/g, "").trim();
            if (extraCfBm) reqCookie += "; __cf_bm=" + extraCfBm;

            const sign = refractSign("POST", url, "", refractKey, UA);
            if (attempt === 1) $.log("[INFO] attend sign=" + sign.substring(0, 16) + "... cfbm=" + (extraCfBm ? "yes" : "no"));

            $.post({
                url,
                headers: {
                    "Cookie": reqCookie,
                    "User-Agent": UA,
                    "Content-Type": "text/plain;charset=UTF-8",
                    "Origin": "https://www.nodeseek.com",
                    "Referer": "https://www.nodeseek.com/",
                    "Accept": "*/*",
                    "Accept-Language": "zh-CN,zh;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Dest": "empty",
                    "refract-sign": sign,
                    "refract-version": REFRACT_VERSION,
                    "refract-key": refractKey,
                },
                body: "",
                timeout: 15000,
            }, (err, resp, data) => {
                if (err) {
                    $.msg("NodeSeek", "❌ 请求失败", String(err));
                    return resolve();
                }
                $.log("[INFO] attend#" + attempt + " status=" + resp.status + " body=" + String(data).substring(0, 200));

                // CF block: try to extract fresh __cf_bm and retry once
                if (resp.status === 403 && String(data).includes("Just a moment") && attempt === 1) {
                    const newCfBm = extractCfBm((resp.headers || {})["Set-Cookie"] || (resp.headers || {})["set-cookie"]);
                    $.log("[INFO] CF block, retry cfbm=" + (newCfBm ? "yes" : "no"));
                    doPost(newCfBm, 2);
                    return;
                }

                let result;
                try { result = JSON.parse(atob(data)); } catch (_) {
                    try { result = JSON.parse(data); } catch (_2) {
                        $.msg("NodeSeek", "❌ 响应异常", "status=" + resp.status + "\n" + String(data).substring(0, 120));
                        return resolve();
                    }
                }

                if (result.success) {
                    $.msg("NodeSeek", "✅ 签到成功", result.message + "\n积分+" + result.gain + " 当前" + result.current);
                } else {
                    $.msg("NodeSeek", "❌ 签到失败", result.message || "未知错误");
                }
                resolve();
            });
        }

        doPost(cfBm, 1);
    });
}

function extractCfBm(raw) {
    if (!raw) return null;
    const arr = typeof raw === "string" ? [raw] : raw;
    for (const h of arr) {
        const m = (h || "").match(/__cf_bm=([^;,\s]+)/);
        if (m) return m[1];
    }
    return null;
}

// Mirrors sw.js kt() + wt(): SHA-1(hex) of method\n\nurl\n\nUA\n\nbody\n\nkey
function refractSign(method, url, body, key, UA) {
    const cleanUrl = url.replace(/#.*$/, "");
    return sha1([method, cleanUrl, UA, body, key].join("\n\n"));
}

// Pure-JS SHA-1 (hex output); TextEncoder equivalent via unescape(encodeURIComponent())
function sha1(str) {
    function rol(n, s) { return (n << s) | (n >>> (32 - s)); }
    const msg = unescape(encodeURIComponent(str));
    const bs = msg.length;
    const words = [];
    for (let i = 0; i < bs; i++) words[i >> 2] |= msg.charCodeAt(i) << (24 - (i & 3) * 8);
    words[bs >> 2] |= 0x80 << (24 - (bs & 3) * 8);
    words[((bs + 8 >> 6) + 1) * 16 - 1] = bs * 8;
    let H0 = 0x67452301, H1 = 0xEFCDAB89, H2 = 0x98BADCFE, H3 = 0x10325476, H4 = 0xC3D2E1F0;
    const W = [];
    for (let i = 0; i < words.length; i += 16) {
        let a = H0, b = H1, c = H2, d = H3, e = H4;
        for (let j = 0; j < 80; j++) {
            W[j] = j < 16 ? (words[i + j] | 0) : rol(W[j-3] ^ W[j-8] ^ W[j-14] ^ W[j-16], 1);
            let T = (rol(a, 5) + e + W[j]) | 0;
            if (j < 20)      T = (T + ((b & c) | (~b & d)) + 0x5A827999) | 0;
            else if (j < 40) T = (T + (b ^ c ^ d) + 0x6ED9EBA1) | 0;
            else if (j < 60) T = (T + ((b & c) | (b & d) | (c & d)) + 0x8F1BBCDC) | 0;
            else             T = (T + (b ^ c ^ d) + 0xCA62C1D6) | 0;
            e = d; d = c; c = rol(b, 30); b = a; a = T;
        }
        H0 = (H0 + a) | 0; H1 = (H1 + b) | 0; H2 = (H2 + c) | 0;
        H3 = (H3 + d) | 0; H4 = (H4 + e) | 0;
    }
    return [H0, H1, H2, H3, H4].map(n => ("0000000" + (n >>> 0).toString(16)).slice(-8)).join("");
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
