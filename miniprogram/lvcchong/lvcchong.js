/**
 * 驴充充 · 每日签到(积分中心签到领积分)
 *
 * 抓取:打开「驴充充」微信小程序 → 任意页面触发 /getUnionInfo(wx.login() 换 token)
 * 签到:cron 直接用 userToken 签到(小程序无需 H5 accessEntrance 中转)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-07
 *
 * ===== Loon =====
 * [MITM]
 * hostname = appapi.lvcchong.com
 * [Script]
 * http-response ^https:\/\/appapi\.lvcchong\.com\/getUnionInfo tag=驴充充 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png
 * http-response ^https:\/\/appapi\.lvcchong\.com\/accessToken\/refresh\/ tag=驴充充 Auth, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png
 * cron "20 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js, tag=驴充充签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = appapi.lvcchong.com
 * [Script]
 * 驴充充 Cookie = type=http-response,pattern=^https:\/\/appapi\.lvcchong\.com\/getUnionInfo,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png
 * 驴充充 Auth = type=http-response,pattern=^https:\/\/appapi\.lvcchong\.com\/accessToken\/refresh\/,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png
 * 驴充充签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = appapi.lvcchong.com
 * [rewrite_local]
 * ^https:\/\/appapi\.lvcchong\.com\/getUnionInfo url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js
 * ^https:\/\/appapi\.lvcchong\.com\/accessToken\/refresh\/ url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js
 * [task_local]
 * 20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js, tag=驴充充签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 驴充充签到
 *       cron: '20 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "appapi.lvcchong.com"
 *   script:
 *     - match: ^https:\/\/appapi\.lvcchong\.com\/getUnionInfo
 *       name: 驴充充 Cookie
 *       type: response
 *       require-body: true
 *     - match: ^https:\/\/appapi\.lvcchong\.com\/accessToken\/refresh\/
 *       name: 驴充充 Auth
 *       type: response
 *       require-body: true
 * script-providers:
 *   驴充充签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js
 *     interval: 86400
 */

const $ = new Env("驴充充");

const SCRIPT_VERSION = "2026-06-07.r4"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_AUTH = "lvcchong_mp_auth"; // JSON: userToken/refreshToken/userId/captureTime(捕获时间戳)

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("lvcchong_mp_debug")) || "false";
$.messages = [];

const HOST = "https://appapi.lvcchong.com";
// 小程序 channelMessage(VERSION_PREFIX + versionCode + CHANNEL_MESSAGE)
// 解包 app-service.js 确认: VERSION_PREFIX="LVCC-WP-PH_", CHANNEL_MESSAGE="_Tencent-G9", versionCode="4.1.6"
const CHANNEL = "LVCC-WP-PH_4.1.6_Tencent-G9";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) MicroMessenger/8.0.55 MiniProgram";

// ============ Token 抓取(http-response) ============

function captureAuth() {
    try {
        const url = ($request && $request.url) || "";
        const raw = $response && $response.body ? $response.body : "";
        if (!raw) {
            $.log("[capture] 无响应体(确认挂 http-response 且 requires-body=true)");
            return;
        }
        let body = {};
        try { body = JSON.parse(raw); } catch { $.log("[capture] 响应体解析失败: " + raw.substring(0, 200)); return; }

        // 两个端点返回格式不同:
        //   /getUnionInfo  → {success:true, data:{userToken, refreshToken, userId, ...}}
        //   /accessToken/refresh/ → {code:200, data:{userToken, refreshToken, userId, ...}}
        const data = body.data || {};
        if (!data.userToken && !data.refreshToken) {
            $.log("[capture] 响应里没有 token 字段,忽略(前200字): " + raw.substring(0, 200));
            return;
        }

        const auth = $.getjson(CK_AUTH, {}) || {};
        let got = [];

        if (data.userToken) { auth.userToken = data.userToken; got.push("userToken"); }
        if (data.refreshToken) {
            const newAge = tokenAgeMin(data.refreshToken);
            const oldAge = tokenAgeMin(auth.refreshToken);
            // 只用更新的 token 覆盖旧的(防止 /accessToken/refresh 返回更旧的 token 倒灌)
            if (oldAge == null || newAge == null || newAge <= oldAge) {
                auth.refreshToken = data.refreshToken;
                got.push("refreshToken");
            } else {
                $.log(`[capture] 忽略更旧的 refreshToken(新${newAge}min > 存${oldAge}min)`);
            }
        }
        if (data.userId) { auth.userId = data.userId; got.push("userId"); }
        auth.captureTime = Date.now();

        const ep = url.split("?")[0].split("/").pop();
        $.log(`[capture] ${ep} got=[${got.join(",")}] refreshToken距签发${tokenAgeMin(auth.refreshToken)}min`);
        if (!got.length) return;
        $.setjson(auth, CK_AUTH);

        const isUnionInfo = /getUnionInfo/.test(url);
        if (isUnionInfo && data.userToken) {
            $.msg($.name, "✅ 驴充充 Cookie 获取成功", `userToken 已存储,refreshToken 距签发 ${tokenAgeMin(auth.refreshToken)} 分钟`);
        }
    } catch (e) {
        $.log("[ERROR] captureAuth: " + e);
    }
}

// ============ 签到(cron) ============

async function checkin() {
    const auth = $.getjson(CK_AUTH, {}) || {};
    if (!auth.userToken && !auth.refreshToken) {
        throw new Error("未配置凭证,请先开抓包打开「驴充充」微信小程序触发 /getUnionInfo 抓取 Cookie");
    }

    const captureAgo = auth.captureTime ? Math.round((Date.now() - auth.captureTime) / 60000) : null;
    $.log(`[INFO] userToken 距抓取 ${captureAgo ?? "?"}min, refreshToken 距签发 ${tokenAgeMin(auth.refreshToken) ?? "?"}min`);

    // Step 1: 尝试用已存的 userToken 直接签到
    // 如果 userToken 还在有效期内(小程序 token 可能比 App 更长命),省掉一次 refresh 请求
    let userToken = auth.userToken;
    const directResult = await doSign(userToken);
    if (directResult === "ok" || directResult === "already") return;

    // Step 2: userToken 已过期 → 用 refreshToken 换新 userToken
    if (!auth.refreshToken) {
        throw new Error("userToken 已失效且无 refreshToken,请重开小程序重新抓取 Cookie");
    }
    $.log("[INFO] userToken 已失效,尝试用 refreshToken 换新 token...");
    const rfAge = tokenAgeMin(auth.refreshToken);
    $.log(`[INFO] refreshToken 距签发 ${rfAge ?? "?"}min → 这是判断小程序 token 寿命的关键日志`);

    const rf = await postForm("/accessToken/refresh/", { refreshToken: auth.refreshToken }, {
        token: auth.userToken || "",
        "User-Agent": UA,
    });
    debug(rf, "accessToken/refresh");
    if (!rf || rf.code !== 200 || !rf.data || !rf.data.userToken) {
        throw new Error(
            `refreshToken 也失效(距签发 ${rfAge ?? "?"}min): ${rf ? rf.message || $.toStr(rf).slice(0, 160) : "无响应"}\n` +
            "👉 重开小程序任意页面重新抓取 Cookie"
        );
    }
    // 更新存储
    auth.userToken = rf.data.userToken;
    if (rf.data.refreshToken) auth.refreshToken = rf.data.refreshToken;
    if (rf.data.userId) auth.userId = rf.data.userId;
    $.setjson(auth, CK_AUTH);
    $.log(`[INFO] refreshToken 换新成功,新 userToken 已写回`);

    // Step 3: 用新 userToken 签到
    userToken = auth.userToken;
    const retryResult = await doSign(userToken);
    if (retryResult !== "ok" && retryResult !== "already") {
        throw new Error(`换新 token 后签到仍失败: ${retryResult}`);
    }
}

// 执行签到,返回 "ok" / "already" / 错误描述字符串
async function doSign(userToken) {
    // 先查询今日是否已签
    const info = await postForm("/appBaseApi/scoreUser/sign/todaySignInfo", {}, {
        token: userToken,
        "User-Agent": UA,
    });
    debug(info, "todaySignInfo");
    if (info && info.code === 200 && info.data && info.data.todaySign === true) {
        $.messages.push("✨ 今日已签到");
        return "already";
    }
    if (info && info.code === 402) {
        $.log("[sign] todaySignInfo 返回 402(token 已失效)");
        return "expired";
    }

    // 执行签到(小程序无 sourceType 参数)
    const res = await postForm("/appBaseApi/scoreUser/sign/userSign", {}, {
        token: userToken,
        "User-Agent": UA,
    });
    debug(res, "userSign");

    if (res && res.code === 200 && res.data) {
        const d = res.data;
        const days = d.signDays != null ? `,累计 ${d.signDays} 天` : "";
        const got = d.score != null ? ` +${d.score} 积分` : "";
        $.messages.push(`✅ 签到成功${got}${days}`);
        return "ok";
    }
    if (res && res.code === 402) return "expired";
    if (res && /已签|重复|签过/.test(res.message || "")) {
        $.messages.push("✨ 今日已签到");
        return "already";
    }
    // 其他失败
    const errMsg = res ? `code=${res.code} ${res.message || $.toStr(res).slice(0, 160)}` : "无响应";
    $.messages.push(`❌ 签到失败: ${errMsg}`);
    return errMsg;
}

// ============ 工具函数 ============

function postForm(path, form, extraHeaders) {
    return new Promise((resolve) => {
        const headers = Object.assign(
            {
                "content-type": "application/x-www-form-urlencoded; charset=utf-8",
                accept: "*/*",
                "accept-language": "zh-CN,zh-Hans;q=0.9",
            },
            extraHeaders || {}
        );
        const url = `${HOST}${path}?channelMessage=${CHANNEL}`;
        const body = buildForm(form);
        debug({ url, body }, `POST ${path}`);
        $.post({ url, headers, body }, (err, resp, data) => {
            if (err) { $.log(`[ERROR] POST ${path}: ${$.toStr(err)}`); resolve(null); return; }
            try { resolve(typeof data === "string" ? JSON.parse(data) : data); }
            catch { $.log(`[ERROR] 响应解析失败 ${path}: ${(data || "").substring(0, 300)}`); resolve(null); }
        });
    });
}

// 解 JWT payload 的 iat,算出"距签发多少分钟"(不依赖 atob)
function tokenAgeMin(token) {
    try {
        const seg = String(token).split(".")[1];
        if (!seg) return null;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const s = seg.replace(/-/g, "+").replace(/_/g, "/");
        let out = "", bits = 0, buf = 0;
        for (const c of s) {
            const i = chars.indexOf(c);
            if (i < 0) continue;
            buf = (buf << 6) | i;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                out += String.fromCharCode((buf >> bits) & 0xff);
                buf &= (1 << bits) - 1; // 清掉已输出的高位,防止 buf 溢出
            }
        }
        const p = JSON.parse(out);
        if (p && p.iat) return Math.round((Date.now() / 1000 - p.iat) / 60);
    } catch {}
    return null;
}

function buildForm(obj) {
    return Object.entries(obj)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
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
        try { const n = require("./sendNotify"); await n.sendNotify($.name, message); }
        catch { $.log(`\n${$.name}\n${message}`); }
    } else {
        $.msg($.name, "", message);
    }
}

// ============ 入口 ============

if (typeof $response !== "undefined") {
    captureAuth();
    $.done();
} else {
    (async () => {
        if (JSON.parse($.getdata("lvcchong_mp_clear") || "false")) {
            $.setdata("", CK_AUTH);
            $.setdata("false", "lvcchong_mp_clear");
            $.messages.push("✅ Cookie 已清除，请重新抓取");
            return;
        }
        await checkin();
    })()
        .catch((e) => { $.messages.push(e.message || String(e)); $.logErr(e); })
        .finally(async () => { await sendMsg($.messages.join("\n")); $.done(); });
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}getdata(t){return this.getval(t)}setdata(t,e){return this.setval(t,e)}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
