/**
 * 小米有品 · 小米有品 APP「每日签到」红包活动，每日签到随机领取现金红包
 *
 * 抓取:打开小米有品 APP →「我的」→「红包」页,停留 1 秒抓 Cookie
 * 签到:cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-27
 *
 * ===== Loon =====
 * [MITM]
 * hostname = m.xiaomiyoupin.com
 * [Script]
 * http-request ^https:\/\/m\.xiaomiyoupin\.com\/mtop\/act\/redPacketSign\/getActInfo tag=有品 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png
 * cron "5 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js, tag=有品签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = m.xiaomiyoupin.com
 * [Script]
 * 有品 Cookie = type=http-request,pattern=^https:\/\/m\.xiaomiyoupin\.com\/mtop\/act\/redPacketSign\/getActInfo,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png
 * 有品签到 = type=cron,cronexp=5 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = m.xiaomiyoupin.com
 * [rewrite_local]
 * ^https:\/\/m\.xiaomiyoupin\.com\/mtop\/act\/redPacketSign\/getActInfo url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js
 * [task_local]
 * 5 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js, tag=有品签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 有品签到
 *       cron: '5 9 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "m.xiaomiyoupin.com"
 *   script:
 *     - match: ^https:\/\/m\.xiaomiyoupin\.com\/mtop\/act\/redPacketSign\/getActInfo
 *       name: 有品 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   有品签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js
 *     interval: 86400
 */

const $ = new Env("小米有品");

const SCRIPT_VERSION = "2026-06-07.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY  = 'youpin_data';
const BASE    = 'https://m.xiaomiyoupin.com';
// 每日签到活动 ID（channelId，固定值，Xiaomi 更新活动后可能变）
const ACT_ID  = '686b76a6ac546f0001b930c5';

// ─── 入口 ────────────────────────────────────────────────────────────────────
if (typeof $request !== "undefined") {
    getCookie();
    $.done();
} else {
    (async () => {
        if (JSON.parse($.getdata("youpin_clear") || "false")) {
            $.setdata("", CK_KEY);
            $.setdata("false", "youpin_clear");
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
// 触发条件: 打开有品 APP → 「我的」→「签到有礼」，停留 1 秒等 getActInfo 请求发出
function getCookie() {
    // Loon 在 HTTP/2 多 cookie 头时会将多个 "cookie: xxx" 合并成换行分隔字符串
    // 需要先 normalize，去掉每行残留的 "cookie: " 前缀后再按分号解析
    const raw = normalizeCookie(
        $request.headers['cookie'] || $request.headers['Cookie'] || ''
    );

    const serviceToken  = parseCookieField(raw, 'serviceToken');
    const youpinSession = parseCookieField(raw, 'youpin_sessionid');
    // youpindistinct_id: 神策数据生成的设备 distinct_id，随 cookie 一起传
    const distinctId    = parseCookieField(raw, 'youpindistinct_id');

    if (!serviceToken) {
        $.msg($.name, '⚠️ 未提取到 serviceToken',
            '请确认已开启 MITM 并进「我的 → 签到有礼」页面');
        return;
    }

    const ua = $request.headers['user-agent'] || $request.headers['User-Agent'] || '';

    const ck = { serviceToken, youpinSession, distinctId, userAgent: ua };
    $.setdata(JSON.stringify(ck), CK_KEY);

    $.msg(
        $.name,
        '✅ Cookie 已保存',
        `serviceToken: ${maskToken(serviceToken)}\n` +
        `session: ${maskToken(youpinSession || '-')}`
    );
}

// ─── 签到主逻辑 ──────────────────────────────────────────────────────────────
async function main() {
    const raw = $.getdata(CK_KEY);
    if (!raw) {
        $.msg($.name, '🚫 缺少 Cookie',
            '请先开启重写规则，打开有品 APP 进「我的 → 签到有礼」页面');
        return;
    }

    let ck;
    try {
        ck = JSON.parse(raw);
    } catch (e) {
        $.msg($.name, '🚫 Cookie 解析失败', '请清空后重新触发抓取');
        return;
    }

    if (!ck.serviceToken) {
        $.msg($.name, '🚫 serviceToken 为空', '请重新进「签到有礼」页面');
        return;
    }

    const headers = buildHeaders(ck);

    // 1. 查询签到状态
    let actData;
    try {
        const r = await post(`${BASE}/mtop/act/redPacketSign/getActInfo`, headers,
            [{}, { actId: ACT_ID }]);
        if (!r || r.code !== 0) {
            $.msg($.name, '❌ 状态查询失败',
                `code=${r && r.code} msg=${r && (r.msg || r.message)}`);
            return;
        }
        actData = r.data;
    } catch (e) {
        $.msg($.name, '❌ 状态请求异常', String(e));
        return;
    }

    const signInfo = actData && actData.signUserInfo;
    const alreadySigned = signInfo && signInfo.sign === true;

    if (alreadySigned) {
        $.msg($.name, '✨ 今日已签到', `连签第 ${(signInfo.dayIndex || 0) + 1} 天`);
        return;
    }

    // 2. 执行签到（接口已通过抓包验证: 2026-05-27）
    let signResult;
    try {
        signResult = await post(`${BASE}/mtop/act/redPacketSign/clickSign`, headers,
            [{}, { actId: ACT_ID }]);
    } catch (e) {
        $.msg($.name, '❌ 签到请求异常', String(e));
        return;
    }

    if (!signResult || signResult.code !== 0) {
        const errMsg = (signResult && (signResult.msg || signResult.message)) || JSON.stringify(signResult).slice(0, 200);
        $.msg($.name, '❌ 签到失败', errMsg);
        return;
    }

    // 解析奖励（红包金额随机，响应示例: {"amount":"0.15","msg":"签到成功！"}）
    const data = signResult.data || {};
    const amount = data.amount || '?';
    const tip    = data.msg || '';

    let body = `💰 获得红包 ¥${amount}`;
    if (tip && tip !== '签到成功！') body += `\n${tip}`;

    $.msg($.name, '✅ 签到成功', body);
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * Loon HTTP/2 多 cookie 头 normalize
 * 多个独立 cookie: 头被合并后形如:
 *   "mijiasn=YPQD_YPMRQD\ncookie: mjclient=YouPin\ncookie: serviceToken=..."
 * 需要去掉每行的 "cookie: " 前缀，再按 "; " 拼回标准格式
 */
function normalizeCookie(raw) {
    if (!raw) return '';
    const parts = raw.split('\n').flatMap(line =>
        line.replace(/^cookie:\s*/i, '').split(';')
    );
    return parts.map(s => s.trim()).filter(Boolean).join('; ');
}

function parseCookieField(cookieStr, field) {
    if (!cookieStr) return undefined;
    const seg = cookieStr.split(';').find(s => s.trim().startsWith(field + '='));
    return seg ? seg.trim().slice(field.length + 1) : undefined;
}

/**
 * 构建 m.xiaomiyoupin.com 的请求头
 * 关键: sec-fetch-site=same-origin + origin + referer 缺一会被后端识别为非浏览器调用
 */
function buildHeaders(ck) {
    const cookieParts = [
        // mijiasn / mjclient 是活动页面固定注入的值，不随用户变化
        'mijiasn=YPQD_YPMRQD',
        'mjclient=YouPin',
        `serviceToken=${ck.serviceToken}`,
    ];
    if (ck.youpinSession) cookieParts.push(`youpin_sessionid=${ck.youpinSession}`);
    if (ck.distinctId)    cookieParts.push(`youpindistinct_id=${ck.distinctId}`);

    return {
        'content-type':    'application/json',
        'accept':          '*/*',
        'accept-language': 'zh-CN,zh-Hans;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'origin':          'https://m.xiaomiyoupin.com',
        'referer':         `https://m.xiaomiyoupin.com/hd/checkInsignIn/index.html?hideNavBar=true&channelId=${ACT_ID}&source=YPQD_YPMRQD`,
        'sec-fetch-site':  'same-origin',
        'sec-fetch-mode':  'cors',
        'sec-fetch-dest':  'empty',
        'priority':        'u=3, i',
        'user-agent':      ck.userAgent ||
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) ' +
            'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ' +
            'MIOTStore/20191212 (YouPin;5.32.0;;;;I;;;)',
        'cookie': cookieParts.join('; '),
    };
}

function post(url, headers, body) {
    return new Promise((resolve, reject) => {
        $.post({ url, headers, body: JSON.stringify(body), timeout: 10000 },
            (err, _resp, data) => {
                if (err) { reject(err); return; }
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    $.log(`⚠️ JSON 解析失败，原始响应: ${String(data).slice(0, 300)}`);
                    reject(new Error('JSON parse error'));
                }
            });
    });
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
