/**
 * 微博超话 · Cookie 抓取
 *
 * 抓取①:打开微博 APP → 我的 → 超话社区 → 我的 → 关注,抓关注列表请求(container_timeline_topicsub)
 * 抓取②:在超话页手动签到一次,抓签到请求(page/button · X-Validator 与路径绑定,必须分开抓)
 *
 * @Author: @Evilbutcher / @toulanboy
 * @Modifier: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-09
 */

const $ = new Env("微博超话 [Cookie]");

const KEY_LIST_URL = 'evil_tokenurl';
const KEY_LIST_HEADERS = 'evil_tokenheaders';
const KEY_LIST_BODY = 'evil_tokenbody';
const KEY_CHECKIN_URL = 'evil_tokencheckinurl';
const KEY_CHECKIN_HEADERS = 'evil_tokencheckinheaders';

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

    // 抓取 1: 关注超话列表
    if (/\/2\/statuses\/container_timeline_topicsub/.test(url)) {
        try {
            const headers = $request.headers;
            let body = $request.body || '';
            if (!body || body.length < 10) {
                body = 'filterGroupStyle=1&flowId=232478_-_mine_topic&flowVersion=0.0.1&lfid=profile_me&luicode=10000011&mix_media_enable=1&moduleID=pagecard&orifid=profile_me&oriuicode=10000011&pageDataType=flow&sg_tab_config=2&source_code=10000011_profile_me&taskType=refresh&uicode=10001387';
                $.log('[INFO] 未抓到 body,使用兜底默认值');
            }
            $.setdata(url, KEY_LIST_URL);
            $.setdata(JSON.stringify(headers), KEY_LIST_HEADERS);
            $.setdata(body, KEY_LIST_BODY);
            $.log(`[INFO] 列表 cookie: url=${url.length}字符 headers=${Object.keys(headers).length}个 body=${body.length}字符`);

            const checkinExists = !!$.getdata(KEY_CHECKIN_URL);
            const subtitle = '✅ 已获取关注列表 Cookie';
            const body_msg = checkinExists
                ? '✨ 列表 + 签到 cookie 都已就绪,可关闭本脚本'
                : '🔍 接下来请进一个超话手动签到一次,以获取签到 cookie';
            $.msg('微博超话', subtitle, body_msg);
        } catch (e) {
            $.log('[ERROR] 列表 cookie 抓取失败: ' + e);
        }
        $.done();
        return;
    }

    // 抓取 2: 签到接口 (放宽: 只要 page/button 路径就尝试存,签到/已签都能命中)
    // 这样 active_checkin / 已签状态查询 等任何 button 接口都能用
    if (/\/2\/page\/button/.test(url)) {
        try {
            const headers = $request.headers;
            $.setdata(url, KEY_CHECKIN_URL);
            $.setdata(JSON.stringify(headers), KEY_CHECKIN_HEADERS);
            $.log(`[INFO] 签到 cookie: url=${url.length}字符 headers=${Object.keys(headers).length}个`);
            $.log(`[INFO] 签到 url 含 active_checkin: ${/active_checkin/.test(url)}`);

            const listExists = !!$.getdata(KEY_LIST_URL);
            const subtitle = '🎉 已获取签到 Cookie';
            const body_msg = listExists
                ? '✨ 列表 + 签到 cookie 都已就绪,请关闭本脚本'
                : '⚠️ 还需要进关注列表页抓取列表 cookie';
            $.msg('微博超话', subtitle, body_msg);
        } catch (e) {
            $.log('[ERROR] 签到 cookie 抓取失败: ' + e);
        }
        $.done();
        return;
    }

    $.done();
})();


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
