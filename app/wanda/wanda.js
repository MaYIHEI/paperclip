/**
 * 万达电影 · 每日签到(成长值 +1)
 *
 * 抓取:打开万达电影 APP →「我的」,见 wanda.cookie.js
 * 签到:cron 定时。签名 x-ry-check 由小程序 wasm 算,Loon 跑不了 wasm,
 *      故委托自建 Worker(见 signer/)计算,token 不出本机。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-10
 */

const $ = new Env('万达电影');

const SCRIPT_VERSION = '2026-06-10.r1'; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = 'wanda_data';
const API = 'https://front-gateway-c.wandafilm.com';
const SIGN_URI = '/sign_in/do_sign_in.api';
const DEBUG = JSON.parse($.getdata('wanda_debug') || 'false');

// 签名服务地址:部署 signer/ 后填这里,或在 BoxJS 写 wanda_signer_url
const SIGNER_URL = $.getdata('wanda_signer_url') || 'https://wanda-signer.YOUR-SUBDOMAIN.workers.dev';

if (JSON.parse($.getdata('wanda_clear') || 'false')) {
    $.setdata('', CK_KEY);
    $.setdata('false', 'wanda_clear');
    $.msg($.name, '', '✅ Cookie 已清除，请重新抓取');
    $.done();
} else {
(async () => {
    const raw = $.getdata(CK_KEY);
    if (!raw) {
        $.msg($.name, '🚫 缺少 Cookie',
            '请先开启 Cookie 抓取脚本,再打开万达电影 APP →「我的」');
        $.done();
        return;
    }

    let ck;
    try { ck = JSON.parse(raw); } catch (e) {
        $.msg($.name, '🚫 Cookie 解析失败', '请清空缓存重抓');
        $.done();
        return;
    }
    if (!ck.token || !ck.user) {
        $.msg($.name, '🚫 Cookie 不完整', '缺 token/user,请重抓');
        $.done();
        return;
    }
    if (/YOUR-SUBDOMAIN/.test(SIGNER_URL)) {
        $.msg($.name, '🚫 未配置签名服务', '请部署 signer/ 并把 Worker 地址填到 wanda_signer_url');
        $.done();
        return;
    }

    const user = mask(ck.user);
    const signInDate = todayCN();
    const ts = Date.now();
    const bodyStr = JSON.stringify({ signInDate, ruleScene: 1, json: 'true' });
    $.log(`▶️ 开始签到 user=${user} date=${signInDate}`);

    // 1. 委托 Worker 算签名(同一个 ts 必须贯穿到万达请求)
    const check = await getCheck(ts, SIGN_URI, bodyStr);
    if (!check) {
        $.msg($.name, `❌ ${user} 签到失败`, '签名服务无响应,检查 Worker 是否部署/可达');
        $.done();
        return;
    }
    if (DEBUG) $.log(`[DEBUG] ts=${ts} check=${check}`);

    // 2. 带签名打万达签到接口
    const resp = await doSign(ck, ts, check, bodyStr);
    if (!resp) {
        $.msg($.name, `❌ ${user} 签到失败`, '万达接口无响应,请查看日志');
        $.done();
        return;
    }

    // 错误分流
    // code 403 The signature validate failure → 签名/token 问题
    if (resp.code === 403 || /signature/i.test(resp.msg || '')) {
        $.msg($.name, `🔐 ${user} 签名校验失败`,
            'token 可能已失效,请重开万达 APP「我的」重抓 Cookie');
        $.log(`[ERR] 403: ${JSON.stringify(resp).slice(0, 300)}`);
        $.done();
        return;
    }
    if (resp.code !== 0) {
        $.msg($.name, `❌ ${user} 签到失败`, `code=${resp.code} ${resp.msg || ''}`);
        $.log(`[ERR] ${JSON.stringify(resp).slice(0, 400)}`);
        $.done();
        return;
    }

    // code 0:业务态在 data.bizCode / data.data
    const biz = resp.data || {};
    const inner = biz.data || {};
    if (biz.bizCode === 1004 || /已签|重复/.test(biz.bizMsg || '')) {
        $.msg($.name, `✨ ${user} 今日已签`, biz.bizMsg || '已签到过了');
    } else {
        const m = inner.successMessage || '签到成功';
        $.msg($.name, `✅ ${user} 签到成功`, m);
    }
    $.log(`[OK] ${JSON.stringify(resp).slice(0, 300)}`);
    $.done();
})();
}

// 调用签名 Worker:POST {ts, uri, body} → { check }
function getCheck(ts, uri, body) {
    return new Promise((resolve) => {
        const opts = {
            url: SIGNER_URL,
            timeout: 15,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ts, uri, body }),
        };
        $.post(opts, (err, resp, data) => {
            if (err) { $.log(`[signer] 错误: ${JSON.stringify(err)}`); resolve(null); return; }
            try {
                const j = JSON.parse(data);
                if (!j.check) { $.log(`[signer] 无 check: ${(data || '').slice(0, 200)}`); resolve(null); return; }
                resolve(j.check);
            } catch (e) {
                $.log(`[signer] 解析失败 status=${resp && resp.statusCode}: ${(data || '').slice(0, 200)}`);
                resolve(null);
            }
        });
    });
}

// 打万达签到接口(body 发原始 JSON,签名对 urlEncode 后的 body 算 —— Worker 已处理)
function doSign(ck, ts, check, bodyStr) {
    return new Promise((resolve) => {
        const mxapi = JSON.stringify({
            ver: '6.5.3', sCode: 'Wanda', _mi_: ck.token, width: 1280, json: true,
            cCode: 'XIAOCHENGXUGP', check, ts, heigth: 720, appId: 3,
        });
        const headers = {
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
            'User-Agent': 'WandaFilm MiniProgram',
            'X-Mtime-Platform-Id': '3',
            'MX-API': mxapi,
            'X-RY-CHANNEL': 'XIAOCHENGXUGP',
            'X-RY-TIMESTAMP': String(ts),
            'X-RY-VERSION': '6.5.3',
            'X-RY-TOKEN': ck.token,
            'X-RY-CHECK': check,
            'X-RY-USER': ck.user,
        };
        if (ck.shumei) headers['ShumeiBoxId'] = ck.shumei;

        $.post({ url: API + SIGN_URI, timeout: 20, headers, body: bodyStr }, (err, resp, data) => {
            if (err) { $.log(`[doSign] 错误: ${JSON.stringify(err)}`); resolve(null); return; }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                $.log(`[doSign] 解析失败 status=${resp && resp.statusCode}: ${(data || '').slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// 东八区今天 YYYY-MM-DD(cron 在本机时区跑,统一按北京时间算签到日)
function todayCN() {
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function mask(s) {
    if (!s) return '未知';
    if (s.length <= 4) return s;
    return s.slice(0, 2) + '****' + s.slice(-2);
}

// @Chavy Env
function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== 'undefined';
    this.isQuanX = () => typeof $task !== 'undefined';
    this.isLoon = () => typeof $loon !== 'undefined';
    this.log = (...a) => console.log(a.join('\n'));
    this.msg = (t = this.name, s = '', b = '') => {
        if (typeof $notification !== 'undefined') $notification.post(t, s, b);
        else if (this.isQuanX()) $notify(t, s, b);
        console.log(['', '====📣' + t + '====', s, b].filter(Boolean).join('\n'));
    };
    this.getdata = (k) => {
        if (typeof $persistentStore !== 'undefined') return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        return null;
    };
    this.setdata = (v, k) => {
        if (typeof $persistentStore !== 'undefined') return $persistentStore.write(v, k);
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
