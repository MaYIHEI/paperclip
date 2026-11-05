/**
 * 签到汇总 · 一条通知看完所有签到脚本今天的结果和奖励
 *
 * 汇总:读取登记在 checkin_registry 里的各签到脚本最近一次结果;cron 每天 11:30,也可随时手动运行
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-11-05
 *
 * ===== Loon =====
 * [Script]
 * cron "30 11 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/summary/summary.js") with tag="签到汇总", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-checkin.png"
 *
 * ===== Surge =====
 * [Script]
 * 签到汇总 = type=cron,cronexp=30 11 * * *,timeout=30,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/summary/summary.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-checkin.png
 *
 * ===== Quantumult X =====
 * [task_local]
 * 30 11 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/summary/summary.js, tag=签到汇总, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-checkin.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 签到汇总
 *       cron: '30 11 * * *'
 *       timeout: 30
 * script-providers:
 *   签到汇总:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/summary/summary.js
 *     interval: 86400
 */

const $ = new Env("Paperclip 签到汇总");

const SCRIPT_VERSION = "2026-11-05.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

// 本仓库脚本 [显示名, 状态 key]:登记索引里还没有它们时兜底;没装或从未运行的脚本没有记录,自动跳过
const SCRIPTS = [
    ["微博超话", "weibotalk_status"],
    ["腾讯视频", "tenvideo_status"],
    ["米游社", "mihoyo_status"],
    ["一点万象", "newmixc_status"],
    ["小米商城", "mishop_status"],
    ["小米抽奖", "milottery_status"],
    ["小米有品", "youpin_status"],
    ["龙湖天街 App", "lhtj_app_status"],
    ["QQ音乐", "qqmusic_status"],
    ["万达电影", "wanda_status"],
    ["听听FM", "tingtingfm_status"],
    ["WPS", "wps_status"],
    ["扫描全能王", "camscanner_status"],
    ["追觅", "dreame_status"],
    ["灵狐灵购", "linghu_status"],
    ["NodeSeek", "nodeseek_status"],
    ["123社区", "pan1_status"],
    ["AgentRouter", "agentrouter_status"],
    ["网上国网", "sgcc_status"],
    ["中国移动", "cmcc_status"],
    ["小黑盒", "heybox_status"],
    ["百度网盘", "baidunetdisk_status"],
    ["徕芬", "laifen_status"],
    ["泡泡玛特", "ppmt_status"],
    ["途虎养车", "tuhu_status"],
    ["海底捞", "haidilao_status"],
    ["惠省红包墙", "huisheng_status"],
    ["名创优品", "miniso_status"],
    ["龙德广场", "longde_status"],
    ["龙湖天街", "lhtj_status"],
    ["味多美", "wedome_status"],
    ["北京华联", "bhg_status"],
    ["林里", "linli_status"],
];

// 签到状态协议 v1:各脚本把自己登记在 checkin_registry({状态 key: {name, author}}),这里按索引发现脚本
let registry = {};
try { registry = JSON.parse($.getdata("checkin_registry") || "{}") || {}; } catch (e) {}
const own = new Map(SCRIPTS.map(([name, key]) => [key, name]));
const keys = [...new Set([...own.keys(), ...Object.keys(registry)])];

// 数据地址:请求 http://1.1.1.1/checkin/all 时返回索引和全部签到状态,只读,不受开关影响,不发通知
if (typeof $request !== "undefined") {
    const status = {};
    for (const key of keys) {
        try { const r = JSON.parse($.getdata(key) || "null"); if (r) status[key] = r; } catch (e) {}
    }
    $.done({ response: { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ v: 1, t: Date.now(), registry, status }) } });
} else {
    summarize();
    pushUpdates().finally(() => $.done());
}

function summarize() {
    // 签到合集插件会传入本仓库各脚本开关,只汇总打开的;别的作者登记的脚本不受开关影响
    const enabled = typeof $argument === "object" && $argument ? $argument : null;
    const today = day(Date.now());
    const cookie = [], fail = [], ok = [];
    let unused = 0;
    for (const key of keys) {
        if (enabled && own.has(key) && enabled[key.replace(/_status$/, "")] !== true) continue;
        let r;
        try { r = JSON.parse($.getdata(key) || "null"); } catch (e) { r = null; }
        if (!r) continue;
        if (r.s === "none") { unused++; continue; } // 没抓过 Cookie 或没配账号,不算问题
        const name = (registry[key] && registry[key].name) || r.name || own.get(key) || key;
        const label = `${name}${day(r.t) === today ? "" : `(${day(r.t)})`}`; // 不是今天的结果标上日期
        if (r.s === "ok") ok.push(`${label} ${reward(r.msg)}${assetText(r)}`);
        else if (r.s === "cookie") cookie.push(label);
        else fail.push(`${label}(${r.msg})`);
    }

    const counts = [ok.length && `✅ ${ok.length} 成功`, cookie.length && `⚠️ ${cookie.length} 需重抓`, fail.length && `❌ ${fail.length} 失败`].filter(Boolean);
    const lines = [];
    if (cookie.length) lines.push(`需重新抓取:${cookie.join("、")}`);
    if (fail.length) lines.push(`失败:${fail.join("、")}`);
    lines.push(...ok);
    if (unused) lines.push(`未使用 ${unused} 个`);
    if (!lines.length) lines.push("暂无记录,签到脚本运行一次后会自动登记");
    $.msg($.name, counts.join(" · "), lines.join("\n"));
}

// ===== 推送给 Scripting 桌面小组件和实时活动(签到合集插件里填了推送密钥才做) =====
// 失败只记日志,不重试,下次运行再发;幂等 key = 日期 + 动作 + 内容摘要,同一份内容重发不会重复扣每日额度
async function pushUpdates() {
    const arg = typeof $argument === "object" && $argument ? $argument : {};
    const auth = String(arg.push_key || "").trim();
    if (!auth || typeof $httpClient === "undefined") return;
    const date = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 北京日期
    let saved = {};
    try { saved = JSON.parse($.getdata("checkin_push") || "{}") || {}; } catch (e) {}
    if (saved.date !== date) saved = { date, activity: saved.activity, reqs: {} }; // reqs 只留当天发过的请求体
    const st = liveState();
    const digest = hash(JSON.stringify(Object.assign({}, st, { t: 0 })));
    const send = async (path, key, build) => {
        if (!saved.reqs[key]) {
            const body = await build();
            if (!body) return { ok: false };
            saved.reqs[key] = Object.assign(body, { idempotency_key: key });
        }
        $.setdata(JSON.stringify(saved), "checkin_push"); // 先存再发,重发时请求体不变
        const r = await pushCall(auth, path, saved.reqs[key]);
        if (!r.ok) $.log(`[push] ${path} 失败: ${r.code}`);
        return r;
    };

    for (const id of String(arg.widget_targets || "").split(",").map((x) => x.trim()).filter(Boolean)) {
        await send(`/widget-targets/${encodeURIComponent(id)}/reload`, `${date}:reload:${id}:${digest}`, async () => ({}));
    }

    const startTarget = String(arg.activity_start_target || "").trim();
    const version = String(arg.template_version || "").trim();
    if (!startTarget || !version) return $.setdata(JSON.stringify(saved), "checkin_push");
    let act = saved.activity;
    if (act && act.date !== date) { // 跨天:先结束昨天的,再开新的
        await send(`/activities/${encodeURIComponent(act.id)}/end`, `${date}:end:${act.id}`, async () => ({ dismiss_at: new Date().toISOString() }));
        act = saved.activity = null;
    }
    if (!act) {
        const alert = { title: "签到完成", body: `${st.done}/${st.total}${st.issueCount ? ` · ${st.issueCount} 个需处理` : ""}` };
        const r = await send(`/start-targets/${encodeURIComponent(startTarget)}/start`, `${date}:start:${digest}`, async () => ({ template_version: version, state: st, alert }));
        if (r.ok && r.data && r.data.target_id) saved.activity = { id: r.data.target_id, date, digest };
    } else if (act.digest !== digest) { // 内容和上次送达的一样就不再更新
        const path = `/activities/${encodeURIComponent(act.id)}`;
        const r = await send(`${path}/update`, `${date}:update:${digest}`, async () => {
            const cur = await pushCall(auth, `${path}/state`);
            if (!cur.ok || !cur.data) { $.log(`[push] 读取实时活动状态失败: ${cur.code}`); return null; }
            return { state: st, expected_revision: cur.data.revision };
        });
        if (r.ok) act.digest = digest;
    }
    $.setdata(JSON.stringify(saved), "checkin_push");
}

// 实时活动的状态,口径和小组件一致:只算 7 天内有更新的 ok/cookie/fail;需处理按需重抓 → 失败排,最多 3 条
function liveState() {
    const now = Date.now(), list = [];
    for (const key of keys) {
        let r;
        try { r = JSON.parse($.getdata(key) || "null"); } catch (e) { r = null; }
        if (!r || !["ok", "cookie", "fail"].includes(r.s) || !(r.t >= now - 7 * 86400 * 1000)) continue;
        list.push({ key, r, reg: registry[key] || {} });
    }
    const today = day(now);
    const reward = list.reduce((n, e) => {
        const m = e.r.s === "ok" && day(e.r.t) === today && String(e.r.msg || "").match(/\+\s*(\d+(\.\d+)?)/);
        return n + (m ? Number(m[1]) : 0);
    }, 0);
    const issues = list.filter((e) => e.r.s !== "ok").sort((a, b) => (a.r.s === "cookie" ? 0 : 1) - (b.r.s === "cookie" ? 0 : 1));
    return {
        v: 1, t: now, done: list.filter((e) => e.r.s === "ok").length, total: list.length, reward, issueCount: issues.length,
        issues: issues.slice(0, 3).map((e) => ({ key: e.key, name: e.reg.name || e.r.name || own.get(e.key) || e.key, s: e.r.s, msg: e.r.msg, run: e.reg.run, open: e.reg.open })),
    };
}

// Scripting 远程更新 HTTP API;不传 body 是 GET。结果 {ok, data, code}
function pushCall(auth, path, body) {
    return new Promise((resolve) => {
        const opts = { url: `https://push.scripting.fun/v1/remote-updates${path}`, headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" } };
        if (body) opts.body = JSON.stringify(body);
        $httpClient[body ? "post" : "get"](opts, (err, resp, data) => {
            if (err) return resolve({ ok: false, code: String(err) });
            let j = null;
            try { j = JSON.parse(data); } catch (e) {}
            resolve(j && j.ok ? { ok: true, data: j.data } : { ok: false, code: (j && j.code) || `HTTP ${resp && resp.status}` });
        });
    });
}

// 内容摘要(FNV-1a),只用来拼幂等 key
function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0;
    return h.toString(16);
}

// 成功记录里去掉「签到成功」前缀,只留奖励;没有奖励时写「今日已签」/「签到成功」
function reward(msg) {
    const m = String(msg || "").trim();
    if (/^今日已签/.test(m)) return "今日已签";
    return m.replace(/^签到成功\s*/, "") || "签到成功";
}

// 资产数值(如「积分 735」);奖励文字里已经写了就不重复
function assetText(r) {
    return r.asset && !String(r.msg || "").includes(r.asset) ? ` · ${r.asset}` : "";
}

// 北京时间 MM-DD
function day(t) {
    return new Date(t + 8 * 3600 * 1000).toISOString().slice(5, 10);
}

function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== "undefined";
    this.isQuanX = () => typeof $task !== "undefined";
    this.isLoon = () => typeof $loon !== "undefined";
    this.log = (...a) => console.log(a.join("\n"));
    this.msg = (t = this.name, s = "", b = "") => {
        if (this.isSurge() || this.isLoon()) $notification.post(t, s, b);
        else if (this.isQuanX()) $notify(t, s, b);
        console.log(["", "====📣" + t + "====", s, b].filter(Boolean).join("\n"));
    };
    this.setdata = (v, k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.write(v, k);
        if (this.isQuanX()) return $prefs.setValueForKey(v, k);
        return false;
    };
    this.getdata = (k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        return null;
    };
    this.done = (v = {}) => { if (typeof $done !== "undefined") $done(v); };
}
