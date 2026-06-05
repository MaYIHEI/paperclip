/**
 * 海底捞 · 微信小程序「海底捞」每日签到,签到获得菜品碎片🧩
 *
 * 用法:打开微信小程序「海底捞」→ 进入「我的」→ 任意签到入口,触发签到接口
 *
 * @Author: @Sliverkiss
 * @Modifier: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-24
 *
 * ===== Loon =====
 * [MITM]
 * hostname = superapp-public.kiwa-tech.com
 * [Script]
 * http-request ^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin) tag=海底捞 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png
 * cron "23 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js, tag=海底捞签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = superapp-public.kiwa-tech.com
 * [Script]
 * 海底捞 Cookie = type=http-request,pattern=^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin),requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png
 * 海底捞签到 = type=cron,cronexp=23 7 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = superapp-public.kiwa-tech.com
 * [rewrite_local]
 * ^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js
 * [task_local]
 * 23 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js, tag=海底捞签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 海底捞签到
 *       cron: '23 7 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "superapp-public.kiwa-tech.com"
 *   script:
 *     - match: ^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin)
 *       name: 海底捞 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   海底捞签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js
 *     interval: 86400
 */
const $ = new Env("海底捞");
const ckName = "hdl_data";
const Notify = 1;
const notify = $.isNode() ? require('./sendNotify') : '';
let envSplitor = ["@"];
let userCookie = ($.isNode() ? process.env[ckName] : $.getdata(ckName)) || '';
let userList = [];
let userIdx = 0;
let userCount = 0;
$.is_debug = ($.isNode() ? process.env.IS_DEDUG : $.getdata('is_debug')) || 'false';
$.notifyMsg = [];
$.barkKey = ($.isNode() ? process.env["bark_key"] : $.getdata("bark_key")) || '';

async function main() {
    console.log('\n================== 任务 ==================\n');
    const taskall = [];
    for (let user of userList) {
        if (user.ckStatus) {
            DoubleLog(`🔷账号${user.index} >> Start work`);
            console.log(`随机延迟${user.getRandomTime()}ms`);
            // signin: 触发签到接口
            taskall.push(await user.signin());
            await $.wait(user.getRandomTime());
            // queryFragment: 查碎片总数
            taskall.push(await user.queryFragment());
            await $.wait(user.getRandomTime());
        } else {
            $.notifyMsg.push(`❌账号${user.index} >> Check ck error!`);
        }
    }
    await Promise.all(taskall);
}

class UserInfo {
    constructor(str) {
        this.index = ++userIdx;
        this.token = str; // TOKEN_APP_xxx-xxx
        this.ckStatus = true;
        this.signMsg = '';
    }

    getRandomTime() {
        return randomInt(1000, 3000);
    }

    // 通用请求头
    buildHeaders() {
        return {
            'Host': 'superapp-public.kiwa-tech.com',
            'deviceid': 'null',
            'accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.73(0x18004926) NetType/WIFI Language/zh_CN miniProgram/wx1ddeb67115f30d1a',
            'reqtype': 'APPH5',
            '_haidilao_app_token': this.token,
            'origin': 'https://superapp-public.kiwa-tech.com',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'referer': `https://superapp-public.kiwa-tech.com/app-sign-in/?SignInToken=${this.token}&source=MiniApp`,
        };
    }

    // 真正签到
    async signin() {
        try {
            const options = {
                url: `https://superapp-public.kiwa-tech.com/activity/wxapp/signin/signin`,
                headers: this.buildHeaders(),
                body: JSON.stringify({ "signinSource": "MiniApp" })
            };
            const result = await httpRequest(options);
            debug(result);

            if (!result) {
                this.signMsg = `❌签到无响应`;
                $.log(`[账号${this.index}] 签到无响应`);
                return;
            }
            // token 失效
            if (result?.code === 'unauthorized' || /token|登录|未授权/i.test(result?.msg || '')) {
                this.ckStatus = false;
                this.signMsg = `❌${result?.msg || 'token 失效'}`;
                return;
            }
            if (result.success === true) {
                // 解析签到详情：找今天的记录
                const list = result?.data?.signinQueryDetailList || [];
                const today = list.find(x => x.currentOr === 1);
                if (today) {
                    // dailySigninStatus: 1=已签, 2=今日刚签, 3=未签到
                    if (today.dailySigninStatus === 1) {
                        this.signMsg = `✨今日已签`;
                    } else {
                        this.signMsg = `✅签到成功,+${today.fragment || 0}🧩,连签${today.daysSeries || 0}天`;
                    }
                } else {
                    this.signMsg = `✅签到成功`;
                }
            } else {
                this.signMsg = `❌${result?.msg || '签到失败'}`;
                $.log(`[账号${this.index}] raw: ${JSON.stringify(result).substring(0, 300)}`);
            }
        } catch (e) {
            this.signMsg = `❌签到异常`;
            $.log(`[账号${this.index}] ${e}`);
        }
    }

    // 查碎片总数
    async queryFragment() {
        try {
            const options = {
                url: `https://superapp-public.kiwa-tech.com/activity/wxapp/signin/queryFragment`,
                headers: this.buildHeaders(),
                body: '' // POST 空 body，与抓包一致
            };
            const result = await httpRequest(options);
            debug(result);

            if (result?.success === true) {
                DoubleLog(`${this.signMsg},当前共${result.data.total}碎片🧩`);
                this.ckStatus = true;
            } else if (result?.code === 'unauthorized' || /token|登录|未授权/i.test(result?.msg || '')) {
                this.ckStatus = false;
                DoubleLog(`${this.signMsg} (碎片查询失败:token 失效)`);
            } else {
                DoubleLog(`${this.signMsg} (碎片查询失败)`);
                $.log(`[账号${this.index}] queryFragment raw: ${JSON.stringify(result || {}).substring(0, 300)}`);
            }
        } catch (e) {
            DoubleLog(`${this.signMsg}`);
            $.log(`[账号${this.index}] queryFragment 异常 ${e}`);
        }
    }
}

// 抓 token: 从 /activity/wxapp/signin/* 的请求头里取 _haidilao_app_token
async function getCookie() {
    try {
        if (!$request || $request.method === 'OPTIONS') return;
        const headers = ObjectKeys2LowerCase($request.headers);
        const token = headers['_haidilao_app_token'];

        if (!token) {
            $.log(`[ERROR] 未在请求头里找到 _haidilao_app_token`);
            $.log(`[DEBUG] headers keys: ${Object.keys(headers).join(',')}`);
            return;
        }
        if (!/^TOKEN_APP_/i.test(token)) {
            $.log(`[WARN] token 格式异常: ${token.substring(0, 20)}...`);
        }

        // 多账号兼容：已有则替换，没有则追加
        const existing = (userCookie || '').split('@').filter(Boolean);
        const idx = existing.findIndex(t => t === token);
        if (idx === -1) {
            existing.push(token);
            const newVal = existing.join('@');
            $.setdata(newVal, ckName);
            $.msg($.name, '', `🎉 获取 Token 成功 (共${existing.length}个账号)`);
            $.log(`[INFO] 新增 token: ${token}`);
        } else {
            $.log(`[INFO] token 已存在,无需更新`);
        }
    } catch (e) {
        $.log(`[ERROR] getCookie: ${e}`);
        $.msg($.name, '', `❌ 获取 Token 失败: ${e.message || e}`);
    }
}

function ObjectKeys2LowerCase(obj) {
    return !obj ? {} : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

!(async () => {
    if (typeof $request !== "undefined") {
        await getCookie();
        return;
    }
    if (!(await checkEnv())) { throw new Error(`❌未检测到ck，请添加环境变量`); }
    if (userList.length > 0) {
        await main();
    }
})()
    .catch((e) => $.notifyMsg.push(e.message || e))
    .finally(async () => {
        if ($.barkKey) {
            await BarkNotify($, $.barkKey, $.name, $.notifyMsg.join('\n'));
        }
        await SendMsg($.notifyMsg.join('\n'));
        $.done();
    });

/** --------------------------------辅助函数区域------------------------------------------- */

function DoubleLog(data) {
    if (data) {
        console.log(`${data}`);
        $.notifyMsg.push(`${data}`);
    }
}

async function checkEnv() {
    if (userCookie) {
        let e = envSplitor[0];
        for (let o of envSplitor)
            if (userCookie.indexOf(o) > -1) { e = o; break; }
        for (let n of userCookie.split(e)) n && userList.push(new UserInfo(n));
        userCount = userList.length;
    } else {
        console.log("未找到CK");
        return;
    }
    return console.log(`共找到${userCount}个账号`), true;
}

function randomInt(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

async function SendMsg(message) {
    if (!message) return;
    if (Notify > 0) {
        if ($.isNode()) {
            await notify.sendNotify($.name, message);
        } else {
            $.msg($.name, '', message);
        }
    } else {
        console.log(message);
    }
}

function debug(text) {
    if ($.is_debug === 'true') {
        if (typeof text === "string") console.log(text);
        else if (typeof text === "object") console.log($.toStr(text));
    }
}

/** ---------------------------------固定不动区域----------------------------------------- */

function httpRequest(options, method) { typeof (method) === 'undefined' ? ('body' in options ? method = 'post' : method = 'get') : method = method; return new Promise((resolve) => { $[method](options, (err, resp, data) => { try { if (err) { console.log(`${method}请求失败`); $.logErr(err) } else { if (data) { typeof JSON.parse(data) == 'object' ? data = JSON.parse(data) : data = data; resolve(data) } else { console.log(`请求api返回数据为空，请检查自身原因`) } } } catch (e) { $.logErr(e, resp) } finally { resolve() } }) }) }
async function BarkNotify(c, k, t, b) { for (let i = 0; i < 3; i++) { console.log(`🔷Bark notify >> Start push (${i + 1})`); const s = await new Promise((n) => { c.post({ url: 'https://api.day.app/push', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t, body: b, device_key: k, ext_params: { group: t } }) }, (e, r, d) => r && r.status == 200 ? n(1) : n(d || e)) }); if (s === 1) { console.log('✅Push success!'); break } else { console.log(`❌Push failed! >> ${s.message || s}`) } } };
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, a) => { s.call(this, t, (t, s, r) => { t ? a(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } getEnv() { return "undefined" != typeof $environment && $environment["surge-version"] ? "Surge" : "undefined" != typeof $environment && $environment["stash-version"] ? "Stash" : "undefined" != typeof module && module.exports ? "Node.js" : "undefined" != typeof $task ? "Quantumult X" : "undefined" != typeof $loon ? "Loon" : "undefined" != typeof $rocket ? "Shadowrocket" : void 0 } isNode() { return "Node.js" === this.getEnv() } isQuanX() { return "Quantumult X" === this.getEnv() } isSurge() { return "Surge" === this.getEnv() } isLoon() { return "Loon" === this.getEnv() } isShadowrocket() { return "Shadowrocket" === this.getEnv() } isStash() { return "Stash" === this.getEnv() } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const a = this.getdata(t); if (a) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, a) => e(a)) }) } runScript(t, e) { return new Promise(s => { let a = this.getdata("@chavy_boxjs_userCfgs.httpapi"); a = a ? a.replace(/\n/g, "").trim() : a; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [i, o] = a.split("@"), n = { url: `http://${o}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": i, Accept: "*/*" }, timeout: r }; this.post(n, (t, e, a) => s(a)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), a = !s && this.fs.existsSync(e); if (!s && !a) return {}; { const a = s ? t : e; try { return JSON.parse(this.fs.readFileSync(a)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), a = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : a ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const a = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of a) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, a) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[a + 1]) >> 0 == +e[a + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, a] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, a, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, a, r] = /^@(.*?)\.(.*?)$/.exec(e), i = this.getval(a), o = a ? "null" === i ? null : i || "{}" : "{}"; try { const e = JSON.parse(o); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), a) } catch (e) { const i = {}; this.lodash_set(i, r, t), s = this.setval(JSON.stringify(i), a) } } else s = this.setval(t, e); return s } getval(t) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.read(t); case "Quantumult X": return $prefs.valueForKey(t); case "Node.js": return this.data = this.loaddata(), this.data[t]; default: return this.data && this.data[t] || null } } setval(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.write(t, e); case "Quantumult X": return $prefs.setValueForKey(t, e); case "Node.js": return this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0; default: return this.data && this.data[e] || null } } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { switch (t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"], delete t.headers["content-type"], delete t.headers["content-length"]), t.params && (t.url += "?" + this.queryStr(t.params)), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, a) => { !t && s && (s.body = a, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, a) }); break; case "Quantumult X": this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: a, headers: r, body: i, bodyBytes: o } = t; e(null, { status: s, statusCode: a, headers: r, body: i, bodyBytes: o }, i, o) }, t => e(t && t.error || "UndefinedError")); break; case "Node.js": let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: a, statusCode: r, headers: i, rawBody: o } = t, n = s.decode(o, this.encoding); e(null, { status: a, statusCode: r, headers: i, rawBody: o, body: n }, n) }, t => { const { message: a, response: r } = t; e(a, r, r && s.decode(r.rawBody, this.encoding)) }) } } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; switch (t.body && t.headers && !t.headers["Content-Type"] && !t.headers["content-type"] && (t.headers["content-type"] = "application/x-www-form-urlencoded"), t.headers && (delete t.headers["Content-Length"], delete t.headers["content-length"]), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient[s](t, (t, s, a) => { !t && s && (s.body = a, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, a) }); break; case "Quantumult X": t.method = s, this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: a, headers: r, body: i, bodyBytes: o } = t; e(null, { status: s, statusCode: a, headers: r, body: i, bodyBytes: o }, i, o) }, t => e(t && t.error || "UndefinedError")); break; case "Node.js": let a = require("iconv-lite"); this.initGotEnv(t); const { url: r, ...i } = t; this.got[s](r, i).then(t => { const { statusCode: s, statusCode: r, headers: i, rawBody: o } = t, n = a.decode(o, this.encoding); e(null, { status: s, statusCode: r, headers: i, rawBody: o, body: n }, n) }, t => { const { message: s, response: r } = t; e(s, r, r && a.decode(r.rawBody, this.encoding)) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let a = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in a) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? a[e] : ("00" + a[e]).substr(("" + a[e]).length))); return t } queryStr(t) { let e = ""; for (const s in t) { let a = t[s]; null != a && "" !== a && ("object" == typeof a && (a = JSON.stringify(a)), e += `${s}=${a}&`) } return e = e.substring(0, e.length - 1), e } msg(e = t, s = "", a = "", r) { const i = t => { switch (typeof t) { case void 0: return t; case "string": switch (this.getEnv()) { case "Surge": case "Stash": default: return { url: t }; case "Loon": case "Shadowrocket": return t; case "Quantumult X": return { "open-url": t }; case "Node.js": return }case "object": switch (this.getEnv()) { case "Surge": case "Stash": case "Shadowrocket": default: { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } case "Loon": { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } case "Quantumult X": { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl, a = t["update-pasteboard"] || t.updatePasteboard; return { "open-url": e, "media-url": s, "update-pasteboard": a } } case "Node.js": return }default: return } }; if (!this.isMute) switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: $notification.post(e, s, a, i(r)); break; case "Quantumult X": $notify(e, s, a, i(r)); break; case "Node.js": }if (!this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), a && t.push(a), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: this.log("", `❗️${this.name}, 错误!`, t); break; case "Node.js": this.log("", `❗️${this.name}, 错误!`, t.stack) } } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; switch (this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: $done(t); break; case "Node.js": process.exit(1) } } }(t, e) }
