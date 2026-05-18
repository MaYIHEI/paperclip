/**
 * 惠省红包墙 Cookie 抓取脚本
 *
 * 抓 listActivityCoupon 请求的 headers + body,存入持久化,供主脚本复用。
 * grantActivityCoupon 复用同一套 headers(经 cleanHeaders 处理 + mtgsig.a2 刷时间戳)。
 *
 * 触发方式:
 *   打开微信"惠省"小程序,首页停留 3 秒(自动调用 listActivityCoupon)即可。
 *
 * @Refactored: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-05-18
 *
 * [Script]
 * http-request ^https:\/\/media\.meituan\.com\/fulishemini\/couponActivity\/listActivityCoupon script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/huisheng/huisheng.cookie.js, requires-body=1, tag=惠省 [Cookie]
 *
 * [MITM]
 * hostname = media.meituan.com
 */

const $ = new Env("惠省 [Cookie]");

const KEY_HEADERS = 'huisheng_headers';
const KEY_LIST_BODY = 'huisheng_list_body';

(function main() {
    if (!$request) { $.log('[ERROR] 仅作为 http-request 重写脚本运行'); $.done(); return; }
    if ($request.method === 'OPTIONS') { $.done(); return; }

    try {
        const headers = $request.headers || {};
        let body = $request.body || '';

        // 保存
        $.setdata(JSON.stringify(headers), KEY_HEADERS);
        if (body && body.length > 10) $.setdata(body, KEY_LIST_BODY);

        $.log(`[OK] headers ${Object.keys(headers).length} 个,body ${body.length} 字符`);
        $.msg('惠省', '✅ 鉴权数据已抓取', `headers ${Object.keys(headers).length} 项 / body ${body.length} 字符\n可关闭本脚本,主脚本现在可跑`);
    } catch (e) {
        $.log('[ERROR] ' + e);
    }
    $.done();
})();


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
