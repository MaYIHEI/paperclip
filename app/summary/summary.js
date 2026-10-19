/**
 * 签到汇总 · 一条通知看完所有签到脚本今天的结果和奖励
 *
 * 汇总:读取各签到脚本最近一次运行结果;cron 每天 11:30,也可随时手动运行
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-10-19
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

const SCRIPT_VERSION = "2026-10-19.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

// [显示名, 状态 key];没装或从未运行的脚本没有记录,自动跳过
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
    ["百度网盘", "baidunetdisk_status"],
    ["徕芬", "laifen_status"],
    ["泡泡玛特", "ppmt_status"],
    ["途虎养车", "tuhu_status"],
    ["海底捞", "haidilao_status"],
    ["惠省红包墙", "huisheng_status"],
    ["名创优品", "miniso_status"],
    ["龙德广场", "longde_status"],
    ["龙湖天街", "lhtj_status"],
    ["松山棉店", "songshan_status"],
    ["味多美", "wedome_status"],
    ["北京华联", "bhg_status"],
    ["林里", "linli_status"],
];

// 签到合集插件会传入各脚本开关,只汇总打开的脚本
const enabled = typeof $argument === "object" && $argument ? $argument : null;
const today = day(Date.now());
const cookie = [], fail = [], ok = [];
let unused = 0;
for (const [name, key] of SCRIPTS) {
    if (enabled && enabled[key.replace(/_status$/, "")] !== true) continue;
    let r;
    try { r = JSON.parse($.getdata(key) || "null"); } catch (e) { r = null; }
    if (!r) continue;
    if (r.s === "none") { unused++; continue; } // 没抓过 Cookie 或没配账号,不算问题
    const label = `${name}${day(r.t) === today ? "" : `(${day(r.t)})`}`; // 不是今天的结果标上日期
    if (r.s === "ok") ok.push(`${label} ${reward(r.msg)}`);
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
$.done();

// 成功记录里去掉「签到成功」前缀,只留奖励;没有奖励时写「今日已签」/「签到成功」
function reward(msg) {
    const m = String(msg || "").trim();
    if (/^今日已签/.test(m)) return "今日已签";
    return m.replace(/^签到成功\s*/, "") || "签到成功";
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
    this.getdata = (k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        return null;
    };
    this.done = (v = {}) => { if (typeof $done !== "undefined") $done(v); };
}
