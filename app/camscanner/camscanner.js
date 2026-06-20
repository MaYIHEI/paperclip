/**
 * 扫描全能王 · 幸运大转盘每日抽奖(看视频转盘,每日最多 3 次)
 *
 * 抓取:打开「扫描全能王」APP → 任意页停留几秒(自动触发 get_user_attribute),抓 Token
 * 签到:cron 定时自动抽奖,每日 3 次均自动完成,无需看视频
 *
 * 奖品:50M/100M 云存储 · Pad 优惠券 · 打印机优惠券 · 7天/30天 VIP
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-20
 *
 * ===== Loon =====
 * [MITM]
 * hostname = api-cs.intsig.net
 * [Script]
 * http-request ^https:\/\/api-cs\.intsig\.net\/user\/cs\/get_user_attribute tag=扫描全能王 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png
 * cron "15 10 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.js, tag=扫描全能王签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = api-cs.intsig.net
 * [Script]
 * 扫描全能王 Cookie = type=http-request,pattern=^https:\/\/api-cs\.intsig\.net\/user\/cs\/get_user_attribute,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png
 * 扫描全能王签到 = type=cron,cronexp=15 10 * * *,timeout=120,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = api-cs.intsig.net
 * [rewrite_local]
 * ^https:\/\/api-cs\.intsig\.net\/user\/cs\/get_user_attribute url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.cookie.js
 * [task_local]
 * 15 10 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.js, tag=扫描全能王签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 扫描全能王签到
 *       cron: '15 10 * * *'
 *       timeout: 120
 * http:
 *   mitm:
 *     - "api-cs.intsig.net"
 *   script:
 *     - match: ^https:\/\/api-cs\.intsig\.net\/user\/cs\/get_user_attribute
 *       name: 扫描全能王 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   扫描全能王签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.js
 *     interval: 86400
 */

const $ = new Env("扫描全能王");

const SCRIPT_VERSION = "2026-06-20.r3";
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY     = 'camscanner_data';
const APP_SECRET = 'intsig_v2_84ee85cdaaaf1867';
const CLIENT     = 'iPhone-iPhone';
const CLIENT_APP = 'CamScanner_IP_FREE@7.19.5.2606111943';  // raw value; @ encodes to %40 in sign
const APP_VER    = '7.19.5.2606111943';
const COUNTRY    = 'cn';
const LANGUAGE   = 'zh-cn';
const TIME_ZONE  = '8';

const PRIZE_NAME = {
    storage_50m:                    '50M 云存储',
    storage_100m:                   '100M 云存储',
    pad_coupon_20:                  'Pad 20元优惠券',
    cs_privilege_printer_coupon:    '打印机优惠券',
    vip_7day:                       '7天 VIP',
    vip_30day:                      '30天 VIP',
};

// 调试日志:BoxJS 设 camscanner_debug=true 才打印接口原始响应
function debug(content, title = "debug") {
    if (($.getdata("camscanner_debug") || "false") !== "true") return;
    $.log(`\n----- ${title} -----\n${typeof content === "string" ? content : JSON.stringify(content)}\n----- end -----`);
}

(async () => {
    // 清除 Cookie 开关(BoxJS 写 camscanner_clear=true);运行一次后自动复位
    if (JSON.parse($.getdata("camscanner_clear") || "false")) {
        $.setdata("", CK_KEY);
        $.setdata("false", "camscanner_clear");
        $.msg("扫描全能王", "", "✅ Cookie 已清除，请重新抓取");
        $.done();
        return;
    }

    const ckRaw = $.getdata(CK_KEY);
    if (!ckRaw) {
        $.msg('扫描全能王', '🚫 缺少 Cookie',
            '请先开启 Cookie 抓取脚本,然后打开扫描全能王 APP 任意页面停留几秒');
        $.done();
        return;
    }

    let ck;
    try { ck = JSON.parse(ckRaw); } catch (e) {
        $.msg('扫描全能王', '🚫 Cookie 格式错误', '请重新抓取');
        $.done();
        return;
    }

    const { token, cs_ept_d, client_id } = ck;
    if (!token || !cs_ept_d || !client_id) {
        $.msg('扫描全能王', '🚫 Cookie 不完整',
            `缺少: ${[!token && 'token', !cs_ept_d && 'cs_ept_d', !client_id && 'client_id'].filter(Boolean).join(',')} — 请重新抓取`);
        $.done();
        return;
    }

    try {
        // 1. 查今日剩余次数
        const infoRes = await getLotteryInfo(token, cs_ept_d);
        if (isTokenError(infoRes)) {
            $.msg('扫描全能王', '🚫 Token 已失效',
                '请重新打开扫描全能王 APP 任意页面停留几秒,重新抓取 Cookie');
            $.done();
            return;
        }
        const info = infoRes && infoRes.data ? infoRes.data : null;
        if (!info || info.day_count == null) {
            $.msg('扫描全能王', '⚠️ 查询次数失败',
                `服务端返回: ${JSON.stringify(infoRes).slice(0, 120)}`);
            $.done();
            return;
        }
        $.log(`[INFO] 今日剩余: ${info.day_count} 次 / 本周累计: ${info.week_count} 次`);

        if (info.day_count <= 0) {
            $.msg('扫描全能王', '✅ 今日已抽完', `本周累计 ${info.week_count} 次`);
            $.done();
            return;
        }

        // 2. 逐次抽奖
        const prizes = [];
        for (let i = 0; i < info.day_count; i++) {
            $.log(`[INFO] 第 ${i + 1} 次抽奖...`);

            // 2a. 拿 lottery_code(原生接口,需签名);遇限频(109)重试一次
            const codeRes = await withRetry(() => getLotteryCode(token, client_id));
            if (isTokenError(codeRes)) {
                $.msg('扫描全能王', '🚫 Token 已失效', '请重新抓取 Cookie');
                $.done();
                return;
            }
            const codeData = codeRes && codeRes.data ? codeRes.data : null;
            if (!codeData || !codeData.lottery_code) {
                $.log(`[WARN] 第 ${i + 1} 次获取 lottery_code 失败`);
                debug(JSON.stringify(codeRes), `第${i + 1}次取码响应`);
                prizes.push('❓ 取码失败');
                break;
            }

            // 2b. 用 lottery_code 抽奖(H5 接口);同样对限频重试
            const drawRes = await withRetry(() => drawLottery(token, cs_ept_d, codeData.lottery_code));
            const item = drawRes && drawRes.data ? drawRes.data.item : undefined;
            if (item) {
                prizes.push(PRIZE_NAME[item] || item);
                $.log(`[INFO] 第 ${i + 1} 次中奖: ${PRIZE_NAME[item] || item}`);
            } else {
                $.log(`[WARN] 第 ${i + 1} 次抽奖异常`);
                debug(JSON.stringify(drawRes), `第${i + 1}次抽奖响应`);
                prizes.push('❓ 异常');
            }

            // 拉开间隔避限频
            if (i < info.day_count - 1) await sleep(4000);
        }

        const summary = prizes.map((p, i) => `第${i + 1}次: ${p}`).join(' · ');
        $.msg('扫描全能王', `🎰 今日抽奖完成(${prizes.length}/${info.day_count} 次)`, summary);
    } catch (e) {
        $.log('[ERROR] ' + e);
        $.msg('扫描全能王', '⚠️ 脚本运行异常', String(e).slice(0, 100));
    }

    $.done();
})();

// ── 错误判定 + 重试 ────────────────────────────────────────────────────────────

// intsig 约定:成功 ret 为 0 或 "200"(类型不统一,统一转字符串比对)
// ret 105/116 或 err 含 token = 凭据失效;ret 109 = 请求频繁(限频)
function isTokenError(res) {
    if (!res) return false;
    const ret = String(res.ret);
    return ret === '105' || ret === '116' || /token/i.test(res.err || '');
}
function isRateLimit(res) {
    if (!res) return false;
    return String(res.ret) === '109' || /frequent|频繁/i.test(res.err || '');
}

// 仅对限频(109)重试一次,等 5s——别让一次抽奖机会被静默吞掉
async function withRetry(fn) {
    let res = await fn();
    if (isRateLimit(res)) {
        $.log('[WARN] 触发限频(109),等待 5s 后重试一次');
        await sleep(5000);
        res = await fn();
    }
    return res;
}

// ── API ──────────────────────────────────────────────────────────────────────

function getLotteryInfo(token, cs_ept_d) {
    const url = 'https://api-cs.intsig.net/user/cs/reward/big_lottery?' +
        `cs_ept_d=${enc(cs_ept_d)}&lottery_for_new=1&time_zone=${TIME_ZONE}&token=${enc(token)}`;
    return get(url, h5Headers());
}

async function getLotteryCode(token, client_id) {
    const ts = String(Date.now());
    const params = {
        client:     CLIENT,
        client_app: CLIENT_APP,
        client_id:  client_id,
        country:    COUNTRY,
        language:   LANGUAGE,
        method:     'get_lottery_code',
        time_zone:  TIME_ZONE,
        timestamp:  ts,
        token:      token,
    };
    const sign = computeSign(params);

    // client_app: @ → %40 in sign; URL 需双编码 %2540 → 服务端解码得 %40 → sign 字符串一致
    const qs = buildQS(params, sign);
    const url = `https://api-cs.intsig.net/user/cs/reward/task_handle?${qs}`;
    return get(url, nativeHeaders(token));
}

function drawLottery(token, cs_ept_d, lottery_code) {
    const params = {
        app_version: APP_VER,
        award_id:    'big_lottery_award',
        client_app:  CLIENT_APP,
        country:     COUNTRY,
        cs_ept_d:    cs_ept_d,
        language:    LANGUAGE,
        lottery_code: String(lottery_code),
        lottery_for_new: '1',
        time_zone:   TIME_ZONE,
        token:       token,
    };
    const qs = Object.keys(params).sort().map(k => `${k}=${enc(params[k])}`).join('&');
    const url = `https://api-cs.intsig.net/user/cs/reward/lottery?${qs}`;
    return get(url, h5Headers());
}

// ── sign ─────────────────────────────────────────────────────────────────────

function computeSign(params) {
    const keys = Object.keys(params).sort();
    const plain = keys.map(k => `${k}=${enc(String(params[k]))}`).join('&') + APP_SECRET;
    return md5Hex(plain);
}

// 构建 URL query:client_app 特殊处理——@ 在 sign 里是 %40,放 URL 时要双编码成 %2540
// 使服务端解码一次后得到 %40,再算 sign 时就能对上
function buildQS(params, sign) {
    const parts = Object.keys(params).sort().map(k => {
        if (k === 'client_app') {
            // raw CLIENT_APP = "CamScanner_IP_FREE@7.19.5.2606111943"
            // 双编码: @ → %40 → %2540
            return `client_app=${CLIENT_APP.replace('@', '%2540')}`;
        }
        return `${k}=${enc(String(params[k]))}`;
    });
    parts.push(`sign=${sign}`);
    return parts.join('&');
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function h5Headers() {
    return {
        'Origin':          'https://mo.camscanner.com',
        'Referer':         'https://mo.camscanner.com/',
        'User-Agent':      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
    };
}

function nativeHeaders(token) {
    return {
        'x-is-token':      token,
        'x-is-request-id': randomUUID(),
        'Accept':          '*/*',
        'User-Agent':      `CamScanner_Lite/${APP_VER.split('.').slice(0, 3).join('.')} (iPhone; iOS 26.1; Scale/3.00)`,
        'Accept-Language': 'zh-Hans-CN;q=1',
    };
}

function get(url, headers) {
    return new Promise((resolve, reject) => {
        const opts = { url, headers };
        const cb = (err, resp, body) => {
            if (err) {
                $.log(`[HTTP ERROR] ${err}\nURL: ${url}`);
                return reject(new Error(err));
            }
            try {
                const j = JSON.parse(body);
                // 原始响应只在调试模式打印(BoxJS camscanner_debug=true),平时不刷屏
                debug(body.slice(0, 300), url.split('?')[0].split('/').pop());
                // 返回完整对象({ret, err, data}),让调用方自行判错+拆包
                return resolve(j);
            } catch (e) {
                $.log(`[HTTP PARSE ERROR] ${body.slice(0, 300)}`);
                return reject(new Error('JSON parse error'));
            }
        };
        if ($.isQuanX()) {
            $task.fetch({ method: 'GET', url, headers }).then(r => cb(null, r, r.body), e => cb(e));
        } else if ($.isSurge()) {
            $httpClient.get(opts, (e, r, b) => cb(e, r, b));
        } else if ($.isLoon()) {
            $httpClient.get(opts, (e, r, b) => cb(e, r, b));
        } else {
            const https = require('https');
            const u = new URL(url);
            https.get({ host: u.host, path: u.pathname + u.search, headers }, res => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => cb(null, res, d));
            }).on('error', e => cb(e));
        }
    });
}

// ── utils ────────────────────────────────────────────────────────────────────

function enc(s) { return encodeURIComponent(String(s)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase();
    });
}

// ── pure-JS MD5 (同 WPS 脚本口径) ────────────────────────────────────────────

function utf8Bytes(str) {
    const out = [];
    for (const ch of unescape(encodeURIComponent(str))) out.push(ch.charCodeAt(0));
    return out;
}

function md5Hex(str) {
    const rol = (n, c) => (n << c) | (n >>> (32 - c));
    const s = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
    const K = [];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    const m = utf8Bytes(str);
    const origLen = m.length;
    m.push(0x80);
    while (m.length % 64 !== 56) m.push(0);
    const bitLen = origLen * 8;
    for (let i = 0; i < 8; i++) m.push(Math.floor(bitLen / Math.pow(2, 8 * i)) & 0xff);
    for (let off = 0; off < m.length; off += 64) {
        const M = [];
        for (let i = 0; i < 16; i++)
            M[i] = (m[off + i * 4]) | (m[off + i * 4 + 1] << 8) | (m[off + i * 4 + 2] << 16) | (m[off + i * 4 + 3] << 24);
        let A = a0, B = b0, C = c0, D = d0;
        for (let i = 0; i < 64; i++) {
            let F, g;
            if (i < 16) { F = (B & C) | (~B & D); g = i; }
            else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
            else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
            else { F = C ^ (B | ~D); g = (7 * i) % 16; }
            F = (F + A + K[i] + M[g]) >>> 0;
            A = D; D = C; C = B;
            B = (B + rol(F, s[i])) >>> 0;
        }
        a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    const hexLE = (n) => { let h = ''; for (let i = 0; i < 4; i++) h += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0'); return h; };
    return hexLE(a0) + hexLE(b0) + hexLE(c0) + hexLE(d0);
}

// ── Env ───────────────────────────────────────────────────────────────────────

function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== 'undefined' && !!$httpClient;
    this.isQuanX = () => typeof $task !== 'undefined' && !!$task;
    this.isLoon  = () => typeof $loon !== 'undefined' && !!$loon;
    this.log = (...a) => console.log(a.join('\n'));
    this.msg = (t = this.name, s = '', b = '') => {
        if (this.isSurge() || this.isLoon()) $notification.post(t, s, b);
        else if (this.isQuanX()) $notify(t, s, b);
        console.log(['', '====📣' + t + '====', s, b].filter(Boolean).join('\n'));
    };
    this.getdata = (k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        if (typeof $persistentStore !== 'undefined') return $persistentStore.read(k);
        return null;
    };
    this.setdata = (v, k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.write(v, k);
        if (this.isQuanX()) return $prefs.setValueForKey(v, k);
        if (typeof $persistentStore !== 'undefined') return $persistentStore.write(v, k);
        return false;
    };
    this.done = (v = {}) => { if (typeof $done !== 'undefined') $done(v); };
}
