/**
 * 米游社多游戏签到 + 米游币任务 Cookie 获取脚本
 *
 * 需要触发三次抓取:
 *   1. 打开米游社 APP,进入"我的"页面
 *      → 抓 api-takumi.miyoushe.com/binding/api/getUserGameRolesByStoken
 *      → 取 stoken cookie(给游戏角色列表接口用)
 *   2. 进任意游戏签到页面手动签到一次(原神/星穹铁道/绝区零任意一个都行)
 *      → 抓 api-takumi.mihoyo.com/event/luna/{biz}/info
 *      → 取 cookie_token_v2 + 完整 web headers(给 luna sign 用)
 *   3. 进 米游社 → 我的 → 米游币(任意页面触发任务状态查询即可)
 *      → 抓 bbs-api.miyoushe.com/apihub/sapi/getUserMissionsState
 *      → 取完整 BBS headers (给米游币任务接口用,带 DS/x-rpc-device_fp 等)
 *
 * 抓完三次后请关闭本脚本。
 *
 * @Refactored: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-05-13
 */

const $ = new Env("米游社 [Cookie]");

const KEY_STOKEN_COOKIE = 'mhy_stoken_cookie';
const KEY_WEB_COOKIE    = 'mhy_web_cookie';
const KEY_WEB_HEADERS   = 'mhy_web_headers';
const KEY_BBS_HEADERS   = 'mhy_bbs_headers';

(function main() {
    if (!$request) {
        $.log('[ERROR] 该脚本仅作为 http-request 重写脚本运行');
        $.done();
        return;
    }
    if ($request.method === 'OPTIONS') {
        $.done();
        return;
    }

    const url = $request.url;
    const headers = $request.headers || {};
    const cookie = headers.Cookie || headers.cookie || '';

    // 抓取 1: stoken cookie (游戏角色列表)
    if (/api-takumi\.miyoushe\.com\/binding\/api\/getUserGameRolesByStoken/.test(url)) {
        try {
            if (!/stoken=/.test(cookie)) {
                $.log('[WARN] 没有 stoken,跳过'); $.done(); return;
            }
            $.setdata(cookie, KEY_STOKEN_COOKIE);
            $.log(`[INFO] stoken cookie 已存: ${cookie.length}字符`);
            notify();
        } catch (e) { $.log('[ERROR] stoken cookie: ' + e); }
        $.done(); return;
    }

    // 抓取 2: web 签到 cookie + headers
    if (/api-takumi\.mihoyo\.com\/event\/luna\/[a-z0-9]+\/(info|home|sign)/.test(url)) {
        try {
            if (!/cookie_token/.test(cookie)) {
                $.log('[WARN] 没有 cookie_token,跳过'); $.done(); return;
            }
            $.setdata(cookie, KEY_WEB_COOKIE);
            $.setdata(JSON.stringify(headers), KEY_WEB_HEADERS);
            $.log(`[INFO] web cookie 已存: ${cookie.length}字符 headers ${Object.keys(headers).length}个`);
            notify();
        } catch (e) { $.log('[ERROR] web cookie: ' + e); }
        $.done(); return;
    }

    // 抓取 3: BBS headers (米游币任务用)
    if (/bbs-api\.miyoushe\.com\/apihub\/sapi\/getUserMissionsState/.test(url)) {
        try {
            if (!/stoken=/.test(cookie)) {
                $.log('[WARN] 没有 stoken,跳过'); $.done(); return;
            }
            $.setdata(JSON.stringify(headers), KEY_BBS_HEADERS);
            $.log(`[INFO] BBS headers 已存: ${Object.keys(headers).length}个`);
            notify();
        } catch (e) { $.log('[ERROR] BBS headers: ' + e); }
        $.done(); return;
    }

    $.done();
})();

function notify() {
    const has1 = !!$.getdata(KEY_STOKEN_COOKIE);
    const has2 = !!$.getdata(KEY_WEB_COOKIE);
    const has3 = !!$.getdata(KEY_BBS_HEADERS);
    const status = `${has1 ? '✅' : '⏳'} stoken  ${has2 ? '✅' : '⏳'} 签到  ${has3 ? '✅' : '⏳'} 任务`;

    let next = '';
    if (!has1) next = '\n👉 米游社 APP → 我的';
    else if (!has2) next = '\n👉 进任一游戏签到页面手动签到一次';
    else if (!has3) next = '\n👉 米游社 → 我的 → 米游币';
    else next = '\n✨ 全部就绪,可关闭本脚本';

    $.msg('米游社 Cookie', status, next);
}


// @Chavy minimal Env
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
    this.done = (v = {}) => { if (typeof $done !== 'undefined') $done(v); };
}
