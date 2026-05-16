/**
 * 米游社多游戏自动签到 (双 cookie 版)
 *
 * 支持游戏:原神、星穹铁道、绝区零、崩坏3 (国服)
 *
 * 流程:
 *   A. 游戏签到
 *      1. stoken cookie 调 getUserGameRolesByStoken → 拿所有绑定的游戏角色
 *      2. web cookie + 抓到的 web headers 模板,逐个游戏调 luna info / sign
 *   B. 米游币任务 (可选,默认开启)
 *      1. 打卡 (gids=2 原神) +30
 *      2. 浏览 3 个帖子 +20
 *      3. 点赞 5 次 +30 (立即取消,不影响他人)
 *      4. 分享 1 个帖子 +10
 *
 * @Refactored: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-05-13
 *
 * 【关于 DS】
 * 米游币任务接口要求 DS 头签名,2.106 版的 salt 暂时无公开来源,
 * 本脚本采用复用抓包 DS 的策略:抓到的 BBS headers 整体保存原样发送。
 * 如果实测 DS 时效校验严格,只能让用户重抓 cookie。
 *
 * 【BoxJS 配置参数】
 * - mhy_delete_cookie:  true 时清空已存储的 cookie
 * - mhy_req_interval:   游戏间签到间隔毫秒数(默认 2000)
 * - mhy_games:          要签到的 game_biz,逗号分隔,留空 = 全部绑定游戏
 *                       可选: hk4e_cn,hkrpg_cn,nap_cn,bh3_cn
 * - mhy_enable_micoin:  是否做米游币任务 (默认 true,留空也是 true)
 * - mhy_micoin_forum:   米游币任务用哪个版块拉帖子 (默认 26 原神,
 *                       可选 26/34/30/37/52 等)
 */

const $ = new Env("米游社");

$.delete_cookie = false;
$.req_interval = 2000;
$.debug = false;

const KEY_STOKEN_COOKIE   = 'mhy_stoken_cookie';
const KEY_GAME_ROLES      = 'mhy_game_roles';
const KEY_WEB_COOKIE      = 'mhy_web_cookie';
const KEY_WEB_HEADERS     = 'mhy_web_headers';
const KEY_BBS_HEADERS     = 'mhy_bbs_headers';
const KEY_SIGNIN_HEADERS  = 'mhy_signin_headers';

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

        // 米游币任务 (可选)
        if ($.enable_micoin && $.bbsHeadersStr) {
            $.log('\n🪙 开始执行米游币任务');
            // 选一个游戏角色作 game_uid/region 参数(优先原神,因为帖子默认拉原神区)
            const refRole = filtered.find(r => r.game_biz === 'hk4e_cn') || filtered[0];
            await runMicoinTasks(refRole);
        } else if ($.enable_micoin && !$.bbsHeadersStr) {
            $.log('⚠️ 已开启米游币任务但未抓到 BBS headers,跳过');
            $.message.push('⚠️ 米游币任务: 缺少 BBS headers,请抓取');
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

    // 米游币任务: 默认开启,留空也算开启
    const micoinSetting = $.getdata('mhy_enable_micoin');
    $.enable_micoin = (micoinSetting === null || micoinSetting === undefined || micoinSetting === '')
        ? true
        : JSON.parse(micoinSetting);
    $.micoin_forum = parseInt($.getdata('mhy_micoin_forum')) || 26;

    if ($.delete_cookie) {
        [KEY_STOKEN_COOKIE, KEY_GAME_ROLES, KEY_WEB_COOKIE, KEY_WEB_HEADERS, KEY_BBS_HEADERS, KEY_SIGNIN_HEADERS].forEach(k => $.setdata('', k));
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
    $.bbsHeadersStr = $.getdata(KEY_BBS_HEADERS);
    $.signinHeadersStr = $.getdata(KEY_SIGNIN_HEADERS);

    const missing = [];
    if (!$.gameRolesStr) missing.push('角色列表');
    if (!$.webCookie || !$.webHeadersStr) missing.push('web 签到 cookie');

    if (missing.length > 0) {
        $.msg(
            '米游社',
            `🚫 缺少 ${missing.join(' + ')}`,
            '请开启 cookie 抓取脚本,然后:\n1️⃣ 打开米游社 APP "我的" 页面\n2️⃣ 进任一游戏签到页面手动签到一次\n3️⃣ (可选) 进米游币页面抓 BBS headers\n4️⃣ (可选) 在米游币页面点一次打卡'
        );
        return false;
    }

    try {
        $.gameRoles = JSON.parse($.gameRolesStr);
        $.webHeaders = JSON.parse($.webHeadersStr);
        if ($.bbsHeadersStr) {
            $.bbsHeaders = JSON.parse($.bbsHeadersStr);
        }
        if ($.signinHeadersStr) {
            $.signinHeaders = JSON.parse($.signinHeadersStr);
        }
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

// ============ 米游币任务 ============
//
// 接口都用 bbs-api.miyoushe.com 域 + 抓到的 BBS headers(含 DS/UA/device_fp 等)。
// DS 复用策略: 抓包时存的 DS 头是某次请求的有效签名,实测米哈游对 BBS 类
// 接口的 DS 时效校验不是太严,可以原样复用一段时间。
//
// game_uid 和 region 用 refRole 提供(默认拿原神角色作为参数源)。

// 论坛 ID 对应的打卡 gids (来自社区: bbs.mihoyo.com/community)
const FORUM_TO_GIDS = {
    1: 1,   // 崩坏3
    26: 2,  // 原神
    30: 3,  // 崩坏2
    37: 4,  // 未定事件簿
    34: 5,  // 大别野
    52: 6,  // 星穹铁道
    57: 8,  // 绝区零
};

async function runMicoinTasks(refRole) {
    try {
        // 1. 打卡 (用 v2 DS headers)
        if ($.signinHeaders) {
            await micoinSignIn(2, '原神');
            await sleep(1500);
        } else {
            $.message.push(`💡 打卡跳过(未抓 v2 headers,请在 APP 米游币页面手动点一次打卡触发抓取)`);
        }

        // 2. 拉帖子列表
        const forumId = $.micoin_forum;
        const posts = await fetchRecentPostList(forumId);
        if (!posts || posts.length === 0) {
            $.message.push(`⚠️ 米游币: 拉取版块 ${forumId} 帖子列表失败,跳过浏览/点赞/分享`);
            return;
        }
        $.log(`📃 拉到 ${posts.length} 个帖子用于任务`);

        // 3. 浏览 3 个帖子
        await micoinViewPosts(posts.slice(0, 3), refRole);
        await sleep(1500);

        // 4. 点赞 5 个帖子 (点完立即取消)
        await micoinUpvotePosts(posts.slice(0, 5), refRole);
        await sleep(1500);

        // 5. 分享 1 个帖子
        await micoinShare(posts[0]);
    } catch (e) {
        $.log(`[米游币] 整体异常: ${e.message || e}`);
        $.message.push(`❌ 米游币任务异常: ${e.message || e}`);
    }
}

// 打卡 POST /apihub/app/api/signIn (用 v2 DS headers)
function micoinSignIn(gids, gameName) {
    return new Promise((resolve) => {
        const h = cleanHeaders($.signinHeaders);
        h['Content-Type'] = 'application/json';
        const opts = {
            url: 'https://bbs-api.miyoushe.com/apihub/app/api/signIn',
            headers: h,
            body: JSON.stringify({ gids: gids }),
        };
        $.post(opts, (err, resp, data) => {
            if (err || !resp || resp.statusCode !== 200) {
                $.failNum++;
                $.message.push(`【打卡 ${gameName}】❌ HTTP ${resp ? resp.statusCode : 'err'}`);
                resolve(); return;
            }
            try {
                const r = JSON.parse(data);
                if (r.retcode !== 0) {
                    if (/已签到|already/i.test(r.message || '')) {
                        $.alreadyNum++;
                        $.message.push(`【打卡 ${gameName}】✨ 今日已打卡`);
                    } else {
                        $.failNum++;
                        $.message.push(`【打卡 ${gameName}】❌ ${r.message}`);
                    }
                } else {
                    const pts = (r.data && r.data.points) || 0;
                    if (pts > 0) {
                        $.successNum++;
                        $.message.push(`【打卡 ${gameName}】✅ +${pts} 米游币`);
                    } else {
                        $.alreadyNum++;
                        $.message.push(`【打卡 ${gameName}】✨ 今日已打卡`);
                    }
                }
            } catch (e) {
                $.failNum++;
                $.message.push(`【打卡 ${gameName}】❌ 响应解析失败`);
            }
            resolve();
        });
    });
}

// 拉最近帖子列表 GET /painter/api/getRecentForumPostList
function fetchRecentPostList(forumId) {
    return new Promise((resolve) => {
        const h = cleanHeaders($.bbsHeaders);
        const opts = {
            url: `https://bbs-api.miyoushe.com/painter/api/getRecentForumPostList?forum_id=${forumId}&page=1&page_size=20&sort_type=1`,
            headers: h,
        };
        $.get(opts, (err, resp, data) => {
            if (err || !resp || resp.statusCode !== 200) {
                $.log(`[米游币][列表] HTTP ${resp ? resp.statusCode : 'err'}`);
                resolve(null); return;
            }
            try {
                const r = JSON.parse(data);
                if (r.retcode !== 0) {
                    $.log(`[米游币][列表] 接口错误: ${r.message}`);
                    resolve(null); return;
                }
                const list = (r.data && r.data.list) || [];
                resolve(list.map(it => (it.post && it.post.post_id)).filter(Boolean));
            } catch (e) {
                $.log(`[米游币][列表] 解析失败: ${e}`);
                resolve(null);
            }
        });
    });
}

// 浏览 3 个帖子 GET /post/api/getPostFull
async function micoinViewPosts(postIds, refRole) {
    let okCount = 0;
    for (const pid of postIds) {
        const ok = await viewOnePost(pid, refRole);
        if (ok) okCount++;
        await sleep(1500);
    }
    if (okCount === 3) {
        $.successNum++;
        $.message.push(`【浏览帖子】✅ +20 米游币 (3/3)`);
    } else {
        $.failNum++;
        $.message.push(`【浏览帖子】⚠️ 只完成 ${okCount}/3`);
    }
}

function viewOnePost(postId, refRole) {
    return new Promise((resolve) => {
        const h = cleanHeaders($.bbsHeaders);
        const url = `https://bbs-api.miyoushe.com/post/api/getPostFull?game_uid=${refRole.game_uid}&post_id=${postId}&region=${encodeURIComponent(refRole.region)}`;
        $.get({ url, headers: h }, (err, resp, data) => {
            if (err || !resp || resp.statusCode !== 200) {
                $.log(`[浏览 ${postId}] HTTP err`);
                resolve(false); return;
            }
            try {
                const r = JSON.parse(data);
                resolve(r.retcode === 0);
            } catch (e) {
                resolve(false);
            }
        });
    });
}

// 点赞 5 个帖子,每个立即取消
async function micoinUpvotePosts(postIds, refRole) {
    let okCount = 0;
    for (const pid of postIds) {
        const ok = await upvoteOnePost(pid, refRole, false);
        if (ok) okCount++;
        await sleep(1000);
        // 立即取消点赞,不污染他人
        await upvoteOnePost(pid, refRole, true);
        await sleep(1000);
    }
    if (okCount >= 5) {
        $.successNum++;
        $.message.push(`【点赞 5 次】✅ +30 米游币 (${okCount}/5)`);
    } else {
        $.failNum++;
        $.message.push(`【点赞 5 次】⚠️ 只完成 ${okCount}/5`);
    }
}

function upvoteOnePost(postId, refRole, isCancel) {
    return new Promise((resolve) => {
        const h = cleanHeaders($.bbsHeaders);
        h['Content-Type'] = 'application/json';
        const opts = {
            url: 'https://bbs-api.miyoushe.com/post/api/post/upvote',
            headers: h,
            body: JSON.stringify({
                upvote_type: 1,
                post_id: String(postId),
                is_cancel: isCancel,
                region: refRole.region,
                game_uid: String(refRole.game_uid),
            }),
        };
        $.post(opts, (err, resp, data) => {
            if (err || !resp || resp.statusCode !== 200) {
                resolve(false); return;
            }
            try {
                const r = JSON.parse(data);
                resolve(r.retcode === 0);
            } catch (e) {
                resolve(false);
            }
        });
    });
}

// 分享 1 帖 GET /apihub/api/getShareConf
function micoinShare(postId) {
    return new Promise((resolve) => {
        const h = cleanHeaders($.bbsHeaders);
        const url = `https://bbs-api.miyoushe.com/apihub/api/getShareConf?entity_id=${postId}&entity_type=1`;
        $.get({ url, headers: h }, (err, resp, data) => {
            if (err || !resp || resp.statusCode !== 200) {
                $.failNum++;
                $.message.push(`【分享帖子】❌ HTTP err`);
                resolve(); return;
            }
            try {
                const r = JSON.parse(data);
                if (r.retcode === 0) {
                    $.successNum++;
                    $.message.push(`【分享帖子】✅ +10 米游币`);
                } else {
                    $.failNum++;
                    $.message.push(`【分享帖子】❌ ${r.message}`);
                }
            } catch (e) {
                $.failNum++;
                $.message.push(`【分享帖子】❌ 响应解析失败`);
            }
            resolve();
        });
    });
}

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
