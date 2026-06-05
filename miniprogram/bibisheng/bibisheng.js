/**
 * 笔笔省 · 微信支付「笔笔省」小程序  天天领券页面每日免费券自动领取
 *
 * 抓取:打开「微信支付笔笔省」小程序 → 进「天天领」页,自动抓 session-token
 * 签到:cron 定时自动领券
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-12
 *
 * ===== Loon =====
 * [MITM]
 * hostname = discount.wxpapp.wechatpay.cn
 * [Script]
 * http-request ^https:\/\/discount\.wxpapp\.wechatpay\.cn\/txbbs-mall\/coupon\/(querydailygiftcoupons|claimdailygiftcoupon) tag=笔笔省 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png
 * cron "30 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.js, tag=笔笔省签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = discount.wxpapp.wechatpay.cn
 * [Script]
 * 笔笔省 Cookie = type=http-request,pattern=^https:\/\/discount\.wxpapp\.wechatpay\.cn\/txbbs-mall\/coupon\/(querydailygiftcoupons|claimdailygiftcoupon),requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png
 * 笔笔省签到 = type=cron,cronexp=30 7 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = discount.wxpapp.wechatpay.cn
 * [rewrite_local]
 * ^https:\/\/discount\.wxpapp\.wechatpay\.cn\/txbbs-mall\/coupon\/(querydailygiftcoupons|claimdailygiftcoupon) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.cookie.js
 * [task_local]
 * 30 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.js, tag=笔笔省签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 笔笔省签到
 *       cron: '30 7 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "discount.wxpapp.wechatpay.cn"
 *   script:
 *     - match: ^https:\/\/discount\.wxpapp\.wechatpay\.cn\/txbbs-mall\/coupon\/(querydailygiftcoupons|claimdailygiftcoupon)
 *       name: 笔笔省 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   笔笔省签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.js
 *     interval: 86400
 */

const $ = new Env("笔笔省");

const SCRIPT_VERSION = "2026-05-12.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

// 存储 key
const KEY_TOKEN = 'bbs_session_token';
const KEY_APPID = 'bbs_appid';
const KEY_MODULE = 'bbs_module';
const KEY_PAGE = 'bbs_page';

const BASE_URL = 'https://discount.wxpapp.wechatpay.cn';

(async () => {
    if (!loadCookies()) return;

    $.log(`🌟 开始领券任务`);
    $.results = [];

    try {
        const coupons = await queryDailyGiftCoupons();
        if (coupons === null) {
            sendSummary();
            return;
        }
        if (coupons.length === 0) {
            $.results.push('📭 没有可领取的券');
            sendSummary();
            return;
        }

        $.log(`📋 拉到 ${coupons.length} 张券`);

        for (const c of coupons) {
            if (c.is_claimed === true) {
                $.results.push(`✨ ${c.name} 今日已领`);
                continue;
            }
            await claim(c);
            await sleep(800);
        }
    } catch (e) {
        $.results.push(`❌ 异常: ${e.message || e}`);
    }

    sendSummary();
})()
.catch((e) => $.log(`❌ ${e.message || e}`))
.finally(() => $.done());


function loadCookies() {
    $.sessionToken = $.getdata(KEY_TOKEN);
    $.appid = $.getdata(KEY_APPID) || 'wxdb3c0e388702f785';
    $.moduleName = $.getdata(KEY_MODULE) || 'mmpaytxbbsmp';
    $.page = $.getdata(KEY_PAGE) || 'pages/gift/index';

    if (!$.sessionToken) {
        $.msg('笔笔省', '🚫 缺少 session-token', '请打开"微信支付笔笔省"小程序,进"天天领"页面,自动抓取 token');
        return false;
    }
    return true;
}

function commonHeaders() {
    return {
        'Host': 'discount.wxpapp.wechatpay.cn',
        'session-token': $.sessionToken,
        'X-Appid': $.appid,
        'X-Module-Name': $.moduleName,
        'X-Page': $.page,
        'content-type': 'application/json',
        'Accept-Encoding': 'gzip,compress,br,deflate',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.73(0x18004925) NetType/WIFI Language/zh_CN',
        'Referer': `https://servicewechat.com/${$.appid}/182/page-frame.html`,
    };
}

// 拉取今日券列表
function queryDailyGiftCoupons() {
    return new Promise((resolve) => {
        const opts = {
            url: `${BASE_URL}/txbbs-mall/coupon/querydailygiftcoupons`,
            headers: commonHeaders(),
        };
        $.get(opts, (err, resp, data) => {
            if (err) {
                $.results.push(`❌ 列表请求失败: ${JSON.stringify(err)}`);
                resolve(null);
                return;
            }
            const code = resp && resp.statusCode;
            if (code !== 200) {
                $.results.push(`❌ 列表 HTTP ${code}: ${(data || '').substring(0, 200)}`);
                resolve(null);
                return;
            }
            try {
                const r = JSON.parse(data);
                if (r.errcode !== 0) {
                    const msg = r.errmsg || `errcode=${r.errcode}`;
                    // 经验上 token 失效会返回特定 errcode,这里先泛化提示
                    $.results.push(`❌ 列表返回异常: ${msg}\n🔍 token 可能已失效,请重新进小程序"天天领"页`);
                    resolve(null);
                    return;
                }
                const items = (r.data && r.data.coupon_items) || [];
                const list = items.map(it => ({
                    coupon_id: it.coupon_info && it.coupon_info.coupon_id,
                    name: (it.coupon_info && it.coupon_info.name) || '未知券',
                    face_value: (it.coupon_info && it.coupon_info.face_value) || 0,
                    daily_gift_type: it.daily_gift_type || 'DGCT_PLATFORM',
                    is_claimed: it.is_claimed === true,
                }));
                resolve(list);
            } catch (e) {
                $.results.push(`❌ 列表解析失败: ${e}`);
                $.log(`[列表] 响应前300: ${(data || '').substring(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// 领取一张券
function claim(c) {
    return new Promise((resolve) => {
        const body = JSON.stringify({
            daily_gift_type: c.daily_gift_type,
            coupon_id: c.coupon_id,
            expected_send_amount: c.face_value / 10, // 抓包里 face_value=3000 时 expected_send_amount=3000 (此处是 deductible_cash_out_fee 的 1000 倍)??见下方注释
        });
        // 注: 抓包里 expected_send_amount=3000,deductible_cash_out_fee=3
        // 推断 expected_send_amount = deductible_cash_out_fee * 1000
        // 但 face_value(3000)和 expected_send_amount(3000)恰好同值,这里先按 face_value 传,异常再改

        const opts = {
            url: `${BASE_URL}/txbbs-mall/coupon/claimdailygiftcoupon`,
            headers: { ...commonHeaders(), 'Content-Length': String(body.length) },
            body: body,
        };

        $.post(opts, (err, resp, data) => {
            if (err) {
                $.results.push(`❌ 【${c.name}】网络错误`);
                resolve();
                return;
            }
            const code = resp && resp.statusCode;
            if (code !== 200) {
                $.results.push(`❌ 【${c.name}】HTTP ${code}: ${(data || '').substring(0, 150)}`);
                resolve();
                return;
            }
            try {
                const r = JSON.parse(data);
                if (r.errcode === 0 && r.data && r.data.coupon_item) {
                    const got = r.data.coupon_item;
                    const name = (got.coupon_info && got.coupon_info.name) || c.name;
                    $.results.push(`✅ 【${name}】领取成功`);
                } else {
                    const em = r.errmsg || `errcode=${r.errcode}`;
                    $.results.push(`❌ 【${c.name}】${em}`);
                    $.log(`[领取 ${c.name}] raw: ${(data || '').substring(0, 300)}`);
                }
            } catch (e) {
                $.results.push(`❌ 【${c.name}】响应解析失败`);
                $.log(`[领取 ${c.name}] raw: ${(data || '').substring(0, 300)}`);
            }
            resolve();
        });
    });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function sendSummary() {
    const okCount = $.results.filter(s => s.startsWith('✅')).length;
    const alreadyCount = $.results.filter(s => s.startsWith('✨')).length;
    const failCount = $.results.filter(s => s.startsWith('❌')).length;

    // 按情况分支,标题尽量自然不啰嗦
    let title;
    if (failCount > 0) {
        // 有失败优先暴露
        title = `笔笔省: 领 ${okCount}, 失败 ${failCount}`;
    } else if (okCount > 0 && alreadyCount === 0) {
        title = `笔笔省: 领到 ${okCount} 张 ✅`;
    } else if (okCount > 0 && alreadyCount > 0) {
        title = `笔笔省: 新领 ${okCount} 张, 另 ${alreadyCount} 张已领过`;
    } else if (okCount === 0 && alreadyCount > 0) {
        title = `笔笔省: ${alreadyCount} 张今日已领过 ✨`;
    } else {
        title = `笔笔省: 无可领券`;
    }

    const body = $.results.length ? $.results.join('\n') : '⚠️ 没有处理任何券';
    $.msg(title, '', body);
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
