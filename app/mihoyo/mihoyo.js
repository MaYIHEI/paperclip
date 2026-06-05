/**
 * 米游社 · 米游社签到原神/星穹铁道/绝区零/崩坏3
 *
 * 抓取①:打开「米游社」APP → 进「我的」页,抓游戏角色列表(http-response,绕 stoken DS 校验)
 * 抓取②:进任意游戏签到页手动签一次,抓 cookie_token_v2 + web headers(给 luna sign 用)
 * 签到:cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-23
 *
 * ===== Loon =====
 * [MITM]
 * hostname = bbs-api.miyoushe.com, api-takumi.mihoyo.com
 * [Script]
 * http-response ^https:\/\/bbs-api\.miyoushe\.com\/(apihub|user|misc)\/ tag=米游社 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.cookie.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png
 * cron "13 6 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js, tag=米游社签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = bbs-api.miyoushe.com, api-takumi.mihoyo.com
 * [Script]
 * 米游社 Cookie = type=http-response,pattern=^https:\/\/bbs-api\.miyoushe\.com\/(apihub|user|misc)\/,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png
 * 米游社签到 = type=cron,cronexp=13 6 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = bbs-api.miyoushe.com, api-takumi.mihoyo.com
 * [rewrite_local]
 * ^https:\/\/bbs-api\.miyoushe\.com\/(apihub|user|misc)\/ url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.cookie.js
 * [task_local]
 * 13 6 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js, tag=米游社签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 米游社签到
 *       cron: '13 6 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "bbs-api.miyoushe.com"
 *     - "api-takumi.mihoyo.com"
 *   script:
 *     - match: ^https:\/\/bbs-api\.miyoushe\.com\/(apihub|user|misc)\/
 *       name: 米游社 Cookie
 *       type: response
 *       require-body: true
 * script-providers:
 *   米游社签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js
 *     interval: 86400
 */

const $ = new Env("米游社");

const SCRIPT_VERSION = "2026-05-23.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

$.delete_cookie = false;
$.req_interval = 2000;
$.debug = false;

const KEY_STOKEN_COOKIE   = 'mhy_stoken_cookie';
const KEY_GAME_ROLES      = 'mhy_game_roles';
const KEY_WEB_COOKIE      = 'mhy_web_cookie';
const KEY_WEB_HEADERS     = 'mhy_web_headers';

// 各游戏配置: act_id 来自 Womsxd/MihoyoBBSTools setting.py (国服)
const GAMES = {
    hk4e_cn:  { name: '原神',       act_id: 'e202311201442471', signgame: 'hk4e',  path: 'hk4e'  },
    hkrpg_cn: { name: '星穹铁道',   act_id: 'e202304121516551', signgame: 'hkrpg', path: 'hkrpg' },
    nap_cn:   { name: '绝区零',     act_id: 'e202406242138391', signgame: 'zzz',   path: 'zzz'   },
    bh3_cn:   { name: '崩坏3',      act_id: 'e202306201626331', signgame: 'bh3',   path: 'bh3'   },
};

(async () => {
    if (!loadSettings()) return;
    if (!loadCookies()) return;

    $.log(`🌟 开始执行,签到间隔 ${$.req_interval}ms`);
    initState();

    try {
        // 用存储的游戏角色列表 (cookie 抓取时已从 stoken 接口响应里抠出来,绕过 DS 校验)
        const roles = $.gameRoles || [];
        if (roles.length === 0) {
            $.msg('米游社', '🚫 未获取到游戏角色', '请重新抓 cookie:\n打开米游社 APP "我的" 页面');
            return;
        }
        $.log(`📊 找到 ${roles.length} 个游戏角色`);

        // 按 game_biz 过滤
        const filtered = $.games_filter.length > 0
            ? roles.filter(r => $.games_filter.includes(r.game_biz))
            : roles;
        $.log(`🎯 待签到角色: ${filtered.length} 个`);

        // 逐个签到
        for (const r of filtered) {
            const cfg = GAMES[r.game_biz];
            if (!cfg) {
                $.log(`⚠️ 不支持的游戏: ${r.game_biz}`);
                continue;
            }
            await signOne(cfg, r);
            await sleep($.req_interval);
        }
    } catch (e) {
        $.log(`❌ 执行失败: ${e.message || e}`);
        $.message.push(`❌ ${e.message || e}`);
    }

    sendSummary();
})()
.catch((e) => $.log(`❌ ${e.message || e}`))
.finally(() => $.done());


function loadSettings() {
    $.delete_cookie = JSON.parse($.getdata('mhy_delete_cookie') || $.delete_cookie);
    $.req_interval = parseInt($.getdata('mhy_req_interval')) || $.req_interval;
    const gamesStr = $.getdata('mhy_games') || '';
    $.games_filter = gamesStr.split(',').map(s => s.trim()).filter(Boolean);

    if ($.delete_cookie) {
        [KEY_STOKEN_COOKIE, KEY_GAME_ROLES, KEY_WEB_COOKIE, KEY_WEB_HEADERS].forEach(k => $.setdata('', k));
        $.setdata('false', 'mhy_delete_cookie');
        $.msg($.name, '', '✅ Cookie 已清空,请重新抓取');
        return false;
    }
    return true;
}

function loadCookies() {
    $.gameRolesStr  = $.getdata(KEY_GAME_ROLES);
    $.webCookie     = $.getdata(KEY_WEB_COOKIE);
    $.webHeadersStr = $.getdata(KEY_WEB_HEADERS);

    const missing = [];
    if (!$.gameRolesStr) missing.push('角色列表');
    if (!$.webCookie || !$.webHeadersStr) missing.push('web 签到 cookie');

    if (missing.length > 0) {
        $.msg(
            '米游社',
            `🚫 缺少 ${missing.join(' + ')}`,
            '请开启 cookie 抓取脚本,然后:\n1️⃣ 打开米游社 APP "我的" 页面\n2️⃣ 进任一游戏签到页面手动签到一次'
        );
        return false;
    }

    try {
        $.gameRoles = JSON.parse($.gameRolesStr);
        $.webHeaders = JSON.parse($.webHeadersStr);
        return true;
    } catch (e) {
        $.msg('米游社', '🚫 Cookie 解析失败', '请清空 cookie 后重新抓取');
        return false;
    }
}

function initState() {
    $.successNum = 0;
    $.failNum = 0;
    $.alreadyNum = 0;
    $.message = [];
}

// 给一个游戏角色签到
async function signOne(cfg, role) {
    const label = `${cfg.name}[${role.nickname || role.game_uid}]`;
    try {
        // 1. info 接口判断是否已签
        const info = await callLuna('GET', `/event/luna/${cfg.path}/info`, cfg, role, null);
        if (!info) {
            $.failNum++;
            $.message.push(`【${label}】❌ 查询签到状态失败`);
            return;
        }
        if (info.retcode !== 0) {
            $.failNum++;
            $.message.push(`【${label}】❌ ${info.message || 'info error'}`);
            // cookie 失效给提示
            if (info.retcode === -100 || /token|登录|登錄/.test(info.message || '')) {
                $.message.push(`💡 web cookie 可能已过期,请重抓签到页面 cookie`);
            }
            return;
        }
        const isSign = info.data && info.data.is_sign;
        const total = (info.data && info.data.total_sign_day) || 0;

        if (isSign) {
            $.alreadyNum++;
            $.message.push(`【${label}】✨ 今日已签 (累计${total}天)`);
            return;
        }

        // 2. sign 接口签到
        const signBody = {
            act_id: cfg.act_id,
            region: role.region,
            uid: role.game_uid,
            lang: 'zh-cn',
        };
        const sign = await callLuna('POST', `/event/luna/${cfg.path}/sign`, cfg, role, signBody);
        if (!sign) {
            $.failNum++;
            $.message.push(`【${label}】❌ 签到请求失败`);
            return;
        }
        if (sign.retcode !== 0) {
            $.failNum++;
            $.message.push(`【${label}】❌ ${sign.message || 'sign error'}`);
            return;
        }
        const risk = (sign.data && sign.data.risk_code) || 0;
        if (risk !== 0) {
            $.failNum++;
            $.message.push(`【${label}】⚠️ 触发风控(risk_code=${risk}),请去 APP 手动签到一次`);
            return;
        }

        // 3. home 接口拿奖励名称(签后的当天奖励 = awards[total],签前 total)
        const home = await callLuna('GET', `/event/luna/${cfg.path}/home`, cfg, role, null);
        let reward = '签到成功';
        if (home && home.retcode === 0 && home.data && Array.isArray(home.data.awards)) {
            const aw = home.data.awards[total];
            if (aw && aw.name) reward = `${aw.name} x${aw.cnt}`;
        }
        $.successNum++;
        $.message.push(`【${label}】✅ ${reward} (累计${total + 1}天)`);
    } catch (e) {
        $.failNum++;
        $.message.push(`【${label}】❌ ${e.message || e}`);
    }
}

// 通用 luna 接口调用 - 用抓到的 web headers 模板,只替换关键字段
function callLuna(method, path, cfg, role, body) {
    return new Promise((resolve) => {
        // 复用抓到的 headers,替换 cookie / signgame / Content-Type
        const h = cleanHeaders($.webHeaders);
        h['Cookie'] = $.webCookie;
        h['x-rpc-signgame'] = cfg.signgame;
        if (method === 'POST') {
            h['Content-Type'] = 'application/json;charset=utf-8';
        }

        let url = `https://api-takumi.mihoyo.com${path}`;
        if (method === 'GET') {
            const qs = `lang=zh-cn&act_id=${cfg.act_id}&region=${encodeURIComponent(role.region)}&uid=${role.game_uid}`;
            url += '?' + qs;
        }

        const opts = { url, headers: h };
        if (method === 'POST') opts.body = JSON.stringify(body);

        if ($.debug) {
            $.log(`[${method} ${path}] url=${url}`);
            if (body) $.log(`[${method} ${path}] body=${JSON.stringify(body)}`);
        }

        const cb = (err, resp, data) => {
            if (err) {
                $.log(`[${method} ${path}] 错误: ${JSON.stringify(err)}`);
                resolve(null);
                return;
            }
            if (resp && resp.statusCode !== 200) {
                $.log(`[${method} ${path}] HTTP ${resp.statusCode}: ${(data || '').substring(0, 300)}`);
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                $.log(`[${method} ${path}] 解析失败: ${e}, raw=${(data || '').substring(0, 300)}`);
                resolve(null);
            }
        };
        if (method === 'POST') $.post(opts, cb);
        else $.get(opts, cb);
    });
}

function cleanHeaders(h) {
    const blocked = ['content-length', 'host', 'connection', 'accept-encoding', 'content-type'];
    const out = {};
    Object.keys(h || {}).forEach((k) => {
        if (!blocked.includes(k.toLowerCase()) && !k.startsWith(':')) {
            out[k] = h[k];
        }
    });
    return out;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function sendSummary() {
    const total = $.successNum + $.alreadyNum + $.failNum;
    const title = `${$.name}: 成功 ${$.successNum},已签 ${$.alreadyNum},失败 ${$.failNum} (共${total})`;
    if ($.message.length === 0) {
        $.msg(title, '', '⚠️ 没有签到任何游戏,请检查 cookie 或游戏角色绑定');
        return;
    }
    $.msg(title, '', $.message.join('\n'));
}


// @Chavy Env
function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== 'undefined';
    this.isQuanX = () => typeof $task !== 'undefined';
    this.isLoon = () => typeof $loon !== 'undefined';
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
    this.get = (req, cb) => this.send(req, 'GET', cb);
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
