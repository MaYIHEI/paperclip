/**
 * 松山棉店 · 每日签到(每日签到领积分)
 *
 * 抓取:打开「松山棉店」小程序 → 进「签到」页(自动触发 signMainInfo),抓凭据
 * 签到:cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-04
 *
 * ===== Loon =====
 * [MITM]
 * hostname = xapi.weimob.com
 * [Script]
 * http-request ^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign)) tag=松山棉店 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png
 * cron "20 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js, tag=松山棉店签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = xapi.weimob.com
 * [Script]
 * 松山棉店 Cookie = type=http-request,pattern=^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign)),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png
 * 松山棉店签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = xapi.weimob.com
 * [rewrite_local]
 * ^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign)) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js
 * [task_local]
 * 20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js, tag=松山棉店签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 松山棉店签到
 *       cron: '20 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "xapi.weimob.com"
 *   script:
 *     - match: ^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign))
 *       name: 松山棉店 Cookie
 *       type: request
 *       require-body: true
 * script-providers:
 *   松山棉店签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js
 *     interval: 86400
 */

const $ = new Env("松山棉店");

const SCRIPT_VERSION = "2026-06-04.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_HEADERS = "songshan_headers"; // 签到请求头(JSON)
const CK_BODY = "songshan_body";       // 签到请求体(原样)

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("songshan_debug")) || "false";
$.messages = [];

const SIGN_URL = "https://xapi.weimob.com/api3/onecrm/mactivity/sign/misc/sign/activity/core/c/sign";

// 回放时需要剔除的逐跳/伪头,其余原样发出
const DROP_HEADERS = ["content-length", "host", "connection", "accept-encoding"];

// ============ Cookie 抓取 ============

function getCookie() {
    try {
        const headers = $request.headers || {};
        const body = $request.body || "";
        const token = lowerKeys(headers)["x-wx-token"] || "";

        if (!token) {
            $.log("[WARN] 未抓到 x-wx-token,跳过");
            return;
        }
        if (!body || body.length < 20) {
            $.log("[WARN] 签到请求体为空,跳过");
            return;
        }

        $.setdata(JSON.stringify(headers), CK_HEADERS);
        $.setdata(body, CK_BODY);

        $.msg($.name, "🎉 签到凭据已抓取", "可关闭抓包,主脚本自动签到");
    } catch (e) {
        $.log(`[ERROR] cookie 抓取异常: ${e}`);
    }
}

// ============ 业务 ============

function cleanHeaders(raw) {
    const out = {};
    for (const k of Object.keys(raw)) {
        if (k.startsWith(":")) continue;
        if (DROP_HEADERS.includes(k.toLowerCase())) continue;
        out[k] = raw[k];
    }
    return out;
}

async function checkin() {
    const headers = cleanHeaders($.headers);
    const res = await request(SIGN_URL, headers, $.body);
    debug(res, "sign");

    if (!res) {
        $.messages.push("❌ 签到失败: 无响应");
        return;
    }
    // 微盟 errcode 为字符串 "0" 表示成功
    if (String(res.errcode) === "0" && res.data) {
        const fixed = res.data.fixedReward || {};
        const extra = res.data.extraReward || {};
        const pName = res.data.pointName || "积分";
        const got = (fixed.points || 0) + (extra.points || 0);
        $.messages.push(`✅ 签到成功: +${got} ${pName}`);
        return;
    }
    // 已签到 / token 失效等
    const msg = res.errmsg || $.toStr(res);
    if (/已签|重复|已经签到/.test(msg)) {
        $.messages.push("✨ 今日已签到");
    } else if (/登录|token|鉴权|未授权|失效|过期/.test(msg)) {
        $.messages.push(`❌ token 失效,请重新抓取: ${msg}`);
    } else {
        $.messages.push(`❌ 签到失败: errcode=${res.errcode} ${msg}`);
    }
}

// ============ 请求 ============

function request(url, headers, body) {
    return new Promise((resolve) => {
        const opts = { url, headers, body };
        debug({ url, headers, body }, "POST request");
        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] POST sign: ${$.toStr(err)}`);
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

// ============ 工具 ============

function lowerKeys(obj) {
    if (!obj) return {};
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

function mask(s) {
    if (!s || s.length < 8) return "***";
    return s.slice(0, 6) + "****" + s.slice(-4);
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

// ============ 入口 ============

if (typeof $request !== "undefined") {
    getCookie();
    $.done();
} else {
    (async () => {
        const rawHeaders = $.isNode() ? process.env.SONGSHAN_HEADERS : $.getdata(CK_HEADERS);
        $.body = $.isNode() ? process.env.SONGSHAN_BODY : $.getdata(CK_BODY);
        if (!rawHeaders || !$.body) {
            throw new Error("未配置签到凭据,请先进小程序签到页点一次签到抓取");
        }
        try {
            $.headers = JSON.parse(rawHeaders);
        } catch (e) {
            throw new Error("已存请求头损坏,请重新抓取");
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
