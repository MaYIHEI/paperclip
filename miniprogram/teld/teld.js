/**
 * 特来电 · 每日签到(「签到365天领手机」活动,H5 在小程序内)
 *
 * 单脚本: 有 $request 时抓 Cookie(进签到页触发 sgi.teld.cc 接口,抓 telda/teldb 等),
 *   无 $request 时 cron 打卡。签名 WVER = RSA-1024 PKCS#1v15(WTS) 十六进制,本地用 BigInt 算;
 *   Sign/t 为旧版遗留、当前官方 H5 已不发,服务端不校验,故省略。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-03
 */

const $ = new Env("特来电");

const SCRIPT_VERSION = "2026-06-03.poc3"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_AUTH = "teld_auth"; // telda/teldb/ip/userId 等,抓取写入

const API = "https://sgi.teld.cc/api/invoke";
const UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.74(0x18004a25) NetType/WIFI Language/zh_CN miniProgram/wx8d32c1a71ecd965d";

// WVER 用的 RSA-1024 公钥(硬编码在 teld 的 H5 库里,指数 010001)
const RSA_N = BigInt(
    "0xC2D84A72668932EBE5CC2BADB5DE288E59AD587775C1E45F33F6CC9DAB376C793AFF12050C0648D5C3016F685B9F4FA2460A59B6B07793808B4E68A883CA2830FD7895C66F68F64A829DB99DEDE978EC2E04711184A872C1F43956B1B72CFA803C1D677BAE386209368B3F3ED7A8CB06BEC64B0D0369EE62A49E6B417FC55959"
);
const RSA_E = 65537n;

$.messages = [];

// ============ WVER 签名(RSA-1024 PKCS#1 v1.5,纯 BigInt)============

function modpow(base, exp, mod) {
    let result = 1n;
    base %= mod;
    while (exp > 0n) {
        if (exp & 1n) result = (result * base) % mod;
        exp >>= 1n;
        base = (base * base) % mod;
    }
    return result;
}

// WVER = hex( RSA( 00 02 [随机非零填充] 00 [WTS的ASCII] ) ),256 hex
function buildWVER(wts) {
    const msg = [];
    for (const ch of String(wts)) msg.push(ch.charCodeAt(0));
    const k = 128; // RSA-1024 = 128 字节
    const psLen = k - 3 - msg.length; // PKCS#1 v1.5 填充长度
    const block = [0x00, 0x02];
    for (let i = 0; i < psLen; i++) block.push(1 + Math.floor(Math.random() * 255)); // 非零随机
    block.push(0x00);
    for (const b of msg) block.push(b);
    let m = 0n;
    for (const b of block) m = (m << 8n) | BigInt(b);
    let hex = modpow(m, RSA_E, RSA_N).toString(16);
    while (hex.length < 256) hex = "0" + hex;
    return hex;
}

// ============ Cookie 抓取(rewrite 模式)============

// 进签到页时 sgi.teld.cc 的接口请求里带齐 telda/teldb/teldz(IP)/cna/__jsluid_s + body 里的 X-Token
function captureAuth() {
    try {
        if ($request.method === "OPTIONS") return;
        const headers = lowerKeys($request.headers);
        const cookieStr = headers["cookie"] || "";
        const get = (n) => {
            const m = new RegExp(`(?:^|[;\\s])${n}=([^;]+)`).exec(cookieStr);
            return m ? m[1] : "";
        };
        const telda = get("telda");
        if (!telda) {
            $.log("[capture] 本次请求没有 telda,跳过");
            return;
        }
        const auth = {
            telda,
            teldb: get("teldb"),
            teldz: get("teldz"), // 公网 IP,作 WSDI
            cna: get("cna"),
            jsluid: get("__jsluid_s"),
            userId: jwtField(telda, "data") ? jwtField(telda, "data").UserId : jwtUserId(telda),
        };
        $.setjson(auth, CK_AUTH);
        $.msg($.name, "✅ 特来电 Cookie 获取成功", "可关掉小程序,cron 自动打卡(待验证)");
    } catch (e) {
        $.log(`[ERROR] 抓取异常: ${e}`);
    }
}

// ============ 打卡 ============

async function checkin() {
    const auth = $.getjson(CK_AUTH, {});
    if (!auth || !auth.telda) throw new Error(`[${SCRIPT_VERSION}] 未配置 Cookie,请先进特来电「签到365天」页抓取`);

    const wts = Math.round(Date.now() / 1000);
    const wver = buildWVER(wts);
    const ip = auth.teldz || "0.0.0.0";
    const rid = `${auth.userId || ""}_${Date.now()}_WRF`;

    // telda 剩余有效期(诊断:失败时先看是不是 telda 过期了)
    const teldaPayload = jwtPayload(auth.telda);
    const teldaRemain =
        teldaPayload && teldaPayload.exp ? Math.round((teldaPayload.exp - wts) / 60) : null;

    // 逐项打印检测参数,失败时直接对照
    $.log(`[检测] 版本=${SCRIPT_VERSION}`);
    $.log(`[检测] WTS=${wts}  WVER长度=${wver.length}(应256) 前16=${wver.slice(0, 16)}`);
    $.log(`[检测] telda 末8=${(auth.telda || "").slice(-8)}  剩余=${teldaRemain == null ? "?" : teldaRemain}分钟`);
    $.log(`[检测] WSDI(IP)=${ip}  userId=${auth.userId || "空"}  teldb=${auth.teldb ? "有" : "无"}`);
    $.log(`[检测] cna=${auth.cna ? "有" : "无"}  __jsluid_s=${auth.jsluid ? "有" : "无"}  RequestID=${rid}`);
    if (teldaRemain != null && teldaRemain < 0) {
        $.log(`[检测] ⚠️ telda 已过期 ${-teldaRemain} 分钟,大概率打卡会被拒,建议重抓`);
    }

    const form = buildForm({
        request: "{}",
        "X-Token": auth.telda,
        WTS: wts,
        WVER: wver,
        WSDI: ip,
        WRS: "WEB",
        WCOI: "",
        WCOL: "",
        "Teld-RequestID": rid,
        "Teld-RpcID": "0.1",
    });

    const res = await post(`${API}?SID=ProSrv-CompleteCheckInTask`, form, auth);
    $.log(`[响应] ${res ? JSON.stringify(res).slice(0, 400) : "无响应(网络错误/被拦)"}`);

    const tag = `[${SCRIPT_VERSION}]`;
    if (res && res.state === "1" && res.data) {
        if (res.data.IsCheckInSuccess) {
            $.messages.push(`✅ 签到成功,连续 ${res.data.ContinuousDays} 天,累计 ${res.data.TotalDays} 天`);
        } else {
            $.messages.push(`✨ 今日已签到(连续 ${res.data.ContinuousDays} 天)`);
        }
    } else if (res && (res.errcode === "12904" || /已打卡|已签/.test(res.errmsg || ""))) {
        // 12904「今日已打卡」= 服务端已接受请求(WVER/telda 都对),只是今天签过了 → 视为成功
        $.messages.push(`✨ 今日已打卡(${res.errmsg})`);
    } else if (!res) {
        $.messages.push(`${tag} ❌ 无响应(网络错误或被加速乐拦截)`);
    } else if (/token|登录|权限|未授权|unauthor|expire/i.test(JSON.stringify(res))) {
        const ageHint = teldaRemain != null && teldaRemain < 0 ? `(telda 已过期${-teldaRemain}分)` : "";
        $.messages.push(`${tag} ❌ 鉴权失败${ageHint}: errcode=${res.errcode} ${res.errmsg || ""}\n👉 重进签到页重抓 Cookie`);
    } else if (/sign|签名|wver|验签|verif/i.test(JSON.stringify(res))) {
        $.messages.push(`${tag} ❌ 疑似签名问题(WVER/Sign): errcode=${res.errcode} ${res.errmsg || ""}`);
    } else {
        $.messages.push(`${tag} ❌ 打卡失败: state=${res.state} errcode=${res.errcode} errmsg=${res.errmsg || ""}\n${JSON.stringify(res).slice(0, 200)}`);
    }
}

// ============ 请求 ============

function post(url, body, auth) {
    return new Promise((resolve) => {
        const cookie = [
            `telda=${auth.telda}`,
            auth.teldb ? `teldb=${auth.teldb}` : "",
            "teldc=0",
            auth.teldz ? `teldz=${auth.teldz}` : "",
            auth.cna ? `cna=${auth.cna}` : "",
            auth.jsluid ? `__jsluid_s=${auth.jsluid}` : "",
        ]
            .filter(Boolean)
            .join("; ");
        const opts = {
            url,
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                accept: "application/json, text/plain, */*",
                origin: "https://c2.teld.cc",
                referer: "https://c2.teld.cc/",
                "User-Agent": UA,
                Cookie: cookie,
            },
            body,
        };
        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] POST ${url}: ${$.toStr(err)}`);
                return resolve(null);
            }
            try {
                resolve(typeof data === "string" ? JSON.parse(data) : data);
            } catch (e) {
                $.log(`[ERROR] 解析失败: ${(data || "").slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// ============ 工具 ============

function buildForm(obj) {
    return Object.entries(obj)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
}

function jwtPayload(token) {
    try {
        const t = String(token).replace(/^A01/, "");
        const seg = t.split(".")[1];
        const s = seg.replace(/-/g, "+").replace(/_/g, "/");
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
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
        return JSON.parse(out);
    } catch {
        return null;
    }
}
function jwtField(token, f) {
    const p = jwtPayload(token);
    return p ? p[f] : null;
}
function jwtUserId(token) {
    const p = jwtPayload(token);
    return p && p.data ? p.data.UserId : "";
}

function lowerKeys(obj) {
    if (!obj) return {};
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

function debug(content, title = "debug") {
    if (($.getdata("teld_debug") || "false") !== "true") return;
    $.log(`\n----- ${title} -----`);
    $.log(typeof content === "string" ? content : $.toStr(content));
    $.log(`----- end -----\n`);
}

async function sendMsg(message) {
    if (!message) return;
    $.msg($.name, "", message);
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
