/**
 * 一点万象 · 华润万象生活「一点万象」APP 每日签到,覆盖万象汇/万象城/万象天地等华润商场
 *
 * 抓取:打开「一点万象」APP → 任意页停留 1 秒(自动触发 getPersonalData),抓 cookie
 * 签到:cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-23
 *
 * ===== Loon =====
 * [MITM]
 * hostname = app.mixcapp.com
 * [Script]
 * http-request ^https:\/\/app\.mixcapp\.com\/mixc\/api\/v4\/member\/getPersonalData tag=一点万象 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png
 * cron "37 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.js, tag=一点万象签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = app.mixcapp.com
 * [Script]
 * 一点万象 Cookie = type=http-request,pattern=^https:\/\/app\.mixcapp\.com\/mixc\/api\/v4\/member\/getPersonalData,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png
 * 一点万象签到 = type=cron,cronexp=37 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = app.mixcapp.com
 * [rewrite_local]
 * ^https:\/\/app\.mixcapp\.com\/mixc\/api\/v4\/member\/getPersonalData url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.cookie.js
 * [task_local]
 * 37 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.js, tag=一点万象签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 一点万象签到
 *       cron: '37 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "app.mixcapp.com"
 *   script:
 *     - match: ^https:\/\/app\.mixcapp\.com\/mixc\/api\/v4\/member\/getPersonalData
 *       name: 一点万象 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   一点万象签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.js
 *     interval: 86400
 */

const $ = new Env("一点万象");

const SCRIPT_VERSION = "2026-05-23.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = 'newmixc_data';
const SALT = 'P@Gkbu0shTNHjhM!7F';            // H5 包 signIn 章节挖出的盐
const APP_ID = '68a91a5bac6a4f3e91bf4b42856785c6';  // H5 端 appId (常量 d)
const GATEWAY = 'https://app.mixcapp.com/mixc/gateway';

(async () => {
    const ckRaw = $.getdata(CK_KEY);
    if (!ckRaw) {
        $.msg('一点万象', '🚫 缺少 Cookie',
            '请先开启 cookie 抓取脚本,然后打开一点万象 APP 任意页面停留 1 秒');
        $.done();
        return;
    }

    let ck;
    try {
        ck = JSON.parse(ckRaw);
    } catch (e) {
        $.msg('一点万象', '🚫 Cookie 解析失败', '请清空缓存重抓');
        $.done();
        return;
    }

    const required = ['token', 'mallNo', 'imei', 'deviceParams', 'appVersion', 'osVersion'];
    const missing = required.filter(k => !ck[k]);
    if (missing.length) {
        $.msg('一点万象', '🚫 Cookie 不完整', `缺: ${missing.join(',')} ,请重抓`);
        $.done();
        return;
    }

    const phoneMasked = maskPhone(ck.phone);
    $.log(`▶️ 开始签到 账号=${phoneMasked} 商场=${ck.mallNo}`);

    try {
        // 1. 查签到状态
        const status = await call(ck, 'mixc.app.memberSign.latticeList');
        let alreadySigned = false;
        if (status && status.code === 0 && status.data && Array.isArray(status.data.signPointList)) {
            const todayStr = formatDate(new Date());
            const today = status.data.signPointList.find(x => x.signDate === todayStr);
            if (today && today.sign === 1) alreadySigned = true;
            $.log(`📋 状态: 今日${alreadySigned ? '已签' : '未签'},连签 ${status.data.continuousSign || 0} 天`);
        } else {
            $.log(`⚠️ 状态查询异常: ${JSON.stringify(status).slice(0, 200)}`);
        }

        if (alreadySigned) {
            $.msg('一点万象', `✨ ${phoneMasked} 今日已签`,
                `连签 ${status.data.continuousSign || 0} 天`);
            $.done();
            return;
        }

        // 2. 执行签到
        const r = await call(ck, 'mixc.app.memberSign.sign');
        if (!r || r.code !== 0) {
            const m = (r && (r.message || r.msg)) || JSON.stringify(r).slice(0, 200);
            // 兜底: 接口可能用其它字段表达"已签"
            if (/已签|签过/.test(m)) {
                $.msg('一点万象', `✨ ${phoneMasked} 今日已签`, m);
            } else {
                $.msg('一点万象', `❌ ${phoneMasked} 签到失败`, m);
            }
            $.done();
            return;
        }

        const sd = (r.data && r.data.signDataMap) || {};
        const todayPoint = sd.todayPoint || r.data.point || 0;
        const continuous = sd.continuousSign || 0;
        const userPoints = r.data.userPoints;
        $.log(`✅ 签到成功 +${todayPoint} 积分`);

        // 3. 尝试领阶段奖(签到接口本身已发主积分,nextStep 可能有连签奖)
        let extraMsg = '';
        if (r.data.remainStep && r.data.remainStep > 0) {
            try {
                const ns = await call(ck, 'mixc.app.memberSign.nextStep');
                if (ns && ns.code === 0 && ns.data) {
                    if (ns.data.couponName) {
                        extraMsg = `\n🎁 阶段奖: ${ns.data.couponName}`;
                    } else if (ns.data.mixcPoints) {
                        extraMsg = `\n🎁 阶段奖: +${ns.data.mixcPoints} 积分`;
                    }
                }
            } catch (e) {
                $.log('nextStep 调用异常,忽略: ' + e);
            }
        }

        const body = `+${todayPoint} 积分 · 连签 ${continuous} 天${userPoints != null ? ` · 总积分 ${userPoints}` : ''}${extraMsg}`;
        $.msg('一点万象', `✅ ${phoneMasked} 签到成功`, body);
    } catch (e) {
        $.log('❌ 异常: ' + (e.message || e));
        $.msg('一点万象', `❌ ${phoneMasked} 签到异常`, String(e.message || e));
    }

    $.done();
})();


// 调一次网关接口
function call(ck, action) {
    return new Promise((resolve) => {
        const t = Date.now();
        const params = {
            mallNo: ck.mallNo,
            appId: APP_ID,
            platform: 'h5',
            imei: ck.imei,
            appVersion: ck.appVersion,
            osVersion: ck.osVersion,
            action: action,
            apiVersion: '1.0',
            timestamp: String(t + 2),       // 模拟和 t 差 2ms
            deviceParams: ck.deviceParams,
            'X-Mixc-Swimlane': 's1',
            t: String(t),
            date: formatDateTime(new Date(t)),
            token: ck.token,
            params: b64encode(JSON.stringify({ mallNo: ck.mallNo })),
        };
        params.sign = computeSign(params);

        // 拼成 form body
        const body = Object.keys(params)
            .map(k => `${k}=${encodeURIComponent(params[k])}`)
            .join('&');

        const opts = {
            url: GATEWAY,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://app.mixcapp.com',
                'Referer': `https://app.mixcapp.com/m/m-${ck.mallNo}/signIn?appVersion=${ck.appVersion}&mallNo=${ck.mallNo}&showWebNavigation=true&hideNativeNavigation=true`,
                'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) crland/4.4.0 grayscale/0 /MIXCAPP/${ck.appVersion} AnalysysAgent/Hybrid`,
                'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
            },
            body: body,
        };

        $.log(`[${action}] 发送 sign=${params.sign.slice(0, 8)}...`);
        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[${action}] 错误: ${JSON.stringify(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                $.log(`[${action}] 响应解析失败: ${(data || '').slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// 签名: 按 key 排序拼 "k1=v1&k2=v2&..." + salt 然后 md5
// 跳过 null/undefined,保留 0 / "" / 真值
function computeSign(params) {
    const keys = Object.keys(params).sort();
    let s = '';
    for (const k of keys) {
        const v = params[k];
        if (v == null) continue;   // null / undefined 跳过
        s += `${k}=${v}&`;
    }
    s += SALT;
    return md5(s);
}

function formatDate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(d) {
    const pad = (n) => String(n).padStart(2, '0');
    // 抓包看到的是 12 小时制(09:38:31 是 hh 不是 HH),但 9 时段不影响视觉
    // 用 24 小时也能通过(签名只校验字符串一致性,字符串本身格式服务端不强校验)
    const h = d.getHours();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${formatDate(d)} ${pad(h12)}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function maskPhone(p) {
    if (!p || String(p).length !== 11) return p || '未知';
    return String(p).slice(0, 3) + '****' + String(p).slice(7);
}

// base64 编码(跨平台)
function b64encode(s) {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(s, 'utf-8').toString('base64');
    }
    return btoa(unescape(encodeURIComponent(s)));
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
    this.isLoon = () => typeof $loon !== 'undefined';
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
