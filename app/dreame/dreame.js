/**
 * 追觅 · 追觅商城每日签到,得积分 / 成长值,支持连签奖励
 *
 * 抓取:打开「追觅」APP →「商城」或「我的」页停留 1 秒(自动触发 my/info),抓 Cookie
 * 签到:cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-21
 *
 * ===== Loon =====
 * [MITM]
 * hostname = cn-wxmall.dreame.tech
 * [Script]
 * http-request ^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info tag=追觅 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png
 * cron "33 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js, tag=追觅签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png
 *
 * ===== Surge =====
 * [MITM]
 * hostname = cn-wxmall.dreame.tech
 * [Script]
 * 追觅 Cookie = type=http-request,pattern=^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png
 * 追觅签到 = type=cron,cronexp="33 8 * * *",wake-system=1,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = cn-wxmall.dreame.tech
 * [rewrite_local]
 * ^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js
 * [task_local]
 * 33 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js, tag=追觅签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png, enabled=true
 *
 * ===== Stash =====
 * http:
 *   mitm:
 *     - "cn-wxmall.dreame.tech"
 *   script:
 *     - match: ^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info
 *       name: 追觅 Cookie
 *       type: request
 *       require-body: true
 * cron:
 *   script:
 *     - name: 追觅签到
 *       cron: "33 8 * * *"
 *       timeout: 60
 */

const $ = new Env("追觅");

const SCRIPT_VERSION = "2026-06-21.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = 'dreame_data';
const BASE   = 'https://cn-wxmall.dreame.tech/main/member-center';

// 签名盐:body 字段排序后作为 security_key 字段参与 md5(详见本地 project.md)
const SALT = 'b_m3h^jWfA9jp';
// 客户端固定标识(所有用户一致,非隐私;随 app 版本走,失效就重抓一次包对照)
const CLIENT = {
    'client-id':      'dreame_appv1',
    'store-id':       'dreame_appv1',
    'dreame-api':     'i_1666147923',
    'dreame-version': '2.1.6',
};
const SDK_VERSION  = '20';
const VERSION_CODE = '1220';

// ─── 入口 ────────────────────────────────────────────────────────────────────
if (typeof $request !== "undefined") {
    getCookie();
    $.done();
} else {
    (async () => {
        if (JSON.parse($.getdata("dreame_clear") || "false")) {
            $.setdata("", CK_KEY);
            $.setdata("false", "dreame_clear");
            $.msg($.name, "", "✅ Cookie 已清除，请重新抓取");
            return $.done();
        }
        try {
            await main();
        } catch (e) {
            $.msg($.name, '❌ 运行异常', String(e));
        } finally {
            $.done();
        }
    })();
}

// ─── 抓 Cookie ───────────────────────────────────────────────────────────────
// 触发条件: 打开追觅 APP →「商城」或「我的」, my/info 请求 body 里带 sessid + user_id
function getCookie() {
    let raw = $request.body || '';

    // 实际传输是 url-encoded form;个别抓包/平台可能给 base64,做兜底
    let params = parseForm(raw);
    if (!params.sessid) {
        try { params = parseForm(b64decode(raw)); } catch (e) { /* ignore */ }
    }

    const sessid = params.sessid;
    if (!sessid) {
        $.msg($.name, '⚠️ 未提取到 sessid',
            '请确认已开启 MITM 并打开追觅「商城 / 我的」页面');
        return;
    }

    // user_id 优先取 body,兜底从 sessid(JWT)的 sub 里解
    const userId = params.user_id || userIdFromJwt(sessid) || '';
    if (!userId) {
        $.msg($.name, '⚠️ 未提取到 user_id', '请重新打开页面再试');
        return;
    }

    $.setdata(JSON.stringify({ sessid, user_id: userId }), CK_KEY);
    $.msg($.name, '✅ 追觅 Cookie 获取成功',
        `user_id: ${userId}\nsessid: ${maskToken(sessid)}`);
}

// ─── 签到主逻辑 ──────────────────────────────────────────────────────────────
async function main() {
    const raw = $.getdata(CK_KEY);
    if (!raw) {
        $.msg($.name, '🚫 缺少 Cookie',
            '请先开启重写规则,打开追觅 APP「商城 / 我的」页面');
        return;
    }

    let ck;
    try {
        ck = JSON.parse(raw);
    } catch (e) {
        $.msg($.name, '🚫 Cookie 解析失败', '请清空后重新触发抓取');
        return;
    }
    if (!ck.sessid || !ck.user_id) {
        $.msg($.name, '🚫 Cookie 不完整', '请重新打开页面抓取');
        return;
    }

    // 1. 查签到状态
    const status = await call('sign-in-status', ck);
    if (!status || status.iRet !== 1) {
        const m = (status && status.sMsg) || '无响应';
        // sessid 过期 / 失效在这一步暴露(返回鉴权类错误)
        $.msg($.name, '❌ 状态查询失败', `${m}\n(若提示登录失效,请重新抓 Cookie)`);
        return;
    }
    if (status.data && status.data.todaySignedIn === true) {
        $.msg($.name, '✨ 今日已签到',
            `连签 ${status.data.continueSignDays || 0} 天`);
        return;
    }

    // 2. 执行签到
    const r = await call('sign-in', ck);
    if (!r || r.iRet !== 1) {
        const m = (r && r.sMsg) || JSON.stringify(r).slice(0, 200);
        if (/已签|签过/.test(m)) {
            $.msg($.name, '✨ 今日已签到', m);
        } else {
            $.msg($.name, '❌ 签到失败', m);
        }
        return;
    }

    // 3. 拼通知:连签天数 / 今日积分 / 总积分(失败不影响签到主结果)
    let continueDays = '', todayPoint = '', total = '';
    try {
        const info = await call('continue-sign-info', ck);
        if (info && info.iRet === 1 && info.data) {
            todayPoint = info.data.todaySignInPoint != null ? `+${info.data.todaySignInPoint} 积分` : '';
        }
        const score = await call('score-get', ck);
        if (score && score.iRet === 1 && score.data) {
            total = score.data.totalPoints != null ? `总积分 ${score.data.totalPoints}` : '';
        }
        // 签到响应或再查一次 status 拿连签天数
        const st2 = await call('sign-in-status', ck);
        if (st2 && st2.iRet === 1 && st2.data) {
            continueDays = st2.data.continueSignDays != null ? `连签 ${st2.data.continueSignDays} 天` : '';
        }
    } catch (e) {
        debug('拼通知阶段异常,忽略: ' + e);
    }

    const body = [todayPoint, continueDays, total].filter(Boolean).join(' · ') || '签到成功';
    $.msg($.name, '✅ 追觅签到成功', body);
}

// ─── 调一次 member-center 接口 ───────────────────────────────────────────────
function call(endpoint, ck, extra = {}) {
    return new Promise((resolve) => {
        const params = {
            user_id:     ck.user_id,
            sessid:      ck.sessid,
            sdkVersion:  SDK_VERSION,
            versionCode: VERSION_CODE,
            sign_time:   String(Math.floor(Date.now() / 1000)),
            ...extra,
        };
        const sign = buildSign(params);          // dreame-sign(放 header)
        const body = buildBody(params);          // form body(不含 security_key / sign)

        const opts = {
            url: `${BASE}/${endpoint}`,
            headers: {
                'content-type':    'application/x-www-form-urlencoded',
                'accept':          '*/*',
                'accept-language': 'zh-CN,zh-Hans;q=0.9',
                'dreame-sign':     sign,
                'user-agent':      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) ' +
                                   'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148_DreameHome',
                ...CLIENT,
            },
            body,
            timeout: 10000,
        };

        debug(`[${endpoint}] sign=${sign.slice(0, 8)}... sign_time=${params.sign_time}`);
        $.post(opts, (err, _resp, data) => {
            if (err) {
                debug(`[${endpoint}] 错误: ${JSON.stringify(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                debug(`[${endpoint}] 响应解析失败: ${String(data).slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// 签名: 把盐塞进 security_key 字段, 所有 key 排序后拼 "k=v&k=v..." 再 md5
function buildSign(params) {
    const p = { ...params, security_key: SALT };
    const s = Object.keys(p).sort().map(k => `${k}=${p[k]}`).join('&');
    return md5(s);
}

// 发送 body: 普通 url-encoded form(不含 security_key, 不含 sign)
function buildBody(params) {
    return Object.keys(params)
        .map(k => `${k}=${encodeURIComponent(params[k])}`)
        .join('&');
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
function parseForm(str) {
    const out = {};
    if (!str) return out;
    for (const seg of String(str).split('&')) {
        const i = seg.indexOf('=');
        if (i < 0) continue;
        const k = seg.slice(0, i);
        const v = seg.slice(i + 1);
        try { out[k] = decodeURIComponent(v); } catch (e) { out[k] = v; }
    }
    return out;
}

// 从 sessid(JWT)的 payload.sub 里取 user_id(body 没带时的兜底)
function userIdFromJwt(jwt) {
    try {
        const parts = String(jwt).split('.');
        if (parts.length < 2) return '';
        const payload = JSON.parse(b64decode(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const sub = payload.sub || {};
        return sub.user_id || sub.uid || '';
    } catch (e) {
        return '';
    }
}

function b64decode(s) {
    if (typeof Buffer !== 'undefined') return Buffer.from(s, 'base64').toString('utf-8');
    if (typeof atob !== 'undefined') return decodeURIComponent(escape(atob(s)));
    return '';
}

function maskToken(s) {
    if (!s || s.length < 12) return '***';
    return s.slice(0, 6) + '...' + s.slice(-4);
}

// 调试日志:BoxJS 设 dreame_debug=true 才打印接口原始响应
function debug(content) {
    if (($.getdata("dreame_debug") || "false") !== "true") return;
    $.log(`[DEBUG] ${typeof content === "string" ? content : JSON.stringify(content)}`);
}

/**
 * 轻量 MD5 实现 (基于 Joseph Myers 公版实现 v2.2,~3KB)
 * 输入 utf-8 字符串,输出 32 位小写 hex
 */
function md5(str) {
    function rotateLeft(lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }
    function addUnsigned(lX, lY) {
        const lX8 = (lX & 0x80000000), lY8 = (lY & 0x80000000);
        const lX4 = (lX & 0x40000000), lY4 = (lY & 0x40000000);
        const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        if (lX4 | lY4) {
            if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
        }
        return (lResult ^ lX8 ^ lY8);
    }
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }
    function FF(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function GG(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function HH(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function II(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function convertToWordArray(str) {
        let lWordCount;
        const lMessageLength = str.length;
        const lNumberOfWords_temp1 = lMessageLength + 8;
        const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
        const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        const lWordArray = Array(lNumberOfWords - 1);
        let lBytePosition = 0;
        let lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    }
    function wordToHex(lValue) {
        let WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
        }
        return WordToHexValue;
    }
    function utf8Encode(string) {
        string = string.replace(/\r\n/g, "\n");
        let utftext = "";
        for (let n = 0; n < string.length; n++) {
            const c = string.charCodeAt(n);
            if (c < 128) utftext += String.fromCharCode(c);
            else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    }
    let x = [], k, AA, BB, CC, DD, a, b, c, d;
    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;
    str = utf8Encode(str);
    x = convertToWordArray(str);
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
    for (k = 0; k < x.length; k += 16) {
        AA = a; BB = b; CC = c; DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
        d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
        c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
        b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
        a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
        d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
        c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
        b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
        a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
        d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
        c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
        b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
        a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
        d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
        c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
        b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
        a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
        d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
        c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
        b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
        a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
        d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
        c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
        b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
        a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
        d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
        c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
        b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
        a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
        d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
        c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
        b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
        a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
        d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
        c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
        b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
        a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
        d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
        c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
        b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
        a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
        d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
        c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
        b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
        a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
        d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
        c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
        b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
        a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
        d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
        c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
        b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
        a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
        d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
        c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
        b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
        a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
        d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
        c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
        b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
        a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
        d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
        c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
        b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
        a = addUnsigned(a, AA); b = addUnsigned(b, BB);
        c = addUnsigned(c, CC); d = addUnsigned(d, DD);
    }
    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// @Chavy Env
function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== 'undefined';
    this.isQuanX = () => typeof $task !== 'undefined';
    this.isLoon  = () => typeof $loon !== 'undefined';
    this.log = (...a) => console.log(a.join('\n'));
    this.msg = (t = this.name, s = '', b = '') => {
        if (this.isSurge() || this.isLoon()) $notification.post(t, s, b);
        else if (this.isQuanX()) $notify(t, s, b);
        console.log(['', '====📣' + t + '====', s, b].filter(Boolean).join('\n'));
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
    this.get  = (req, cb) => this.send(req, 'GET',  cb);
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
