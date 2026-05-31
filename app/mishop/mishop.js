/**
 * 小米商城 · 米金签到(每日 +5 米金,连签 2/7/14 天阶段红包)
 *
 * 用法:打开小米商城 APP → 首页「米金商城」→ 进入活动页点一次签到,即抓 Cookie;之后 cron 自动签到。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-27
 *
 * ===== Loon =====
 * [MITM]
 * hostname = shop-api.retail.mi.com
 * [Script]
 * http-request ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done) tag=小米商城 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.cookie.js, requires-body=0, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png
 * cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js, tag=小米商城签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = %APPEND% shop-api.retail.mi.com
 * [Script]
 * 小米商城 Cookie = type=http-request, pattern=^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done), requires-body=0, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.cookie.js, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png
 * 小米商城签到 = type=cron, cronexp=15 8 * * *, timeout=60, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, script-update-interval=0
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = shop-api.retail.mi.com
 * [rewrite_local]
 * ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.cookie.js
 * [task_local]
 * 15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js, tag=小米商城签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, enabled=true
 *
 * ===== Stash =====
 * http:
 *   mitm:
 *     - "shop-api.retail.mi.com"
 *   script:
 *     - match: ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done)
 *       name: 小米商城 Cookie
 *       type: request
 *       require-body: false
 * cronjob:
 *   - name: 小米商城签到
 *     cronexp: "15 8 * * *"
 *     timeout: 60
 *     script-path: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js
 */

const $ = new Env('小米商城');

const CK_KEY = 'mishop_data';
const API = 'https://shop-api.retail.mi.com';

// 米金签到任务常量 (从 /mtop/navi/venue/page?page_id=13880 响应里挖出, endTime 到 2027 年)
const ACT_ID    = '6706c0695404a23dfb5b2cab';
const TASK_ID   = '6706c0695243011f230d465d';
const TASK_TYPE = 110;

(async () => {
    const raw = $.getdata(CK_KEY);
    if (!raw) {
        $.msg($.name, '🚫 缺少 Cookie',
            '请先开启 cookie 抓取脚本,然后打开小米商城 APP → 首页 → 米金商城');
        $.done();
        return;
    }

    let ck;
    try {
        ck = JSON.parse(raw);
    } catch (e) {
        $.msg($.name, '🚫 Cookie 解析失败', '请清空缓存重抓');
        $.done();
        return;
    }

    if (!ck.cookie) {
        $.msg($.name, '🚫 Cookie 不完整', '缺 cookie 字段,请重抓');
        $.done();
        return;
    }

    const userId = ck.userId || '未知';
    $.log(`▶️ 开始签到 userId=${userId}`);

    try {
        // 1. 调 infinite/do 拿 taskToken
        const r1 = await post('/mtop/mf/act/infinite/do', ck, [
            {},
            { taskId: TASK_ID, actId: ACT_ID }
        ]);

        if (!r1) {
            $.msg($.name, `❌ ${userId} 签到失败`, '请求异常,请查看日志');
            $.done();
            return;
        }

        // 已签判断: code !== 0 且消息里有 "已" / "重复" / "完成"
        const r1msg = r1.message || r1.msg || '';
        if (r1.code !== 0 || !r1.data || !r1.data.taskToken) {
            if (/已|重复|完成|done/i.test(r1msg)) {
                $.msg($.name, `✨ ${userId} 今日已签`, r1msg);
            } else {
                $.msg($.name, `❌ ${userId} 签到失败`, `code=${r1.code} ${r1msg}`);
                $.log(`do raw: ${JSON.stringify(r1).slice(0, 400)}`);
            }
            $.done();
            return;
        }

        const taskToken = r1.data.taskToken;
        $.log(`do 拿到 taskToken=${taskToken.slice(-10)}`);

        // 2. 调 infinite/done 领奖
        const r2 = await post('/mtop/mf/act/infinite/done', ck, [
            {},
            { taskToken: taskToken, actId: ACT_ID, taskType: TASK_TYPE }
        ]);

        if (!r2 || r2.code !== 0) {
            const m = (r2 && (r2.message || r2.msg)) || '响应异常';
            $.msg($.name, `⚠️ ${userId} 领奖失败`, `code=${r2 && r2.code} ${m}`);
            $.log(`done raw: ${JSON.stringify(r2).slice(0, 400)}`);
            $.done();
            return;
        }

        // 解析奖励
        const awardList = (r2.data && r2.data.awardList) || [];
        const doneInSeries = r2.data && r2.data.taskInfo && r2.data.taskInfo.doneInSeriesCount;

        let awards = [];
        for (const a of awardList) {
            const name = a.awardName || a.customAwardName || '奖励';
            const val = a.awardValue;
            // conditionType=1 是当日基础奖, conditionType=4 是连签阶段奖
            const tag = a.conditionType === 4 ? '🎁阶段奖' : '';
            awards.push(`${tag}+${val} ${name}`);
        }

        const body = awards.length
            ? `${awards.join(' · ')}${doneInSeries ? ` · 连签 ${doneInSeries} 天` : ''}`
            : `连签 ${doneInSeries || '?'} 天`;

        $.log(`✅ ${body}`);
        $.msg($.name, `✅ ${userId} 签到成功`, body);
    } catch (e) {
        $.log(`❌ 异常: ${e.message || e}`);
        $.msg($.name, `❌ ${userId} 签到异常`, String(e.message || e));
    }

    $.done();
})();


// 发 POST 请求, body 是 JSON 数组(小米商城 mtop 接口惯例: [{}, {payload}])
function post(path, ck, bodyArr) {
    return new Promise((resolve) => {
        const opts = {
            url: API + path,
            headers: buildHeaders(ck),
            body: JSON.stringify(bodyArr),
        };
        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[${path}] 错误: ${JSON.stringify(err)}`);
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                $.log(`[${path}] 响应解析失败 status=${resp && resp.statusCode}: ${(data || '').slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

function buildHeaders(ck) {
    const h = {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
        'User-Agent': ck.ua || 'MiShop/2604270937 CFNetwork/3860.200.71 Darwin/25.1.0',
        'x-user-agent': 'channel/mishop platform/mishop.ios',
        'equipmenttype': '2',
        'priority': 'u=3, i',
        'cookie': ck.cookie,
    };
    if (ck.dId) h['d-id'] = ck.dId;
    if (ck.dModel) h['d-model'] = ck.dModel;
    return h;
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
