/**
 * 万达电影 · Cookie 抓取
 *
 * 抓取:打开万达电影 APP → 底部「我的」(触发 user_info),抓 token + 设备指纹
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-10
 */

const $ = new Env('万达电影 [Cookie]');

const CK_KEY = 'wanda_data';

(function main() {
    if (typeof $request === 'undefined' || !$request) {
        $.log('[ERROR] 该脚本仅作为 http-request 重写脚本运行');
        $.done();
        return;
    }
    if ($request.method === 'OPTIONS') { $.done(); return; }

    try {
        // Loon 的 header key 可能大小写不一,统一小写后取
        const h = {};
        for (const k in $request.headers) h[k.toLowerCase()] = $request.headers[k];

        const token = h['x-ry-token'];
        const user = h['x-ry-user'];
        const shumei = h['shumeiboxid'] || '';

        if (!token || !user) {
            $.log(`[WARN] 缺鉴权头 token=${!!token} user=${!!user},换个页面再试`);
            $.done();
            return;
        }

        const data = { token, user, shumei };

        // token 没变就不重复写/通知
        const old = $.getdata(CK_KEY);
        if (old) {
            try {
                const o = JSON.parse(old);
                if (o.token === token && o.user === user) {
                    $.log('[INFO] token 未变,跳过更新');
                    $.done();
                    return;
                }
            } catch (e) {}
        }

        $.setdata(JSON.stringify(data), CK_KEY);
        $.log(`[INFO] 已更新 token, user=${mask(user)}`);
        $.msg('万达电影', '✅ 万达电影 Cookie 获取成功', `账号 ${mask(user)}`);
    } catch (e) {
        $.log('[ERROR] cookie 抓取失败: ' + e);
    }

    $.done();
})();

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
    this.done = (v = {}) => { if (typeof $done !== 'undefined') $done(v); };
}
