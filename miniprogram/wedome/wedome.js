/**
 * 味多美 · 每日签到(每日签到领积分,每日 +2 分)
 *
 * 用法:打开「味多美」小程序 → 进入「签到」页(自动触发 get),即抓到 token;之后 cron 自动签到。无需手动点签到。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Created: 2026-05-31
 *
 * ===== Loon =====
 * [MITM]
 * hostname = scrm-b.zjian.net
 * [Script]
 * http-request ^https:\/\/scrm-b\.zjian\.net\/api\/marketing\/pointSignInActivitySet\/get tag=味多美 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png
 * cron "10 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, tag=味多美签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = scrm-b.zjian.net
 * [Script]
 * 味多美 Cookie = type=http-request,pattern=^https:\/\/scrm-b\.zjian\.net\/api\/marketing\/pointSignInActivitySet\/get,requires-body=false,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png
 * 味多美签到 = type=cron,cronexp=10 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = scrm-b.zjian.net
 * [rewrite_local]
 * ^https:\/\/scrm-b\.zjian\.net\/api\/marketing\/pointSignInActivitySet\/get url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js
 * [task_local]
 * 10 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, tag=味多美签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 味多美签到
 *       cron: '10 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "scrm-b.zjian.net"
 *   script:
 *     - match: ^https:\/\/scrm-b\.zjian\.net\/api\/marketing\/pointSignInActivitySet\/get
 *       name: 味多美 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   味多美签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js
 *     interval: 86400
 */

const $ = new Env("味多美");

const CK_TOKEN = "wedome_token";   // buyer-token
const CK_BRAND = "wedome_brandid"; // brandId 请求头

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("wedome_debug")) || "false";
$.messages = [];

const HOST = "https://scrm-b.zjian.net";
const UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.74(0x18004a24) NetType/WIFI Language/zh_CN";

// ============ Cookie 抓取 ============

function getCookie() {
    try {
        const headers = lowerKeys($request.headers);
        const token = headers["buyer-token"] || "";
        const brandId = headers["brandid"] || "";

        // buyer-token 在签到页所有接口(get / getMyPointInfo 等)上都有,
        // 进页面即可抓,无需点签到。activityId/memberId 在 cron 时现取。
        if (!token) {
            $.log("[WARN] 未抓到 buyer-token,跳过");
            return;
        }
        if (token === $.getdata(CK_TOKEN)) {
            $.log("[INFO] buyer-token 未变化");
            return;
        }

        $.setdata(token, CK_TOKEN);
        if (brandId) $.setdata(brandId, CK_BRAND);

        $.msg($.name, "🎉 Token 已抓取", "可关闭抓包,主脚本自动签到");
    } catch (e) {
        $.log(`[ERROR] cookie 抓取异常: ${e}`);
    }
}

// ============ 业务 ============

function commonHeaders() {
    return {
        "buyer-token": $.token,
        brandId: $.brandId,
        "content-type": "application/json",
        "User-Agent": UA,
        Referer: "https://servicewechat.com/wxbf56db97c9390bb0/25/page-frame.html",
    };
}

async function checkin() {
    // 1) 活动信息 → activityId(签到页进入即调,token 宽容)
    const act = await request("POST", "/api/marketing/pointSignInActivitySet/get", null);
    debug(act, "get");
    const activityId = act && act.data && act.data.id;
    if (!activityId) {
        throw new Error(`取活动信息失败(buyer-token 可能失效): ${$.toStr(act)}`);
    }

    // 2) 积分信息 → memberId(+ 余额)
    const point = await request("GET", "/api/member/memberPoint/getMyPointInfo", null);
    debug(point, "getMyPointInfo");
    const memberId = point && point.data && point.data.memberId;
    if (!memberId) {
        throw new Error(`取 memberId 失败(buyer-token 可能失效): ${$.toStr(point)}`);
    }

    // 3) 签到(memberName 非必需,服务端按 activityId+memberId 判定;index 为周期内天序,固定 1)
    const res = await request("POST", "/api/marketing/pointSignInActivitySet/signIn", {
        activityId,
        memberId,
        index: 1,
    });
    debug(res, "signIn");

    let signLine;
    if (res && res.ok === true) {
        signLine = "✅ 签到成功 (+2 积分)";
    } else if (res && res.result !== undefined) {
        signLine = "✨ 今日已签到";
    } else {
        signLine = "❌ 签到失败: " + $.toStr(res);
    }

    // 用 signInLog 核对今天是否确实有签到记录
    const logRes = await request(
        "POST",
        `/api/marketing/pointSignInActivitySet/signInLog?activityId=${activityId}&memberId=${memberId}`,
        null
    );
    debug(logRes, "signInLog");
    const t = logRes && logRes.data && logRes.data.createTime;
    if (t && t.slice(0, 10) !== today()) {
        signLine += "\n⚠️ 今日暂无签到记录,请检查";
    }
    $.messages.push(signLine);

    if (point.data && typeof point.data.point === "number") {
        $.messages.push(`💰 当前积分: ${point.data.point}`);
    }
}

// ============ 请求 ============

function request(method, path, body) {
    return new Promise((resolve) => {
        const opts = { url: `${HOST}${path}`, headers: commonHeaders() };
        if (method === "POST" && body) opts.body = typeof body === "string" ? body : JSON.stringify(body);

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

function today() {
    const d = new Date(Date.now() + 8 * 3600 * 1000); // 东八区
    return d.toISOString().slice(0, 10);
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
        $.token = $.isNode() ? process.env.WEDOME_TOKEN : $.getdata(CK_TOKEN);
        $.brandId = ($.isNode() ? process.env.WEDOME_BRANDID : $.getdata(CK_BRAND)) || "";

        if (!$.token) {
            throw new Error("未配置 buyer-token,请先进小程序签到页抓取(进页面即可,无需点签到)");
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
