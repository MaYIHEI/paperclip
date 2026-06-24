/**
 * 百度网盘 · 每日签到,得金币 + 成长值,支持连签奖励
 *
 * 抓取:打开百度网盘 APP →「我的」→「签到」页面停留 1 秒,抓 Cookie
 * 签到:cron 定时自动签到(每日签到领奖)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-24
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

const SCRIPT_VERSION = "2026-06-24.r2"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = 'baidunetdisk_data';
const BASE   = 'https://pan.baidu.com/coins/taskcenter';

// 「每日签到领奖」任务标识(活动级常量,所有账号一致;活动改版失效就重抓对照)
const DAILY_TASK_ID = '7268916321758720';
const TASK_FROM     = 'task_sys_daily';
const IS_GROWTH     = '0';

// 会员成长值 → SVIP 等级阈值(升级到 SVIPn 所需成长值,平台稳定配置;SVIP10 满级)
const MEMBER_URL   = 'https://pan.baidu.com/rest/2.0/membership/user';
const MEMBER_APPID = '250528';
const LEVEL_THRESHOLDS = {
    2: 1000, 3: 3000, 4: 7000, 5: 15000, 6: 27000,
    7: 43000, 8: 56000, 9: 68000, 10: 100000,
};

// 抓取时要随 Cookie 一起存下来的设备参数(都来自签到页 URL,非签名,过期不了)
const DEV_KEYS = ['version', 'channel', 'app', 'caller', 'clienttype',
                  'cuid', 'devuid', 'z', 'aid', 'idfa', 'idfv'];

// 仅当历史抓取没存到 UA 时的兜底(通用串,不含任何机型/版本/个人痕迹;正常都用现场抓的 ck.ua)
const FALLBACK_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS like Mac OS X) ' +
                    'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;netdisk;';

// ─── 入口 ────────────────────────────────────────────────────────────────────
if (typeof $request !== "undefined") {
    getCookie();
    $.done();
} else {
    (async () => {
        if (JSON.parse($.getdata("baidunetdisk_clear") || "false")) {
            $.setdata("", CK_KEY);
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
// 触发条件: 打开网盘「我的 → 签到」页,signinlist 请求带完整 Cookie(BDUSS/STOKEN)+ 设备参数
function getCookie() {
    const cookie = normalizeCookie(headerVal('cookie'));
    if (!cookie || !/BDUSS=/.test(cookie)) {
        $.msg($.name, '⚠️ 未抓到有效 Cookie',
            '请确认已开启 MITM 并打开网盘「我的 → 签到」页');
        return;
    }

    // 设备参数从签到页 URL query 里取(z = 设备 GID、cuid、devuid 等,服务端按 Cookie 鉴权)
    const q = parseQuery($request.url);
    const dev = {};
    for (const k of DEV_KEYS) if (q[k] != null) dev[k] = q[k];
    if (!dev.cuid || !dev.devuid) {
        $.msg($.name, '⚠️ 设备参数不全', '请在签到页面多停留一会儿再试');
        return;
    }

    // UA 同样现场抓、随 Cookie 存(含客户端版本/机型,脚本里不写死任何个人/设备痕迹)
    const ua = headerVal('user-agent');

    $.setdata(JSON.stringify({ cookie, dev, ua }), CK_KEY);
    const uid = (cookie.match(/BDUSS=([^;]{0,8})/) || [])[1] || '';
    $.msg($.name, '✅ 百度网盘 Cookie 获取成功',
        `BDUSS: ${uid}…\ncuid: ${maskToken(dev.cuid)}`);
}

// ─── 签到主逻辑 ──────────────────────────────────────────────────────────────
async function main() {
    const raw = $.getdata(CK_KEY);
    if (!raw) {
        $.msg($.name, '🚫 缺少 Cookie',
            '请先开启重写规则,打开网盘「我的 → 签到」页面');
        return;
    }

    let ck;
    try {
        ck = JSON.parse(raw);
    } catch (e) {
        $.msg($.name, '🚫 Cookie 解析失败', '请清空后重新触发抓取');
        return;
    }
    if (!ck.cookie || !ck.dev) {
        $.msg($.name, '🚫 Cookie 不完整', '请重新打开签到页抓取');
        return;
    }

    // 1. 查签到状态(同时验证 Cookie 是否还有效)
    const list = await call('signinlist', ck, true);
    if (!list || list.errno !== 0) {
        const err = list ? `errno ${list.errno}` : '无响应';
        $.msg($.name, '❌ 状态查询失败',
            `${err}\n(若 Cookie 已失效,请重新打开网盘签到页抓取)`);
        return;
    }
    const ld = list.data || {};
    if (ld.signed_today === 1) {
        $.msg($.name, '✨ 今日已签到',
            `连签 ${ld.signin_days || 0} 天${await growthTail(ck)}`);
        return;
    }

    // 2. 执行签到
    const r = await call('signin', ck, true);
    if (!r || r.errno !== 0) {
        const err = r ? `errno ${r.errno}${r.error ? ' ' + r.error : ''}` : '无响应';
        $.msg($.name, '❌ 签到失败',
            `${err}\n(若提示登录失效,请重新抓 Cookie)`);
        return;
    }

    // 今日签到送的成长值(签到日历里今天那格的成长值奖励,type 3)
    const gain = signinGrowth(ld);
    const head = gain ? `签到 +${gain} 成长值` : '签到成功';
    $.msg($.name, '✅ 百度网盘签到成功', `${head}${await growthTail(ck)}`);
}

// 从签到日历里取今日签到送的成长值(type 3 = 成长值,type 10 = 金币)
function signinGrowth(d) {
    try {
        const days = d.signin_days;
        const today = (d.signin_list || []).find(x => x.day === days);
        const g = today && (today.prize || []).find(p => p.type === 3);
        return g ? g.unit : 0;
    } catch (e) {
        return 0;
    }
}

// 拼「会员成长值 / 等级 / 距下一级」尾巴(签到主要是为了升级,失败不影响主结果)
async function growthTail(ck) {
    try {
        const m = await queryMember(ck);
        const d = m && m.level_info;
        if (d && d.current_level != null) {
            const L = d.current_level, V = d.current_value;
            let t = ` · SVIP${L} 成长值 ${V}`;
            const next = LEVEL_THRESHOLDS[L + 1];
            if (next != null && V != null) t += ` · 距 SVIP${L + 1} 还差 ${next - V}`;
            else t += ' · 已满级';
            return t;
        }
    } catch (e) {
        debug('查成长值异常,忽略: ' + e);
    }
    return '';
}

// 查会员成长值 + 等级(POST membership/user?method=query,鉴权同样靠 Cookie)
function queryMember(ck) {
    return new Promise((resolve) => {
        const params = {
            ...ck.dev,
            app_id: MEMBER_APPID,
            method: 'query',
            time:   String(Math.floor(Date.now() / 1000)),
            rand:   randHex(),
            rand2:  randHex(),
        };
        const opts = {
            url: `${MEMBER_URL}?${buildQuery(params)}`,
            headers: baseHeaders(ck),
            body: '',
            timeout: 10000,
        };
        $.post(opts, (err, _resp, data) => {
            if (err) { debug(`[member] 错误: ${JSON.stringify(err)}`); resolve(null); return; }
            try { resolve(JSON.parse(data)); }
            catch (e) { debug(`[member] 解析失败: ${String(data).slice(0, 200)}`); resolve(null); }
        });
    });
}

// ─── 调一次 taskcenter 接口 ──────────────────────────────────────────────────
// withTask=true 的接口(signin/signinlist)需要带签到任务参数
function call(endpoint, ck, withTask) {
    return new Promise((resolve) => {
        const now = String(Math.floor(Date.now() / 1000));
        const params = {
            ...ck.dev,
            time:      now,
            rand:      randHex(),   // 防缓存随机串(非签名,服务端不校验)
            rand2:     randHex(),
            themeinfo: '0',
        };
        if (withTask) {
            params.task_id     = DAILY_TASK_ID;
            params.task_id_str = DAILY_TASK_ID;
            params.task_from   = TASK_FROM;
            params.is_growth   = IS_GROWTH;
        }

        const opts = {
            url: `${BASE}/${endpoint}?${buildQuery(params)}`,
            headers: baseHeaders(ck),
            timeout: 10000,
        };

        debug(`[${endpoint}] time=${now}`);
        $.get(opts, (err, _resp, data) => {
            if (err) {
                debug(`[${endpoint}] 错误: ${JSON.stringify(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                debug(`[${endpoint}] 响应解析失败: ${String(data).slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
// pan.baidu.com 通用请求头(回放现场抓的 UA + Cookie)
function baseHeaders(ck) {
    return {
        'Host':             'pan.baidu.com',
        'Accept':           'application/json, text/plain, */*',
        'Accept-Language':  'zh-CN,zh-Hans;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Site':   'same-origin',
        'Sec-Fetch-Mode':   'cors',
        'Sec-Fetch-Dest':   'empty',
        'Referer':          'https://pan.baidu.com/operation/activitys/taskSystem/main',
        'User-Agent':       ck.ua || FALLBACK_UA,
        'Cookie':           ck.cookie,
    };
}

function buildQuery(obj) {
    return Object.keys(obj)
        .map(k => `${k}=${encodeURIComponent(obj[k])}`)
        .join('&');
}

function parseQuery(url) {
    const out = {};
    const i = String(url).indexOf('?');
    if (i < 0) return out;
    for (const seg of url.slice(i + 1).split('&')) {
        const j = seg.indexOf('=');
        if (j < 0) continue;
        try { out[seg.slice(0, j)] = decodeURIComponent(seg.slice(j + 1)); }
        catch (e) { out[seg.slice(0, j)] = seg.slice(j + 1); }
    }
    return out;
}

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

function randHex() {
    let s = '';
    for (let i = 0; i < 40; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
}

function maskToken(s) {
    if (!s || s.length < 12) return '***';
    return s.slice(0, 6) + '...' + s.slice(-4);
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
