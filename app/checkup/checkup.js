/**
 * Cookie 体检 · 一条通知列出哪些签到脚本需要重新抓 Cookie
 *
 * 体检:汇总各签到脚本最近一次运行结果;cron 每天一次,也可随时手动运行
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-10-16
 *
 * ===== Loon =====
 * [Script]
 * cron "0 12 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/checkup/checkup.js") with tag="Cookie 体检", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png"
 *
 * ===== Surge =====
 * [Script]
 * Cookie 体检 = type=cron,cronexp=0 12 * * *,timeout=30,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/checkup/checkup.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png
 *
 * ===== Quantumult X =====
 * [task_local]
 * 0 12 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/checkup/checkup.js, tag=Cookie 体检, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: Cookie 体检
 *       cron: '0 12 * * *'
 *       timeout: 30
 * script-providers:
 *   Cookie 体检:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/checkup/checkup.js
 *     interval: 86400
 */

const $ = new Env("Cookie 体检");

const SCRIPT_VERSION = "2026-10-16.r1"; // 改一次 +1,确认拉到最新版
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

const cookie = [], fail = [];
let ok = 0;
// 签到合集插件会传入各脚本开关,只报告打开的脚本
const enabled = typeof $argument === "object" && $argument ? $argument : null;
for (const [name, key] of SCRIPTS) {
    if (enabled && enabled[key.replace(/_status$/, "")] !== true) continue;
    let r;
    try { r = JSON.parse($.getdata(key) || "null"); } catch (e) { r = null; }
    if (!r) continue;
    const label = `${name}${day(r.t) === day(Date.now()) ? "" : `(${day(r.t)})`}`; // 不是今天的结果标上日期
    if (r.s === "ok") ok++;
    else if (r.s === "cookie") cookie.push(label);
    else fail.push(`${label}:${r.msg}`);
}

const bad = cookie.length + fail.length;
const lines = [];
if (cookie.length) lines.push(`需重新抓取:${cookie.join("、")}`);
if (fail.length) lines.push(`签到失败:\n${fail.join("\n")}`);
if (!ok && !bad) lines.push("暂无记录,签到脚本运行一次后会自动登记");
$.msg($.name, bad ? `⚠️ ${bad} 个需要处理,${ok} 个正常` : ok ? `✅ 全部正常(${ok} 个)` : "", lines.join("\n"));
$.done();

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
