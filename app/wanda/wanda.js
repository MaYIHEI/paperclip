/**
 * 万达电影 · 每日签到(成长值 +1) —— 全自包含版,无需 Worker/VPS
 *
 * 抓取:打开万达电影 APP →「我的」,见 wanda.cookie.js
 * 签到:cron 定时,签名本地计算,全自包含不联网。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-10-28
 *
 * ===== Loon =====
 * [MITM]
 * hostname = user-api-prd-mx.wandafilm.com
 * [Script]
 * request if ${url} ~= /^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.cookie.js") with tag="万达电影 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png"
 * cron "20 9 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js") with tag="万达电影签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png"
 *
 * ===== Surge =====
 * [MITM]
 * hostname = user-api-prd-mx.wandafilm.com
 * [Script]
 * 万达电影 Cookie = type=http-request,pattern=^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png
 * 万达电影签到 = type=cron,cronexp=20 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = user-api-prd-mx.wandafilm.com
 * [rewrite_local]
 * ^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.cookie.js
 * [task_local]
 * 20 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js, tag=万达电影签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 万达电影签到
 *       cron: '20 9 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "user-api-prd-mx.wandafilm.com"
 *   script:
 *     - match: ^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info
 *       name: 万达电影 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   万达电影签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js
 *     interval: 86400
 */

// ========== MD5(纯 JS,输入按 UTF-8) ==========
function md5(str) {
    const s = unescape(encodeURIComponent(str));
    const n = ((s.length + 8) >> 6) + 1, x = new Array(n * 16).fill(0);
    for (let i = 0; i < s.length; i++) x[i >> 2] |= s.charCodeAt(i) << (i % 4 * 8);
    x[s.length >> 2] |= 0x80 << (s.length % 4 * 8);
    x[n * 16 - 2] = s.length * 8;
    const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    const K = [];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    for (let o = 0; o < x.length; o += 16) {
        let a = a0, b = b0, c = c0, d = d0;
        for (let i = 0; i < 64; i++) {
            let f, g;
            if (i < 16) { f = (b & c) | (~b & d); g = i; }
            else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
            else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
            else { f = c ^ (b | ~d); g = (7 * i) % 16; }
            const t = d; d = c; c = b;
            const r = (a + f + K[i] + x[o + g]) | 0, sh = S[(i >> 4) * 4 + i % 4];
            b = (b + ((r << sh) | (r >>> (32 - sh)))) | 0;
            a = t;
        }
        a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
    }
    let out = '';
    for (const v of [a0, b0, c0, d0])
        for (let i = 0; i < 4; i++) out += ((v >>> (i * 8)) & 255).toString(16).padStart(2, '0');
    return out;
}

// 万达 urlEncodeUnicode —— 签名 body 的规范化(与 App 一致)
function urlEncodeUnicode(s) {
    if (typeof s !== 'string') s += '';
    const isSafe = (c) =>
        (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') ||
        c === "'" || c === '(' || c === ')' || c === '*' || c === '-' ||
        c === '.' || c === '_' || c === '!' || c === '~';
    const hex = (n) => n <= 9 ? String.fromCharCode(n + 48) : String.fromCharCode(n - 10 + 97);
    const out = [];
    for (let i = 0; i < s.length; i++) {
        const ch = s.charAt(i), n = s.charCodeAt(i);
        if (n < 128) {
            if (isSafe(ch)) out.push(ch);
            else if (ch === ' ') out.push('+');
            else { out.push('%'); out.push(hex(n >> 4 & 15)); out.push(hex(15 & n)); }
        } else {
            out.push('%u'); out.push(hex(n >> 12 & 15)); out.push(hex(n >> 8 & 15));
            out.push(hex(n >> 4 & 15)); out.push(hex(15 & n));
        }
    }
    return out.join('');
}

// ========== 签到逻辑 ==========
const $ = new Env('万达电影');

// 签到合集开启「统一通知」时不单独弹通知,结果由签到汇总统一发送
$.merge = typeof $argument === "object" && !!$argument && $argument.merge === true;
if ($.merge) $.msg = (...a) => console.log(a.filter((x) => typeof x === "string" && x).join("\n"));

// 补签入口:请求 http://1.1.1.1/checkin/wanda 时现跑一次签到,跑完把本脚本的签到状态作为响应返回
const CHECKIN_RUN = typeof $request !== 'undefined' && /^http:\/\/1\.1\.1\.1\/checkin\//.test($request.url);
if (CHECKIN_RUN) { const end = $.done.bind($); $.done = () => end({ response: { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: $.getdata('wanda_status') || '{}' } }); }

const SCRIPT_VERSION = '2026-10-28.r1'; // 改用 App 渠道签名,恢复签到
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = 'wanda_data';
const API = 'https://front-gateway-c.wandafilm.com';
const SIGN_URI = '/sign_in/do_sign_in.api';
const CAL_URI = '/sign_in/calendar.api';
const DEBUG = JSON.parse($.getdata('wanda_debug') || 'false');

// App 渠道签名
const CHANNEL = '1_1';
const CLIENT_KEY = '3K8DN7A2FZQ9XJ1L5TYVW0BC4G6HMRPSEUIOA2L7M3N5P8Q9RSTUVWXYZ01234A';
function signCheck(ts, uri, bodyStr) {
    return md5('Wanda' + CHANNEL + CLIENT_KEY + ts + uri + urlEncodeUnicode(bodyStr));
}

// 旧 Cookie 没存设备信息时的默认值(取自 App 9.4.6)
const DEF_DEV = {
    ua: 'WandaFilm-Swift/9.4.6.316 CFNetwork/3860.200.71 Darwin/25.1.0',
    model: 'iPhone15,3', sysVer: '26.1', ver: '9.4.6',
};

if (JSON.parse($.getdata('wanda_clear') || 'false')) {
    $.setdata('', CK_KEY);
    $.setdata('false', 'wanda_clear');
    $.msg($.name, '', '✅ Cookie 已清除，请重新抓取');
    $.done();
} else {
(async () => {
    const raw = $.getdata(CK_KEY);
    if (!raw) {
        saveStatus('none', '未抓取 Cookie');
        $.msg($.name, '🚫 缺少 Cookie',
            '请先开启 Cookie 抓取脚本,再打开万达电影 APP →「我的」');
        $.done();
        return;
    }
    let ck;
    try { ck = JSON.parse(raw); } catch (e) {
        saveStatus('cookie', 'Cookie 解析失败');
        $.msg($.name, '🚫 Cookie 解析失败', '请清空缓存重抓');
        $.done();
        return;
    }
    if (!ck.token || !ck.user) {
        saveStatus('cookie', 'Cookie 不完整');
        $.msg($.name, '🚫 Cookie 不完整', '缺 token/user,请重抓');
        $.done();
        return;
    }

    const user = mask(ck.user);
    const signInDate = todayCN();
    $.log(`▶️ 开始签到 user=${user} date=${signInDate}`);

    let before;
    try {
        before = await todayState(ck);
    } catch (e) {
        $.log(`[sign] 签名引擎异常: ${e && e.message || e}`);
        saveStatus('fail', '本地签名引擎异常');
        $.msg($.name, `❌ ${user} 签到失败`, '本地签名引擎异常,请查看日志');
        $.done();
        return;
    }
    if (before === 1) {
        saveStatus('ok', '今日已签');
        $.msg($.name, `✨ ${user} 今日已签`, '日历显示今天已签到');
        $.done();
        return;
    }

    const resp = await post(ck, SIGN_URI, { signInDate, ruleScene: 1, json: 'true' });
    if (!resp) {
        saveStatus('fail', '万达接口无响应');
        $.msg($.name, `❌ ${user} 签到失败`, '万达接口无响应,请查看日志');
        $.done();
        return;
    }

    if (resp.code === 403 || /signature/i.test(resp.msg || '')) {
        // 签名引擎问题也会报 403,不能断定是 Cookie 失效
        saveStatus('fail', '签名校验失败,token 可能已失效');
        $.msg($.name, `🔐 ${user} 签名校验失败`,
            'token 可能已失效,请重开万达 APP「我的」重抓 Cookie');
        $.log(`[ERR] 403: ${JSON.stringify(resp).slice(0, 300)}`);
        $.done();
        return;
    }
    if (resp.code !== 0) {
        saveStatus('fail', `code=${resp.code} ${resp.msg || ''}`);
        $.msg($.name, `❌ ${user} 签到失败`, `code=${resp.code} ${resp.msg || ''}`);
        $.log(`[ERR] ${JSON.stringify(resp).slice(0, 400)}`);
        $.done();
        return;
    }
    $.log(`[sign] ${JSON.stringify(resp).slice(0, 300)}`);

    // 外层 code:0 不代表落账,以签到日历今天的 state 为准
    const after = await todayState(ck);
    if (after === 1) {
        const inner = (resp.data || {}).data || {};
        saveStatus('ok', inner.successMessage || '签到成功');
        $.msg($.name, `✅ ${user} 签到成功`, inner.successMessage || '签到成功');
    } else {
        saveStatus('fail', after === 0 ? '签到未生效' : '无法确认签到结果');
        $.msg($.name, `❌ ${user} 签到未生效`,
            after === 0 ? '接口已返回但日历仍未签到,请在 APP 内手动签到' : '查询签到日历失败,请查看日志');
    }
    $.done();
})();
}

// 今天的签到状态:1 已签 / 0 未签 / null 查询失败
async function todayState(ck) {
    const resp = await post(ck, CAL_URI, { json: 'true', ruleScene: 1 });
    const list = resp && resp.code === 0 && resp.data && resp.data.data && resp.data.data.dataList;
    const today = list && list.find((x) => x.todayFlag);
    if (!today) { $.log(`[calendar] ${JSON.stringify(resp).slice(0, 300)}`); return null; }
    $.log(`[calendar] ${today.date} state=${today.state}`);
    return today.state;
}

// 打万达接口(body 发原始 JSON;签名对 urlEncode 后的 body 算,signCheck 已处理)
function post(ck, uri, body) {
    const bodyStr = JSON.stringify(body);
    const ts = Date.now();
    const check = signCheck(ts, uri, bodyStr);
    if (DEBUG) $.log(`[DEBUG] ${uri} ts=${ts} check=${check}`);
    const dev = Object.assign({}, DEF_DEV, ck.dev);
    return new Promise((resolve) => {
        const mx = { json: 'true', model: dev.model, cCode: CHANNEL, check, appId: 1, sCode: 'Wanda', _mi_: ck.token };
        if (ck.shumei) mx.ShumeiBoxId = ck.shumei;
        Object.assign(mx, { ts, systemVersion: dev.sysVer, ver: dev.ver });
        const headers = {
            'X-RY-TIMESTAMP': String(ts),
            'Accept': '*/*',
            'MX-API': JSON.stringify(mx),
            'X-RY-TOKEN': ck.token,
            'X-RY-SYSTEM-VER': dev.sysVer,
            'X-RY-USER': ck.user,
            'MX-CID': Array.from({ length: 32 }, () => (Math.random() * 16 | 0).toString(16)).join(''),
            'Content-Type': 'application/json',
            'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
            'X-RY-CHANNEL': CHANNEL,
            'X-RY-VERSION': dev.ver,
            'X-RY-CHECK': check,
            'User-Agent': dev.ua,
            'X-RY-MODEL': dev.model,
        };
        if (ck.shumei) headers['ShumeiBoxId'] = ck.shumei;
        $.post({ url: API + uri, headers, body: bodyStr }, (err, resp, data) => {
            if (err) { $.log(`[post] ${uri} 错误: ${JSON.stringify(err)}`); resolve(null); return; }
            try { resolve(JSON.parse(data)); }
            catch (e) {
                $.log(`[post] ${uri} 解析失败 status=${resp && resp.statusCode}: ${(data || '').slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// 记录本次结果,供「签到汇总」:ok 正常 / cookie 需重新抓取 / fail 其他失败 / none 未使用
function saveStatus(s, msg) {
    msg = String(msg).slice(0, 100);
    // 服务器明确提示登录过期的失败,按需要重新抓取处理
    if (s === 'fail' && /过期|重新登录|未登录|请登录|登录失效|登录已失效|token\s*(失效|过期|无效)|not\s*login/i.test(msg)) s = 'cookie';
    // 同一天已有带奖励的成功记录时,再次运行得到的「今日已签」不覆盖它
    if (s === 'ok' && /^今日已/.test(msg)) {
        const day = (t) => new Date(t + 8 * 3600 * 1000).toISOString().slice(0, 10);
        let old = null;
        try { old = JSON.parse($.getdata('wanda_status') || 'null'); } catch (e) {}
        if (old && old.s === 'ok' && !/^今日已/.test(old.msg) && day(old.t) === day(Date.now())) return;
    }
    checkinReport('wanda_status', { s, msg }, { name: '万达电影', author: 'MaYIHEI', run: 'http://1.1.1.1/checkin/wanda' });
}

function todayCN() {
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function mask(s) {
    if (!s) return '未知';
    if (s.length <= 4) return s;
    return s.slice(0, 2) + '****' + s.slice(-2);
}

// 签到状态协议 v1:写本次结果,并把自己登记进公共索引 checkin_registry(Loon/Surge/QX/Stash 通用,不依赖 Env)
function checkinReport(key, rec, info) {
    const read = (k) => (typeof $prefs !== 'undefined' ? $prefs.valueForKey(k) : $persistentStore.read(k));
    const write = (v, k) => (typeof $prefs !== 'undefined' ? $prefs.setValueForKey(v, k) : $persistentStore.write(v, k));
    const registry = () => { try { return JSON.parse(read('checkin_registry') || '{}') || {}; } catch (e) { return {}; } };
    write(JSON.stringify(Object.assign({ v: 1, t: Date.now(), name: info.name, author: info.author }, rec)), key);
    const reg = registry();
    if (JSON.stringify(reg[key]) === JSON.stringify(info)) return;
    reg[key] = info;
    write(JSON.stringify(reg), 'checkin_registry');
    if (!registry()[key]) console.log(`[checkin] ${key} 登记没写上,下次运行再补`);
}

// @Chavy Env
function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== 'undefined';
    this.isQuanX = () => typeof $task !== 'undefined';
    this.isLoon = () => typeof $loon !== 'undefined';
    this.log = (...a) => console.log(a.join('\n'));
    this.msg = (t = this.name, s = '', b = '') => {
        if (typeof $notification !== 'undefined') $notification.post(t, s, b);
        else if (this.isQuanX()) $notify(t, s, b);
        console.log(['', '====📣' + t + '====', s, b].filter(Boolean).join('\n'));
    };
    this.getdata = (k) => {
        if (typeof $persistentStore !== 'undefined') return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        return null;
    };
    this.setdata = (v, k) => {
        if (typeof $persistentStore !== 'undefined') return $persistentStore.write(v, k);
        if (this.isQuanX()) return $prefs.setValueForKey(v, k);
        return false;
    };
    this.get = (req, cb) => this.send(req, 'GET', cb);
    this.post = (req, cb) => this.send(req, 'POST', cb);
    this.send = (req, method, cb) => {
        if (this.isSurge() || this.isLoon()) {
            const fn = method === 'POST' ? $httpClient.post : $httpClient.get;
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
    this.done = (v = {}) => { if (typeof $done !== 'undefined') $done(v); };
}
