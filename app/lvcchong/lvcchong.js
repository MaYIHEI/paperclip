/**
 * 驴充充 · 每日签到(积分中心「签到领积分」)
 *
 * 核心发现:驴充充所有 token 的 JWT 里都只写 30 秒(userToken)/ 90 秒(refreshToken)过期,
 *           但服务端【实测不认这个 exp】——抓包里一个 refreshToken 过期 52 分钟后仍能成功换新 token。
 *           说明服务端按 jti 在后台记账,JWT 的 90 秒是幌子。所以只要存下 refreshToken,即可长期续命,
 *           绕开「token 短命 + 登录态绑死微信/SIM」的死结。这是本脚本能成立的唯一前提。
 *
 * 链路(全走 app 端 https://appapi.lvcchong.com):
 *   1) /accessToken/refresh           送 refreshToken → 新 userToken + 新 refreshToken(滚动!必须写回 BoxJS)
 *   2) /appBaseApi/h5/accessEntrance   送 userToken + phone + userId → 积分 H5 用的 userToken
 *   3) /appBaseApi/scoreUser/sign/userSign  送 H5 userToken + sourceType=3 → 签到
 *
 * 签到接口本身无签名、无验证码,难点只在「拿到能用的 token」,上面这条链解决了它。
 *
 * 用法:
 *   1. 开 Loon 抓包,打开【驴充充 App】(已登录,无需退出)
 *   2. 进入「我的 → 积分中心 / 签到」页(会触发 accessToken/refresh + accessEntrance 两个请求)
 *   3. 看到「🎉 凭证已抓取」通知即入库,之后【关掉 App】(避免 App 把 refreshToken 滚到新值,作废脚本手里的)
 *   4. cron 自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Created: 2026-06-02
 *
 * ===== Loon =====
 * [MITM]
 * hostname = appapi.lvcchong.com
 * [Script]
 * http-request ^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance) tag=驴充充 凭证, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js, requires-body=true
 * cron "20 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js, tag=驴充充签到, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = appapi.lvcchong.com
 * [Script]
 * 驴充充 凭证 = type=http-request,pattern=^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js
 * 驴充充签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = appapi.lvcchong.com
 * [rewrite_local]
 * ^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js
 * [task_local]
 * 20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js, tag=驴充充签到, enabled=true
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
 *     - match: ^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance)
 *       name: 驴充充 凭证
 *       type: request
 *       require-body: true
 * script-providers:
 *   驴充充签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js
 *     interval: 86400
 */

const $ = new Env("驴充充");

const SCRIPT_VERSION = "2026-06-02.1"; // 改一次 +1,跑日志可见,确认是否拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_AUTH = "lvcchong_auth"; // BoxJS 存的凭证 JSON(refreshToken 等,自动滚动更新)

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("lvcchong_debug")) || "false";
$.messages = [];

const HOST = "https://appapi.lvcchong.com";
// app 端默认值(抓包对齐);若抓取时拿到真实值会覆盖,这里只是兜底
const DEFAULTS = {
    channel: "LVCC-I-PH_2.8.0_Apple-A2",
    appVersion: "2.8.0",
    deviceType: "iPhone15,3",
    deviceOs: "iOS",
    deviceOsVersion: "26.1",
    deviceName: "iPhone",
    ownerId: "0",
};
// app 原生用 Alamofire UA;H5 接口用浏览器 UA
const UA_APP = "Charge/2.8.0 (com.lvcc.charge; build:1; iOS 26.1.0) Alamofire/5.8.0";
const UA_H5 =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

// ============ 凭证抓取(rewrite 模式) ============

// 同时匹配 accessToken/refresh 与 h5/accessEntrance 两个请求,各取所需字段,合并入库。
// refresh 请求带:refreshToken(body)+ 一堆 device_* 头 + 当前 userToken(token 头)
// accessEntrance 请求带:phone + userId + ownerId(body)
function captureAuth() {
    try {
        const url = $request.url || "";
        const headers = lowerKeys($request.headers);
        const body = parseForm($request.body || "");
        const auth = $.getjson(CK_AUTH, {}) || {};
        let touched = false;

        if (/accessToken\/refresh/.test(url)) {
            if (body.refreshToken) {
                auth.refreshToken = body.refreshToken;
                touched = true;
            }
            // 设备指纹必须和你这台一致,refresh 会校验,换设备可能触发风控
            pick(auth, headers, "deviceId", "device_id");
            pick(auth, headers, "deviceType", "device_type");
            pick(auth, headers, "deviceOs", "device_os");
            pick(auth, headers, "deviceOsVersion", "device_os_version");
            pick(auth, headers, "deviceName", "device_name");
            pick(auth, headers, "appVersion", "app_version");
            pick(auth, headers, "channel", "channel_name");
            if (headers["token"]) auth.userToken = headers["token"];
        } else if (/h5\/accessEntrance/.test(url)) {
            if (body.phone) (auth.phone = body.phone), (touched = true);
            if (body.userId) auth.userId = body.userId;
            if (body.ownerId != null) auth.ownerId = body.ownerId;
            if (headers["token"]) auth.userToken = headers["token"];
        }

        if (!auth.refreshToken) {
            $.log("[WARN] 本次未抓到 refreshToken,继续操作 App(进积分签到页)即可");
            return;
        }
        $.setjson(auth, CK_AUTH);
        if (touched) {
            const ok = auth.refreshToken && auth.phone && auth.userId;
            $.msg(
                $.name,
                "🎉 凭证已抓取",
                ok ? "可关掉 App,cron 自动签到" : "已存部分,请再进一次「积分中心/签到」页补全 phone/userId"
            );
        }
    } catch (e) {
        $.log(`[ERROR] 凭证抓取异常: ${e}`);
    }
}

// ============ 签到主流程(cron 模式) ============

async function checkin() {
    const auth = $.getjson(CK_AUTH, {}) || {};
    if (!auth.refreshToken) {
        throw new Error("未配置凭证,请先开抓包进驴充充 App「积分中心/签到」页");
    }

    // 1) 用 refreshToken 换新 token。服务端不认 JWT 的 90 秒过期、按 jti 记账,所以隔天的旧 refreshToken 仍可用。
    //    返回里会带【新的】refreshToken(滚动),必须写回,否则下次又拿旧的去刷、链就断了。
    const rf = await postForm(
        "/accessToken/refresh/",
        { refreshToken: auth.refreshToken },
        {
            channel_name: auth.channel || DEFAULTS.channel,
            app_version: auth.appVersion || DEFAULTS.appVersion,
            device_type: auth.deviceType || DEFAULTS.deviceType,
            device_os: auth.deviceOs || DEFAULTS.deviceOs,
            device_os_version: auth.deviceOsVersion || DEFAULTS.deviceOsVersion,
            device_name: auth.deviceName || DEFAULTS.deviceName,
            device_id: auth.deviceId || "",
            token: auth.userToken || "",
            "User-Agent": UA_APP,
        }
    );
    debug(rf, "accessToken/refresh");
    if (!rf || rf.code !== 200 || !rf.data || !rf.data.userToken) {
        // refreshToken 真失效(超过服务端宽限期 / 被吊销 / 换了设备)
        throw new Error(
            `换 token 失败,refreshToken 已失效: ${rf ? rf.message || $.toStr(rf) : "无响应"}\n` +
                "👉 重新开抓包进驴充充 App「积分中心/签到」页重抓凭证"
        );
    }
    // 滚动写回新凭证
    auth.userToken = rf.data.userToken;
    if (rf.data.refreshToken) auth.refreshToken = rf.data.refreshToken;
    if (rf.data.userId) auth.userId = rf.data.userId;
    $.setjson(auth, CK_AUTH);
    $.log("[INFO] token 已刷新并写回");

    // 2) 用 app userToken 换积分 H5 专用 token(签到接口认的是这个)
    const ae = await postForm(
        "/appBaseApi/h5/accessEntrance",
        { phone: auth.phone || "", userId: auth.userId || "", ownerId: auth.ownerId || DEFAULTS.ownerId, time: Date.now() },
        { token: auth.userToken, origin: "https://h5.lvcchong.com", referer: "https://h5.lvcchong.com/", "User-Agent": UA_H5 }
    );
    debug(ae, "h5/accessEntrance");
    if (!ae || ae.code !== 200 || !ae.data || !ae.data.userToken) {
        throw new Error(`换 H5 token 失败: ${ae ? ae.message || $.toStr(ae) : "无响应"}`);
    }
    const h5Token = ae.data.userToken;

    // 3) 签到。body 固定 sourceType=3(抓包对齐),无签名。
    const res = await postForm(
        "/appBaseApi/scoreUser/sign/userSign",
        { sourceType: 3 },
        { token: h5Token, origin: "https://h5.lvcchong.com", referer: "https://h5.lvcchong.com/", "User-Agent": UA_H5 }
    );
    debug(res, "userSign");

    if (res && res.code === 200 && res.data) {
        const d = res.data;
        const days = d.signDays != null ? `,累计 ${d.signDays} 天` : "";
        const got = d.score != null ? ` +${d.score} 积分` : "";
        $.messages.push(`✅ 签到成功${got}${days}`);
        if (d.watchVideoScore) $.messages.push(`ℹ️ 看视频另可领 ${d.watchVideoScore} 积分(需手动看广告,脚本不做)`);
    } else if (res && (res.code === 402 || /TOKEN|令牌/i.test(res.message || ""))) {
        // 402「刷新TOKEN」= H5 token 在两步之间又过期了,重试一次通常能过
        $.messages.push(`⚠️ 签到时 token 过期(${res.message || 402}),下次 cron 会重试;若反复出现请重抓凭证`);
    } else if (res && /已签|重复|签过/.test(res.message || "")) {
        $.messages.push("✨ 今日已签到");
    } else {
        $.messages.push(`❌ 签到失败: ${res ? res.message || $.toStr(res) : "无响应"}`);
    }
}

// ============ 请求 ============

// app 接口全是 application/x-www-form-urlencoded,body 用表单串,不是 JSON
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
        const opts = { url: `${HOST}${path}?channelMessage=${DEFAULTS.channel}`, headers, body: buildForm(form) };
        debug({ url: opts.url, body: opts.body }, `POST ${path}`);
        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] POST ${path}: ${$.toStr(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(typeof data === "string" ? JSON.parse(data) : data);
            } catch (e) {
                $.log(`[ERROR] 响应解析失败 ${path}: ${(data || "").substring(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// ============ 工具 ============

function buildForm(obj) {
    return Object.entries(obj)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
}

function parseForm(str) {
    const out = {};
    String(str)
        .split("&")
        .forEach((kv) => {
            if (!kv) return;
            const i = kv.indexOf("=");
            const k = i < 0 ? kv : kv.slice(0, i);
            const v = i < 0 ? "" : kv.slice(i + 1);
            try {
                out[decodeURIComponent(k)] = decodeURIComponent(v);
            } catch {
                out[k] = v;
            }
        });
    return out;
}

// 把 headers[srcKey] 存进 auth[dstKey](有值才存,避免空值覆盖已存的好值)
function pick(auth, headers, dstKey, srcKey) {
    if (headers[srcKey]) auth[dstKey] = headers[srcKey];
}

function lowerKeys(obj) {
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

// ============ 入口 ============

if (typeof $request !== "undefined") {
    captureAuth();
    $.done();
} else {
    (async () => {
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
