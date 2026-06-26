/**
 * 百度网盘 · 会员成长值每日签到 + 每日答题,助力 SVIP 升级
 *
 * 抓取:打开百度网盘 APP →「我的」→「签到 / 会员」页面停留 1 秒,抓 Cookie
 * 签到:cron 定时自动签到 + 答题(都加会员成长值)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-26
 *
 * ===== Loon =====
 * [MITM]
 * hostname = pan.baidu.com
 * [Script]
 * http-request ^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist tag=百度网盘 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png
 * cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js, tag=百度网盘签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = pan.baidu.com
 * [Script]
 * 百度网盘 Cookie = type=http-request,pattern=^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png
 * 百度网盘签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = pan.baidu.com
 * [rewrite_local]
 * ^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js
 * [task_local]
 * 15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js, tag=百度网盘签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 百度网盘签到
 *       cron: '15 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "pan.baidu.com"
 *   script:
 *     - match: ^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist
 *       name: 百度网盘 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   百度网盘签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js
 *     interval: 86400
 */

const $ = new Env("百度网盘");

const SCRIPT_VERSION = "2026-06-26.r9"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY    = 'baidunetdisk_data';
const TRACK_KEY = 'baidunetdisk_track';   // 成长值基线 {value,ts},用真实变化算"约 N 天"
const API       = 'https://pan.baidu.com';
const COMMON  = 'app_id=250528&web=5';                       // 会员成长值(WAP)系统通用参数
const REFERER = 'https://pan.baidu.com/wap/svip/growth/task';
// 通用浏览器 UA(所有用户一致、无任何个人/设备痕迹;成长值是 WAP 系统,按浏览器身份请求)
const UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// 会员成长值 → SVIP 等级阈值(升级到 SVIPn 所需成长值,平台稳定配置;SVIP10 满级)
const LEVEL_THRESHOLDS = {
    2: 1000, 3: 3000, 4: 7000, 5: 15000, 6: 27000,
    7: 43000, 8: 56000, 9: 68000, 10: 100000,
};
// 每日会员成长值(按购买的产品类型给,与等级无关;有效期内不衰减)→ 估算到 SVIP10 还要几天
const DAILY_GROWTH = {
    vip2_1m: 20, vip2_1m_auto: 20, vip2_1y: 30, vip2_1y_auto: 30,
    vip2_3m: 20, vip2_3m_auto: 20, vip2_7d_1m_auto: 20, vip2_vipv2_upgrade_svip: 20,
    vip1_1m: 5, vip1_1y: 12, vip1_3m: 10,
};

// ─── 入口 ────────────────────────────────────────────────────────────────────
if (typeof $request !== "undefined") {
    getCookie();
    $.done();
} else {
    (async () => {
        if (JSON.parse($.getdata("baidunetdisk_clear") || "false")) {
            $.setdata("", CK_KEY);
            $.setdata("", TRACK_KEY);
            $.setdata("false", "baidunetdisk_clear");
            $.msg($.name, "", "✅ Cookie 已清除，请重新抓取");
            return $.done();
        }
        try {
            await main();
        } catch (e) {
            $.msg($.name, '❌ 运行异常', String(e));
        } finally {
            $.done();
        }
    })();
}

// ─── 抓 Cookie ───────────────────────────────────────────────────────────────
// 触发条件: 打开网盘「我的 → 签到 / 会员」页,signinlist 请求带完整 Cookie(BDUSS/STOKEN)
function getCookie() {
    const cookie = normalizeCookie(headerVal('cookie'));
    if (!cookie || !/BDUSS=/.test(cookie)) {
        $.msg($.name, '⚠️ 未抓到有效 Cookie',
            '请确认已开启 MITM 并打开网盘「我的 → 签到 / 会员」页');
        return;
    }
    $.setdata(cookie, CK_KEY);
    const uid = (cookie.match(/BDUSS=([^;]{0,8})/) || [])[1] || '';
    $.msg($.name, '✅ 百度网盘 Cookie 获取成功', `BDUSS: ${uid}…`);
}

// ─── 签到主逻辑 ──────────────────────────────────────────────────────────────
async function main() {
    const cookie = $.getdata(CK_KEY);
    if (!cookie) {
        $.msg($.name, '🚫 缺少 Cookie',
            '请先开启重写规则,打开网盘「我的 → 签到 / 会员」页面');
        return;
    }

    // 1. 成长值签到
    const signRes = await api(`/rest/2.0/membership/level?${COMMON}&method=signin`, cookie);
    debug('[signin] ' + signRes.slice(0, 200));
    if (!signRes) {
        $.msg($.name, '❌ 签到失败', '无响应\n(若 Cookie 失效,请重新打开网盘签到页抓取)');
        return;
    }
    if (/("errno"|"error_code")\s*:\s*-?(6|2|110)\b/.test(signRes) || /not login|登录/.test(signRes)) {
        $.msg($.name, '🚫 登录失效', '请重新打开网盘「我的 → 签到 / 会员」页抓 Cookie');
        return;
    }
    const signPts = num(signRes, /"points"\s*:\s*(\d+)/);     // 签到加的成长值
    const signTip = signPts ? `签到 +${signPts}` : '签到已完成';

    // 2. 每日答题(答案在取题响应里直接给,回填即可,额外加成长值)
    let answerTip = '';
    let answerPts = 0;
    try {
        const q = await api(`/act/v2/membergrowv2/getdailyquestion?${COMMON}`, cookie);
        const askId  = num(q, /"ask_id"\s*:\s*(\d+)/);
        const answer = num(q, /"answer"\s*:\s*(\d+)/);
        if (askId && answer != null) {
            const a = await api(`/act/v2/membergrowv2/answerquestion?${COMMON}&ask_id=${askId}&answer=${answer}`, cookie);
            debug('[answer] ' + a.slice(0, 200));
            answerPts = num(a, /"score"\s*:\s*(\d+)/) || 0;
            answerTip = answerPts ? ` · 答题 +${answerPts}` : ' · 答题已完成';
        } else {
            answerTip = ' · 答题已完成';   // 今日无题 / 已答
        }
    } catch (e) {
        debug('答题阶段异常,忽略: ' + e);
    }

    // 3. 查会员成长值 / 等级 → 距 SVIP10 进度
    const tail = await growthTail(cookie, (signPts || 0) + answerPts);

    $.msg($.name, '✅ 百度网盘成长值签到', `${signTip}${answerTip}${tail}`);
}

// 拼「会员成长值 / 等级 / 距下一级 + 估算天数」尾巴(失败不影响主结果)
async function growthTail(cookie, todayGain) {
    try {
        const u = await api(`/rest/2.0/membership/user?${COMMON}&method=query`, cookie);
        const L = num(u, /"current_level"\s*:\s*(\d+)/);
        const V = num(u, /"current_value"\s*:\s*(\d+)/);
        if (L == null || V == null) return '';
        let t = ` · SVIP${L} 成长值 ${V}`;
        const next = LEVEL_THRESHOLDS[L + 1];
        if (next != null) {
            const gap = next - V;
            t += ` · 距 SVIP${L + 1} 还差 ${gap}`;
            const perDay = dailyRate(V, str(u, /"product_type"\s*:\s*"(.*?)"/), todayGain);
            if (perDay > 0 && gap > 0) t += `(约 ${Math.ceil(gap / perDay)} 天)`;
        } else {
            t += ' · 已满级';
        }
        return t;
    } catch (e) {
        debug('查成长值异常,忽略: ' + e);
        return '';
    }
}

// 每日成长速率:优先用「成长值真实变化 ÷ 经过天数」(涵盖 app+web+答题+会员所有来源);
// 首次跑没基线、或同日重跑(不足 ~1 天)时,退回「会员每日 + 今日所得」估算
function dailyRate(V, ptype, todayGain) {
    const now = Date.now();
    try {
        const tk = JSON.parse($.getdata(TRACK_KEY) || 'null');
        if (tk && tk.value != null && tk.ts) {
            const days = (now - tk.ts) / 86400000;
            if (days >= 0.8 && V > tk.value) return (V - tk.value) / days;   // 实测日均
        } else {
            $.setdata(JSON.stringify({ value: V, ts: now }), TRACK_KEY);     // 建立基线
        }
    } catch (e) {
        debug('成长值基线读写异常: ' + e);
    }
    return (DAILY_GROWTH[ptype] || 0) + (todayGain || 0);                    // 兜底估算
}

// ─── 调一次 pan.baidu.com 接口(GET,鉴权靠 Cookie),返回原始文本 ─────────────
function api(path, cookie) {
    return new Promise((resolve) => {
        const opts = {
            url: `${API}${path}`,
            headers: {
                'Host':             'pan.baidu.com',
                'Accept':           'application/json, text/plain, */*',
                'Accept-Language':  'zh-CN,zh-Hans;q=0.9',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer':          REFERER,
                'User-Agent':       UA,
                'Cookie':           cookie,
            },
            timeout: 10000,
        };
        $.get(opts, (err, _resp, data) => {
            if (err) { debug(`[api ${path}] 错误: ${JSON.stringify(err)}`); resolve(''); return; }
            resolve(String(data || ''));
        });
    });
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
function num(s, re) { const m = re.exec(s); return m ? parseInt(m[1], 10) : null; }
function str(s, re) { const m = re.exec(s); return m ? m[1] : ''; }

// 取请求头(大小写不敏感)
function headerVal(name) {
    const h = $request.headers || {};
    const low = name.toLowerCase();
    for (const k in h) if (k.toLowerCase() === low) return h[k];
    return '';
}

// HTTP/2 下多 cookie 头被合并时可能残留换行 + 重复 "cookie:" 前缀,清掉
function normalizeCookie(s) {
    return String(s || '')
        .replace(/\r?\n\s*cookie:\s*/gi, '; ')
        .replace(/\s+/g, ' ')
        .trim();
}

// 调试日志:BoxJS 设 baidunetdisk_debug=true 才打印接口原始响应
function debug(content) {
    if (($.getdata("baidunetdisk_debug") || "false") !== "true") return;
    $.log(`[DEBUG] ${typeof content === "string" ? content : JSON.stringify(content)}`);
}

// @Chavy Env
function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== 'undefined';
    this.isQuanX = () => typeof $task !== 'undefined';
    this.isLoon  = () => typeof $loon !== 'undefined';
    this.log = (...a) => console.log(a.join('\n'));
    this.msg = (t = this.name, s = '', b = '') => {
        if (this.isSurge() || this.isLoon()) $notification.post(t, s, b);
        else if (this.isQuanX()) $notify(t, s, b);
        console.log(['', '====📣' + t + '====', s, b].filter(Boolean).join('\n'));
    };
    this.getdata = (k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        return null;
    };
    this.setdata = (v, k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.write(v, k);
        if (this.isQuanX()) return $prefs.setValueForKey(v, k);
        return false;
    };
    this.get  = (req, cb) => this.send(req, 'GET',  cb);
    this.post = (req, cb) => this.send(req, 'POST', cb);
    this.send = (req, method, cb) => {
        if (this.isSurge() || this.isLoon()) {
            const fn = method === 'POST' ? $httpClient.post : $httpClient.get;
            fn(req, (err, resp, data) => {
                if (resp) { resp.body = data; resp.statusCode = resp.status || resp.statusCode; }
                cb(err, resp, data);
            });
        } else if (this.isQuanX()) {
            req.method = method;
            $task.fetch(req).then(
                (r) => { r.status = r.statusCode; cb(null, r, r.body); },
                (e) => cb(e.error || e, null, null)
            );
        }
    };
    this.done = (v = {}) => { if (typeof $done !== 'undefined') $done(v); };
}
