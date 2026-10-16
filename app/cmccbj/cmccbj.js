/**
 * 北京移动 · 每日签到(签到赢好礼,送流量/积分)
 *
 * 抓取:打开中国移动 APP(北京) → 进「签到赢好礼」H5 → 点一次签到,抓 Cookie(token + constid)
 * 签到:cron 定时自动签到(先查状态再签,已签则跳过)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-24
 *
 * ===== Loon =====
 * [MITM]
 * hostname = h5.bj.10086.cn
 * [Script]
 * request if ${url} ~= /^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\//i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js") with tag="北京移动 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png"
 * cron "20 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js") with tag="北京移动签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png"
 *
 * ===== Surge =====
 * [MITM]
 * hostname = %APPEND% h5.bj.10086.cn
 * [Script]
 * 北京移动 Cookie = type=http-request, pattern=^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/, requires-body=0, max-size=0, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png
 * 北京移动签到 = type=cron, cronexp=20 8 * * *, timeout=60, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png, script-update-interval=0
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = h5.bj.10086.cn
 * [rewrite_local]
 * ^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js
 * [task_local]
 * 20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js, tag=北京移动签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png, enabled=true
 *
 * ===== Stash =====
 * http:
 *   mitm:
 *     - "h5.bj.10086.cn"
 *   script:
 *     - match: ^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/
 *       name: 北京移动 Cookie
 *       type: request
 *       require-body: false
 * cronjob:
 *   - name: 北京移动签到
 *     cronexp: "20 8 * * *"
 *     timeout: 60
 *     script-path: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js
 */

const $ = new Env('北京移动');

const SCRIPT_VERSION = "2026-06-24.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = 'cmccbj_data';
const BASE = 'https://h5.bj.10086.cn/ActSignIn2023';

// ============ 抓取分支:从签到页请求 URL 里取 token + constid ============
if (typeof $request !== "undefined") {
    const url = $request.url || '';
    const token = (url.match(/[?&]token=([^&]+)/) || [])[1];
    // constid 只在 doPrize 请求里有(点签到才触发),getSignIn(进页面)只有 token
    const constid = (url.match(/[?&]constid=([^&]+)/) || [])[1];

    if (!token) {
        $.done({});
    } else {
        let ck = {};
        try { ck = JSON.parse($.getdata(CK_KEY) || "{}"); } catch (e) { ck = {}; }

        ck.token = decodeURIComponent(token);
        if (constid) ck.constid = decodeURIComponent(constid); // 没抓到就保留旧值

        $.setdata(JSON.stringify(ck), CK_KEY);

        const tip = ck.constid
            ? `token 末位 ${ck.token.slice(-6)} · constid 已就绪`
            : `token 末位 ${ck.token.slice(-6)}（还需点一次「签到」抓 constid）`;
        $.msg($.name, "✅ 北京移动 Cookie 获取成功", tip);
        $.done({});
    }
} else if (JSON.parse($.getdata("cmccbj_clear") || "false")) {
    // ============ 清除缓存 ============
    $.setdata("", CK_KEY);
    $.setdata("false", "cmccbj_clear");
    $.msg($.name, "", "✅ Cookie 已清除，请重新抓取");
    $.done();
} else {
    // ============ cron 签到分支 ============
    (async () => {
        const raw = $.getdata(CK_KEY);
        if (!raw) {
            $.msg($.name, '🚫 缺少 Cookie',
                '请先开启 Cookie 抓取脚本,打开中国移动 APP(北京)进「签到赢好礼」页点一次签到');
            $.done();
            return;
        }

        let ck;
        try { ck = JSON.parse(raw); } catch (e) {
            $.msg($.name, '🚫 Cookie 解析失败', '请清空缓存重抓');
            $.done();
            return;
        }
        if (!ck.token) {
            $.msg($.name, '🚫 Cookie 不完整', '缺 token,请重抓');
            $.done();
            return;
        }
        if (!ck.constid) {
            $.msg($.name, '🚫 缺 constid',
                '请在签到页「点一次签到」让脚本抓到 constid(进页面只能抓 token)');
            $.done();
            return;
        }

        try {
            // 1. 查签到状态(也拿到今日奖品名)
            const status = await call('/getSignIn/JT/ActSignIn2023JT', ck);
            if (!status) {
                $.msg($.name, '❌ 签到失败', 'token 可能已失效,请重新打开 APP 抓取');
                $.done();
                return;
            }
            if (status.result !== 0) {
                $.msg($.name, '❌ 签到失败',
                    `查询返回 result=${status.result} ${status.errmsg || ''} —— token 多半失效,请重抓`);
                debug(`getSignIn raw: ${JSON.stringify(status).slice(0, 400)}`);
                $.done();
                return;
            }

            const todayPrize = (status.signInList && status.signInList[0]
                && status.signInList[0].signInPrize) || '';
            const masked = status.misdnmask || '';

            if (status.isSignIn === true) {
                $.msg($.name, `✨ ${masked} 今日已签`,
                    todayPrize ? `今日奖品:${todayPrize}` : '');
                $.done();
                return;
            }

            // 2. 执行签到 + 领奖
            const tid = Date.now();
            const sign = await call(
                `/doPrize/JT/ActSignIn2023JT?type=sign&constid=${encodeURIComponent(ck.constid)}`,
                ck, tid
            );

            if (!sign) {
                $.msg($.name, `❌ ${masked} 签到失败`, '请求异常,请查看日志');
                $.done();
                return;
            }
            if (sign.result === 0) {
                $.msg($.name, `✅ ${masked} 签到成功`,
                    todayPrize ? `奖品:${todayPrize}` : (sign.errmsg || 'OK'));
            } else {
                // constid 失效常见错因,给重抓提示
                $.msg($.name, `⚠️ ${masked} 签到未成功`,
                    `result=${sign.result} ${sign.errmsg || ''} —— 若持续失败请重新点签到抓 constid`);
                debug(`doPrize raw: ${JSON.stringify(sign).slice(0, 400)}`);
            }
        } catch (e) {
            $.msg($.name, '❌ 签到异常', String(e.message || e));
        }
        $.done();
    })();
}

// 统一发请求:token 拼在 query,响应是明文 JSON。tid 默认现取时间戳
function call(path, ck, tid) {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${BASE}${path}${sep}token=${encodeURIComponent(ck.token)}&transactionid=${tid || Date.now()}`;
    return new Promise((resolve) => {
        $.post({
            url,
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
                'Origin': 'https://h5.bj.10086.cn',
                'Referer': 'https://h5.bj.10086.cn/cmcc_app/checkin/index.html',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148/wkwebview leadeon/12.1.2/CMCCIT',
            },
            body: '',
        }, (err, resp, data) => {
            if (err) { debug(`[${path}] 错误: ${JSON.stringify(err)}`); resolve(null); return; }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                debug(`[${path}] 解析失败 status=${resp && resp.statusCode}: ${(data || '').slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}


// @Chavy Env
// 调试日志:BoxJS 设 cmccbj_debug=true 才打印接口原始响应
function debug(content) {
    if (($.getdata("cmccbj_debug") || "false") !== "true") return;
    $.log(`[DEBUG] ${typeof content === "string" ? content : JSON.stringify(content)}`);
}

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
