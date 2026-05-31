/**
 * 米游社多游戏自动签到
 *
 * 支持游戏:原神、星穹铁道、绝区零、崩坏3 (国服)
 *
 * 流程:
 *   1. 抓 cookie 时已把游戏角色列表从 stoken 响应里抠出来本地存(绕过 DS 校验)
 *   2. cron 跑时,用 web cookie + 抓到的 web headers 模板,逐个游戏调 luna info / sign
 *
 * @Refactored: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-23
 *
 * 【为什么不做米游币任务】
 * 2026-05-22 后米哈游官方将米游币每日任务砍到只剩"打卡 +30",
 * 浏览/点赞/分享接口已下线,米游币日上限从 110 降至 50。
 * 唯一剩下的打卡用 v2 DS,body 固定 {"gids":N} 触发服务器重放检测,
 * 自动化无解,请在 APP 米游币页面手动点一次(1 秒)。
 *
 * 【BoxJS 配置参数】
 * - mhy_delete_cookie:  true 时清空已存储的 cookie
 * - mhy_req_interval:   游戏间签到间隔毫秒数(默认 2000)
 * - mhy_games:          要签到的 game_biz,逗号分隔,留空 = 全部绑定游戏
 *                       可选: hk4e_cn,hkrpg_cn,nap_cn,bh3_cn
 */

const $ = new Env("米游社");

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
