/**
 * 泡泡玛特 · 微信小程序「泡泡玛特会员俱乐部」每日签到自动 +5 泡泡值
 *
 * 抓取:打开「泡泡玛特会员俱乐部」小程序 → 进「我的」页,触发接口自动抓 JWT
 * 签到:cron 定时自动签到
 *
 * @Author: @Sliverkiss
 * @Modifier: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-11
 *
 * ===== Loon =====
 * [MITM]
 * hostname = popvip.paquapp.com
 * [Script]
 * http-response ^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info) tag=泡泡玛特 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png
 * cron "0 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js, tag=泡泡玛特签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = popvip.paquapp.com
 * [Script]
 * 泡泡玛特 Cookie = type=http-response,pattern=^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png
 * 泡泡玛特签到 = type=cron,cronexp=0 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = popvip.paquapp.com
 * [rewrite_local]
 * ^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info) url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js
 * [task_local]
 * 0 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js, tag=泡泡玛特签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 泡泡玛特签到
 *       cron: '0 9 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "popvip.paquapp.com"
 *   script:
 *     - match: ^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info)
 *       name: 泡泡玛特 Cookie
 *       type: response
 *       require-body: true
 * script-providers:
 *   泡泡玛特签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js
 *     interval: 86400
 */
const $ = new Env("泡泡玛特");

const SCRIPT_VERSION = "2026-06-07.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);
const ckName = "ppmt_data";
const userCookie = $.toObj($.isNode() ? process.env[ckName] : $.getdata(ckName)) || [];
$.userIdx = 0, $.userList = [], $.notifyMsg = [];
$.succCount = 0;
const notify = $.isNode() ? require('./sendNotify') : '';
$.is_debug = ($.isNode() ? process.env.IS_DEDUG : $.getdata('is_debug')) || 'false';

async function main() {
    for (let user of $.userList) {
        try {
            let signMsg = await user.signin() ?? "";
            if (user.ckStatus) {
                let userInfo = await user.getUserInfo() || {};
                const phoneStr = userInfo.phone || user.userName || '';
                DoubleLog(`用户: ${phone_num(phoneStr)}\n签到: ${signMsg}`);
                $.succCount++;
            } else {
                DoubleLog(`⛔️ 「${user.userName ?? `账号${user.index}`}」签到失败, 用户需要去登录`)
            }
        } catch (e) {
            $.log(`[${user.userName || user.index}][ERROR] ${e}`);
            DoubleLog(`⛔️ 账号 ${user.userName || user.index} 处理异常: ${e.message || e}`);
        }
    }
    $.title = `共${$.userList.length}个账号,成功${$.succCount}个,失败${$.userList.length - 0 - $.succCount}个`
    await sendMsg($.notifyMsg.join("\n"), $.avatar ? { $media: $.avatar } : undefined);
}

class UserInfo {
    constructor(user) {
        this.index = ++$.userIdx;
        this.token = "" || user.token || user;          // openid (identity_code)
        this.jwt = user.jwt || "";                       // PopVip-Auth Bearer JWT (新增)
        this.userId = "" || user.userId;
        this.userName = user.userName;                   // phone
        this.avatar = user.avatar;
        this.ckStatus = true;
        this.baseUrl = `https://popvip.paquapp.com`;
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.73(0x18004921) NetType/WIFI Language/zh_CN',
            'Accept-Encoding': 'gzip,compress,br,deflate',
            'identity_code': this.token,
            'PopVip-Platform': '2',
            'charset': 'utf-8',
            'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
            'Referer': 'https://servicewechat.com/wx9627eb7f4b1c69d5/835/page-frame.html'
        };
        // 如果有 JWT，加上 PopVip-Auth 头（新版鉴权）
        if (this.jwt) {
            this.headers['PopVip-Auth'] = `Bearer ${this.jwt}`;
        }
        this.fetch = async (o) => {
            try {
                if (typeof o === 'string') o = { url: o };
                if (o?.url?.startsWith("/") || o?.url?.startsWith(":")) o.url = this.baseUrl + o.url;
                const res = await Request({ ...o, headers: o.headers || this.headers, url: o.url })
                debug(res, o?.url?.replace(/\/+$/, '').substring(o?.url?.lastIndexOf('/') + 1));
                return res;
            } catch (e) {
                this.ckStatus = false;
                $.log(`[${this.userName || this.index}][ERROR] 请求发起失败!${e}\n`);
            }
        }
    }

    // 仅返回 phone(从 JWT 解),不再调用任何接口,因为通知里已不展示等级/泡泡值/积分
    async getUserInfo() {
        const jwtPayload = parseJWT(this.jwt) || {};
        return {
            phone: jwtPayload.phone || this.userName,
        };
    }

    // 签到 (接口暂未变,先维持不动观察)
    async signin() {
        try {
            const opts = {
                url: `/miniapp/v2/sign_in/everySignDay/`,
                params: { openid: this.token, ...getSign({ openid: this.token }) },
                type: "get",
            }
            let res = await this.fetch(opts);
            if (res?.code != 1) throw new Error(res?.msg || "登录过期");
            let signMsg = `${res?.msg || `${res?.data?.reward_desc}+${res?.data?.reward_val || 0}`}`;
            $.log(`[${this.userName || this.index}][INFO] 签到任务: ${signMsg}`);
            return signMsg;
        } catch (e) {
            this.ckStatus = false;
            $.log(`[${this.userName || this.index}][ERROR] ${e}\n`);
        }
    }
}

// 解析 JWT payload
function parseJWT(token) {
    try {
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        // base64url -> base64
        let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (payload.length % 4) payload += '=';
        // 跨平台 base64 decode
        let decoded;
        if (typeof Buffer !== 'undefined') {
            decoded = Buffer.from(payload, 'base64').toString('utf-8');
        } else if (typeof $ !== 'undefined' && $.CryptoJS) {
            const wa = $.CryptoJS.enc.Base64.parse(payload);
            decoded = $.CryptoJS.enc.Utf8.stringify(wa);
        } else {
            // 降级: 简易 atob
            decoded = decodeURIComponent(escape(atob(payload)));
        }
        return JSON.parse(decoded);
    } catch (e) {
        $.log(`[parseJWT][ERROR] ${e}`);
        return null;
    }
}

// 获取Cookie
async function getCookie() {
    try {
        if ($request && $request.method === 'OPTIONS') return;
        const header = ObjectKeys2LowerCase($request.headers) ?? {};
        if (!header) throw new Error(`错误的运行方式，请切换到cron环境`);

        // 抓 openid (identity_code) 和 JWT (popvip-auth)
        const openid = header.identity_code;
        const authHeader = header['popvip-auth'] || '';
        const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!openid) throw new Error("获取token失败, 缺少 identity_code");
        if (!jwt) throw new Error("获取token失败, 缺少 PopVip-Auth (请确保进入了'我的'页面)");

        // 从 JWT payload 解出 user_id 和 phone (新接口响应体已不再返回)
        const payload = parseJWT(jwt);
        if (!payload) throw new Error("获取token失败, JWT 解析异常");

        const newData = {
            "userId": payload.user_id,
            "token": openid,
            "jwt": jwt,
            "userName": payload.phone,
        };

        if (!newData.userId || !newData.userName) {
            throw new Error(`获取token失败, JWT 缺少 user_id 或 phone 字段: ${$.toStr(payload)}`);
        }

        const index = userCookie.findIndex(e => e.userId == newData.userId);
        index >= 0 ? userCookie[index] = newData : userCookie.push(newData);

        $.setjson(userCookie, ckName);
        $.msg($.name, `🎉账号[${phone_num(newData.userName)}]更新token成功!`, ``);

    } catch (e) {
        throw e;
    }
}

function phone_num(phone_num) {
    if (typeof phone_num !== 'string') return String(phone_num || '');
    if (phone_num.length === 11) return phone_num.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    return phone_num;
}

function getSign(t, e = "GET", n = false) {
    function md5(data) {
        return $.CryptoJS.MD5(data).toString();
    }
    function base64Encode(data) {
        const wordArray = $.CryptoJS.enc.Utf8.parse(data);
        return $.CryptoJS.enc.Base64.stringify(wordArray);
    }
    function d(t, e, n) {
        var o = {};
        Object.keys(t).sort().forEach(function (n) {
            o[n] = "POST" === e ? t[n] : t[n]?.toString();
        });
        o.version = "5.13.8";  // 同步更新到当前版本号
        var s = (new Date).getTime().toString();
        var c = JSON.stringify(o) + "PopMartminiApp1117" + s;
        var u = md5(c);
        t.sign = n ? md5(base64Encode(u + "PopMartminiApp0314")) : u;
        t.time = s;
        t.version = "5.13.8";
        return t;
    }
    return d(t, e, n);
}

async function loadCryptoJS() {
    let code = ($.isNode() ? require('crypto-js') : $.getdata('CryptoJS_code')) || '';
    if ($.isNode()) return code;
    if (code && Object.keys(code).length) {
        console.log(`[INFO] 缓存中存在CryptoJS代码, 跳过下载\n`)
        eval(code)
        return createCryptoJS();
    }
    console.log(`[INFO] 开始下载CryptoJS代码\n`)
    return new Promise(async (resolve) => {
        $.getScript(
            'https://cdn.jsdelivr.net/gh/Sliverkiss/QuantumultX@main/Utils/CryptoJS.min.js'
        ).then((fn) => {
            $.setdata(fn, 'CryptoJS_code')
            eval(fn)
            const CryptoJS = createCryptoJS();
            console.log(`[INFO] CryptoJS加载成功, 请继续\n`)
            resolve(CryptoJS)
        })
    })
}

!(async () => {
    try {
        if (typeof $request !== "undefined") {
            await getCookie();
        } else {
            if (JSON.parse($.getdata("ppmt_clear") || "false")) {
                $.setdata("", ckName);
                $.setdata("false", "ppmt_clear");
                $.msg($.name, "", "✅ Cookie 已清除，请重新抓取");
                return;
            }
            $.CryptoJS = await loadCryptoJS();
            await checkEnv();
            await main();
        }
    } catch (e) {
        throw e;
    }
})()
    .catch((e) => { $.logErr(e), $.msg($.name, `⛔️ script run error!`, e.message || e) })
    .finally(async () => {
        $.done({ ok: 1 });
    });

/** ---------------------------------固定不动区域----------------------------------------- */
async function sendMsg(a, e) { a && ($.isNode() ? await notify.sendNotify($.name, a) : $.msg($.name, $.title || "", a, e)) }
function DoubleLog(o) { o && ($.log(`${o}`), $.notifyMsg.push(`${o}`)) };
async function checkEnv() { try { if (!userCookie?.length) throw new Error("no available accounts found"); $.log(`\n[INFO] 检测到 ${userCookie?.length ?? 0} 个账号\n`), $.userList.push(...userCookie.map((o => new UserInfo(o))).filter(Boolean)) } catch (o) { throw o } }
function debug(g, e = "debug") { "true" === $.is_debug && ($.log(`\n-----------${e}------------\n`), $.log("string" == typeof g ? g : $.toStr(g) || `debug error => t=${g}`), $.log(`\n-----------${e}------------\n`)) }
function ObjectKeys2LowerCase(obj) { return !obj ? {} : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])) };
async function Request(t) { "string" == typeof t && (t = { url: t }); try { if (!t?.url) throw new Error("[URL][ERROR] 缺少 url 参数"); let { url: o, type: e, headers: r = {}, body: s, params: a, dataType: n = "form", resultType: u = "data" } = t; const p = e ? e?.toLowerCase() : "body" in t ? "post" : "get", c = o.concat("post" === p ? "?" + $.queryStr(a) : ""), i = t.timeout ? $.isSurge() ? t.timeout / 1e3 : t.timeout : 1e4; "json" === n && (r["Content-Type"] = "application/json;charset=UTF-8"); const y = "string" == typeof s ? s : (s && "form" == n ? $.queryStr(s) : $.toStr(s)), l = { ...t, ...t?.opts ? t.opts : {}, url: c, headers: r, ..."post" === p && { body: y }, ..."get" === p && a && { params: a }, timeout: i }, m = $.http[p.toLowerCase()](l).then((t => "data" == u ? $.toObj(t.body) || t.body : $.toObj(t) || t)).catch((t => $.log(`[${p.toUpperCase()}][ERROR] ${t}\n`))); return Promise.race([new Promise(((t, o) => setTimeout((() => o("当前请求已超时")), i))), m]) } catch (t) { console.log(`[${p.toUpperCase()}][ERROR] ${t}\n`) } }
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise(((e, i) => { s.call(this, t, ((t, s, o) => { t ? i(t) : e(s) })) })) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.logLevels = { debug: 0, info: 1, warn: 2, error: 3 }, this.logLevelPrefixs = { debug: "[DEBUG] ", info: "[INFO] ", warn: "[WARN] ", error: "[ERROR] " }, this.logLevel = "info", this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } getEnv() { return "undefined" != typeof $environment && $environment["surge-version"] ? "Surge" : "undefined" != typeof $environment && $environment["stash-version"] ? "Stash" : "undefined" != typeof module && module.exports ? "Node.js" : "undefined" != typeof $task ? "Quantumult X" : "undefined" != typeof $loon ? "Loon" : "undefined" != typeof $rocket ? "Shadowrocket" : void 0 } isNode() { return "Node.js" === this.getEnv() } isQuanX() { return "Quantumult X" === this.getEnv() } isSurge() { return "Surge" === this.getEnv() } isLoon() { return "Loon" === this.getEnv() } isShadowrocket() { return "Shadowrocket" === this.getEnv() } isStash() { return "Stash" === this.getEnv() } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null, ...s) { try { return JSON.stringify(t, ...s) } catch { return e } } getjson(t, e) { let s = e; if (this.getdata(t)) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise((e => { this.get({ url: t }, ((t, s, i) => e(i))) })) } runScript(t, e) { return new Promise((s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let o = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); o = o ? 1 * o : 20, o = e && e.timeout ? e.timeout : o; const [r, a] = i.split("@"), n = { url: `http://${a}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: o }, headers: { "X-Key": r, Accept: "*/*" }, timeout: o }; this.post(n, ((t, e, i) => s(i))) })).catch((t => this.logErr(t))) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), o = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, o) : i ? this.fs.writeFileSync(e, o) : this.fs.writeFileSync(t, o) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let o = t; for (const t of i) if (o = Object(o)[t], void 0 === o) return s; return o } lodash_set(t, e, s) { return Object(t) !== t || (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce(((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}), t)[e[e.length - 1]] = s), t } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), o = s ? this.getval(s) : ""; if (o) try { const t = JSON.parse(o); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, o] = /^@(.*?)\.(.*?)$/.exec(e), r = this.getval(i), a = i ? "null" === r ? null : r || "{}" : "{}"; try { const e = JSON.parse(a); this.lodash_set(e, o, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const r = {}; this.lodash_set(r, o, t), s = this.setval(JSON.stringify(r), i) } } else s = this.setval(t, e); return s } getval(t) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.read(t); case "Quantumult X": return $prefs.valueForKey(t); case "Node.js": return this.data = this.loaddata(), this.data[t]; default: return this.data && this.data[t] || null } } setval(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.write(t, e); case "Quantumult X": return $prefs.setValueForKey(t, e); case "Node.js": return this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0; default: return this.data && this.data[e] || null } } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.cookie && void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar))) } get(t, e = (() => { })) { switch (t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"], delete t.headers["content-type"], delete t.headers["content-length"]), t.params && (t.url += "?" + this.queryStr(t.params)), void 0 === t.followRedirect || t.followRedirect || ((this.isSurge() || this.isLoon()) && (t["auto-redirect"] = !1), this.isQuanX() && (t.opts ? t.opts.redirection = !1 : t.opts = { redirection: !1 })), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, ((t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, i) })); break; case "Quantumult X": this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then((t => { const { statusCode: s, statusCode: i, headers: o, body: r, bodyBytes: a } = t; e(null, { status: s, statusCode: i, headers: o, body: r, bodyBytes: a }, r, a) }), (t => e(t && t.error || "UndefinedError"))); break; case "Node.js": let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", ((t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } })).then((t => { const { statusCode: i, statusCode: o, headers: r, rawBody: a } = t, n = s.decode(a, this.encoding); e(null, { status: i, statusCode: o, headers: r, rawBody: a, body: n }, n) }), (t => { const { message: i, response: o } = t; e(i, o, o && s.decode(o.rawBody, this.encoding)) })); break } } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; switch (t.body && t.headers && !t.headers["Content-Type"] && !t.headers["content-type"] && (t.headers["content-type"] = "application/x-www-form-urlencoded"), t.headers && (delete t.headers["Content-Length"], delete t.headers["content-length"]), void 0 === t.followRedirect || t.followRedirect || ((this.isSurge() || this.isLoon()) && (t["auto-redirect"] = !1), this.isQuanX() && (t.opts ? t.opts.redirection = !1 : t.opts = { redirection: !1 })), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient[s](t, ((t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, i) })); break; case "Quantumult X": t.method = s, this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then((t => { const { statusCode: s, statusCode: i, headers: o, body: r, bodyBytes: a } = t; e(null, { status: s, statusCode: i, headers: o, body: r, bodyBytes: a }, r, a) }), (t => e(t && t.error || "UndefinedError"))); break; case "Node.js": let i = require("iconv-lite"); this.initGotEnv(t); const { url: o, ...r } = t; this.got[s](o, r).then((t => { const { statusCode: s, statusCode: o, headers: r, rawBody: a } = t, n = i.decode(a, this.encoding); e(null, { status: s, statusCode: o, headers: r, rawBody: a, body: n }, n) }), (t => { const { message: s, response: o } = t; e(s, o, o && i.decode(o.rawBody, this.encoding)) })); break } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } queryStr(t) { let e = ""; for (const s in t) { let i = t[s]; null != i && "" !== i && ("object" == typeof i && (i = JSON.stringify(i)), e += `${s}=${i}&`) } return e = e.substring(0, e.length - 1), e } msg(e = t, s = "", i = "", o = {}) { const r = t => { const { $open: e, $copy: s, $media: i, $mediaMime: o } = t; switch (typeof t) { case void 0: return t; case "string": switch (this.getEnv()) { case "Surge": case "Stash": default: return { url: t }; case "Loon": case "Shadowrocket": return t; case "Quantumult X": return { "open-url": t }; case "Node.js": return }case "object": switch (this.getEnv()) { case "Surge": case "Stash": case "Shadowrocket": default: { const r = {}; let a = t.openUrl || t.url || t["open-url"] || e; a && Object.assign(r, { action: "open-url", url: a }); let n = t["update-pasteboard"] || t.updatePasteboard || s; if (n && Object.assign(r, { action: "clipboard", text: n }), i) { let t, e, s; if (i.startsWith("http")) t = i; else if (i.startsWith("data:")) { const [t] = i.split(";"), [, o] = i.split(","); e = o, s = t.replace("data:", "") } else { e = i, s = (t => { const e = { JVBERi0: "application/pdf", R0lGODdh: "image/gif", R0lGODlh: "image/gif", iVBORw0KGgo: "image/png", "/9j/": "image/jpg" }; for (var s in e) if (0 === t.indexOf(s)) return e[s]; return null })(i) } Object.assign(r, { "media-url": t, "media-base64": e, "media-base64-mime": o ?? s }) } return Object.assign(r, { "auto-dismiss": t["auto-dismiss"], sound: t.sound }), r } case "Loon": { const s = {}; let o = t.openUrl || t.url || t["open-url"] || e; o && Object.assign(s, { openUrl: o }); let r = t.mediaUrl || t["media-url"]; return i?.startsWith("http") && (r = i), r && Object.assign(s, { mediaUrl: r }), console.log(JSON.stringify(s)), s } case "Quantumult X": { const o = {}; let r = t["open-url"] || t.url || t.openUrl || e; r && Object.assign(o, { "open-url": r }); let a = t["media-url"] || t.mediaUrl; i?.startsWith("http") && (a = i), a && Object.assign(o, { "media-url": a }); let n = t["update-pasteboard"] || t.updatePasteboard || s; return n && Object.assign(o, { "update-pasteboard": n }), console.log(JSON.stringify(o)), o } case "Node.js": return }default: return } }; if (!this.isMute) switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: $notification.post(e, s, i, r(o)); break; case "Quantumult X": $notify(e, s, i, r(o)); break; case "Node.js": break }if (!this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } debug(...t) { this.logLevels[this.logLevel] <= this.logLevels.debug && (t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(`${this.logLevelPrefixs.debug}${t.map((t => t ?? String(t))).join(this.logSeparator)}`)) } info(...t) { this.logLevels[this.logLevel] <= this.logLevels.info && (t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(`${this.logLevelPrefixs.info}${t.map((t => t ?? String(t))).join(this.logSeparator)}`)) } warn(...t) { this.logLevels[this.logLevel] <= this.logLevels.warn && (t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(`${this.logLevelPrefixs.warn}${t.map((t => t ?? String(t))).join(this.logSeparator)}`)) } error(...t) { this.logLevels[this.logLevel] <= this.logLevels.error && (t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(`${this.logLevelPrefixs.error}${t.map((t => t ?? String(t))).join(this.logSeparator)}`)) } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.map((t => t ?? String(t))).join(this.logSeparator)) } logErr(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: this.log("", `❗️${this.name}, 错误!`, e, t); break; case "Node.js": this.log("", `❗️${this.name}, 错误!`, e, void 0 !== t.message ? t.message : t, t.stack); break } } wait(t) { return new Promise((e => setTimeout(e, t))) } done(t = {}) { const e = ((new Date).getTime() - this.startTime) / 1e3; switch (this.log("", `🔔${this.name}, 结束! 🕛 ${e} 秒`), this.log(), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: $done(t); break; case "Node.js": process.exit(1) } } }(t, e) }
