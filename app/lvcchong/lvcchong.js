/**
 * 驴充充 · 每日签到(积分中心「签到领积分」)
 *
 * 📦 已归档:refreshToken 空闲仅 ~20 分钟,长期登录态绑运营商一键登录(SIM),定时 cron 无解。详见 README。
 *
 * 抓取:冷启 App 触发 /accessToken/refresh、进积分页触发 /h5/accessEntrance,抓 refreshToken
 * 签到:cron 定时自动签到(续命原理/三步链见 README)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-02
 */

const $ = new Env("驴充充");

const SCRIPT_VERSION = "2026-06-03.2"; // 改一次 +1,跑日志可见,确认是否拉到最新版(避开 CDN 缓存)
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_AUTH = "lvcchong_auth"; // refreshToken 等,抓取写入、每次签到自动滚动更新

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("lvcchong_debug")) || "false";
$.messages = [];

const HOST = "https://appapi.lvcchong.com";
// app 端默认值(抓包对齐),抓取时拿到真实值会覆盖,这里只兜底
const DEFAULTS = {
    channel: "LVCC-I-PH_2.8.0_Apple-A2",
    appVersion: "2.8.0",
    deviceType: "iPhone15,3",
    deviceOs: "iOS",
    deviceOsVersion: "26.1",
    deviceName: "iPhone",
    ownerId: "0",
};
const UA_APP = "Charge/2.8.0 (com.lvcc.charge; build:1; iOS 26.1.0) Alamofire/5.8.0";
const UA_H5 =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

async function checkin() {
    const auth = $.getjson(CK_AUTH, {}) || {};
    if (!auth.refreshToken) {
        throw new Error("未配置凭证,请先开抓包冷启驴充充 App 并进「积分中心/签到」页");
    }

    // 标尺:记录这个 refreshToken 距签发多久(失败时一并打出来,用来量服务端宽限窗口)
    const ageMin = tokenAgeMin(auth.refreshToken);
    $.log(`[INFO] 当前 refreshToken 距签发 ${ageMin == null ? "?" : ageMin} 分钟`);

    // 1) refreshToken 换新 token。返回里带【新的】refreshToken(滚动),必须写回,否则下次拿旧的就断链。
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
        throw new Error(
            `换 token 失败,refreshToken 失效(距签发 ${ageMin == null ? "?" : ageMin} 分钟): ` +
                `${rf ? rf.message || $.toStr(rf) : "无响应"}\n` +
                "👉 重新开抓包冷启 App 进「积分中心/签到」页重抓 Cookie"
        );
    }
    auth.userToken = rf.data.userToken;
    if (rf.data.refreshToken) auth.refreshToken = rf.data.refreshToken;
    if (rf.data.userId) auth.userId = rf.data.userId;
    $.setjson(auth, CK_AUTH);
    // 刷新换回来的 token 多新?若仍是十几分钟的旧货,说明刷新没重置寿命(或被污染),是死穴
    $.log(`[INFO] token 已刷新并写回,新 refreshToken 距签发 ${tokenAgeMin(rf.data.refreshToken)} 分钟`);

    // 2) app userToken 换积分 H5 专用 token(签到接口认这个)
    const ae = await postForm(
        "/appBaseApi/h5/accessEntrance",
        { phone: auth.phone || "", userId: auth.userId || "", ownerId: auth.ownerId || DEFAULTS.ownerId, time: Date.now() },
        { token: auth.userToken, origin: "https://h5.lvcchong.com", referer: "https://h5.lvcchong.com/", "User-Agent": UA_H5 }
    );
    debug(ae, "h5/accessEntrance");
    if (!ae || ae.code !== 200 || !ae.data || !ae.data.userToken) {
        throw new Error(`换 H5 token 失败: ${ae ? ae.message || $.toStr(ae) : "无响应"}`);
    }

    // 3) 签到,body 固定 sourceType=3(抓包对齐),无签名
    const res = await postForm(
        "/appBaseApi/scoreUser/sign/userSign",
        { sourceType: 3 },
        { token: ae.data.userToken, origin: "https://h5.lvcchong.com", referer: "https://h5.lvcchong.com/", "User-Agent": UA_H5 }
    );
    debug(res, "userSign");

    if (res && res.code === 200 && res.data) {
        const d = res.data;
        const days = d.signDays != null ? `,累计 ${d.signDays} 天` : "";
        const got = d.score != null ? ` +${d.score} 积分` : "";
        $.messages.push(`✅ 签到成功${got}${days}`);
        if (d.watchVideoScore) $.messages.push(`ℹ️ 看视频另可领 ${d.watchVideoScore} 积分(需手动看广告,脚本不做)`);
    } else if (res && (res.code === 402 || /TOKEN|令牌/i.test(res.message || ""))) {
        $.messages.push(`⚠️ 签到时 token 过期(${res.message || 402}),下次 cron 会重试;反复出现请重抓 Cookie`);
    } else if (res && /已签|重复|签过/.test(res.message || "")) {
        $.messages.push("✨ 今日已签到");
    } else {
        $.messages.push(`❌ 签到失败: ${res ? res.message || $.toStr(res) : "无响应"}`);
    }
}

// app 接口全是 application/x-www-form-urlencoded
function postForm(path, form, extraHeaders) {
    return new Promise((resolve) => {
        const headers = Object.assign(
            {
                "content-type": "application/x-www-form-urlencoded; charset=utf-8",
                accept: "*/*",
                "accept-language": "zh-CN,zh-Hans;q=0.9",
                "x-lcc-self": "1", // 暗号:抓取脚本看到它就跳过,避免截到自己的流量污染存的 token
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

// 解 JWT payload 的 iat,算出"距签发多少分钟"。自带 base64url 解码,不依赖 atob(Loon/QX 不一定有)。
function tokenAgeMin(token) {
    try {
        const seg = String(token).split(".")[1];
        if (!seg) return null;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const s = seg.replace(/-/g, "+").replace(/_/g, "/");
        let out = "",
            bits = 0,
            buf = 0;
        for (const c of s) {
            const i = chars.indexOf(c);
            if (i < 0) continue;
            buf = (buf << 6) | i;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                out += String.fromCharCode((buf >> bits) & 0xff);
            }
        }
        const p = JSON.parse(out);
        if (p && p.iat) return Math.round(Date.now() / 1000 - p.iat);
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

// ============ Cookie 抓取(rewrite 模式) ============

// refreshToken 是「一次性滚动」:请求体里的是即将作废的旧值,服务器换成新值塞回【响应体】。
// 所以 refreshToken/userToken 只从 http-response 抓(最新有效的那个);
// phone/设备指纹这些不会滚动,从 http-request 抓即可。
function captureAuth() {
    try {
        if ($request && $request.method === "OPTIONS") return;
        const reqHeaders = lowerKeys(($request && $request.headers) || {});
        // 跳过 cron 脚本自己发的请求(带暗号),否则会把 cron 刚存的新 token 覆盖成 accessEntrance 里的旧值
        if (reqHeaders["x-lcc-self"]) {
            $.log("[capture] 跳过脚本自身请求");
            return;
        }
        const url = ($request && $request.url) || "";
        const isResp = typeof $response !== "undefined" && $response;
        const auth = $.getjson(CK_AUTH, {}) || {};
        let got = [];

        if (isResp) {
            // 响应模式:取服务端【新签发】的 refreshToken(请求体里的旧值用过即废,不能存)
            let data = {};
            try {
                data = (JSON.parse($response.body || "{}") || {}).data || {};
            } catch {}
            if (data && data.refreshToken) {
                // 只存更新的:新 token 年龄 ≤ 已存的才覆盖,防止 accessEntrance 等返回的旧 token 倒灌
                const newAge = tokenAgeMin(data.refreshToken);
                const oldAge = tokenAgeMin(auth.refreshToken);
                if (oldAge == null || newAge == null || newAge <= oldAge) {
                    auth.refreshToken = data.refreshToken;
                    got.push("refreshToken");
                } else {
                    $.log(`[capture] 忽略更旧的 refreshToken(新${newAge}分 > 存${oldAge}分)`);
                }
            }
            if (data && data.userToken) auth.userToken = data.userToken;
            if (data && data.userId) auth.userId = data.userId;
        } else if (typeof $request !== "undefined") {
            // 请求模式:取 phone / userId / ownerId / 设备指纹(都不滚动)
            const headers = lowerKeys($request.headers);
            const body = parseForm($request.body || "");
            if (/h5\/accessEntrance/.test(url)) {
                if (body.phone) (auth.phone = body.phone), got.push("phone");
                if (body.userId) auth.userId = body.userId;
                if (body.ownerId != null) auth.ownerId = body.ownerId;
            }
            if (/accessToken\/refresh/.test(url) && headers["device_id"]) {
                pick(auth, headers, "deviceId", "device_id");
                pick(auth, headers, "deviceType", "device_type");
                pick(auth, headers, "deviceOs", "device_os");
                pick(auth, headers, "deviceOsVersion", "device_os_version");
                pick(auth, headers, "deviceName", "device_name");
                pick(auth, headers, "appVersion", "app_version");
                pick(auth, headers, "channel", "channel_name");
                got.push("device");
            }
        }

        // 始终打一行日志,确认脚本被触发了(没反应时先看 Loon 日志有没有这行)
        const ep = url.split("?")[0].split("/").pop();
        $.log(`[capture] ${isResp ? "resp" : "req"} ${ep} got=[${got.join(",") || "none"}]`);
        if (!got.length) return;
        $.setjson(auth, CK_AUTH);

        // 节流通知(12 秒一次),避免 App 每 30 秒刷新就弹一条;但保证一定有反馈
        const last = +($.getdata("lvcchong_notify_ts") || 0);
        if (Date.now() - last < 12000) return;
        $.setdata(String(Date.now()), "lvcchong_notify_ts");
        const full = auth.refreshToken && auth.phone && auth.userId;
        if (full) {
            $.msg($.name, "✅ 驴充充 Cookie 已更新", "停 2 秒让它存到最新,然后立刻关 App");
        } else {
            $.msg($.name, "⏳ 驴充充 Cookie 还缺 " + missing(auth), "杀进程冷启 App + 进积分签到页");
        }
    } catch (e) {
        $.log(`[ERROR] Cookie 抓取异常: ${e}`);
    }
}

function missing(auth) {
    return [!auth.refreshToken && "refreshToken", !auth.phone && "phone", !auth.userId && "userId"]
        .filter(Boolean)
        .join("/");
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

function pick(auth, headers, dstKey, srcKey) {
    if (headers[srcKey]) auth[dstKey] = headers[srcKey];
}

function lowerKeys(obj) {
    if (!obj) return {};
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

// ============ 入口 ============

if (typeof $request !== "undefined" || typeof $response !== "undefined") {
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
