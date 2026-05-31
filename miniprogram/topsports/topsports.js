/**
 * 滔搏运动 · 每日签到(每日中心签到领积分)
 *
 * 用法:打开「滔搏运动」小程序 → 进入「每日中心」页,即抓到 Cookie;之后 cron 自动签到。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Created: 2026-05-31
 *
 * ===== Loon =====
 * [MITM]
 * hostname = m.topsports.com.cn
 * [Script]
 * http-request ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo tag=滔搏 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
 * cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, tag=滔搏签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = m.topsports.com.cn
 * [Script]
 * 滔搏 Cookie = type=http-request,pattern=^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
 * 滔搏签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = m.topsports.com.cn
 * [rewrite_local]
 * ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
 * [task_local]
 * 15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, tag=滔搏签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 滔搏签到
 *       cron: '15 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "m.topsports.com.cn"
 *   script:
 *     - match: ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo
 *       name: 滔搏 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   滔搏签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
 *     interval: 86400
 */

const $ = new Env("滔搏");

const CK_COOKIE = "topsports_cookie"; // 完整 Cookie(含 Authorization=UUID, memberId)

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("topsports_debug")) || "false";
$.messages = [];

const HOST = "https://m.topsports.com.cn";
const BRAND = "TS";
const UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.74(0x18004a24) NetType/WIFI Language/zh_CN miniProgram/wx71a6af1f91734f18";

// ============ Cookie 抓取 ============

function getCookie() {
    try {
        const headers = lowerKeys($request.headers);
        const cookie = headers["cookie"] || "";
        if (!/Authorization=/i.test(cookie)) {
            $.log("[WARN] Cookie 里没有 Authorization,跳过");
            return;
        }
        if (cookie === $.getdata(CK_COOKIE)) {
            $.log("[INFO] Cookie 未变化");
            return;
        }
        $.setdata(cookie, CK_COOKIE);
        const auth = (cookie.match(/Authorization=([^;]+)/i) || [])[1] || "";
        $.msg($.name, "🎉 Cookie 抓取成功", `Authorization: ${mask(auth)}\n可关闭抓包,主脚本可跑`);
    } catch (e) {
        $.log(`[ERROR] cookie 抓取异常: ${e}`);
    }
}

// ============ 业务 ============

function commonHeaders() {
    return {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        brandcode: BRAND,
        origin: HOST,
        Referer: `${HOST}/m/dailycenter?brandCode=${BRAND}&share=true&minienv=1`,
        "User-Agent": UA,
        Cookie: $.cookie,
    };
}

async function checkin() {
    // 1) 取活动信息(动态 activityId)
    const actInfo = await request("GET", `/h5/act/signIn/actInfo?brandCode=${BRAND}`, null);
    debug(actInfo, "actInfo");
    if (!actInfo || actInfo.code !== 1 || !actInfo.data || !actInfo.data.activityId) {
        throw new Error(`取活动信息失败(可能 Cookie 失效): ${$.toStr(actInfo)}`);
    }
    const activityId = actInfo.data.activityId;
    $.log(`[INFO] activityId=${activityId}`);

    // 2) 签到
    const res = await request("POST", "/h5/act/signIn/doSign", { activityId, brandCode: BRAND });
    debug(res, "doSign");

    if (res && res.data && res.data.signInSuccess === true) {
        const prize = (res.data.signInPrizeSendResultDTOList || [])
            .map((p) => `${p.prizeName || ""}+${p.prizeValue || ""}`)
            .join(", ");
        $.messages.push(`✅ 签到成功${prize ? ": " + prize : ""}`);
        if (res.data.signInTips) $.messages.push(`💡 ${res.data.signInTips}`);
    } else if (res && (res.bizCode === 20001 || /已签|重复/.test(res.bizMsg || ""))) {
        $.messages.push(`✨ 今日已签到${res.bizMsg ? ": " + res.bizMsg : ""}`);
    } else {
        $.messages.push(`❌ 签到失败: ${res ? res.bizMsg || $.toStr(res) : "无响应"}`);
    }
}

// ============ 请求 ============

function request(method, path, body) {
    return new Promise((resolve) => {
        const opts = { url: `${HOST}${path}`, headers: commonHeaders() };
        if (method === "POST" && body) opts.body = JSON.stringify(body);

        debug({ method, url: opts.url, body: opts.body }, `${method} request`);

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

// ============ 工具 ============

function lowerKeys(obj) {
    if (!obj) return {};
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

function mask(s) {
    if (!s || s.length < 8) return "***";
    return s.slice(0, 4) + "****" + s.slice(-4);
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
        $.cookie = $.isNode() ? process.env.TOPSPORTS_COOKIE : $.getdata(CK_COOKIE);
        if (!$.cookie) {
            throw new Error("未配置 Cookie,请先进小程序'每日中心/签到'页抓取");
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
