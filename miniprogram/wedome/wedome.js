/**
 * 味多美 · 每日签到(每日签到领积分,每日 +2 分)
 *
 * 抓取:打开「味多美」小程序 → 进「我的/签到」页(member/find 或 minaLogin),自动抓公众号 openid(无需删小程序重登)
 * 签到:cron 用 openid 换 token(loginByOpenid)→ 取 activityId → 签到(openid 永久固定,免续期)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-07 r3
 *
 * ===== Loon =====
 * [MITM]
 * hostname = scrm-b.zjian.net
 * [Script]
 * http-response ^https:\/\/scrm-b\.zjian\.net\/api\/member\/(minaLogin|find) tag=味多美 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png
 * cron "10 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, tag=味多美签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = scrm-b.zjian.net
 * [Script]
 * 味多美 Cookie = type=http-response,pattern=^https:\/\/scrm-b\.zjian\.net\/api\/member\/(minaLogin|find),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png
 * 味多美签到 = type=cron,cronexp=10 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = scrm-b.zjian.net
 * [rewrite_local]
 * ^https:\/\/scrm-b\.zjian\.net\/api\/member\/(minaLogin|find) url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js
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
 *     - match: ^https:\/\/scrm-b\.zjian\.net\/api\/member\/(minaLogin|find)
 *       name: 味多美 Cookie
 *       type: response
 *       require-body: true
 * script-providers:
 *   味多美签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js
 *     interval: 86400
 */

const $ = new Env("味多美");

const SCRIPT_VERSION = "2026-06-07.r3"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_OPENID = "wedome_openid";      // 公众号 openid(永久固定)
const CK_NAME = "wedome_membername";    // 会员昵称,signIn body 必填
const CK_CLEAR = "wedome_clear";        // BoxJS「清除 Cookie」开关

const BASE = "https://scrm-b.zjian.net";
const BRAND_ID = "2039";
const REFERER = "https://servicewechat.com/wxbf56db97c9390bb0/25/page-frame.html";
const UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.74(0x18004a27) NetType/WIFI Language/zh_CN";

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("wedome_debug")) || "false";
$.messages = [];

// ============ openid 抓取(http-response minaLogin)============

// minaLogin / member/find 响应里 data.member.openid 就是「公众号 openid」(loginByOpenid 用它,不是小程序 openid)
// 两接口结构一致;member/find 在「我的/会员」页正常浏览即触发,不必删小程序重登
function captureOpenid() {
    try {
        const raw = typeof $response !== "undefined" && $response.body ? $response.body : "";
        if (!raw) {
            $.log("[capture] 无响应体(确认挂 http-response 且 requires-body=true)");
            return;
        }
        const j = JSON.parse(raw);
        const openid = j && j.data && j.data.member && j.data.member.openid;
        $.log(`[capture] 命中登录/会员接口  openid=${openid ? "有" : "无"}`);
        if (!openid) {
            $.log("[capture] 响应里没 member.openid,换「我的」页或重进小程序再试");
            return;
        }
        if (openid === $.getdata(CK_OPENID)) {
            $.log("[capture] openid 未变化");
            return;
        }
        $.setdata(openid, CK_OPENID);
        // member/find 响应同时带 name,signIn body 需要
        const mname = j.data.member.name || "";
        if (mname) $.setdata(mname, CK_NAME);
        $.msg($.name, "✅ 味多美 openid 已获取", "可关掉小程序,cron 自动签到(openid 永久有效,无需再抓)");
    } catch (e) {
        $.log(`[ERROR] openid 抓取异常: ${e}`);
    }
}

// ============ 清除 openid(BoxJS 开关,跑一次后自动复位)============

// 切账号 / openid 失效时用:BoxJS 把「清除 Cookie」设为开启 → 手动跑一次签到脚本(或等 cron)
// 即清空 openid 并把开关复位,之后重进小程序「我的」页重新抓即可
function maybeClear() {
    if (($.getdata(CK_CLEAR) || "false") !== "true") return false;
    $.setdata("", CK_OPENID); // 清空 openid
    $.setdata("false", CK_CLEAR); // 复位开关,避免下次又清
    $.log("[clear] 已清空 openid 并复位开关");
    $.msg($.name, "🗑 已清除 openid", "重进味多美小程序「我的」页重新抓取");
    return true;
}

// ============ 签到(openid 换 token → 取活动 → 签到)============

async function checkin() {
    const openid = ($.isNode() ? process.env.WEDOME_OPENID : $.getdata(CK_OPENID)) || "";
    $.log(`[检测] 版本=${SCRIPT_VERSION}  openid=${openid ? openid.slice(0, 4) + "…" + openid.slice(-4) : "空"}`);
    if (!openid) {
        throw new Error(`[${SCRIPT_VERSION}] 未配置 openid,请先进味多美小程序签到页抓取(或 BoxJS 填 wedome_openid)`);
    }

    // 1) 公众号 openid 换 buyer-token(绕开 wx.login,免续期)+ 拿 memberId
    const login = await api("GET", `/api/member/h5/loginByOpenid?openid=${encodeURIComponent(openid)}&brandId=${BRAND_ID}`, null);
    debug(login, "loginByOpenid");
    const token = login && login.data && login.data.token;
    const memberId = login && login.data && login.data.memberId;
    if (!token || !memberId) {
        throw new Error(`[${SCRIPT_VERSION}] loginByOpenid 失败(openid 失效?重进小程序重抓): ${$.toStr(login).slice(0, 160)}`);
    }
    $.log(`[登录] token 末6=${token.slice(-6)}  memberId=${memberId}`);

    // 2) 取当前签到活动 → activityId
    const act = await api("POST", "/api/marketing/pointSignInActivitySet/get", token);
    debug(act, "get");
    const activityId = act && act.data && act.data.id;
    if (!activityId) {
        throw new Error(`[${SCRIPT_VERSION}] 取 activityId 失败: ${$.toStr(act).slice(0, 160)}`);
    }
    $.log(`[活动] activityId=${activityId}`);

    // 3a) 查询今日是否已签(signInLog = 查询接口,有 createTime = 已签)
    const check = await api("POST", `/api/marketing/pointSignInActivitySet/signInLog?activityId=${activityId}&memberId=${memberId}`, token);
    debug(check, "signInLog(check)");
    $.log(`[查询] ${$.toStr(check).slice(0, 200)}`);

    if (check && check.data && check.data.createTime) {
        const signedToday = check.data.createTime.slice(0, 10) === today();
        $.messages.push(signedToday ? `✨ 今日已签到,第 ${check.data.index || "?"} 天` : "✨ 今日已签到");
        return;
    }

    // 3b) 实际签到:POST signIn,body 必须含 memberName
    const memberName = $.isNode()
        ? (process.env.WEDOME_MEMBERNAME || "")
        : ($.getdata(CK_NAME) || "");
    if (!memberName) {
        $.log("[WARN] 未存储 memberName,重进味多美小程序「我的」页触发 member/find 重抓即可");
    }
    const sign = await api("POST", "/api/marketing/pointSignInActivitySet/signIn", token, {
        activityId, memberId, memberName, index: 1,
    });
    debug(sign, "signIn");
    $.log(`[签到] ${$.toStr(sign).slice(0, 200)}`);

    const tag = `[${SCRIPT_VERSION}]`;
    if (sign && sign.result === 0) {
        $.messages.push(`✅ 签到成功 (+2 积分)`);
    } else if (sign && /已签|already|repeat|重复/i.test($.toStr(sign))) {
        $.messages.push("✨ 今日已签到");
    } else {
        $.messages.push(`${tag} ❌ 签到失败: ${sign ? $.toStr(sign).slice(0, 160) : "无响应"}`);
    }

    // 4) 积分余额(可选展示)
    const point = await api("GET", "/api/member/memberPoint/getMyPointInfo", token);
    debug(point, "getMyPointInfo");
    if (point && point.data && typeof point.data.point === "number") {
        $.messages.push(`💰 当前积分: ${point.data.point}`);
    }
}

// ============ 请求 ============

function api(method, path, token, body) {
    return new Promise((resolve) => {
        const headers = {
            brandId: BRAND_ID,
            "tentacle-content": "",
            "tentacle-content-m-info": "",
            "content-type": "application/json",
            "User-Agent": UA,
            Referer: REFERER,
        };
        if (token) headers["buyer-token"] = token;
        const opts = { url: BASE + path, headers };
        if (method === "POST") opts.body = body ? JSON.stringify(body) : "";

        const fn = method === "POST" ? $.post : $.get;
        fn.call($, opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] ${method} ${path.split("?")[0]}: ${$.toStr(err)}`);
                return resolve(null);
            }
            try {
                resolve(typeof data === "string" ? JSON.parse(data) : data);
            } catch (e) {
                $.log(`[ERROR] 响应解析失败: ${(data || "").slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// ============ 工具 ============

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
    $.msg($.name, "", message);
}

// ============ 入口 ============

if (typeof $response !== "undefined") {
    captureOpenid();
    $.done();
} else {
    (async () => {
        if (maybeClear()) return; // 清除模式:清完即止,不签到
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
