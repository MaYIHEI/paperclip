/**
 * 林里 · 每日签到与鸭币兑换
 *
 * 首次抓取:打开「林里」小程序 → 进入签到页,自动抓取 Cookie
 * 后续更新:Cookie 到期前后打开小程序首页或鸭币商城,自动保存新 Cookie
 * 定时任务:每日签到;BoxJS 可分别开启免单券 / 周边兑换
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-07-16
 *
 * ===== Loon =====
 * [MITM]
 * hostname = webapi.qmai.cn
 * [Script]
 * http-request ^https:\/\/webapi\.qmai\.cn\/web\/(cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar)|catering\/common\/common-info|mall-apiserver\/integral\/(home\/index|item\/goods(\/detail)?)) tag=林里 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png
 * cron "0 10 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js, tag=林里签到兑换, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = webapi.qmai.cn
 * [Script]
 * 林里 Cookie = type=http-request,pattern=^https:\/\/webapi\.qmai\.cn\/web\/(cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar)|catering\/common\/common-info|mall-apiserver\/integral\/(home\/index|item\/goods(\/detail)?)),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png
 * 林里签到兑换 = type=cron,cronexp=0 10 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = webapi.qmai.cn
 * [rewrite_local]
 * ^https:\/\/webapi\.qmai\.cn\/web\/(cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar)|catering\/common\/common-info|mall-apiserver\/integral\/(home\/index|item\/goods(\/detail)?)) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js
 * [task_local]
 * 0 10 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js, tag=林里签到兑换, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 林里签到兑换
 *       cron: '0 10 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "webapi.qmai.cn"
 *   script:
 *     - match: ^https:\/\/webapi\.qmai\.cn\/web\/(cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar)|catering\/common\/common-info|mall-apiserver\/integral\/(home\/index|item\/goods(\/detail)?))
 *       name: 林里 Cookie
 *       type: request
 *       require-body: true
 * script-providers:
 *   林里签到兑换:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js
 *     interval: 86400
 */

const $ = new Env("林里");

const SCRIPT_VERSION = "2026-07-16.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = "linli_data";
const CK_CLEAR = "linli_clear";
const CK_DEBUG = "linli_debug";
const TASK_COUPON = "linli_task_exchange_coupon";
const TASK_TOY = "linli_task_exchange_toy";
const SIGN_BASE = "https://webapi.qmai.cn/web/cmk-center/sign";
const MALL_BASE = "https://webapi.qmai.cn/web/mall-apiserver/integral";
const DROP_HEADERS = ["content-length", "host", "connection", "accept-encoding"];
const EXCHANGE_TARGETS = [
    { key: TASK_COUPON, id: "1281777364363137025", name: "单杯免单券" },
    { key: TASK_TOY, id: "1283198338438545409", name: "林里鸭游乐园周边" },
];

$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata(CK_DEBUG)) || "false";
$.messages = [];

function captureCookie() {
    try {
        const headers = cleanHeaders($request.headers || {});
        const lower = lowerKeys(headers);
        const token = lower["qm-user-token"] || "";
        const body = parseJSON($request.body, {});
        const old = parseJSON($.getdata(CK_KEY), {});
        const activityId = body.activityId || old.activityId || "";
        const appid = body.appid || old.appid || "wx26c7aaacfa017719";
        const storeId = lower["store-id"] || body.storeId || old.storeId || "";

        $.log(`[capture] token=${token ? "有" : "无"} activityId=${activityId || "无"} storeId=${storeId || "无"}`);
        if (!token || !storeId || !appid) {
            $.log("[capture] Cookie 字段不完整,已忽略本次请求");
            return;
        }
        if (!activityId) {
            $.log("[capture] 首次配置仍需进入签到页获取活动信息");
            return;
        }

        const oldToken = lowerKeys(old.headers || {})["qm-user-token"] || "";
        const data = {
            headers,
            activityId: String(activityId),
            storeId: String(storeId),
            appid: String(appid),
            capturedAt: Date.now(),
        };
        const saved = $.setdata(JSON.stringify(data), CK_KEY);
        const checked = parseJSON($.getdata(CK_KEY), {});
        if (!saved || checked.activityId !== data.activityId) {
            throw new Error("Cookie 写入失败");
        }
        if (!oldToken) {
            $.msg($.name, "✅ 林里 Cookie 获取成功", "可关闭抓包,定时自动签到");
        } else if (oldToken !== token) {
            $.msg($.name, "♻️ 林里 Cookie 已自动更新", "以后打开小程序首页即可更新,无需再进签到页");
        }
    } catch (e) {
        $.log(`[ERROR] Cookie 抓取异常: ${e.message || e}`);
    }
}

function maybeClear() {
    if (($.getdata(CK_CLEAR) || "false") !== "true") return false;
    $.setdata("", CK_KEY);
    $.setdata("false", CK_CLEAR);
    $.msg($.name, "🗑 已清除 Cookie", "重新进入林里小程序签到页抓取");
    return true;
}

function loadAuth() {
    const raw = $.isNode() ? process.env.LINLI_DATA : $.getdata(CK_KEY);
    const auth = parseJSON(raw, null);
    if (!auth || !auth.headers || !auth.activityId || !auth.storeId || !auth.appid) {
        throw new Error("未配置 Cookie,请进入林里小程序签到页抓取");
    }
    return auth;
}

async function checkin(auth) {
    const headers = cleanHeaders(auth.headers);
    const common = { activityId: auth.activityId, appid: auth.appid };
    const before = await api(SIGN_BASE + "/userSignStatistics", headers, common);
    debug(before, "userSignStatistics(before)");
    assertAuth(before);

    if (isSigned(before)) {
        $.messages.push(formatStatus("✨ 今日已签到", before));
        return;
    }

    const sign = await api(SIGN_BASE + "/takePartInSign", headers, {
        activityId: auth.activityId,
        storeId: auth.storeId,
        appid: auth.appid,
    });
    debug(sign, "takePartInSign");
    assertAuth(sign);

    if (sign && sign.status === true) {
        const rewards = rewardText(sign.data && sign.data.rewardDetailList);
        const after = await api(SIGN_BASE + "/userSignStatistics", headers, common);
        debug(after, "userSignStatistics(after)");
        $.messages.push(formatStatus(`✅ 签到成功${rewards ? `: ${rewards}` : ""}`, after));
        return;
    }

    const message = String((sign && sign.message) || "");
    if (/已签到|重复签到/.test(message)) {
        $.messages.push("✨ 今日已签到");
        return;
    }
    throw new Error(`签到失败: ${message || short(sign)}`);
}

async function exchange(auth) {
    const targets = EXCHANGE_TARGETS.filter((item) => taskOn(item.key));
    if (!targets.length) return;

    const headers = cleanHeaders(auth.headers);
    for (const target of targets) {
        const detail = await api(MALL_BASE + "/item/goods/detail", headers, {
            goodsId: target.id,
            appid: auth.appid,
        });
        debug(detail, `exchange detail: ${target.name}`);
        assertAuth(detail);
        if (!detail || detail.status !== true || !detail.data) {
            $.messages.push(`❌ ${target.name}: 商品信息获取失败`);
            continue;
        }

        const goods = detail.data;
        const period = goods.timeCycleExtraVo || {};
        if (period.saleIng !== true) {
            $.log(`[exchange] ${target.name} 当前不在售卖时间,跳过`);
            continue;
        }
        if (Number(goods.userOrderLimit) > 0 && Number(goods.userOrderTimes) >= Number(goods.userOrderLimit)) {
            $.messages.push(`✨ ${target.name}: 已兑换`);
            continue;
        }
        if (Number(goods.remainStocks) <= 0) {
            $.messages.push(`⛔ ${target.name}: 已售罄`);
            continue;
        }
        if (Number(goods.userPoints) < Number(goods.pointsPrice)) {
            $.messages.push(`❌ ${target.name}: 鸭币不足`);
            continue;
        }

        const order = await api(MALL_BASE + "/order/create", headers, {
            goodsId: target.id,
            appid: auth.appid,
        });
        debug(order, `exchange order: ${target.name}`);
        assertAuth(order);
        if (order && order.status === true && order.data) {
            $.messages.push(`✅ ${target.name}: 兑换成功`);
            continue;
        }
        const message = String((order && order.message) || "未知错误");
        if (/已兑换|已购买|超过.*限制|限购/.test(message)) {
            $.messages.push(`✨ ${target.name}: 已兑换`);
        } else if (/售罄|库存|抢光/.test(message)) {
            $.messages.push(`⛔ ${target.name}: 已售罄`);
        } else {
            $.messages.push(`❌ ${target.name}: ${message}`);
        }
    }
}

function api(url, headers, body) {
    return new Promise((resolve) => {
        const path = url.replace("https://webapi.qmai.cn/web", "");
        const opts = { url, headers, body: JSON.stringify(body) };
        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] POST ${path}: ${short(err)}`);
                resolve(null);
                return;
            }
            const result = parseJSON(data, null);
            if (!result) $.log(`[ERROR] ${path} 响应解析失败: ${String(data || "").slice(0, 300)}`);
            resolve(result);
        });
    });
}

function taskOn(key) {
    const value = $.isNode() ? process.env[key.toUpperCase()] : $.getdata(key);
    return value === true || value === 1 || value === "true" || value === "1";
}

function assertAuth(res) {
    if (!res) throw new Error("网络无响应,请稍后重试");
    const message = String(res.message || "");
    if ([9001, 10008, 41000].includes(Number(res.code)) || /token|登录|鉴权|未授权|失效|过期/i.test(message)) {
        throw new Error(`Cookie 已失效,请重新进入签到页抓取: ${message || `code=${res.code}`}`);
    }
}

function isSigned(res) {
    return !!(res && res.status === true && res.data && Number(res.data.signStatus) === 1);
}

function formatStatus(prefix, res) {
    const data = (res && res.data) || {};
    const days = Number(data.signDays);
    return Number.isFinite(days) && days > 0 ? `${prefix} · 连续 ${days} 天` : prefix;
}

function rewardText(list) {
    if (!Array.isArray(list)) return "";
    return list.map((item) => item && item.rewardName ? `+${item.sendNum || 1} ${item.rewardName}` : "").filter(Boolean).join("、");
}

function cleanHeaders(raw) {
    const out = {};
    Object.keys(raw || {}).forEach((key) => {
        if (key.startsWith(":")) return;
        if (DROP_HEADERS.includes(key.toLowerCase())) return;
        out[key] = raw[key];
    });
    if (!lowerKeys(out)["content-type"]) out["content-type"] = "application/json";
    return out;
}

function lowerKeys(obj) {
    const out = {};
    Object.keys(obj || {}).forEach((key) => { out[key.toLowerCase()] = obj[key]; });
    return out;
}

function parseJSON(value, fallback) {
    if (value && typeof value === "object") return value;
    try { return JSON.parse(value); } catch (_) { return fallback; }
}

function short(value) {
    return (typeof value === "string" ? value : JSON.stringify(value || {})).slice(0, 300);
}

function debug(content, title) {
    if ($.is_debug !== "true") return;
    $.log(`\n----- ${title} -----`);
    $.log(short(content));
    $.log("----- end -----\n");
}

if (typeof $request !== "undefined") {
    captureCookie();
    $.done();
} else {
    (async () => {
        if (maybeClear()) return;
        const auth = loadAuth();
        await exchange(auth);
        await checkin(auth);
    })().catch((e) => {
        $.messages.push(`❌ ${e.message || e}`);
        $.logErr(e);
    }).finally(() => {
        if ($.messages.length) $.msg($.name, "", $.messages.join("\n"));
        $.done();
    });
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}getdata(t){return this.getval(t)}setdata(t,e){return this.setval(t,e)}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
