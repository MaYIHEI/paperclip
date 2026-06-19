/**
 * WPS · 每日签到 + 福利中心(打卡/抽奖/会员试用申请/限量爆款领取),送积分与会员时长
 *
 * 抓取:打开「WPS」APP → 进任意活动页(任务中心/福利中心)→ 自动触发 page_info,抓 wps_sid
 * 签到:cron 10 点触发,抢完限量爆款顺手做签到等其余任务,逐个串行、动作间随机间隔(细节见 README)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-19
 *
 * ===== Loon =====
 * [MITM]
 * hostname = personal-act.wps.cn
 * [Script]
 * http-request ^https:\/\/personal-act\.wps\.cn\/activity-rubik\/activity\/page_info tag=WPS Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png
 * cron "0 10 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.js, tag=WPS签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = personal-act.wps.cn
 * [Script]
 * WPS Cookie = type=http-request,pattern=^https:\/\/personal-act\.wps\.cn\/activity-rubik\/activity\/page_info,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png
 * WPS签到 = type=cron,cronexp=0 10 * * *,timeout=120,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = personal-act.wps.cn
 * [rewrite_local]
 * ^https:\/\/personal-act\.wps\.cn\/activity-rubik\/activity\/page_info url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.cookie.js
 * [task_local]
 * 0 10 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.js, tag=WPS签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: WPS签到
 *       cron: '0 10 * * *'
 *       timeout: 120
 * http:
 *   mitm:
 *     - "personal-act.wps.cn"
 *   script:
 *     - match: ^https:\/\/personal-act\.wps\.cn\/activity-rubik\/activity\/page_info
 *       name: WPS Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   WPS签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.js
 *     interval: 86400
 */

const $ = new Env("WPS");

const SCRIPT_VERSION = "2026-06-19.r3"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = "wps_sid";

// ===== 接口 =====
const ISLOGIN = "https://account.wps.cn/api/v3/islogin";        // 动态取 user_id(脚本不硬编码任何账号信息)
const ENC_KEY = "https://personal-bus.wps.cn/sign_in/v1/encrypt/key"; // 服务端全局公钥(所有用户共用,每次现拉)
const DAY_INFO = "https://personal-bus.wps.cn/sign_in/v1/day_info";
const SIGN_IN = "https://personal-bus.wps.cn/sign_in/v1/sign_in";
const COMPONENT = "https://personal-act.wps.cn/activity-rubik/activity/component_action";

// ===== 福利中心活动「WPS618 天天领福利」的组件标识(活动换期需更新) =====
const FLZX = { activity_number: "HD2025031721339450", page_number: "YM2025060910400185" };
// 注:lottery/grant 的 filter_params(渠道追踪)不参与鉴权,故不带

const COMPONENTS = {
    // 福利中心打卡免费领会员
    fragment: { component_number: "ZJ2025061815352884", component_node_id: "FN1769668388sb3w", type: 42 },
    // 天天抽奖
    lottery: { component_number: "ZJ2025092916519174", component_node_id: "FN1779447163CApn", type: 45, session_id: 3002 },
    // 会员免费试用申请(次日开奖,只申请)
    trial: { component_number: "ZJ2025041115200788", component_node_id: "FN1744358694RbIn", type: 31, group_id: 2, privilege_id: 221 },
    // 限量爆款领取(任选 1 个,服务端限每天 1 次;只领其中一项)
    hot: { component_number: "ZJ2024110514212950", component_node_id: "FN1779689314rHQZ", type: 16 },
};

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WpsiOS/26.6.1";

// 动作间隔(秒,[最小,最大] 每步独立取随机,各不相等):10 点抢完顺手把其余做了,模拟真人手动操作避风控
const ACTION_GAP = [5, 10];

$.results = []; // 各任务结果汇总,最后一条通知

// 清除 cookie 开关(BoxJS 写 wps_clear=true)
if (JSON.parse($.getdata("wps_clear") || "false")) {
    $.setdata("", CK_KEY);
    $.setdata("false", "wps_clear");
    $.msg("WPS", "", "✅ Cookie 已清除，请重新抓取");
    $.done();
} else {
    main().catch((e) => {
        $.log(`[ERROR] 主流程异常: ${e}`);
        $.msg("WPS", "❌ 运行异常", String(e));
    }).finally(() => $.done());
}

async function main() {
    const sid = $.getdata(CK_KEY);
    if (!sid) {
        $.msg("WPS", "🚫 缺少 Cookie", "请先开启 cookie 抓取脚本,打开 WPS APP 进任意活动页停留 1 秒");
        return;
    }

    // 动态取 user_id(签到加密需要,不写进脚本)+ 顺带校验登录态
    let uid;
    try {
        const r = await httpReq("GET", ISLOGIN);
        const j = JSON.parse(r.body);
        if (j.result !== "ok" || !j.userid) throw new Error(`islogin 异常: ${r.body.slice(0, 200)}`);
        uid = j.userid;
        $.log(`[INFO] user_id 已获取(${String(uid).slice(0, 3)}***)`);
    } catch (e) {
        $.msg("WPS", "🚫 登录态失效", "wps_sid 已过期,请重新抓取(打开 WPS 进活动页)");
        $.log(`[ERROR] ${e}`);
        return;
    }

    // 10 点 cron 触发:抢完限量爆款顺手把其余做了,逐个串行、动作间随机间隔(模拟真人,避风控)
    await taskComponent("限量爆款", COMPONENTS.hot, "privilege_grant.exec", {}); // 库存少,放最前
    await sleep(jitter(ACTION_GAP));
    await taskComponent("会员试用申请", COMPONENTS.trial, "privilege_select.exec", {
        privilege_select: { group_id: COMPONENTS.trial.group_id, privilege_id: COMPONENTS.trial.privilege_id },
    });
    await sleep(jitter(ACTION_GAP));
    await taskSignIn(uid);
    await sleep(jitter(ACTION_GAP));
    await taskComponent("打卡领会员", COMPONENTS.fragment, "fragment_collect.sign_in", {
        fragment_collect: { sign_date: beijingDate(), series_id: "", is_new_sign_series: true },
    });
    await sleep(jitter(ACTION_GAP));
    await taskComponent("天天抽奖", COMPONENTS.lottery, "lottery_v2.exec", {
        lottery_v2: { session_id: COMPONENTS.lottery.session_id },
    });

    $.msg("WPS 任务汇总", "", $.results.join("\n")); // $.msg 已把汇总打到日志,不再重复 $.log
}

// ============ 任务:每日签到(请求体加密)============

async function taskSignIn(uid) {
    const tag = "每日签到";
    try {
        // 已签则跳过
        const di = await httpReq("GET", DAY_INFO);
        const info = (JSON.parse(di.body).data || {}).info || {};
        if (info.has_sign) {
            $.results.push(`✅ ${tag}:今日已签`);
            return;
        }

        // 取全局公钥
        const ek = await httpReq("GET", ENC_KEY);
        const pubKeyB64 = JSON.parse(ek.body).data;
        if (!pubKeyB64) throw new Error(`公钥获取失败: ${ek.body.slice(0, 120)}`);

        // aesKey = 22 位随机 + 10 位 unix 秒;extra = AES(明文);token = RSA(aesKey)
        const aesKey = genAesKey();
        const plain = JSON.stringify({ user_id: uid, platform: 32 }); // 32 = iPhone(平台位码,公开常量)
        const extra = aesEncrypt(plain, aesKey, aesKey.substr(0, 16));
        const token = rsaEncryptB64(aesKey, pubKeyB64);

        const body = JSON.stringify({ encrypt: true, extra, pay_origin: "ios_ucs_rwzx sign", channel: "" });
        const r = await httpReq("POST", SIGN_IN, { body, token });
        const j = safeJson(r.body);
        if (j && j.result === "ok") {
            const names = ((j.data || {}).rewards || []).map((x) => x.reward_name).filter(Boolean);
            $.results.push(`✅ ${tag}:成功${names.length ? " " + names.join("/") : ""}`);
        } else if (j && j.msg === "has sign") {
            $.results.push(`✅ ${tag}:今日已签`);
        } else {
            $.results.push(`⚠️ ${tag}:${(j && (j.ext_msg || j.msg)) || "失败"}`);
            $.log(`[WARN] ${tag} 响应: ${r.body.slice(0, 300)}`);
        }
    } catch (e) {
        $.results.push(`❌ ${tag}:异常`);
        $.log(`[ERROR] ${tag}: ${e}`);
    }
}

// ============ 任务:福利中心通用组件动作(明文 base64)============

async function taskComponent(tag, comp, action, payload) {
    try {
        const uniq = {
            activity_number: FLZX.activity_number,
            page_number: FLZX.page_number,
            component_number: comp.component_number,
            component_node_id: comp.component_node_id,
        };

        const reqObj = { component_uniq_number: uniq, component_type: comp.type, component_action: action };
        for (const k in payload) reqObj[k] = payload[k];

        // body 与响应均为 JSON
        const r = await httpReq("POST", COMPONENT, { body: JSON.stringify(reqObj) });
        const j = safeJson(r.body);
        if (!j) {
            $.results.push(`❌ ${tag}:无响应`);
            $.log(`[WARN] ${tag} 响应: ${r.body.slice(0, 300)}`);
            return;
        }
        // 外层 result 只代表请求被受理(打卡已签时这里直接报 Duplicate 错);真正成败看内层 data.<action>.success
        if (j.result !== "ok") {
            if (isAlreadyDone(j.msg)) $.results.push(`✅ ${tag}:今日已完成`);
            else {
                $.results.push(`⚠️ ${tag}:${shortMsg(j.msg || j.ext_msg)}`);
                $.log(`[WARN] ${tag} 响应: ${r.body.slice(0, 300)}`);
            }
            return;
        }
        const inner = (j.data || {})[action.split(".")[0]] || {};
        if (inner.success === true) {
            $.results.push(`✅ ${tag}:成功${inner.reward_name ? " " + inner.reward_name : ""}`);
        } else {
            const why = interpretFail(inner);
            $.results.push(`${why.done ? "✅" : "⚠️"} ${tag}:${why.text}`);
            if (!why.done) $.log(`[WARN] ${tag} 响应: ${r.body.slice(0, 300)}`);
        }
    } catch (e) {
        $.results.push(`❌ ${tag}:异常`);
        $.log(`[ERROR] ${tag}: ${e}`);
    }
}

// ============ HTTP(携带 wps_sid;签到带 token 头)============

function httpReq(method, url, { body, token } = {}) {
    const sid = $.getdata(CK_KEY);
    const headers = {
        "User-Agent": UA,
        "Cookie": `wps_sid=${sid}; wps_sids=${sid}`,
        "Origin": "https://personal-act.wps.cn",
        "Referer": "https://personal-act.wps.cn/",
    };
    if (body) headers["Content-Type"] = "application/json";
    if (token) headers["token"] = token;
    return new Promise((resolve, reject) => {
        const req = { url, headers, body };
        const cb = (err, resp, data) => {
            if (err) return reject(err);
            resolve({ status: (resp && (resp.status || resp.statusCode)) || 0, body: data || "" });
        };
        method === "POST" ? $.post(req, cb) : $.get(req, cb);
    });
}

function safeJson(s) {
    try { return JSON.parse(s); } catch (e) { return null; }
}

// 服务端「今日已完成/已领取」类提示(去重唯一索引冲突、has sign 等),按成功对待
function isAlreadyDone(msg) {
    if (!msg) return false;
    return /Duplicate entry|has sign|已签|已领|已参与|重复|already/i.test(msg);
}

// 长报错(如 SQL 错误)截短,通知里好看
function shortMsg(msg) {
    msg = String(msg || "失败");
    if (/Duplicate entry/i.test(msg)) return "今日已完成";
    return msg.length > 24 ? msg.slice(0, 24) + "…" : msg;
}

// 内层 success:false 时,把 reason/error_code 解读为「已完成(done=true)」或真失败
function interpretFail(inner) {
    const reason = String(inner.reason || "");
    const code = inner.error_code;
    if (code === 10005) return { done: true, text: "今日无抽奖次数" };
    if (/reach limit|out of limit|out of stock/i.test(reason)) return { done: true, text: "已达上限/已领完" };
    if (/limit|received|已/i.test(reason)) return { done: true, text: "今日已完成" };
    return { done: false, text: reason || (code ? `code ${code}` : "未成功") };
}

// 北京时间 YYYY-MM-DD(青龙服务器可能是 UTC,固定 +8)
function beijingDate() {
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 在 [min,max] 秒区间取随机毫秒
function jitter([min, max]) {
    return Math.floor((min + Math.random() * (max - min)) * 1000);
}

// aesKey: 22 位随机 base36 + 10 位 unix 秒(共 32 字符)
function genAesKey() {
    const cs = "0123456789abcdefghijklmnopqrstuvwxyz";
    let s = "";
    for (let i = 0; i < 22; i++) s += cs[Math.floor(Math.random() * 36)];
    return s + Math.floor(Date.now() / 1000);
}

// ============ 纯 JS 加密工具(AES-CBC-Pkcs7 + RSA PKCS#1 v1.5,BigInt 实现)============

function modpow(base, exp, mod) {
    let result = 1n;
    base %= mod;
    while (exp > 0n) {
        if (exp & 1n) result = (result * base) % mod;
        exp >>= 1n;
        base = (base * base) % mod;
    }
    return result;
}

// RSA 公钥加密:pemB64 = encrypt/key 返回的 data(base64 的 PKCS#1 PEM)→ 解出 n,e → PKCS#1 v1.5 type2 → base64 密文
function rsaEncryptB64(msg, pemB64) {
    const pem = bytesUtf8(b64dec(pemB64));
    const der = b64dec(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""));
    let p = 0;
    p++; // SEQUENCE tag
    let sl = der[p++];
    if (sl & 0x80) p += sl & 0x7f; // 跳过长度字节
    const readInt = () => {
        p++; // INTEGER tag
        let l = der[p++];
        if (l & 0x80) {
            let nb = l & 0x7f;
            l = 0;
            for (let i = 0; i < nb; i++) l = (l << 8) | der[p++];
        }
        let v = 0n;
        for (let i = 0; i < l; i++) v = (v << 8n) | BigInt(der[p++]);
        return v;
    };
    const n = readInt(), e = readInt();
    let k = 0, nn = n;
    while (nn > 0n) { k++; nn >>= 8n; } // 模数字节数(RSA-512 = 64)

    const m = utf8Bytes(msg);
    const psLen = k - 3 - m.length;
    if (psLen < 8) throw new Error("RSA 明文过长");
    const block = [0x00, 0x02];
    for (let i = 0; i < psLen; i++) block.push(1 + Math.floor(Math.random() * 255)); // 非零随机填充
    block.push(0x00);
    for (const b of m) block.push(b);

    let mm = 0n;
    for (const b of block) mm = (mm << 8n) | BigInt(b);
    let hex = modpow(mm, e, n).toString(16);
    while (hex.length < k * 2) hex = "0" + hex;
    const cb = [];
    for (let i = 0; i < hex.length; i += 2) cb.push(parseInt(hex.substr(i, 2), 16));
    return b64enc(cb);
}

const _SB = [], _ISB = [];
(function () {
    const p = [], l = [];
    let x = 1;
    for (let i = 0; i < 256; i++) {
        p[i] = x;
        x ^= (x << 1) ^ (x & 0x80 ? 0x11b : 0);
        p[i] &= 0xff;
    }
    for (let i = 0; i < 255; i++) l[p[i]] = i;
    let si = 0;
    for (let i = 0; i < 256; i++) {
        let xx = si ? p[255 - l[si]] : 0;
        let t = xx;
        for (let r = 0; r < 4; r++) {
            t = ((t << 1) | (t >>> 7)) & 0xff;
            xx ^= t;
        }
        xx = (xx ^ 0x63) & 0xff;
        _SB[si] = xx;
        _ISB[xx] = si;
        si = si ? p[(l[si] + 1) % 255] : 1;
    }
})();
const _RCON = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54];
function _xt(a) { return ((a << 1) ^ (a & 0x80 ? 0x11b : 0)) & 0xff; }
function _mul(a, b) {
    let r = 0;
    for (; b; b >>= 1) {
        if (b & 1) r ^= a;
        a = _xt(a);
    }
    return r;
}
function _keyExp(key) {
    const Nk = key.length / 4, Nr = Nk + 6, w = [];
    for (let i = 0; i < Nk; i++) w[i] = [key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]];
    for (let i = Nk; i < 4 * (Nr + 1); i++) {
        let t = w[i - 1].slice();
        if (i % Nk === 0) {
            t.push(t.shift());
            t = t.map((b) => _SB[b]);
            t[0] ^= _RCON[i / Nk - 1];
        } else if (Nk > 6 && i % Nk === 4) {
            t = t.map((b) => _SB[b]);
        }
        w[i] = w[i - Nk].map((b, j) => b ^ t[j]);
    }
    return { w, Nr };
}
function _enc(inp, ks) {
    let s = [[], [], [], []];
    for (let i = 0; i < 16; i++) s[i % 4][i >> 2] = inp[i];
    const ar = (k) => {
        for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) s[r][c] ^= k[c][r];
    };
    ar(ks.w.slice(0, 4));
    for (let rd = 1; rd < ks.Nr; rd++) {
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s[r][c] = _SB[s[r][c]];
        for (let r = 1; r < 4; r++) {
            const row = s[r].slice();
            for (let c = 0; c < 4; c++) s[r][c] = row[(c + r) % 4];
        }
        for (let c = 0; c < 4; c++) {
            const a = [s[0][c], s[1][c], s[2][c], s[3][c]];
            s[0][c] = _mul(a[0], 2) ^ _mul(a[1], 3) ^ a[2] ^ a[3];
            s[1][c] = a[0] ^ _mul(a[1], 2) ^ _mul(a[2], 3) ^ a[3];
            s[2][c] = a[0] ^ a[1] ^ _mul(a[2], 2) ^ _mul(a[3], 3);
            s[3][c] = _mul(a[0], 3) ^ a[1] ^ a[2] ^ _mul(a[3], 2);
        }
        ar(ks.w.slice(4 * rd, 4 * rd + 4));
    }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s[r][c] = _SB[s[r][c]];
    for (let r = 1; r < 4; r++) {
        const row = s[r].slice();
        for (let c = 0; c < 4; c++) s[r][c] = row[(c + r) % 4];
    }
    ar(ks.w.slice(4 * ks.Nr, 4 * ks.Nr + 4));
    const out = [];
    for (let i = 0; i < 16; i++) out[i] = s[i % 4][i >> 2];
    return out;
}
function utf8Bytes(str) {
    const out = [];
    for (const ch of unescape(encodeURIComponent(str))) out.push(ch.charCodeAt(0));
    return out;
}
function bytesUtf8(b) {
    let s = "";
    for (const x of b) s += String.fromCharCode(x);
    return decodeURIComponent(escape(s));
}
const _B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function b64enc(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
        s += _B64[b0 >> 2] + _B64[((b0 & 3) << 4) | (b1 >> 4)];
        s += i + 1 < bytes.length ? _B64[((b1 & 15) << 2) | (b2 >> 6)] : "=";
        s += i + 2 < bytes.length ? _B64[b2 & 63] : "=";
    }
    return s;
}
function b64dec(str) {
    const out = [];
    let buf = 0, bits = 0;
    for (const c of str) {
        if (c === "=") break;
        const v = _B64.indexOf(c);
        if (v < 0) continue;
        buf = (buf << 6) | v;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out.push((buf >> bits) & 0xff);
        }
    }
    return out;
}
// AES-256-CBC + Pkcs7,key/iv 为 UTF8 字符串,输出 base64
function aesEncrypt(plain, keyStr, ivStr) {
    const ks = _keyExp(utf8Bytes(keyStr));
    const data = utf8Bytes(plain);
    const pad = 16 - (data.length % 16);
    for (let i = 0; i < pad; i++) data.push(pad);
    let prev = utf8Bytes(ivStr);
    const out = [];
    for (let i = 0; i < data.length; i += 16) {
        const blk = data.slice(i, i + 16).map((b, j) => b ^ prev[j]);
        prev = _enc(blk, ks);
        out.push(...prev);
    }
    return b64enc(out);
}

function Env(s) {
    this.name = s;
    this.isSurge = () => typeof $httpClient !== "undefined";
    this.isQuanX = () => typeof $task !== "undefined";
    this.isLoon = () => typeof $loon !== "undefined";
    this.log = (...a) => console.log(a.join("\n"));
    this.msg = (t = this.name, s = "", b = "") => {
        if (this.isSurge() || this.isLoon()) $notification.post(t, s, b);
        else if (this.isQuanX()) $notify(t, s, b);
        console.log(["", "====📣" + t + "====", s, b].filter(Boolean).join("\n"));
    };
    this._node = {}; // Node(青龙)内存兜底,种子来自环境变量
    this.getdata = (k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.read(k);
        if (this.isQuanX()) return $prefs.valueForKey(k);
        if (typeof process !== "undefined" && process.env) return k in this._node ? this._node[k] : (process.env[k] || null);
        return null;
    };
    this.setdata = (v, k) => {
        if (this.isSurge() || this.isLoon()) return $persistentStore.write(v, k);
        if (this.isQuanX()) return $prefs.setValueForKey(v, k);
        this._node[k] = v;
        return true;
    };
    this.get = (req, cb) => this.send(req, "GET", cb);
    this.post = (req, cb) => this.send(req, "POST", cb);
    this.send = (req, method, cb) => {
        if (this.isSurge() || this.isLoon()) {
            const fn = method === "POST" ? $httpClient.post : $httpClient.get;
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
        } else {
            // Node(青龙)
            const https = require("https");
            const u = new URL(req.url);
            const r = https.request(
                { hostname: u.hostname, path: u.pathname + u.search, method, headers: req.headers },
                (resp) => {
                    let d = "";
                    resp.on("data", (c) => (d += c));
                    resp.on("end", () => cb(null, { status: resp.statusCode, statusCode: resp.statusCode }, d));
                }
            );
            r.on("error", (e) => cb(e, null, null));
            if (req.body) r.write(req.body);
            r.end();
        }
    };
    this.done = (v = {}) => { if (typeof $done !== "undefined") $done(v); };
}
