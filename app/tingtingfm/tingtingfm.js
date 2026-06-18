/**
 * 听听FM · 听听FM APP「任务中心」每日签到，领成长值 + 金币
 *
 * 抓取:打开听听FM APP →「我的」→「任务中心」，停留 1 秒触发 /sns/app 抓 Cookie
 * 签到:cron 用抓到的会话密钥换 token，再调每日签到任务(task=2)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-18
 *
 * ===== Loon =====
 * [MITM]
 * hostname = xunting.vbegin.com.cn
 * [Script]
 * http-request ^https:\/\/xunting\.vbegin\.com\.cn\/sns\/app tag=听听FM Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png
 * cron "20 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js, tag=听听FM签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = xunting.vbegin.com.cn
 * [Script]
 * 听听FM Cookie = type=http-request,pattern=^https:\/\/xunting\.vbegin\.com\.cn\/sns\/app,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png
 * 听听FM签到 = type=cron,cronexp=20 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = xunting.vbegin.com.cn
 * [rewrite_local]
 * ^https:\/\/xunting\.vbegin\.com\.cn\/sns\/app url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js
 * [task_local]
 * 20 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js, tag=听听FM签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 听听FM签到
 *       cron: '20 9 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "xunting.vbegin.com.cn"
 *   script:
 *     - match: ^https:\/\/xunting\.vbegin\.com\.cn\/sns\/app
 *       name: 听听FM Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   听听FM签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js
 *     interval: 86400
 */

const $ = new Env("听听FM");

const SCRIPT_VERSION = "2026-06-18.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = 'tingtingfm_data';        // 存的是含 s_k 会话密钥的完整 User-Agent
const BASE   = 'https://xunting.vbegin.com.cn';
const DEBUG  = JSON.parse($.getdata('tingtingfm_debug') || 'false');

// ─── 入口 ────────────────────────────────────────────────────────────────────
if (typeof $request !== "undefined") {
    getCookie();
    $.done();
} else {
    (async () => {
        if (JSON.parse($.getdata("tingtingfm_clear") || "false")) {
            $.setdata("", CK_KEY);
            $.setdata("false", "tingtingfm_clear");
            $.msg($.name, "", "✅ Cookie 已清除，请重新抓取");
            return $.done();
        }
        try {
            await main();
        } catch (e) {
            $.msg($.name, '❌ 运行异常', String(e && e.message || e));
        } finally {
            $.done();
        }
    })();
}

// ─── 抓 Cookie ───────────────────────────────────────────────────────────────
// 触发条件: 打开听听FM APP →「我的」→「任务中心」，停留 1 秒等 /sns/app 请求发出
// 凭证就是请求 User-Agent 里的 s_k 会话密钥(无 cookie / 无鉴权头)，存完整 UA 回放
function getCookie() {
    const ua = $request.headers['user-agent'] || $request.headers['User-Agent'] || '';
    const m = ua.match(/s_k:([^;)]+)/);
    if (!m) {
        $.msg($.name, '⚠️ 未提取到会话密钥',
            '请确认已开启 MITM 并进「我的 → 任务中心」页面');
        return;
    }
    $.setdata(ua, CK_KEY);
    $.msg($.name, '✅ 听听FM Cookie 获取成功', `s_k: ${maskToken(m[1])}`);
}

// ─── 签到主逻辑 ──────────────────────────────────────────────────────────────
async function main() {
    const ua = $.getdata(CK_KEY);
    if (!ua) {
        $.msg($.name, '🚫 缺少 Cookie',
            '请先开启重写规则，打开听听FM APP 进「我的 → 任务中心」页面');
        return;
    }

    // 1. 用 s_k(在 UA 里)换取本次会话 token —— token 每次现生成、不可长期缓存
    const token = await login(ua);
    if (!token) {
        $.msg($.name, '🚫 会话密钥失效',
            's_k 已过期，请重新打开听听FM「任务中心」重抓 Cookie');
        return;
    }
    if (DEBUG) $.log(`[login] token=${maskToken(token)}`);

    // 2. 执行每日签到(task=2)。task=1=听15分钟需真实收听、task=3=分享广播，均不在此处理
    const r = await sign(token, ua, 2);
    if (DEBUG) $.log(`[sign] resp=${JSON.stringify(r).slice(0, 400)}`);

    if (!r || r.status !== 200 || r.error) {
        $.msg($.name, '❌ 签到失败', (r && r.error) ? String(r.error) : '无响应');
        return;
    }

    const data = r.data || {};
    const log  = data.logs;             // 本次新签到产生流水(含 grow/coin)；今日已签为 null
    const point = await getPoint(token, ua);
    const pointStr = point != null ? ` · 金币 ${point}` : '';

    if (log) {
        $.msg($.name, '✅ 签到成功',
            `+${log.grow || 0} 成长值 · +${log.coin || 0} 金币${pointStr}`);
    } else {
        // logs 为 null 且无 error = 今日已签(服务端幂等，不重复发放)
        $.msg($.name, '✨ 今日已签到', `成长值/金币不再重复发放${pointStr}`);
    }
}

// ─── 接口封装 ────────────────────────────────────────────────────────────────

// POST /sns/app —— 凭 UA 里的 s_k 换取本次会话 token
function login(ua) {
    return new Promise((resolve) => {
        $.post({ url: `${BASE}/sns/app`, headers: buildHeaders(ua), body: '' },
            (err, _resp, body) => {
                if (err) { $.log(`[login] 错误: ${JSON.stringify(err)}`); return resolve(null); }
                try {
                    const j = JSON.parse(body);
                    resolve(j && j.status === 200 ? j.data : null);
                } catch (e) {
                    $.log(`[login] 响应解析失败: ${String(body).slice(0, 200)}`);
                    resolve(null);
                }
            });
    });
}

// POST /api/sns/grow/daily/tasks?token=X  body: task=N
function sign(token, ua, task) {
    return new Promise((resolve) => {
        const headers = buildHeaders(ua);
        headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        $.post({
            url: `${BASE}/api/sns/grow/daily/tasks?token=${encodeURIComponent(token)}`,
            headers,
            body: `task=${task}`,
        }, (err, _resp, body) => {
            if (err) { $.log(`[sign] 错误: ${JSON.stringify(err)}`); return resolve(null); }
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                $.log(`[sign] 响应解析失败: ${String(body).slice(0, 200)}`);
                resolve(null);
            }
        });
    });
}

// GET /api/sns/app/point?token=X —— 当前金币数(仅用于通知展示，失败不影响签到)
function getPoint(token, ua) {
    return new Promise((resolve) => {
        $.get({
            url: `${BASE}/api/sns/app/point?token=${encodeURIComponent(token)}&_=${Date.now()}`,
            headers: buildHeaders(ua),
        }, (err, _resp, body) => {
            if (err) return resolve(null);
            try {
                const j = JSON.parse(body);
                resolve(j && j.status === 200 ? j.data : null);
            } catch (e) { resolve(null); }
        });
    });
}

function buildHeaders(ua) {
    return {
        'accept':          'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'zh-CN,zh-Hans;q=0.9',
        'origin':          'https://tingtingfm.vbegin.com.cn',
        'referer':         'https://tingtingfm.vbegin.com.cn/',
        'user-agent':      ua,
    };
}

function maskToken(s) {
    if (!s || s.length < 12) return '***';
    return s.slice(0, 6) + '...' + s.slice(-4);
}

// ─── Env（轻量版，兼容 Loon / Surge / QX / Stash）────────────────────────────
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
