/**
 * 脚本名称：龙德广场(芝麻科技 SaaS 通用)签到
 * 脚本说明：龙德广场微信小程序每日签到,送积分。底层是芝麻科技(china-smartech)
 *           SaaS,签名算法已本地复现(HmacSHA256, key = JWT)。JWT 有效期至 2099,
 *           理论上抓一次永久有效。
 *
 *           同套 SaaS 服务大量商场小程序,改 mall_id 即可适配其他商场。
 *
 * 环境变量：LONGDE_TOKEN (Bearer 后面那串 JWT)
 * 抓包：进小程序"我的"→"签到"页,即可触发 checkInForm 获取 token
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Created: 2026-05-23
 *
 * ------------------ Loon 配置 ------------------
 *
 * [MITM]
 * hostname = a.china-smartech.com
 *
 * [Script]
 * http-request https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm tag=龙德广场 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/longde/longde.js, requires-body=0
 *
 * cron "5 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/longde/longde.js, tag=龙德广场签到, enable=true
 *
 * ------------------ Surge 配置 -----------------
 *
 * [MITM]
 * hostname = a.china-smartech.com
 *
 * [Script]
 * 龙德广场 Cookie = type=http-request,pattern=https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm,requires-body=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/longde/longde.js
 * 龙德广场 = type=cron,cronexp=5 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/longde/longde.js,script-update-interval=0
 *
 * -------------- Quantumult X 配置 --------------
 *
 * [MITM]
 * hostname = a.china-smartech.com
 *
 * [rewrite_local]
 * https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/longde/longde.js
 *
 * [task_local]
 * 5 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/longde/longde.js, tag=龙德广场签到, enabled=true
 *
 * ------------------ Stash 配置 -----------------
 *
 * cron:
 *   script:
 *     - name: 龙德广场
 *       cron: '5 8 * * *'
 *       timeout: 10
 *
 * http:
 *   mitm:
 *     - "a.china-smartech.com"
 *   script:
 *     - match: https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm
 *       name: 龙德广场
 *       type: request
 *       require-body: false
 *
 * script-providers:
 *   龙德广场:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/longde/longde.js
 *     interval: 86400
 */

const $ = new Env("龙德广场");
const CK_NAME = "longde_token";
$.token = ($.isNode() ? process.env.LONGDE_TOKEN : $.getdata(CK_NAME)) || "";
$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("is_debug")) || "false";
$.messages = [];

const HOST = "https://a.china-smartech.com";
const VERSION = "v2.7.24t4livepoint";

// ============ 签名 (HmacSHA256, key = JWT) ============

function genNonce(len = 10) {
    const charset = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789";
    let s = "";
    for (let i = 0; i < len; i++) s += charset.charAt(Math.floor(Math.random() * charset.length));
    return s;
}

// 来自小程序 utils/signature.js 的 hashResult:
//   payload = url(未编码) + JSON.stringify(body)("{}" if 无 body) + timestamp + nonce
//   key     = wx.getStorageSync("access_token") (= 完整 JWT)
//   sig     = HmacSHA256(payload, key)
function sign(path, body, token) {
    let a;
    try {
        a = body === undefined || body === null ? "{}" : JSON.stringify(body);
    } catch (e) {
        a = "{}";
    }
    if (a === undefined) a = "{}";
    const c = Math.floor(Date.now() / 1000).toString();
    const s = genNonce(10);
    const u = path + a + c + s;
    const i = hmacSHA256Hex(u, token);
    return {
        "X-ZHIMA-VERSION": VERSION,
        "X-ZHIMA-TIMESTAMP": c,
        "X-ZHIMA-NONCE": s,
        "X-ZHIMA-SIGNATURE": i,
        "X-ZHIMA-URL": encodeURIComponent(path),
    };
}

// ============ JWT ============

function parseJWT(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        let p = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (p.length % 4) p += "=";
        let decoded;
        if (typeof Buffer !== "undefined") {
            decoded = Buffer.from(p, "base64").toString("utf-8");
        } else {
            decoded = decodeURIComponent(escape(atob(p)));
        }
        return JSON.parse(decoded);
    } catch (e) {
        return null;
    }
}

// ============ 业务 ============

async function checkin() {
    const payload = parseJWT($.token);
    if (!payload || !payload.mall_id) {
        throw new Error("JWT 解析失败,请重新抓取 token");
    }
    const mallId = payload.mall_id;
    $.log(`[INFO] mall_id=${mallId} user_id=${payload.sub}`);

    // 查签到状态(可选,提供丰富通知信息;签名可能因 mgms 不完全匹配,但接口宽容)
    const formPath = `restful/mall/${mallId}/checkInForm?with_records=1`;
    const formRes = await request("GET", formPath, null);
    debug(formRes, "checkInForm");

    if (formRes && formRes.code === 401) {
        throw new Error(`token 已失效: ${formRes.msg || ""}`);
    }

    // 签到
    const checkinPath = `restful/mall/${mallId}/checkInRecord`;
    const checkinBody = { latitude: 0, longitude: 0 };
    const res = await request("POST", checkinPath, checkinBody);
    debug(res, "checkInRecord");

    if (!res) {
        $.messages.push("❌ 签到失败: 无响应");
        return;
    }

    // 成功
    if (res.code === 200 && res.data) {
        const { point, point_total, total_point, extra, num } = res.data;
        const earned = point_total || point || 0;
        const extraLine = extra && extra > 0 ? ` (含连签 +${extra})` : "";
        const totalLine = typeof total_point === "number" ? `, 累计 ${total_point} 分` : "";
        const numLine = typeof num === "number" ? `\n📅 本月已签 ${num} 天` : "";
        $.messages.push(`✅ 签到成功: +${earned} 分${extraLine}${totalLine}${numLine}`);
        return;
    }

    // 已签
    if (res.code === 422 || /已签|已经签到/.test(res.msg || "")) {
        $.messages.push(`✨ 今日已签到${res.msg ? `: ${res.msg}` : ""}`);
        return;
    }

    // 401 / token 问题
    if (res.code === 401) {
        $.messages.push(`❌ token 失效: ${res.msg || ""}`);
        return;
    }

    $.messages.push(`❌ 签到失败: code=${res.code} msg=${res.msg || $.toStr(res)}`);
}

// ============ 请求 ============

function request(method, path, body) {
    return new Promise((resolve) => {
        const headers = {
            "Accept": "application/json",
            "content-type": "application/json",
            "Authorization": `Bearer ${$.token}`,
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.73(0x18004931) NetType/WIFI Language/zh_CN",
            "Referer": "https://servicewechat.com/wxbed463d49f94aaf3/197/page-frame.html",
        };
        Object.assign(headers, sign(path, body, $.token));

        const opts = { url: `${HOST}/${path}`, headers };
        if (method === "POST" && body) opts.body = JSON.stringify(body);

        debug({ url: opts.url, headers, body: opts.body }, `${method} request`);

        const fn = method === "POST" ? $.post : $.get;
        fn.call($, opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] ${method} ${path}: ${$.toStr(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(typeof data === "string" ? JSON.parse(data) : data);
            } catch (e) {
                $.log(`[ERROR] 响应解析失败: ${(data || "").substring(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// ============ Cookie 抓取 ============

function getCookie() {
    try {
        const headers = ObjectKeys2LowerCase($request.headers);
        const auth = headers["authorization"] || "";
        const newToken = auth.replace(/^Bearer\s+/i, "").trim();
        if (!newToken) {
            $.log("[WARN] 未抓到 Authorization 头");
            return;
        }
        const payload = parseJWT(newToken);
        if (!payload || !payload.mall_id) {
            $.log("[WARN] JWT 解析失败,放弃保存");
            return;
        }
        if (newToken === $.token) {
            $.log("[INFO] token 未变化");
            return;
        }
        $.setdata(newToken, CK_NAME);
        const expDate = payload.exp ? new Date(payload.exp * 1000).toLocaleDateString() : "?";
        $.msg($.name, "🎉 Token 获取成功", `mall_id: ${payload.mall_id}\n有效至: ${expDate}`);
    } catch (e) {
        $.log(`[ERROR] cookie 抓取异常: ${e}`);
    }
}

// ============ 工具 ============

function ObjectKeys2LowerCase(obj) {
    if (!obj) return {};
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

function debug(content, title = "debug") {
    if ($.is_debug !== "true") return;
    $.log(`\n----- ${title} -----`);
    $.log(typeof content === "string" ? content : $.toStr(content));
    $.log(`----- end -----\n`);
}

async function sendMsg(message) {
    if (!message) return;
    if ($.isNode()) {
        try {
            const notify = require("./sendNotify");
            await notify.sendNotify($.name, message);
        } catch (e) {
            $.log(`\n${$.name}\n${message}`);
        }
    } else {
        $.msg($.name, "", message);
    }
}

// ============ HmacSHA256 (纯 JS, 无依赖) ============
//
// SHA256 实现基于 https://github.com/jbt/js-crypto (公共领域 / WTFPL),
// 紧凑实测正确。HMAC 按 RFC 2104 包装。已通过对比 Node crypto 验证。

function _sha256_latin1(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = "";
    const words = [];
    const asciiBitLength = ascii.length * 8;
    let hash = _sha256_latin1.h = _sha256_latin1.h || [];
    const k = _sha256_latin1.k = _sha256_latin1.k || [];
    let primeCounter = k.length;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }
    hash = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    ascii += "\x80";
    while (ascii.length % 64 - 56) ascii += "\x00";
    for (let i = 0; i < ascii.length; i++) {
        const j = ascii.charCodeAt(i);
        if (j >> 8) return; // 调用方必须先做 utf-8 编码
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = asciiBitLength;
    for (let j = 0; j < words.length;) {
        const w = words.slice(j, j += 16);
        const oldHash = hash.slice(0);
        for (let i = 0; i < 64; i++) {
            const w15 = w[i - 15], w2 = w[i - 2];
            const a = hash[0], e = hash[4];
            const temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                    w[i - 16]
                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                    + w[i - 7]
                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                  ) | 0);
            const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
        }
        for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) {
        for (let j = 3; j + 1; j--) {
            const b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? "0" : "") + b.toString(16);
        }
    }
    return result;
}

function _utf8ToLatin1(s) {
    // 把 utf-8 字符串编码为 latin1 字节流字符串
    return unescape(encodeURIComponent(s));
}

function _sha256BinFromLatin1(latin1) {
    const hex = _sha256_latin1(latin1);
    let s = "";
    for (let i = 0; i < hex.length; i += 2) {
        s += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return s;
}

function hmacSHA256Hex(message, key) {
    const blockSize = 64;
    let kBin = _utf8ToLatin1(key);
    if (kBin.length > blockSize) kBin = _sha256BinFromLatin1(kBin);
    while (kBin.length < blockSize) kBin += "\x00";
    let opad = "", ipad = "";
    for (let i = 0; i < blockSize; i++) {
        opad += String.fromCharCode(kBin.charCodeAt(i) ^ 0x5c);
        ipad += String.fromCharCode(kBin.charCodeAt(i) ^ 0x36);
    }
    const inner = _sha256BinFromLatin1(ipad + _utf8ToLatin1(message));
    return _sha256_latin1(opad + inner);
}

// ============ 入口 ============

if (typeof $request !== "undefined") {
    getCookie();
    $.done();
} else {
    (async () => {
        if (!$.token) {
            throw new Error("未配置 token,请先进小程序'签到'页抓取");
        }
        const payload = parseJWT($.token);
        if (payload && payload.exp && payload.exp * 1000 < Date.now()) {
            throw new Error("token 已过期,请重新抓取");
        }
        await checkin();
    })()
        .catch((e) => {
            $.messages.push(e.message || String(e));
            $.logErr(e);
        })
        .finally(async () => {
            await sendMsg($.messages.join("\n"));
            $.done();
        });
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}getdata(t){return this.getval(t)}setdata(t,e){return this.setval(t,e)}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
