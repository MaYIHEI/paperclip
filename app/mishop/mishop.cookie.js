/**
 * 小米商城 Cookie 抓取脚本
 *
 * 抓取方式: 打开小米商城 APP → 首页 → "米金商城" → 点签到按钮
 *   → 触发 /mtop/mf/act/infinite/do 或 done
 *   → 自动抓 cookie + userId + 其他必要 headers
 *
 * 抓完关闭本脚本即可。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-27
 */

const $ = new Env('小米商城 [Cookie]');

const CK_KEY = 'mishop_data';

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

    try {
        const headers = lowerHeaders($request.headers);

        // 小米商城 APP 用 HTTP/2 多个 cookie 头分别发送:
        //   cookie: serviceToken=...
        //   cookie: userId=...
        //   cookie: xmUuid=...
        // Loon/QX 合并方式不固定(可能是数组/换行/逗号/分号),统一规范成 "k1=v1; k2=v2; k3=v3"
        const cookie = normalizeCookie(headers['cookie']);
        if (!cookie || !/serviceToken=/.test(cookie)) {
            $.log('[WARN] cookie 里没有 serviceToken,跳过');
            $.done();
            return;
        }

        const userId = pickCookie(cookie, 'userId') || '';
        const ua = headers['user-agent'] || '';
        const dId = headers['d-id'] || '';
        const dModel = headers['d-model'] || '';

        const data = {
            cookie: cookie,
            userId: userId,
            ua: ua,
            dId: dId,
            dModel: dModel,
        };

        const old = $.getdata(CK_KEY) || '';
        if (old) {
            try {
                const oldObj = JSON.parse(old);
                if (oldObj.cookie === data.cookie) {
                    $.log('[INFO] Cookie 未变,跳过更新');
                    $.done();
                    return;
                }
            } catch (e) {}
        }

        const ok = $.setdata(JSON.stringify(data), CK_KEY);
        // 写后读回校验 (huisheng 经验: setdata 在重写环境可能静默失败)
        const verify = ($.getdata(CK_KEY) || '').length;

        if (verify > 0) {
            $.log(`[INFO] Cookie 已更新, userId=${userId}, cookie ${cookie.length}字符, 读回 ${verify}字符`);
            $.msg('小米商城', '✅ Cookie 获取成功', `账号 ${userId} · 请关闭本脚本`);
        } else {
            $.log(`[ERROR] setdata 写入失败 (ok=${ok} verify=${verify})`);
            $.msg('小米商城', '⚠️ Cookie 写入失败', '存储读回为空,检查代理工具持久化权限');
        }
    } catch (e) {
        $.log('[ERROR] cookie 抓取失败: ' + e);
    }

    $.done();
})();

function pickCookie(cookie, key) {
    const m = cookie.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]+)'));
    return m ? m[1] : '';
}

// 把 Loon/QX 拿到的 cookie 值统一规范成 "k1=v1; k2=v2; ..." 形式
// 输入可能是:
//   - string("a=1; b=2")                             分号合并
//   - string("a=1\ncookie: b=2\ncookie: c=3")        Loon HTTP/2 多头换行合并(残留 "cookie:" 前缀)
//   - string("a=1\nb=2")                             换行合并无前缀
//   - Array(["a=1","b=2","c=3"])                     数组
function normalizeCookie(raw) {
    if (!raw) return '';
    let parts = [];
    if (Array.isArray(raw)) {
        parts = raw;
    } else {
        parts = String(raw).split(/\r?\n/);
    }
    const flat = [];
    for (const p of parts) {
        let s = String(p).trim();
        if (!s) continue;
        // 清掉 Loon 合并多 header 时可能残留的 "cookie:" / "Cookie:" 前缀
        s = s.replace(/^cookie\s*:\s*/i, '').trim();
        if (!s) continue;
        flat.push(s);
    }
    return flat.join('; ');
}

function lowerHeaders(h) {
    const out = {};
    Object.keys(h || {}).forEach((k) => { out[k.toLowerCase()] = h[k]; });
    return out;
}

function Env(s) {
    this.name = s;
    // 注意:Loon http-request 重写脚本里 $httpClient / $loon 都可能 undefined,
    // 用 $persistentStore 判存储能力更稳。huisheng 第一版栽过这个坑。
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
