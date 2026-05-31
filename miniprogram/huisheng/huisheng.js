/**
 * 惠省红包墙自动领券脚本
 *
 * 微信小程序"惠省"(appid wx0b42a347aafbe0d0,亦称"私域福利"/"福利社"前端 fulishemini)的
 * 红包墙活动每日 0 点重置,理论上每天可一次性领取全部 7 个 tab 数十张美团外卖/闪购/丽人医疗等
 * 优惠券(都是 gundam 红包,底层和美团 APP 红包墙是同一套),实测单次总值在 ¥150~¥260 不等。
 *
 * 流程:
 *   1. POST /fulishemini/couponActivity/listActivityCoupon → 拿 tabs + 可领 rightCodes
 *   2. POST /fulishemini/couponActivity/grantActivityCoupon → 一次性领取所有 rightCodes
 *
 * 鉴权:
 *   美团 wmtoken (token 字段) + openId + openIdCipher + mtgsig (v1.2 弱版本)
 *   抓 cookie 脚本会把整个 headers 和 list 接口的 body 模板存下来,
 *   主脚本 cleanHeaders 后整套发出,只动态刷新 mtgsig.a2 时间戳和 body 里的 req_time。
 *
 * @Refactored: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-18
 *
 * [Script]
 * cron 5 0 * * * script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/huisheng/huisheng.js, tag=惠省红包墙签到
 *
 * [MITM]
 * hostname = media.meituan.com
 */

const $ = new Env("惠省红包墙");

$.delete_cookie = false;
$.debug = false;
$.req_interval = 500;

const KEY_HEADERS = 'huisheng_headers';
const KEY_LIST_BODY = 'huisheng_list_body';

(async () => {
    if (!loadSettings()) return;
    if (!loadCookies()) return;

    $.log(`🌟 开始执行`);
    initState();

    try {
        // 1. 拉券列表
        const listResp = await listActivityCoupon();
        if (!listResp) return;

        const tabs = buildGrantTabs(listResp);
        const totalCoupons = tabs.reduce((s, t) => s + t.rightCodes.length, 0);
        if (totalCoupons === 0) {
            $.msg($.name, '⚠️ 没有可领的券', '可能今日已领或活动已结束');
            return;
        }
        $.log(`📊 待领 ${tabs.length} 个 tab,共 ${totalCoupons} 张券`);

        await sleep($.req_interval);

        // 2. 一次性领取 (注意 recallToken 是 listResp.recallToken,grant 里必传,不传会 403)
        const grantResp = await grantActivityCoupon(listResp, tabs);
        if (!grantResp) return;

        // 3. 统计 + 通知
        summarize(grantResp);
    } catch (e) {
        $.log(`❌ 执行异常: ${e.message || e}`);
        $.msg($.name, '❌ 执行异常', String(e.message || e));
    }
})()
.catch((e) => $.log(`❌ ${e.message || e}`))
.finally(() => $.done());


function loadSettings() {
    $.delete_cookie = ($.getdata('huisheng_delete_cookie') === 'true');
    const ri = parseInt($.getdata('huisheng_request_time'));
    if (!isNaN(ri) && ri > 0) $.req_interval = ri;
    $.debug = ($.getdata('huisheng_debug') === 'true');

    if ($.delete_cookie) {
        [KEY_HEADERS, KEY_LIST_BODY].forEach(k => $.setdata('', k));
        $.setdata('false', 'huisheng_delete_cookie');
        $.msg($.name, '', '✅ Cookie 已清空,请重新抓取');
        return false;
    }
    return true;
}

function loadCookies() {
    $.headersStr = $.getdata(KEY_HEADERS) || '';
    $.listBody = $.getdata(KEY_LIST_BODY) || '';

    $.log(`[diag] headers 读到 ${$.headersStr.length} 字符,body 读到 ${$.listBody.length} 字符`);

    if (!$.headersStr || !$.listBody) {
        $.msg($.name, '🚫 缺少鉴权数据', `headers=${$.headersStr.length}字符 body=${$.listBody.length}字符\n请先打开 cookie 抓取脚本,然后:\n1️⃣ 进微信"惠省"小程序\n2️⃣ 在首页停留 3 秒触发列表接口`);
        return false;
    }
    try {
        $.headers = JSON.parse($.headersStr);
        $.listBodyObj = JSON.parse($.listBody);
        return true;
    } catch (e) {
        $.msg($.name, '🚫 数据解析失败', '请清空 cookie 后重新抓取');
        return false;
    }
}

function initState() {
    $.successNum = 0;
    $.failNum = 0;
    $.totalValue = 0;
    $.couponNames = [];
}

// 列表接口
function listActivityCoupon() {
    return new Promise((resolve) => {
        const headers = freshHeaders($.headers);
        const body = freshBody($.listBodyObj);
        const opts = {
            url: 'https://media.meituan.com/fulishemini/couponActivity/listActivityCoupon?yodaReady=wx&csecappid=wx0b42a347aafbe0d0&csecplatform=3&csecversionname=1.34.0&csecversion=1.3.0',
            headers: headers,
            body: body,
        };
        if ($.debug) $.log(`[list] headers: ${$.toStr(headers)}\n[list] body: ${body}`);

        $.post(opts, (err, resp, data) => {
            if (err) { $.log(`[list] 网络错误: ${$.toStr(err)}`); resolve(null); return; }
            if (resp && resp.statusCode !== 200) {
                $.log(`[list] HTTP ${resp.statusCode}: ${(data || '').substring(0, 200)}`);
                $.msg($.name, '❌ 拉券列表失败', `HTTP ${resp.statusCode},可能 mtgsig 已过期。请重新抓 cookie。`);
                resolve(null); return;
            }
            try {
                const obj = JSON.parse(data);
                if (obj.code !== 200) {
                    $.log(`[list] 业务失败: ${obj.code} ${obj.msg}`);
                    $.msg($.name, '❌ 拉券列表失败', `${obj.code} ${obj.msg}\n\n可能 mtgsig/token 已失效,请重新抓 cookie`);
                    resolve(null); return;
                }
                resolve(obj.data);
            } catch (e) {
                $.log(`[list] 解析失败: ${e}\n${(data || '').substring(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// 从 listResp 提取可领的 rightCodes,按 planCode 分组
function buildGrantTabs(listResp) {
    const map = {};
    for (const c of (listResp.list || [])) {
        const cd = c.data;
        if (!cd || !cd.planCode || !cd.rightCode) continue;
        if (!map[cd.planCode]) map[cd.planCode] = [];
        map[cd.planCode].push(cd.rightCode);
    }
    // preGrantList 也算上,实测它是已预发放的券,grant 接口照样接收
    for (const c of (listResp.preGrantList || [])) {
        const cd = c.data;
        if (!cd || !cd.planCode || !cd.rightCode) continue;
        if (!map[cd.planCode]) map[cd.planCode] = [];
        if (!map[cd.planCode].includes(cd.rightCode)) map[cd.planCode].push(cd.rightCode);
    }
    return Object.keys(map).map(p => ({ planCode: p, rightCodes: map[p] }));
}

// 领取接口
function grantActivityCoupon(listResp, tabs) {
    return new Promise((resolve) => {
        const headers = freshHeaders($.headers);
        // 拼装 grant body:基于 list body,加上 activityCode / tabs / 其它必要字段
        const body = buildGrantBody(listResp, tabs);
        const opts = {
            url: 'https://media.meituan.com/fulishemini/couponActivity/grantActivityCoupon?yodaReady=wx&csecappid=wx0b42a347aafbe0d0&csecplatform=3&csecversionname=1.34.0&csecversion=1.3.0',
            headers: headers,
            body: body,
        };
        if ($.debug) $.log(`[grant] body: ${body}`);

        $.post(opts, (err, resp, data) => {
            if (err) { $.log(`[grant] 网络错误: ${$.toStr(err)}`); resolve(null); return; }
            if (resp && resp.statusCode !== 200) {
                $.log(`[grant] HTTP ${resp.statusCode}: ${(data || '').substring(0, 300)}`);
                $.msg($.name, '❌ 领券失败', `HTTP ${resp.statusCode}`);
                resolve(null); return;
            }
            try {
                const obj = JSON.parse(data);
                if (obj.code !== 200) {
                    $.log(`[grant] 业务失败: ${obj.code} ${obj.msg}`);
                    $.msg($.name, '❌ 领券失败', `${obj.code} ${obj.msg}`);
                    resolve(null); return;
                }
                resolve(obj.data);
            } catch (e) {
                $.log(`[grant] 解析失败: ${e}\n${(data || '').substring(0, 300)}`);
                resolve(null);
            }
        });
    });
}



function buildGrantBody(listResp, tabs) {
    const cfg = (listResp && listResp.config) || {};
    // list body 是基础模板,拷贝后改字段
    const obj = Object.assign({}, $.listBodyObj);

    obj.req_time = Date.now();
    obj.tabs = tabs;
    obj.activityName = cfg.activityName || '惠省红包墙活动配置';
    obj.activityCode = cfg.activityCode || '101357000';
    obj.activityScene = cfg.activityScene || 1;
    obj.preGrantSource = 2;
    obj.osType = 'iOS';
    obj.pageId = 'c_waimai_7hs96y41';
    obj.moduleId = 'b_waimai_gci8oda9_mc';
    obj.distributorChannel = 0;

    // recallToken 是 list 响应里 data.recallToken,grant 必传,不传 403
    if (listResp.recallToken) obj.recallToken = listResp.recallToken;

    // sessionId 客户端生成
    obj.sessionId = generateSessionId();

    // expoId 用 headers 里的 openIdCipher(同一个值),list 抓的 body 里已经有了就用,没有再 fallback
    if (!obj.expoId) {
        const ocKey = Object.keys($.headers || {}).find(k => k.toLowerCase() === 'openidcipher');
        if (ocKey) obj.expoId = $.headers[ocKey];
    }

    return JSON.stringify(obj);
}

function generateSessionId() {
    // 形如 19e394dbb5a-312d-301d-6191
    const s = () => Math.floor(Math.random() * 0xffff).toString(16);
    return `${Date.now().toString(16)}-${s()}-${s()}-${s()}`;
}

// 把 mtgsig.a2 刷成当前时间戳(其他字段保持不变,实测有效期较宽)
function freshHeaders(src) {
    const out = {};
    Object.keys(src || {}).forEach(k => {
        if (['content-length', 'host', 'connection', 'accept-encoding'].includes(k.toLowerCase()) || k.startsWith(':')) return;
        out[k] = src[k];
    });
    // 找 mtgsig 头,刷 a2
    const mtgKey = Object.keys(out).find(k => k.toLowerCase() === 'mtgsig');
    if (mtgKey && out[mtgKey]) {
        try {
            const sig = JSON.parse(out[mtgKey]);
            sig.a2 = Date.now();
            out[mtgKey] = JSON.stringify(sig);
        } catch (e) {
            $.log(`[warn] mtgsig 解析失败,保持原值: ${e}`);
        }
    }
    return out;
}

// body 刷 req_time
function freshBody(srcObj) {
    const obj = Object.assign({}, srcObj);
    obj.req_time = Date.now();
    return JSON.stringify(obj);
}

function summarize(grantData) {
    const tabs = (grantData && grantData.tabs) || [];
    for (const t of tabs) {
        for (const c of (t.couponList || [])) {
            if (c.status === 0 || c.status === 10) {
                $.successNum++;
                $.totalValue += Number(c.couponValue) || 0;
                $.couponNames.push(`${c.couponName}¥${(Number(c.couponValue) || 0) / 100}`);
            } else {
                $.failNum++;
            }
        }
    }
    const totalServer = Number(grantData.totalCouponValue) || $.totalValue;
    const title = `领券完成: 成功 ${$.successNum} 张,共 ¥${(totalServer / 100).toFixed(2)}`;
    const subtitle = $.failNum > 0 ? `失败 ${$.failNum} 张` : '';
    // 通知 body 折叠前 15 条
    const body = $.couponNames.slice(0, 15).join('、') + ($.couponNames.length > 15 ? ` 等 ${$.couponNames.length} 张` : '');
    $.msg($.name, title, body || subtitle);
    $.log(`${title} ${subtitle}\n${body}`);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }


// @Chavy Env
function Env(s) {
    this.name = s;
    this.hasStore = () => typeof $persistentStore !== 'undefined';
    this.isSurge = () => typeof $httpClient !== 'undefined';
    this.isQuanX = () => typeof $task !== 'undefined';
    this.isLoon = () => typeof $loon !== 'undefined';
    this.toStr = (o) => { try { return JSON.stringify(o); } catch { return ''; } };
    this.log = (...a) => console.log(a.join('\n'));
    this.msg = (t = this.name, s = '', b = '') => {
        if (typeof $notification !== 'undefined') $notification.post(t, s, b);
        else if (typeof $notify !== 'undefined') $notify(t, s, b);
        console.log(['', '====📣' + t + '====', s, b].filter(Boolean).join('\n'));
    };
    this.getdata = (k) => {
        if (this.hasStore()) return $persistentStore.read(k);
        if (typeof $prefs !== 'undefined') return $prefs.valueForKey(k);
        return null;
    };
    this.setdata = (v, k) => {
        if (this.hasStore()) return $persistentStore.write(v, k);
        if (typeof $prefs !== 'undefined') return $prefs.setValueForKey(v, k);
        return false;
    };
    this.post = (req, cb) => {
        if (this.isSurge() || this.isLoon()) {
            $httpClient.post(req, (err, resp, data) => {
                if (resp) { resp.body = data; resp.statusCode = resp.status || resp.statusCode; }
                cb(err, resp, data);
            });
        } else if (this.isQuanX()) {
            req.method = 'POST';
            $task.fetch(req).then(
                (r) => { r.status = r.statusCode; cb(null, r, r.body); },
                (e) => cb(e.error || e, null, null)
            );
        }
    };
    this.done = (v = {}) => { if (typeof $done !== 'undefined') $done(v); };
}
