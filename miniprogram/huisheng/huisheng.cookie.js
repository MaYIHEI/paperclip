/**
 * 惠省红包墙 Cookie 抓取脚本
 *
 * 抓 listActivityCoupon 请求的 headers + body,存入持久化,供主脚本复用。
 * grantActivityCoupon 复用同一套 headers(经 cleanHeaders 处理 + mtgsig.a2 刷时间戳)。
 *
 * 触发方式:
 *   打开微信"惠省"小程序,首页停留 3 秒(自动调用 listActivityCoupon)即可。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-18
 *
 * [Script]
 * http-request ^https:\/\/media\.meituan\.com\/fulishemini\/couponActivity\/listActivityCoupon tag=惠省红包墙 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/huisheng/huisheng.cookie.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/huisheng.png
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
        const okH = $.setdata(JSON.stringify(headers), KEY_HEADERS);
        let okB = true;
        if (body && body.length > 10) okB = $.setdata(body, KEY_LIST_BODY);

        // 读回校验
        const verifyH = ($.getdata(KEY_HEADERS) || '').length;
        const verifyB = ($.getdata(KEY_LIST_BODY) || '').length;

        $.log(`[OK] headers ${Object.keys(headers).length} 个,body ${body.length} 字符;写入返回 H=${okH} B=${okB};读回验证 H=${verifyH} B=${verifyB}`);

        if (verifyH > 0 && verifyB > 0) {
            $.msg('惠省', '✅ 鉴权数据已落地', `headers ${verifyH} 字符 / body ${verifyB} 字符\n可关闭本脚本,主脚本可跑`);
        } else {
            $.msg('惠省', '⚠️ 写入异常', `存储读回为空 (H=${verifyH} B=${verifyB})\n检查 Loon 持久化存储权限`);
        }
    } catch (e) {
        $.log('[ERROR] ' + e);
        $.msg('惠省', '❌ 抓取异常', String(e));
    }
    $.done();
})();


function Env(s) {
    this.name = s;
    // 注意:Loon http-request 重写脚本里 $httpClient 是 undefined,只有 $persistentStore / $notification / $done
    // 所以用 $persistentStore 判断存储能力,而不是 $httpClient
    this.hasStore = () => typeof $persistentStore !== 'undefined';
    this.isQuanX = () => typeof $prefs !== 'undefined';
    this.log = (...a) => console.log(a.join('\n'));
    this.msg = (t = this.name, s = '', b = '') => {
        if (typeof $notification !== 'undefined') $notification.post(t, s, b);
        else if (typeof $notify !== 'undefined') $notify(t, s, b);
        console.log(['', '====📣' + t + '====', s, b].filter(Boolean).join('\n'));
    };
    this.getdata = (k) => {
        if (this.hasStore()) return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        return null;
    };
    this.setdata = (v, k) => {
        if (this.hasStore()) return $persistentStore.write(v, k);
        if (this.isQuanX()) return $prefs.setValueForKey(v, k);
        return false;
    };
    this.done = (v = {}) => { if (typeof $done !== 'undefined') $done(v); };
}
