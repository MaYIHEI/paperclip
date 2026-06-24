/**
 * 百度网盘 · 金币中心每日签到,得金币 + 成长值,支持连签奖励
 *
 * 抓取:打开百度网盘 APP →「我的」→「金币中心 / 签到」页面停留 1 秒,抓 Cookie
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
 * http-request ^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist tag=百度网盘 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidupan/baidupan.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidupan.png
 * cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidupan/baidupan.js, tag=百度网盘签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidupan.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = pan.baidu.com
 * [Script]
 * 百度网盘 Cookie = type=http-request,pattern=^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidupan/baidupan.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidupan.png
 * 百度网盘签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidupan/baidupan.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidupan.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = pan.baidu.com
 * [rewrite_local]
 * ^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidupan/baidupan.js
 * [task_local]
 * 15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidupan/baidupan.js, tag=百度网盘签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidupan.png, enabled=true
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
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidupan/baidupan.js
 *     interval: 86400
 */

const $ = new Env("百度网盘");

const SCRIPT_VERSION = "2026-06-24.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = 'baidupan_data';
const BASE   = 'https://pan.baidu.com/coins/taskcenter';

// 「每日签到领奖」任务标识(活动级常量,所有账号一致;活动改版失效就重抓对照)
const DAILY_TASK_ID = '7268916321758720';
const TASK_FROM     = 'task_sys_daily';
const IS_GROWTH     = '0';

// 抓取时要随 Cookie 一起存下来的设备参数(都来自签到页 URL,非签名,过期不了)
const DEV_KEYS = ['version', 'channel', 'app', 'caller', 'clienttype',
                  'cuid', 'devuid', 'z', 'aid', 'idfa', 'idfv'];

// ─── 入口 ────────────────────────────────────────────────────────────────────
if (typeof $request !== "undefined") {
    getCookie();
    $.done();
} else {
    (async () => {
        if (JSON.parse($.getdata("baidupan_clear") || "false")) {
            $.setdata("", CK_KEY);
            $.setdata("false", "baidupan_clear");
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
// 触发条件: 打开网盘「金币中心 / 签到」页,signinlist 请求带完整 Cookie(BDUSS/STOKEN)+ 设备参数
function getCookie() {
    const cookie = normalizeCookie(headerVal('cookie'));
    if (!cookie || !/BDUSS=/.test(cookie)) {
        $.msg($.name, '⚠️ 未抓到有效 Cookie',
            '请确认已开启 MITM 并打开网盘「我的 → 金币中心 / 签到」页');
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

    $.setdata(JSON.stringify({ cookie, dev }), CK_KEY);
    const uid = (cookie.match(/BDUSS=([^;]{0,8})/) || [])[1] || '';
    $.msg($.name, '✅ 百度网盘 Cookie 获取成功',
        `BDUSS: ${uid}…\ncuid: ${maskToken(dev.cuid)}`);
}

// ─── 签到主逻辑 ──────────────────────────────────────────────────────────────
async function main() {
    const raw = $.getdata(CK_KEY);
    if (!raw) {
        $.msg($.name, '🚫 缺少 Cookie',
            '请先开启重写规则,打开网盘「我的 → 金币中心 / 签到」页面');
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
            `连签 ${ld.signin_days || 0} 天${await coinsTail(ck)}`);
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

    const days = (r.data && r.data.signin_days) || ld.signin_days || 0;
    $.msg($.name, '✅ 百度网盘签到成功', `连签 ${days} 天${await coinsTail(ck)}`);
}

// 拼「金币余额」尾巴(失败不影响主结果)
async function coinsTail(ck) {
    try {
        const home = await call('home', ck, false);
        const bal = home && home.data && home.data.points_balance;
        if (bal != null) return ` · 金币余额 ${bal}`;
    } catch (e) {
        debug('查金币余额异常,忽略: ' + e);
    }
    return '';
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
            headers: {
                'Host':             'pan.baidu.com',
                'Accept':           'application/json, text/plain, */*',
                'Accept-Language':  'zh-CN,zh-Hans;q=0.9',
                'X-Requested-With': 'XMLHttpRequest',
                'Sec-Fetch-Site':   'same-origin',
                'Sec-Fetch-Mode':   'cors',
                'Sec-Fetch-Dest':   'empty',
                'Referer':          'https://pan.baidu.com/operation/activitys/taskSystem/main',
                'User-Agent':       'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) ' +
                                    'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;netdisk;' +
                                    '13.27.5;iPhone14ProMax;ios-iphone;26.1;zh_CN;JSbridge4.4.2;jointBridge;1.1.0;',
                'Cookie':           ck.cookie,
            },
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

// 调试日志:BoxJS 设 baidupan_debug=true 才打印接口原始响应
function debug(content) {
    if (($.getdata("baidupan_debug") || "false") !== "true") return;
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
