/**
 * QQ 音乐 · 绿钻成长值每日签到(QQ 音乐 App「我的-会员-每日签到」)
 *
 * 抓取:打开 QQ 音乐 →「我的 / 会员 / 每日签到」进签到页,抓 uin + qm_keyst + refresh_key
 * 签到:cron 先用 refresh_key 续 qm_keyst(musickey 仅 3 天有效,refresh_key 长期不变),
 *       再走小程序免签名通道(musicu.fcg + comm.authst)签到,无需私有 sign。挂着代理永不用再开 App
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-15
 *
 * ===== Loon =====
 * [MITM]
 * hostname = u6.y.qq.com
 * [Script]
 * http-request ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?_webcgikey=EveryDaySignLvzScore& tag=QQ音乐 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
 * cron "20 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, tag=QQ音乐签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = u6.y.qq.com
 * [Script]
 * QQ音乐 Cookie = type=http-request,pattern=^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?_webcgikey=EveryDaySignLvzScore&,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
 * QQ音乐签到 = type=cron,cronexp=20 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = u6.y.qq.com
 * [rewrite_local]
 * ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?_webcgikey=EveryDaySignLvzScore& url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js
 * [task_local]
 * 20 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, tag=QQ音乐签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: QQ音乐签到
 *       cron: '20 9 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "u6.y.qq.com"
 *   script:
 *     - match: ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?_webcgikey=EveryDaySignLvzScore&
 *       name: QQ音乐 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   QQ音乐签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js
 *     interval: 86400
 */

const $ = new Env("QQ音乐");

const SCRIPT_VERSION = "2026-06-15.r3"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = "qqmusic_data"; // { uin, authst, refresh_key, login_type, ts }
// 签到走小程序免签名通道:解包 wxada7aab80ba27074 发现所有 CGI 都用
// musicu.fcg + comm.authst(musickey) 鉴权,无私有 sign / 无 g_tk / 无 cookie。
// 实测 App 抓的 qm_keyst 直接当 authst 即可(跨通道通用)。
const API_URL = "https://u.y.qq.com/cgi-bin/musicu.fcg";
const MINA_APPID = "wxada7aab80ba27074"; // QQ 音乐微信小程序 appid(comm.appid)
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) MicroMessenger/8.0 miniProgram";

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata("qqmusic_debug")) || "false";
$.messages = [];

// ============ 抓取 ============

// 进「每日签到」页时触发(musics.fcg?_webcgikey=EveryDaySignLvzScore&),
// 只需从 Cookie 里取 uin + qm_keyst,不需要请求体。
function getCookie() {
    try {
        const headers = lowerKeys($request.headers);
        // HTTP/2 下 QQ 音乐发多个独立 cookie: 头,代理合并时常残留 "cookie:" 脏前缀,要拼回标准串
        const cookie = normalizeCookie(headers["cookie"]);

        const authst = (/qm_keyst=([^;]+)/.exec(cookie) || [])[1] || "";
        const uin = (/\buin=o?(\d+)/.exec(cookie) || [])[1] || "";
        // refresh_key 是长期不变的续期凭据,cron 靠它换新 musickey(详见 refreshKey)
        const refresh_key = (/refresh_key=([^;]+)/.exec(cookie) || [])[1] || "";
        // tmeLoginType 区分登录方式(1=QQ / 2=微信等),续期 comm 要带对
        const login_type = (/tmeLoginType=([^;]+)/.exec(cookie) || [])[1] || "1";
        if (!authst || !uin) {
            $.log("[WARN] Cookie 缺 qm_keyst / uin,跳过(可能未登录)");
            return;
        }
        if (!refresh_key) {
            $.log("[WARN] Cookie 缺 refresh_key,将无法自动续期(只能撑 ~3 天)");
        }

        $.setjson({ uin, authst, refresh_key, login_type, ts: Date.now() }, CK_KEY);
        $.msg($.name, "✅ QQ 音乐 Cookie 获取成功", "可关闭抓包,主脚本会自动续期并签到");
        $.log(`[INFO] 已保存 (uin=${uin}, authst…${authst.slice(-6)}, refresh_key${refresh_key ? "…" + refresh_key.slice(-6) : "(无)"}, loginType=${login_type})`);
    } catch (e) {
        $.log(`[ERROR] 抓取异常: ${e}`);
    }
}

// ============ 签到 ============

async function checkin() {
    const snap = $.getjson(CK_KEY, null);
    if (!snap || !snap.authst || !snap.uin) {
        $.messages.push(
            "🚫 未抓到 Cookie\n" +
            "👉 打开 QQ 音乐 →「我的 / 会员 / 每日签到」进签到页一次"
        );
        return;
    }

    const uin = String(snap.uin).replace(/^0+/, "") || String(snap.uin);

    // 1) 续期:musickey 仅 3 天有效,先用长期不变的 refresh_key 换一把新的(滚动续命)。
    //    续期失败不致命(库存 musickey 可能还没过期),继续尝试签到。
    await refreshKey(snap, uin);

    // 2) 签到:用(刚刷新的)authst
    const body = {
        comm: { uin: Number(uin), authst: snap.authst, mina: 1, appid: MINA_APPID, ct: 29, cv: 0, format: "json" },
        req_0: {
            module: "music.lvz.MuFest13TaskSvr",
            method: "EveryDaySignLvzScore",
            param: { Uin: uin, Cmd: "get" }, // Cmd:get 即领取(实测会真签)
        },
    };

    const res = await post(API_URL, JSON.stringify(body));
    debug(res, "EveryDaySignLvzScore");

    if (!res) {
        $.messages.push("❌ 签到无响应(详情见日志)");
        return;
    }
    const r0 = res.req_0 || {};
    const data = r0.data || {};

    // 外层鉴权失败(authst 失效)→ code!=0,需重抓
    if (res.code !== 0 || (r0.code !== 0 && r0.code !== undefined && data.Ret === undefined)) {
        $.messages.push(
            `❌ 签到失败 (code=${res.code}, req_0.code=${r0.code})\n` +
            "续期可能也失败(refresh_key 失效或离线 >3 天),请重进「每日签到」页重抓"
        );
        $.log(`[DEBUG] 响应前300: ${$.toStr(res).slice(0, 300)}`);
        return;
    }

    if (data.Ret === 0) {
        const score = (data.Info && data.Info.Score) || 0;
        $.messages.push(`✅ 绿钻成长值签到成功${score ? `: 今日 +${score}` : ""}`);
    } else if (data.Ret === 20019 || /已.*领取|已签|重复/.test(data.Msg || "")) {
        $.messages.push(`✨ 今日已签到${data.Msg ? `(${data.Msg})` : ""}`);
    } else {
        $.messages.push(`⚠️ 已处理 (Ret=${data.Ret})${data.Msg ? `: ${data.Msg}` : ""}`);
        $.log(`[DEBUG] 响应前300: ${$.toStr(res).slice(0, 300)}`);
    }
}

// 用 refresh_key 换新 musickey。实测(2026-06-15):
//   - musickey(qm_keyst)keyExpiresIn=259200 秒 = 3 天,每次续期换全新值 → 必须滚动存
//   - refresh_key 长期不变(needRefreshKeyIn=0),是续期的根凭据
//   - comm.tmeLoginType 要带对(本号实测为 2);用抓取时存的 login_type
// 只要 cron 每 ≤3 天跑一次,musickey 永远在有效期内,无需再开 App。
async function refreshKey(snap, uin) {
    if (!snap.refresh_key) {
        $.log("[WARN] 无 refresh_key,跳过续期(authst 失效则需重抓)");
        return;
    }
    const body = {
        comm: { ct: 24, cv: 0, format: "json", tmeAppID: "qqmusic", tmeLoginType: snap.login_type || "1", uin: Number(uin), authst: snap.authst },
        req1: {
            module: "music.login.LoginServer",
            method: "Login",
            param: { str_musicid: uin, musicid: Number(uin), musickey: snap.authst, refresh_key: snap.refresh_key, loginMode: 2 },
        },
    };
    const res = await post(API_URL, JSON.stringify(body));
    debug(res, "refreshKey");

    const data = (res && res.req1 && res.req1.data) || {};
    if (res && res.code === 0 && res.req1 && res.req1.code === 0 && data.musickey) {
        snap.authst = data.musickey;
        if (data.refresh_key) snap.refresh_key = data.refresh_key; // 通常不变,变了也跟上
        snap.ts = Date.now();
        $.setjson(snap, CK_KEY);
        $.log(`[INFO] musickey 已续期 (…${data.musickey.slice(-6)}, ${Math.round((data.keyExpiresIn || 0) / 86400)} 天有效)`);
    } else {
        // 续期失败:refresh_key 可能已失效,或 cron 停了 >3 天 musickey 也过期了
        $.log(`[WARN] 续期失败 (req1.code=${res && res.req1 ? res.req1.code : "?"}),用库存 authst 继续`);
    }
}

// ============ 请求 ============

function post(url, body) {
    return new Promise((resolve) => {
        const opts = {
            url,
            headers: {
                "content-type": "application/json",
                accept: "application/json",
                "User-Agent": UA,
            },
            body,
        };
        debug({ url, body }, "POST request");
        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] POST 失败: ${$.toStr(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(typeof data === "string" ? JSON.parse(data) : data);
            } catch (e) {
                $.log(`[ERROR] 响应解析失败,前300: ${String(data || "").slice(0, 300)}`);
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

// 清理代理合并多 cookie 头时残留的 "cookie:" 脏前缀,拼回标准 "k=v; k=v"
function normalizeCookie(raw) {
    if (!raw) return "";
    const parts = Array.isArray(raw) ? raw : String(raw).split(/\r?\n/);
    return parts
        .map((p) => String(p).replace(/^cookie\s*:\s*/i, "").trim())
        .filter(Boolean)
        .join("; ");
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
