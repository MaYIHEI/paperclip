/**
 * 特来电 · 每日签到(「签到365天领手机」活动,H5 在小程序内)
 *
 * 单脚本: 有 $request 时抓 Cookie(进签到页触发 sgi.teld.cc 接口,抓 telda/teldb 等),
 *   无 $request 时 cron:先用 teldb 刷新 telda(telda 仅 20 分钟),再打卡。
 *   签名 WVER = RSA-1024 PKCS#1v15(WTS) 十六进制(BigInt);刷新用 AES-CBC(纯 JS,自带);
 *   Sign/t 为旧版遗留、当前官方 H5 已不发,服务端不校验,故省略。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-04
 */

const $ = new Env("特来电");

const SCRIPT_VERSION = "2026-06-04.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_AUTH = "teld_auth"; // telda/teldb/ip/userId 等,抓取写入、刷新后自动滚动更新

const API = "https://sgi.teld.cc/api/invoke";
const REFRESH_URL = "https://sgi.teld.cn/api/Invoke?SID=UserAPI-WEBUI-SRefreshToken";

// cajess 默认 AES key/iv(藏在 teld-thirdpart.min.js;注意 cajess 函数里 _a/_b 是诱饵,差一字符)
const AES_KEY = "7fb498553e3c462988c3b9573692bd5f"; // 32 字节 → AES-256
const AES_IV = "98d71fe589499967"; // 16 字节
const UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.74(0x18004a25) NetType/WIFI Language/zh_CN miniProgram/wx8d32c1a71ecd965d";

// WVER 用的 RSA-1024 公钥(硬编码在 teld 的 H5 库里,指数 010001)
const RSA_N = BigInt(
    "0xC2D84A72668932EBE5CC2BADB5DE288E59AD587775C1E45F33F6CC9DAB376C793AFF12050C0648D5C3016F685B9F4FA2460A59B6B07793808B4E68A883CA2830FD7895C66F68F64A829DB99DEDE978EC2E04711184A872C1F43956B1B72CFA803C1D677BAE386209368B3F3ED7A8CB06BEC64B0D0369EE62A49E6B417FC55959"
);
const RSA_E = 65537n;

$.messages = [];

// ============ WVER 签名(RSA-1024 PKCS#1 v1.5,纯 BigInt)============

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

// WVER = hex( RSA( 00 02 [随机非零填充] 00 [WTS的ASCII] ) ),256 hex
function buildWVER(wts) {
    const msg = [];
    for (const ch of String(wts)) msg.push(ch.charCodeAt(0));
    const k = 128; // RSA-1024 = 128 字节
    const psLen = k - 3 - msg.length; // PKCS#1 v1.5 填充长度
    const block = [0x00, 0x02];
    for (let i = 0; i < psLen; i++) block.push(1 + Math.floor(Math.random() * 255)); // 非零随机
    block.push(0x00);
    for (const b of msg) block.push(b);
    let m = 0n;
    for (const b of block) m = (m << 8n) | BigInt(b);
    let hex = modpow(m, RSA_E, RSA_N).toString(16);
    while (hex.length < 256) hex = "0" + hex;
    return hex;
}

// ============ AES-CBC-Pkcs7(纯 JS,key/iv 为 UTF8 字符串,密文 base64)============
// 已用抓包数据验证:加密匹配服务端 Data、解密能还原响应里的新 telda。

const _SB = [],
    _ISB = [];
(function () {
    const p = [],
        l = [];
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
function _xt(a) {
    return ((a << 1) ^ (a & 0x80 ? 0x11b : 0)) & 0xff;
}
function _mul(a, b) {
    let r = 0;
    for (; b; b >>= 1) {
        if (b & 1) r ^= a;
        a = _xt(a);
    }
    return r;
}
function _keyExp(key) {
    const Nk = key.length / 4,
        Nr = Nk + 6,
        w = [];
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
function _dec(inp, ks) {
    let s = [[], [], [], []];
    for (let i = 0; i < 16; i++) s[i % 4][i >> 2] = inp[i];
    const ar = (k) => {
        for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) s[r][c] ^= k[c][r];
    };
    ar(ks.w.slice(4 * ks.Nr, 4 * ks.Nr + 4));
    for (let rd = ks.Nr - 1; rd > 0; rd--) {
        for (let r = 1; r < 4; r++) {
            const row = s[r].slice();
            for (let c = 0; c < 4; c++) s[r][c] = row[(c - r + 4) % 4];
        }
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s[r][c] = _ISB[s[r][c]];
        ar(ks.w.slice(4 * rd, 4 * rd + 4));
        for (let c = 0; c < 4; c++) {
            const a = [s[0][c], s[1][c], s[2][c], s[3][c]];
            s[0][c] = _mul(a[0], 14) ^ _mul(a[1], 11) ^ _mul(a[2], 13) ^ _mul(a[3], 9);
            s[1][c] = _mul(a[0], 9) ^ _mul(a[1], 14) ^ _mul(a[2], 11) ^ _mul(a[3], 13);
            s[2][c] = _mul(a[0], 13) ^ _mul(a[1], 9) ^ _mul(a[2], 14) ^ _mul(a[3], 11);
            s[3][c] = _mul(a[0], 11) ^ _mul(a[1], 13) ^ _mul(a[2], 9) ^ _mul(a[3], 14);
        }
    }
    for (let r = 1; r < 4; r++) {
        const row = s[r].slice();
        for (let c = 0; c < 4; c++) s[r][c] = row[(c - r + 4) % 4];
    }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s[r][c] = _ISB[s[r][c]];
    ar(ks.w.slice(0, 4));
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
        const b0 = bytes[i],
            b1 = bytes[i + 1],
            b2 = bytes[i + 2];
        s += _B64[b0 >> 2] + _B64[((b0 & 3) << 4) | (b1 >> 4)];
        s += i + 1 < bytes.length ? _B64[((b1 & 15) << 2) | (b2 >> 6)] : "=";
        s += i + 2 < bytes.length ? _B64[b2 & 63] : "=";
    }
    return s;
}
function b64dec(str) {
    const out = [];
    let buf = 0,
        bits = 0;
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
function aesDecrypt(b64, keyStr, ivStr) {
    const ks = _keyExp(utf8Bytes(keyStr));
    const data = b64dec(b64);
    let prev = utf8Bytes(ivStr);
    const out = [];
    for (let i = 0; i < data.length; i += 16) {
        const blk = data.slice(i, i + 16);
        const d = _dec(blk, ks).map((b, j) => b ^ prev[j]);
        prev = blk;
        out.push(...d);
    }
    const pad = out[out.length - 1];
    return bytesUtf8(out.slice(0, out.length - pad));
}

// ============ teldb 刷新 telda(telda 仅 20 分钟,cron 前先刷新)============

function rand16() {
    const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < 16; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
}

async function refresh(auth) {
    if (!auth.teldb) throw new Error(`[${SCRIPT_VERSION}] 缺 teldb,无法刷新,请重进签到页抓取`);
    const ip = auth.teldz || "0.0.0.0";
    const param = JSON.stringify({ DeviceType: "WEB", ReqSource: 100, RefreshToken: auth.teldb, ClientIP: ip });
    const uts = String(Math.round(Date.now() / 1000));
    const uver = rand16(); // IV,任意 16 字符,服务端按发来的 UVER 解
    const dataEnc = aesEncrypt(param, uts + "000000", uver);
    const blob = JSON.stringify({ Data: dataEnc, UTS: uts, UVER: uver, UUID: Date.now() + "" + Math.floor(Math.random() * 1e10) });

    const wts = Math.round(Date.now() / 1000);
    const form = buildForm({
        refreshToken: blob,
        "X-Token": auth.telda || "",
        WTS: wts,
        WVER: buildWVER(wts),
        WSDI: ip,
        WRS: "WEB",
        WCOI: "",
        WCOL: "",
        "Teld-RequestID": `${auth.userId || ""}_${Date.now()}_WRF`,
        "Teld-RpcID": "0.1",
    });

    const res = await post(REFRESH_URL, form, auth);
    if (!res || !res.data || typeof res.data !== "string") {
        throw new Error(`[${SCRIPT_VERSION}] 刷新失败(teldb 可能过期): ${res ? JSON.stringify(res).slice(0, 150) : "无响应"}\n👉 重进签到页重抓 Cookie`);
    }
    // 解两层:外层默认 key/iv → {Data,UTS,UVER} → 内层 → {AccessToken,RefreshToken}
    const outer = JSON.parse(aesDecrypt(res.data, AES_KEY, AES_IV));
    const inner = JSON.parse(aesDecrypt(outer.Data, outer.UTS + "000000", outer.UVER));
    if (!inner.AccessToken) throw new Error(`[${SCRIPT_VERSION}] 刷新响应无 AccessToken: ${JSON.stringify(inner).slice(0, 150)}`);
    auth.telda = inner.AccessToken;
    if (inner.RefreshToken) auth.teldb = inner.RefreshToken; // teldb 也滚动,写回
    $.setjson(auth, CK_AUTH);
    $.log(`[刷新] 新 telda 末8=${auth.telda.slice(-8)}  teldb 末8=${(auth.teldb || "").slice(-8)}`);
    return auth;
}

// ============ Cookie 抓取(rewrite 模式)============

// 进签到页时 sgi.teld.cc 的接口请求里带齐 telda/teldb/teldz(IP)/cna/__jsluid_s + body 里的 X-Token
function captureAuth() {
    try {
        if ($request.method === "OPTIONS") return;
        const headers = lowerKeys($request.headers);
        const cookieStr = headers["cookie"] || "";
        const get = (n) => {
            const m = new RegExp(`(?:^|[;\\s])${n}=([^;]+)`).exec(cookieStr);
            return m ? m[1] : "";
        };
        const telda = get("telda");
        const teldb = get("teldb");
        if (!teldb) {
            $.log("[capture] 本次请求没有 teldb(刷新必需),跳过");
            return;
        }
        const auth = {
            telda,
            teldb, // ~15 天,刷新 telda 必需
            teldz: get("teldz"), // 公网 IP,作 WSDI
            cna: get("cna"),
            jsluid: get("__jsluid_s"),
            userId: jwtField(telda, "data") ? jwtField(telda, "data").UserId : jwtUserId(telda),
        };
        $.setjson(auth, CK_AUTH);
        $.msg($.name, "✅ 特来电 Cookie 获取成功", "可关掉小程序,cron 自动打卡(待验证)");
    } catch (e) {
        $.log(`[ERROR] 抓取异常: ${e}`);
    }
}

// ============ 打卡 ============

async function checkin() {
    let auth = $.getjson(CK_AUTH, {});
    if (!auth || !auth.teldb) throw new Error(`[${SCRIPT_VERSION}] 未配置 Cookie(缺 teldb),请先进特来电「签到365天」页抓取`);

    // telda 仅 20 分钟,cron 时早过期 → 先用 teldb(~15 天)刷新拿新 telda
    $.log(`[检测] 版本=${SCRIPT_VERSION}  teldb末8=${auth.teldb.slice(-8)}  userId=${auth.userId || "空"}`);
    auth = await refresh(auth);

    const wts = Math.round(Date.now() / 1000);
    const wver = buildWVER(wts);
    const ip = auth.teldz || "0.0.0.0";
    const rid = `${auth.userId || ""}_${Date.now()}_WRF`;

    $.log(`[检测] WTS=${wts}  WVER长度=${wver.length}(应256) 前16=${wver.slice(0, 16)}`);
    $.log(`[检测] telda(新)末8=${auth.telda.slice(-8)}  WSDI=${ip}`);

    const form = buildForm({
        request: "{}",
        "X-Token": auth.telda,
        WTS: wts,
        WVER: wver,
        WSDI: ip,
        WRS: "WEB",
        WCOI: "",
        WCOL: "",
        "Teld-RequestID": rid,
        "Teld-RpcID": "0.1",
    });

    const res = await post(`${API}?SID=ProSrv-CompleteCheckInTask`, form, auth);
    $.log(`[响应] ${res ? JSON.stringify(res).slice(0, 400) : "无响应(网络错误/被拦)"}`);

    const tag = `[${SCRIPT_VERSION}]`;
    if (res && res.state === "1" && res.data) {
        if (res.data.IsCheckInSuccess) {
            $.messages.push(`✅ 签到成功,连续 ${res.data.ContinuousDays} 天,累计 ${res.data.TotalDays} 天`);
        } else {
            $.messages.push(`✨ 今日已签到(连续 ${res.data.ContinuousDays} 天)`);
        }
    } else if (res && (res.errcode === "12904" || /已打卡|已签/.test(res.errmsg || ""))) {
        // 12904「今日已打卡」= 服务端已接受请求(WVER/telda 都对),只是今天签过了 → 视为成功
        $.messages.push(`✨ 今日已打卡(${res.errmsg})`);
    } else if (!res) {
        $.messages.push(`${tag} ❌ 无响应(网络错误或被加速乐拦截)`);
    } else if (/token|登录|权限|未授权|unauthor|expire/i.test(JSON.stringify(res))) {
        $.messages.push(`${tag} ❌ 鉴权失败(刷新后 telda 仍被拒?): errcode=${res.errcode} ${res.errmsg || ""}\n👉 重进签到页重抓 Cookie`);
    } else if (/sign|签名|wver|验签|verif/i.test(JSON.stringify(res))) {
        $.messages.push(`${tag} ❌ 疑似签名问题(WVER/Sign): errcode=${res.errcode} ${res.errmsg || ""}`);
    } else {
        $.messages.push(`${tag} ❌ 打卡失败: state=${res.state} errcode=${res.errcode} errmsg=${res.errmsg || ""}\n${JSON.stringify(res).slice(0, 200)}`);
    }
}

// ============ 请求 ============

function post(url, body, auth) {
    return new Promise((resolve) => {
        const cookie = [
            `telda=${auth.telda}`,
            auth.teldb ? `teldb=${auth.teldb}` : "",
            "teldc=0",
            auth.teldz ? `teldz=${auth.teldz}` : "",
            auth.cna ? `cna=${auth.cna}` : "",
            auth.jsluid ? `__jsluid_s=${auth.jsluid}` : "",
        ]
            .filter(Boolean)
            .join("; ");
        const opts = {
            url,
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                accept: "application/json, text/plain, */*",
                origin: "https://c2.teld.cc",
                referer: "https://c2.teld.cc/",
                "User-Agent": UA,
                Cookie: cookie,
            },
            body,
        };
        $.post(opts, (err, resp, data) => {
            if (err) {
                $.log(`[ERROR] POST ${url}: ${$.toStr(err)}`);
                return resolve(null);
            }
            try {
                resolve(typeof data === "string" ? JSON.parse(data) : data);
            } catch (e) {
                $.log(`[ERROR] 解析失败: ${(data || "").slice(0, 300)}`);
                resolve(null);
            }
        });
    });
}

// ============ 工具 ============

function buildForm(obj) {
    return Object.entries(obj)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
}

function jwtPayload(token) {
    try {
        const t = String(token).replace(/^A01/, "");
        const seg = t.split(".")[1];
        const s = seg.replace(/-/g, "+").replace(/_/g, "/");
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let out = "",
            bits = 0,
            buf = 0;
        for (const c of s) {
            const i = chars.indexOf(c);
            if (i < 0) continue;
            buf = (buf << 6) | i;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                out += String.fromCharCode((buf >> bits) & 0xff);
            }
        }
        return JSON.parse(out);
    } catch {
        return null;
    }
}
function jwtField(token, f) {
    const p = jwtPayload(token);
    return p ? p[f] : null;
}
function jwtUserId(token) {
    const p = jwtPayload(token);
    return p && p.data ? p.data.UserId : "";
}

function lowerKeys(obj) {
    if (!obj) return {};
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

function debug(content, title = "debug") {
    if (($.getdata("teld_debug") || "false") !== "true") return;
    $.log(`\n----- ${title} -----`);
    $.log(typeof content === "string" ? content : $.toStr(content));
    $.log(`----- end -----\n`);
}

async function sendMsg(message) {
    if (!message) return;
    $.msg($.name, "", message);
}

// ============ 入口 ============

if (typeof $request !== "undefined") {
    captureAuth();
    $.done();
} else {
    (async () => {
        await checkin();
    })()
        .catch((e) => {
            $.messages.push(e.message || String(e));
            $.logErr(e);
        })
        .finally(async () => {
            await sendMsg($.messages.join("\n"));
            $.done();
        });
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}getdata(t){return this.getval(t)}setdata(t,e){return this.setval(t,e)}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
