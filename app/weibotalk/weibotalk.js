/**
 * 微博超话自动签到 (双cookie版)
 *
 * 流程: 列表 cookie 拉关注超话 → 签到 cookie 逐个签到(只替换 fid 和 pageid)
 *
 * @Original: @Evilbutcher (https://github.com/evilbutcher)
 * @Original: @toulanboy (https://github.com/toulanboy/scripts)
 * @Refactored: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-05-09
 *
 * 【更新说明】
 * 适配 2026-05 后的微博 APP 版本:
 * - 关注列表接口: /2/cardlist → /2/statuses/container_timeline_topicsub (POST)
 * - 翻页机制: page → since_id (-1_2, -1_3 ...)
 * - 卡片解析: cardlistInfo.cards[0].card_group → 递归提取 card_type:8
 * - 签到接口仍是 /2/page/button,响应结构 {result, button.name, error_msg} 保持
 *
 * 关键: 签到必须用专门抓的 /2/page/button cookie,不能用列表 cookie 复用,
 * 因为 X-Validator 风控签名和请求路径强绑定,跨路径无效。
 *
 * 【BoxJS 配置参数】
 * - wb_delete_cookie: true 时清空已存储的 cookie
 * - wb_msg_max_num: 单条通知显示的超话数量(默认 30)
 * - wb_request_time: 签到间隔毫秒数(默认 700)
 */

const $ = new Env("微博超话");

$.delete_cookie = false;
$.msg_max_num = 30;
$.req_interval = 700;
$.debug = false;

const KEY_LIST_URL = 'evil_tokenurl';
const KEY_LIST_HEADERS = 'evil_tokenheaders';
const KEY_LIST_BODY = 'evil_tokenbody';
const KEY_CHECKIN_URL = 'evil_tokencheckinurl';
const KEY_CHECKIN_HEADERS = 'evil_tokencheckinheaders';

(async () => {
    if (!loadSettings()) return;
    if (!loadCookies()) return;

    $.log(`🌟 开始执行,签到间隔 ${$.req_interval}ms`);
    initState();

    try {
        // 拉所有页关注超话
        let page = 1;
        let sinceId = '';
        while (true) {
            const result = await fetchTopicPage(sinceId);
            if (!result || !result.list || result.list.length === 0) {
                if (page === 1) $.log('⚠️ 第一页没拉到超话,可能是 cookie 或解析问题');
                break;
            }
            $.log(`📃 第 ${page} 页: 拉到 ${result.list.length} 个超话`);
            $.topics.push(...result.list);
            // 不足一页(20条)说明已经是最后一页,不再翻
            if (result.list.length < 20) break;
            if (!result.nextSinceId) break;
            sinceId = result.nextSinceId;
            page++;
            if (page > 20) break;
            await sleep(500);
        }

        // 去重
        const seen = new Set();
        $.topics = $.topics.filter(t => {
            if (seen.has(t.fid)) return false;
            seen.add(t.fid);
            return true;
        });
        $.log(`📊 总计去重后关注超话: ${$.topics.length} 个`);

        for (const t of $.topics) {
            await checkin(t.fid, t.name);
            await sleep($.req_interval);
        }
    } catch (e) {
        $.log(`❌ 执行失败: ${e.message || e}`);
    }

    sendSummary();
})()
.catch((e) => $.log(`❌ ${e.message || e}`))
.finally(() => $.done());


function loadSettings() {
    $.delete_cookie = JSON.parse($.getdata('wb_delete_cookie') || $.delete_cookie);
    $.msg_max_num = parseInt($.getdata('wb_msg_max_num')) || $.msg_max_num;
    $.req_interval = parseInt($.getdata('wb_request_time')) || $.req_interval;

    if ($.delete_cookie) {
        [KEY_LIST_URL, KEY_LIST_HEADERS, KEY_LIST_BODY, KEY_CHECKIN_URL, KEY_CHECKIN_HEADERS]
            .forEach(k => $.setdata('', k));
        $.setdata('false', 'wb_delete_cookie');
        $.msg($.name, '', '✅ Cookie 已清空,请重新抓取');
        return false;
    }
    return true;
}

function loadCookies() {
    $.listUrl = $.getdata(KEY_LIST_URL);
    $.listHeadersStr = $.getdata(KEY_LIST_HEADERS);
    $.listBody = $.getdata(KEY_LIST_BODY) || '';
    $.checkinUrl = $.getdata(KEY_CHECKIN_URL);
    $.checkinHeadersStr = $.getdata(KEY_CHECKIN_HEADERS);

    const missing = [];
    if (!$.listUrl || !$.listHeadersStr) missing.push('列表 cookie');
    if (!$.checkinUrl || !$.checkinHeadersStr) missing.push('签到 cookie');

    if (missing.length > 0) {
        $.msg(
            '微博超话',
            `🚫 缺少 ${missing.join(' + ')}`,
            '请开启 cookie 抓取脚本,然后:\n1️⃣ 进 我的→超话社区→我的→关注\n2️⃣ 进任一超话页面手动签到一次'
        );
        return false;
    }

    try {
        $.listHeaders = JSON.parse($.listHeadersStr);
        $.checkinHeaders = JSON.parse($.checkinHeadersStr);
        return true;
    } catch (e) {
        $.msg('微博超话', '🚫 Cookie 解析失败', '请清空 cookie 后重新抓取');
        return false;
    }
}

function initState() {
    $.topics = [];
    $.successNum = 0;
    $.failNum = 0;
    $.alreadyNum = 0;
    $.message = [];
}

function fetchTopicPage(sinceId) {
    return new Promise((resolve) => {
        let body = $.listBody;
        if (sinceId) {
            body = body.replace(/&?since_id=[^&]*/g, '');
            body += (body ? '&' : '') + `since_id=${encodeURIComponent(sinceId)}`;
        }
        const cleanedHeaders = cleanHeaders($.listHeaders);
        const opts = { url: $.listUrl, headers: cleanedHeaders, body: body };

        $.log(`[列表] URL长度=${$.listUrl.length} headers=${Object.keys(cleanedHeaders).length}个 body长度=${body.length}`);
        if ($.debug) {
            $.log(`[列表] headers: ${JSON.stringify(cleanedHeaders)}`);
            $.log(`[列表] body: ${body}`);
        }

        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[列表] 请求错误: ${JSON.stringify(err)}`);
                resolve(null);
                return;
            }
            if (resp && resp.statusCode !== 200) {
                $.log(`[列表] HTTP ${resp.statusCode}: ${(data || '').substring(0, 200)}`);
                resolve(null);
                return;
            }
            try {
                const obj = JSON.parse(data);
                if (obj.errmsg || obj.errno) {
                    const em = obj.errmsg || `errno: ${obj.errno}`;
                    $.log(`[列表] 微博错误: ${em}`);
                    let hint = '\n\n🔍 风控签名(X-Validator)可能已过期。\n请重新抓 cookie:\n1️⃣ 进 我的→超话社区→我的→关注\n2️⃣ 进任一超话签到一次';
                    $.msg('微博超话', '🚨 拉取关注列表失败', `${em}${hint}`);
                    resolve(null);
                    return;
                }
                const list = extractTopics(obj);
                $.log(`[列表] 解析到 ${list.length} 个超话`);
                const nextSinceId = (obj.moreInfo && obj.moreInfo.params && obj.moreInfo.params.since_id) || '';
                resolve({ list, nextSinceId: (nextSinceId === '-1_1' || !nextSinceId) ? '' : nextSinceId });
            } catch (e) {
                $.log(`[列表] 解析失败: ${e}`);
                $.log(`[列表] 响应前500: ${(data || '').substring(0, 500)}`);
                resolve(null);
            }
        });
    });
}

// 递归找 card_type:8 的超话卡片
function extractTopics(obj) {
    const result = [];
    function walk(node) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        const data = node.data;
        if (data && data.card_type === 8 && data.scheme && data.title_sub) {
            const m = data.scheme.match(/containerid=(1008\d{2}[a-f0-9]{32})/);
            if (m) {
                result.push({
                    fid: m[1],
                    name: String(data.title_sub).replace(/超话$/, ''),
                });
            }
        }
        Object.values(node).forEach(v => { if (v && typeof v === 'object') walk(v); });
    }
    walk(obj);
    return result;
}

// 签到: 用签到 cookie,只替换 fid 和 pageid
function checkin(fid, name) {
    return new Promise((resolve) => {
        const url = buildCheckinUrl(fid);
        const cleanedHeaders = cleanHeaders($.checkinHeaders);
        const opts = { url: url, headers: cleanedHeaders };

        if ($.debug) {
            $.log(`[签到 ${name}] URL: ${url}`);
        }

        $.get(opts, (err, resp, data) => {
            if (err) {
                $.failNum++;
                $.message.push(`【${name}】❌ 网络错误`);
                resolve();
                return;
            }
            const code = resp && resp.statusCode;
            if (code === 418) { $.failNum++; $.message.push(`【${name}】⚠️ 签到太频繁`); resolve(); return; }
            if (code === 511) { $.failNum++; $.message.push(`【${name}】⚠️ 需要身份验证`); resolve(); return; }
            if (code !== 200) { $.failNum++; $.message.push(`【${name}】❌ HTTP ${code}`); resolve(); return; }

            try {
                const r = JSON.parse(data);
                const btnName = (r.button && r.button.name) || '';
                const extType = (r.ext_button && r.ext_button.type) || '';
                const extName = (r.ext_button && r.ext_button.name) || '';

                if (r.error_msg) {
                    const m = r.error_msg.match(/\((\d+)\)/);
                    if (m && m[1] === '382004') {
                        $.alreadyNum++;
                        $.message.push(`【${name}】✨ 今日已签`);
                    } else {
                        $.failNum++;
                        $.message.push(`【${name}】❌ ${r.error_msg}`);
                    }
                } else if (r.result === 1) {
                    // 关键判断: ext_button.type === 'sign_in' 表示"已签"状态
                    // 这种情况下 button.name 仍然显示"连签X天",但实际是查看签到记录的入口
                    if (extType === 'sign_in' || /已签/.test(extName)) {
                        $.alreadyNum++;
                        $.message.push(`【${name}】✨ 今日已签 (${btnName || '连签'})`);
                    } else {
                        $.successNum++;
                        $.message.push(`【${name}】✅ ${btnName || '签到成功'}`);
                    }
                } else {
                    $.failNum++;
                    $.message.push(`【${name}】❌ 未知响应`);
                    if ($.debug) $.log(`[签到 ${name}] 响应: ${data}`);
                }
            } catch (e) {
                $.failNum++;
                $.message.push(`【${name}】❌ 响应解析失败`);
            }
            resolve();
        });
    });
}

// 拼装签到 URL: 用抓到的 checkinUrl 做模板,替换 fid 和 pageid
function buildCheckinUrl(fid) {
    let url = $.checkinUrl;
    // fid 参数: ...&fid=1008xxxxxxxxxx_-_recommend&...
    url = url.replace(/([?&])fid=[^&]*/, `$1fid=${fid}_-_recommend`);
    // request_url 里也有 pageid: ...pageid%3D1008xxxxxxxx%26...
    url = url.replace(/(pageid%3D)[a-f0-9]+/g, `$1${fid}`);
    return url;
}

function cleanHeaders(h) {
    const blocked = ['content-length', 'host', 'connection', 'accept-encoding'];
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
        $.msg(title, '', '⚠️ 没有签到任何超话,请检查 cookie 或关注列表');
        return;
    }
    for (let i = 0; i < $.message.length; i += $.msg_max_num) {
        const chunk = $.message.slice(i, i + $.msg_max_num).join('\n');
        const subtitle = `第 ${Math.floor(i / $.msg_max_num) + 1} 页 / 共 ${Math.ceil($.message.length / $.msg_max_num)} 页`;
        $.msg(title, subtitle, chunk);
    }
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
