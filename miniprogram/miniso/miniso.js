/**
 * 名创优品 · 微信小程序「名创优品」每日签到 mini 币
 *
 * 用法:打开微信小程序「名创优品」→ 进入会员页(自动登录刷 token)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 *
 * ===== Loon =====
 * [MITM]
 * hostname = mini-cn.miniso.com
 * [Script]
 * http-response https:\/\/mini-cn\.miniso\.com\/api\/v3\/m-mini\/user\/login tag=名创优品 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png
 * cron "37 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js, tag=名创优品签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = mini-cn.miniso.com
 * [Script]
 * 名创优品 Cookie = type=http-response,pattern=https:\/\/mini-cn\.miniso\.com\/api\/v3\/m-mini\/user\/login,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png
 * 名创优品签到 = type=cron,cronexp=37 7 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = mini-cn.miniso.com
 * [rewrite_local]
 * https:\/\/mini-cn\.miniso\.com\/api\/v3\/m-mini\/user\/login url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js
 * [task_local]
 * 37 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js, tag=名创优品签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 名创优品签到
 *       cron: '37 7 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "mini-cn.miniso.com"
 *   script:
 *     - match: https:\/\/mini-cn\.miniso\.com\/api\/v3\/m-mini\/user\/login
 *       name: 名创优品 Cookie
 *       type: response
 *       require-body: true
 * script-providers:
 *   名创优品签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js
 *     interval: 86400
 */

const $ = new Env('名创优品');

const CK_NAME = 'miniso_data';
const SALT = 'ffe232&t%4df!67sx55eas';
const ACTIVITY_ID = '18';
const SIGNIN_TASK_ID = 79;
// 浏览任务通过 taskType=5 动态识别,无需写死 id
// uvClick → browse/finish 的等待秒数,真实抓包 25-39s,任务要求 20s
const BROWSE_WAIT_SEC_MIN = 21;
const BROWSE_WAIT_SEC_MAX = 30;
// 单次接口之间的间隔
const ACTION_INTERVAL_MS = 1500;

$.is_debug = $.getdata('mc_debug') === 'true';
$.userData = $.toObj($.isNode() ? process.env['MINISO_DATA'] : $.getdata(CK_NAME)) || null;
$.messages = [];
$.signSuccess = false;
$.browseSuccess = 0;
$.alreadyDone = 0;


// ============= 主流程 =============
async function main() {
    if (!$.userData) {
        throw new Error('未配置账号 Cookie,请先打开名创优品小程序的"任务中心"页面抓取 ❌');
    }
    const { openid, unionid, uid, skey, weappcode, appcode } = $.userData;
    if (!openid || !skey) throw new Error('Cookie 不完整,请重新抓取 ❌');

    $.log(`📱 用户 uid=${uid} openid=${openid.substring(0, 8)}...`);

    // JWT 过期检查
    const jwtPayload = parseJWT(skey);
    if (jwtPayload && jwtPayload.exp && jwtPayload.exp * 1000 < Date.now()) {
        const expDate = new Date(jwtPayload.exp * 1000).toISOString().slice(0, 10);
        throw new Error(`Cookie 已过期(${expDate}),请重新抓取 ❌`);
    }
    if (jwtPayload && jwtPayload.PHONE) {
        $.log(`📞 手机号: ${jwtPayload.PHONE.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}`);
    }

    // 1. 查 mini币余额(开始)
    const beforeCoin = await getCoin();
    $.beforeCoin = beforeCoin;
    $.log(`💰 当前 mini币: ${beforeCoin}`);

    // 2. 签到
    await signIn();
    await sleep(ACTION_INTERVAL_MS);

    // 3. 查未完成的浏览任务
    const pendingTasks = await getPendingBrowseTasks();
    $.log(`📋 待完成浏览任务: ${pendingTasks.length} 个 [${pendingTasks.map(t => t.taskId).join(', ')}]`);

    if (pendingTasks.length > 0) {
        // 4. 串行处理: 对每个任务 click → 等 → finish → receive
        $.log(`🎯 串行处理 ${pendingTasks.length} 个浏览任务,每个约 ${BROWSE_WAIT_SEC_MIN}-${BROWSE_WAIT_SEC_MAX}s...`);
        for (let i = 0; i < pendingTasks.length; i++) {
            const t = pendingTasks[i];
            const waitSec = randInt(BROWSE_WAIT_SEC_MIN, BROWSE_WAIT_SEC_MAX);
            $.log(`[${i + 1}/${pendingTasks.length}] ${t.taskName} (id=${t.taskId}) - 上报点击,等 ${waitSec}s...`);

            await uvClick(t.taskId);
            await sleep(waitSec * 1000);

            // 关键: 通知服务端"浏览已完成" (multibrands 域,需要 content-sign)
            const finishOk = await browseFinish(t.taskId);
            if (!finishOk) {
                $.messages.push(`❌ ${t.taskName}: browse/finish 失败`);
                continue;
            }

            await sleep(800);
            // 领奖
            await receiveBrowseAward(t.taskId, t.taskName);
            // 任务间随机停顿
            if (i < pendingTasks.length - 1) {
                await sleep(randInt(2000, 5000));
            }
        }
    } else {
        $.messages.push('📋 今日浏览任务已全部完成');
    }

    // 7. 查 mini币余额(结束)
    const afterCoin = await getCoin();
    $.afterCoin = afterCoin;
    const gained = (typeof beforeCoin === 'number' && typeof afterCoin === 'number') ? afterCoin - beforeCoin : '?';
    $.gained = gained;
    $.messages.push(`💰 mini币: ${beforeCoin} → ${afterCoin} (今日 +${gained})`);
}


// ============= 接口封装 =============

// 签到
async function signIn() {
    const res = await apiPost(
        'https://api-saas.miniso.com/task-manage-platform/api/activity/signInTask/award/receive',
        { activityId: ACTIVITY_ID, taskId: SIGNIN_TASK_ID }
    );
    if (res?.code === 200 && res?.success) {
        $.messages.push(`✅ 每日签到成功 (+20 mini币)`);
        $.signSuccess = true;
    } else if (/已完成|已签|已经/.test(res?.message || '')) {
        $.messages.push(`✨ 今日已签到`);
        $.signSuccess = true;
    } else {
        $.messages.push(`❌ 签到失败: ${res?.message || JSON.stringify(res)}`);
    }
}

// 查任务列表,返回所有未完成的浏览任务(taskType=5)
// 不写死 taskId — 名创换任务后自动识别新的,下架的也不会再尝试
async function getPendingBrowseTasks() {
    const url = `https://api-saas.miniso.com/task-manage-platform/api/activity/periodTask/taskDetail?activityId=${ACTIVITY_ID}&unionId=${$.userData.unionid}`;
    const res = await apiGet(url);
    if (res?.code !== 200) {
        $.log(`⚠️  拉取任务列表失败: ${JSON.stringify(res)}`);
        return [];
    }
    const pending = [];
    let totalBrowse = 0;
    for (const period of (res.data || [])) {
        for (const t of (period.periodTasks || [])) {
            if (t.taskType !== 5) continue;  // 只要浏览任务
            totalBrowse++;
            // buttonStatus === 3 = 已领取 UI 状态,跳过
            if (t.buttonStatus === 3) {
                if ($.is_debug) $.log(`  跳过已领取: ${t.taskName}`);
                $.alreadyDone++;
                continue;
            }
            pending.push({ taskId: t.taskId, taskName: t.taskName });
        }
    }
    $.totalBrowse = totalBrowse;
    return pending;
}

// 上报点击
async function uvClick(taskId) {
    const res = await apiPost(
        'https://api-saas.miniso.com/task-manage-platform/api/activity/task/uvClick',
        { activityId: ACTIVITY_ID, taskId: taskId, taskType: 5 }
    );
    if ($.is_debug) $.log(`  uvClick(${taskId}): ${JSON.stringify(res)}`);
}

// 浏览任务完成上报 (multibrands 域,需要 content-sign)
async function browseFinish(taskId) {
    const res = await apiPostMulti(
        'https://api.multibrands.miniso.com/multi-configure-platform/api/activity/task/browse/finish',
        { activityId: 18, taskId: taskId }   // 注意: activityId 是数字
    );
    if (res?.code === 200 && res?.success) {
        if ($.is_debug) $.log(`  browse/finish(${taskId}): ok`);
        return true;
    }
    $.log(`⚠️  browse/finish(${taskId}) 失败: ${JSON.stringify(res)}`);
    return false;
}

// 领浏览任务奖励
async function receiveBrowseAward(taskId, taskName) {
    const res = await apiPost(
        'https://api-saas.miniso.com/task-manage-platform/api/activity/periodTask/award/receive',
        { activityId: ACTIVITY_ID, taskId: taskId }
    );
    if (res?.code === 200 && res?.success) {
        const num = res?.data?.awardNum || 10;
        const name = res?.data?.awardName || `${num} mini币`;
        $.messages.push(`✅ ${taskName}: ${name}`);
        $.browseSuccess++;
        return;
    }
    // "不存在已完成待领取的奖励" / "已领取" / "已完成" 都当作已签状态
    const msg = res?.message || '';
    if (/已领取|已完成|不存在.*奖励/.test(msg)) {
        $.messages.push(`✨ ${taskName}: 今日已完成`);
        $.alreadyDone++;
        return;
    }
    $.messages.push(`❌ ${taskName}: ${msg || '失败'}`);
}

// 查 mini币余额
async function getCoin() {
    const res = await apiGet('https://api-saas.miniso.com/task-manage-platform/api/virtualCoin/member');
    return res?.data?.quantity ?? '?';
}


// ============= 签名 + 请求 =============

function getSignature(time, nonce) {
    return md5(`#storeexpress1.0#${SALT}#${time}#${nonce}`).toUpperCase();
}

function genNonce() {
    const chars = '1234567890qwertyuiopasdfghjklzxc';
    let out = '';
    for (let i = 0; i < chars.length; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
}

function buildHeaders() {
    const time = Date.now().toString();
    const nonce = genNonce();
    const sig = getSignature(time, nonce);
    const u = $.userData;
    return {
        'Host': 'api-saas.miniso.com',
        'Connection': 'keep-alive',
        'can-flash-send': 'true',
        'tenant': 'MINISO',
        'tenant-code': 'MINISO',
        'time': time,
        'nonce': nonce,
        'signature': sig,
        'version': 'storeexpress1.0',
        'X-Mi-Version': '5.1.70',
        'x-client-source': 'MINISO_WX_MINI',
        'content-type': 'application/json',
        'content-uid': String(u.uid || ''),
        'content-openid': u.openid || '',
        'content-unionid': u.unionid || '',
        'content-skey': u.skey || '',
        'content-weappcode': String(u.weappcode || '52'),
        'content-appcode': String(u.appcode || '51'),
        'content-sceneid': '1089',
        'content-latitude': '[object Undefined]',
        'content-longitude': '[object Undefined]',
        'content-pageType': '%E6%BD%AE%E7%8E%A9%E7%AD%BE%E5%88%B0%E9%A1%B5%E9%9D%A2',
        'content-pageName': '%E6%BD%AE%E7%8E%A9%E7%AD%BE%E5%88%B0%E9%A1%B5%E9%9D%A2',
        'X-Mi-Store-Id': 'Z8GW',
        'X-Mi-City': '',
        'Accept-Encoding': 'gzip,compress,br,deflate',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.73(0x1800492e) NetType/4G Language/zh_CN',
        'Referer': 'https://servicewechat.com/wx2a212470bade49bf/1092/page-frame.html',
    };
}

function apiGet(url) {
    return request({ url, method: 'GET', headers: buildHeaders() });
}

function apiPost(url, body) {
    const headers = buildHeaders();
    return request({ url, method: 'POST', headers, body: JSON.stringify(body) });
}

// === multibrands 域专用: 业务签名 content-sign ===
// 算法: MD5("k1=v1&k2=v2&...&key=0704demo"),字段含 body + openid + nonce(content-nonce),按 key 字典序
function getContentSign(body, openid, contentNonce) {
    const merged = Object.assign({}, body, { openid: openid, nonce: contentNonce });
    const keys = Object.keys(merged).sort();
    const parts = [];
    for (const k of keys) {
        let v = merged[k];
        if (v && typeof v === 'object') v = JSON.stringify(v);
        // 抓包看是 k=v 形式 (空值会被脚本原版逻辑跳过,这里简化:有值就拼)
        if (v !== '' && v !== null && v !== undefined) {
            parts.push(`${k}=${v}`);
        }
    }
    const plain = parts.join('&') + '&key=0704demo';
    return md5(plain).toUpperCase();
}

function buildMultiHeaders(body) {
    const base = buildHeaders();
    base['Host'] = 'api.multibrands.miniso.com';
    base['content-pageType'] = '%E8%90%BD%E5%9C%B0%E9%A1%B5';
    base['content-pageName'] = '%E8%90%BD%E5%9C%B0%E9%A1%B5';
    // multibrands 域专属: content-sign
    const contentNonce = Date.now().toString();
    base['content-nonce'] = contentNonce;
    base['content-sign'] = getContentSign(body, $.userData.openid, contentNonce);
    return base;
}

function apiPostMulti(url, body) {
    const headers = buildMultiHeaders(body);
    return request({ url, method: 'POST', headers, body: JSON.stringify(body) });
}

function request(opt) {
    return new Promise((resolve) => {
        const cb = (err, resp, data) => {
            if (err) {
                $.log(`❌ 请求出错: ${JSON.stringify(err)}`);
                return resolve(null);
            }
            const code = resp?.statusCode || resp?.status;
            if ($.is_debug) $.log(`  [${code}] ${opt.method} ${opt.url}\n    -> ${(data || '').substring(0, 200)}`);
            if (code !== 200) {
                $.log(`⚠️  HTTP ${code}: ${(data || '').substring(0, 200)}`);
            }
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                resolve({ raw: data });
            }
        };
        if (opt.method === 'POST') $.post(opt, cb);
        else $.get(opt, cb);
    });
}


// ============= cookie 抓取(http-request 模式) =============
function getCookie() {
    try {
        if ($request.method === 'OPTIONS') return;
        const h = ObjectKeys2LowerCase($request.headers);
        const openid = h['content-openid'];
        const unionid = h['content-unionid'];
        const uid = h['content-uid'];
        const skey = h['content-skey'];
        const weappcode = h['content-weappcode'];
        const appcode = h['content-appcode'];

        if (!openid || !skey) {
            $.log(`⚠️ 缺少 openid 或 skey, 当前请求头: ${Object.keys(h).join(',')}`);
            return;
        }

        const newData = { openid, unionid, uid, skey, weappcode, appcode };
        $.setjson(newData, CK_NAME);

        const phone = (parseJWT(skey) || {}).PHONE || '';
        const masked = phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : openid.substring(0, 8) + '...';
        $.msg($.name, '🎉 Cookie 更新成功', `账号: ${masked}`);
    } catch (e) {
        $.log(`❌ Cookie 抓取异常: ${e.message || e}`);
    }
}


// ============= 工具 =============

function parseJWT(token) {
    try {
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (payload.length % 4) payload += '=';
        let decoded;
        if (typeof Buffer !== 'undefined') {
            decoded = Buffer.from(payload, 'base64').toString('utf-8');
        } else {
            decoded = decodeURIComponent(escape(atob(payload)));
        }
        return JSON.parse(decoded);
    } catch (e) {
        return null;
    }
}

function ObjectKeys2LowerCase(obj) {
    return Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => [k.toLowerCase(), v]));
}

// 纯 JS MD5 (无外部依赖,Loon/Surge/QX/Stash/Node 通用)
function md5(s){
    function rh(n){var s='',j;for(var i=0;i<=3;i++){j=(n>>>(i*8))&255;s+='0123456789abcdef'.charAt((j>>>4)&15)+'0123456789abcdef'.charAt(j&15);}return s;}
    function ad(x,y){var l=(x&65535)+(y&65535);return ((x>>16)+(y>>16)+(l>>16))<<16|l&65535;}
    function rol(n,c){return n<<c|n>>>32-c;}
    function cm(q,a,b,x,s,t){return ad(rol(ad(ad(a,q),ad(x,t)),s),b);}
    function ff(a,b,c,d,x,s,t){return cm((b&c)|((~b)&d),a,b,x,s,t);}
    function gg(a,b,c,d,x,s,t){return cm((b&d)|(c&(~d)),a,b,x,s,t);}
    function hh(a,b,c,d,x,s,t){return cm(b^c^d,a,b,x,s,t);}
    function ii(a,b,c,d,x,s,t){return cm(c^(b|(~d)),a,b,x,s,t);}
    function c2b(s){var b=[],m=(1<<8)-1;for(var i=0;i<s.length*8;i+=8)b[i>>5]|=(s.charCodeAt(i/8)&m)<<i%32;return b;}
    s=unescape(encodeURIComponent(s));
    var x=c2b(s),a=1732584193,b=-271733879,c=-1732584194,d=271733878;
    x[s.length>>2]|=128<<((s.length%4)*8);x[(((s.length+8)>>6)*16)+14]=s.length*8;
    for(var i=0;i<x.length;i+=16){var oa=a,ob=b,oc=c,od=d;
        a=ff(a,b,c,d,x[i+0],7,-680876936);d=ff(d,a,b,c,x[i+1],12,-389564586);c=ff(c,d,a,b,x[i+2],17,606105819);b=ff(b,c,d,a,x[i+3],22,-1044525330);
        a=ff(a,b,c,d,x[i+4],7,-176418897);d=ff(d,a,b,c,x[i+5],12,1200080426);c=ff(c,d,a,b,x[i+6],17,-1473231341);b=ff(b,c,d,a,x[i+7],22,-45705983);
        a=ff(a,b,c,d,x[i+8],7,1770035416);d=ff(d,a,b,c,x[i+9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,-42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
        a=ff(a,b,c,d,x[i+12],7,1804603682);d=ff(d,a,b,c,x[i+13],12,-40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);b=ff(b,c,d,a,x[i+15],22,1236535329);
        a=gg(a,b,c,d,x[i+1],5,-165796510);d=gg(d,a,b,c,x[i+6],9,-1069501632);c=gg(c,d,a,b,x[i+11],14,643717713);b=gg(b,c,d,a,x[i+0],20,-373897302);
        a=gg(a,b,c,d,x[i+5],5,-701558691);d=gg(d,a,b,c,x[i+10],9,38016083);c=gg(c,d,a,b,x[i+15],14,-660478335);b=gg(b,c,d,a,x[i+4],20,-405537848);
        a=gg(a,b,c,d,x[i+9],5,568446438);d=gg(d,a,b,c,x[i+14],9,-1019803690);c=gg(c,d,a,b,x[i+3],14,-187363961);b=gg(b,c,d,a,x[i+8],20,1163531501);
        a=gg(a,b,c,d,x[i+13],5,-1444681467);d=gg(d,a,b,c,x[i+2],9,-51403784);c=gg(c,d,a,b,x[i+7],14,1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);
        a=hh(a,b,c,d,x[i+5],4,-378558);d=hh(d,a,b,c,x[i+8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16,1839030562);b=hh(b,c,d,a,x[i+14],23,-35309556);
        a=hh(a,b,c,d,x[i+1],4,-1530992060);d=hh(d,a,b,c,x[i+4],11,1272893353);c=hh(c,d,a,b,x[i+7],16,-155497632);b=hh(b,c,d,a,x[i+10],23,-1094730640);
        a=hh(a,b,c,d,x[i+13],4,681279174);d=hh(d,a,b,c,x[i+0],11,-358537222);c=hh(c,d,a,b,x[i+3],16,-722521979);b=hh(b,c,d,a,x[i+6],23,76029189);
        a=hh(a,b,c,d,x[i+9],4,-640364487);d=hh(d,a,b,c,x[i+12],11,-421815835);c=hh(c,d,a,b,x[i+15],16,530742520);b=hh(b,c,d,a,x[i+2],23,-995338651);
        a=ii(a,b,c,d,x[i+0],6,-198630844);d=ii(d,a,b,c,x[i+7],10,1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);b=ii(b,c,d,a,x[i+5],21,-57434055);
        a=ii(a,b,c,d,x[i+12],6,1700485571);d=ii(d,a,b,c,x[i+3],10,-1894986606);c=ii(c,d,a,b,x[i+10],15,-1051523);b=ii(b,c,d,a,x[i+1],21,-2054922799);
        a=ii(a,b,c,d,x[i+8],6,1873313359);d=ii(d,a,b,c,x[i+15],10,-30611744);c=ii(c,d,a,b,x[i+6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21,1309151649);
        a=ii(a,b,c,d,x[i+4],6,-145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+2],15,718787259);b=ii(b,c,d,a,x[i+9],21,-343485551);
        a=ad(a,oa);b=ad(b,ob);c=ad(c,oc);d=ad(d,od);
    }
    return rh(a)+rh(b)+rh(c)+rh(d);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function sendMsg(subtitle, body) {
    if (!body) return;
    if ($.isNode()) {
        try {
            const notify = require('./sendNotify');
            await notify.sendNotify($.name + ' ' + subtitle, body);
        } catch (e) { $.log(body); }
    } else {
        $.msg($.name, subtitle, body);
    }
}

if (typeof $request !== 'undefined') {
    getCookie();
    $.done();
} else {
    !(async () => {
        await main();
    })()
        .catch(e => { $.messages.push(`❌ ${e.message || e}`); $.log(e); })
        .finally(async () => {
            // 构造汇总副标题
            const signTxt = $.signSuccess ? '签到 ✓' : '签到 ✗';
            const done = $.browseSuccess + $.alreadyDone;
            const total = $.totalBrowse || 9;
            const browseTxt = `浏览 ${done}/${total}`;
            const coinTxt = (typeof $.gained === 'number') ? `+${$.gained} mini币` : '';
            const subtitle = [signTxt, browseTxt, coinTxt].filter(Boolean).join(' · ');
            await sendMsg(subtitle, $.messages.join('\n').trim());
            $.done();
        });
}


// prettier-ignore
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, a) => { s.call(this, t, (t, s, r) => { t ? a(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } getEnv() { return "undefined" != typeof $environment && $environment["surge-version"] ? "Surge" : "undefined" != typeof $environment && $environment["stash-version"] ? "Stash" : "undefined" != typeof module && module.exports ? "Node.js" : "undefined" != typeof $task ? "Quantumult X" : "undefined" != typeof $loon ? "Loon" : "undefined" != typeof $rocket ? "Shadowrocket" : void 0 } isNode() { return "Node.js" === this.getEnv() } isQuanX() { return "Quantumult X" === this.getEnv() } isSurge() { return "Surge" === this.getEnv() } isLoon() { return "Loon" === this.getEnv() } isShadowrocket() { return "Shadowrocket" === this.getEnv() } isStash() { return "Stash" === this.getEnv() } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const a = this.getdata(t); if (a) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, a) => e(a)) }) } runScript(t, e) { return new Promise(s => { let a = this.getdata("@chavy_boxjs_userCfgs.httpapi"); a = a ? a.replace(/\n/g, "").trim() : a; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [i, o] = a.split("@"), n = { url: `http://${o}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": i, Accept: "*/*" }, timeout: r }; this.post(n, (t, e, a) => s(a)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), a = !s && this.fs.existsSync(e); if (!s && !a) return {}; { const a = s ? t : e; try { return JSON.parse(this.fs.readFileSync(a)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), a = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : a ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const a = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of a) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, a) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[a + 1]) >> 0 == +e[a + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, a] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, a, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, a, r] = /^@(.*?)\.(.*?)$/.exec(e), i = this.getval(a), o = a ? "null" === i ? null : i || "{}" : "{}"; try { const e = JSON.parse(o); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), a) } catch (e) { const i = {}; this.lodash_set(i, r, t), s = this.setval(JSON.stringify(i), a) } } else s = this.setval(t, e); return s } getval(t) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.read(t); case "Quantumult X": return $prefs.valueForKey(t); case "Node.js": return this.data = this.loaddata(), this.data[t]; default: return this.data && this.data[t] || null } } setval(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": return $persistentStore.write(t, e); case "Quantumult X": return $prefs.setValueForKey(t, e); case "Node.js": return this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0; default: return this.data && this.data[e] || null } } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { switch (t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"], delete t.headers["content-type"], delete t.headers["content-length"]), t.params && (t.url += "?" + this.queryStr(t.params)), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, a) => { !t && s && (s.body = a, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, a) }); break; case "Quantumult X": this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: a, headers: r, body: i, bodyBytes: o } = t; e(null, { status: s, statusCode: a, headers: r, body: i, bodyBytes: o }, i, o) }, t => e(t && t.error || "UndefinedError")); break; case "Node.js": let s = require("iconv-lite"); this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: a, statusCode: r, headers: i, rawBody: o } = t, n = s.decode(o, this.encoding); e(null, { status: a, statusCode: r, headers: i, rawBody: o, body: n }, n) }, t => { const { message: a, response: r } = t; e(a, r, r && s.decode(r.rawBody, this.encoding)) }) } } post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : "post"; switch (t.body && t.headers && !t.headers["Content-Type"] && !t.headers["content-type"] && (t.headers["content-type"] = "application/x-www-form-urlencoded"), t.headers && (delete t.headers["Content-Length"], delete t.headers["content-length"]), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient[s](t, (t, s, a) => { !t && s && (s.body = a, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, a) }); break; case "Quantumult X": t.method = s, this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: a, headers: r, body: i, bodyBytes: o } = t; e(null, { status: s, statusCode: a, headers: r, body: i, bodyBytes: o }, i, o) }, t => e(t && t.error || "UndefinedError")); break; case "Node.js": let a = require("iconv-lite"); this.initGotEnv(t); const { url: r, ...i } = t; this.got[s](r, i).then(t => { const { statusCode: s, statusCode: r, headers: i, rawBody: o } = t, n = a.decode(o, this.encoding); e(null, { status: s, statusCode: r, headers: i, rawBody: o, body: n }, n) }, t => { const { message: s, response: r } = t; e(s, r, r && a.decode(r.rawBody, this.encoding)) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let a = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in a) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? a[e] : ("00" + a[e]).substr(("" + a[e]).length))); return t } queryStr(t) { let e = ""; for (const s in t) { let a = t[s]; null != a && "" !== a && ("object" == typeof a && (a = JSON.stringify(a)), e += `${s}=${a}&`) } return e = e.substring(0, e.length - 1), e } msg(e = t, s = "", a = "", r) { const i = t => { switch (typeof t) { case void 0: return t; case "string": switch (this.getEnv()) { case "Surge": case "Stash": default: return { url: t }; case "Loon": case "Shadowrocket": return t; case "Quantumult X": return { "open-url": t }; case "Node.js": return }case "object": switch (this.getEnv()) { case "Surge": case "Stash": case "Shadowrocket": default: { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } case "Loon": { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } case "Quantumult X": { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl, a = t["update-pasteboard"] || t.updatePasteboard; return { "open-url": e, "media-url": s, "update-pasteboard": a } } case "Node.js": return }default: return } }; if (!this.isMute) switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": default: $notification.post(e, s, a, i(r)); break; case "Quantumult X": $notify(e, s, a, i(r)); break; case "Node.js": }if (!this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), a && t.push(a), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { switch (this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: this.log("", `❗️${this.name}, 错误!`, t); break; case "Node.js": this.log("", `❗️${this.name}, 错误!`, t.stack) } } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; switch (this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), this.getEnv()) { case "Surge": case "Loon": case "Stash": case "Shadowrocket": case "Quantumult X": default: $done(t); break; case "Node.js": process.exit(1) } } }(t, e) }
