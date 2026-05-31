/**
 * 微信支付笔笔省 - Cookie 抓取
 *
 * 进小程序"我的-提现笔笔省-天天领"页面,会自动触发本脚本抓取 session-token
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-12
 */

const $ = new Env("笔笔省 [Cookie]");

const KEY_TOKEN = 'bbs_session_token';
const KEY_APPID = 'bbs_appid';
const KEY_MODULE = 'bbs_module';
const KEY_PAGE = 'bbs_page';

(function main() {
    if (!$request) { $.done(); return; }
    if ($request.method === 'OPTIONS') { $.done(); return; }

    try {
        const headers = lowerHeaders($request.headers);
        const token = headers['session-token'];
        if (!token) {
            $.log('[INFO] 未抓到 session-token,可能不是登录态接口');
            $.done();
            return;
        }
        $.setdata(token, KEY_TOKEN);
        if (headers['x-appid']) $.setdata(headers['x-appid'], KEY_APPID);
        if (headers['x-module-name']) $.setdata(headers['x-module-name'], KEY_MODULE);
        if (headers['x-page']) $.setdata(headers['x-page'], KEY_PAGE);

        $.log(`[INFO] session-token 已更新, 长度 ${token.length}`);
        $.msg('笔笔省', '✅ Token 已更新', '可以关闭重写,等 cron 自动领券');
    } catch (e) {
        $.log('[ERROR] cookie 抓取失败: ' + e);
    }
    $.done();
})();

function lowerHeaders(h) {
    const out = {};
    Object.keys(h || {}).forEach((k) => { out[k.toLowerCase()] = h[k]; });
    return out;
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
    this.done = (v = {}) => { if (typeof $done !== 'undefined') $done(v); };
}
