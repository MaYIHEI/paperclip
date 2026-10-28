/**
 * 小黑盒 · 小黑盒 APP「每日签到」,每日签到领 20 H 币
 *
 * 抓取:打开小黑盒 APP →「我的」→「签到」页,停留 1 秒抓 Cookie
 * 签到:cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-10-28
 *
 * ===== Loon =====
 * [MITM]
 * hostname = api.xiaoheihe.cn
 * [Script]
 * request if ${url} ~= /^https:\/\/api\.xiaoheihe\.cn\/task\/sign_list/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/heybox/heybox.js") with tag="小黑盒 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png"
 * cron "20 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/heybox/heybox.js") with tag="小黑盒签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png"
 *
 * ===== Surge =====
 * [MITM]
 * hostname = api.xiaoheihe.cn
 * [Script]
 * 小黑盒 Cookie = type=http-request,pattern=^https:\/\/api\.xiaoheihe\.cn\/task\/sign_list,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/heybox/heybox.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png
 * 小黑盒签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/heybox/heybox.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = api.xiaoheihe.cn
 * [rewrite_local]
 * ^https:\/\/api\.xiaoheihe\.cn\/task\/sign_list url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/heybox/heybox.js
 * [task_local]
 * 20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/heybox/heybox.js, tag=小黑盒签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 小黑盒签到
 *       cron: '20 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "api.xiaoheihe.cn"
 *   script:
 *     - match: ^https:\/\/api\.xiaoheihe\.cn\/task\/sign_list
 *       name: 小黑盒 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   小黑盒签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/heybox/heybox.js
 *     interval: 86400
 */

const $ = new Env("小黑盒");

// 签到合集开启「统一通知」时不单独弹通知,结果由签到汇总统一发送
$.merge = typeof $argument === "object" && !!$argument && $argument.merge === true;
if ($.merge) $.msg = (...a) => console.log(a.filter((x) => typeof x === "string" && x).join("\n"));

// 补签入口:请求 http://1.1.1.1/checkin/heybox 时现跑一次签到,跑完把本脚本的签到状态作为响应返回
const CHECKIN_RUN = typeof $request !== "undefined" && /^http:\/\/1\.1\.1\.1\/checkin\//.test($request.url);
if (CHECKIN_RUN) { const end = $.done.bind($); $.done = () => end({ response: { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, body: $.getdata("heybox_status") || "{}" } }); }

const SCRIPT_VERSION = "2026-10-28.r3"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const CK_KEY = "heybox_data";
const BASE = "https://api.xiaoheihe.cn";
const REFERER = "http://api.maxjia.com/";
// 抓取时保存的公共参数;签到时原样带上,只刷新 _time / nonce / _rnd / hkey
const PUBLIC_KEYS = [
  "dw", "lang", "version", "device_info", "os_type", "os_version",
  "x_os_type", "x_client_type", "heybox_id", "time_zone", "x_app",
];

// ─── 抓 Cookie ───────────────────────────────────────────────────────────────
// 触发条件: 打开小黑盒 APP →「我的」→「签到」页,停留 1 秒等 sign_list 请求发出
function getCookie() {
  const url = $request.url || "";
  const query = parseQuery(url);

  if (!query.device_id || query.x_app !== "heybox") {
    $.msg($.name, "⚠️ 未抓到有效请求", "请确认已开启 MITM 并进「我的 → 签到」页面");
    return;
  }

  // 公共参数(签到请求复用),device_id / version 也在其中
  const params = {};
  for (const k of PUBLIC_KEYS) if (query[k] != null) params[k] = query[k];
  params.device_id = query.device_id;

  // 会话 Cookie: pkey + x_xhh_tokenid(hkey 由算法现算,不保存)
  const raw = normalizeCookie(
    $request.headers["cookie"] || $request.headers["Cookie"] || ""
  );
  const pkey = parseCookieField(raw, "pkey");
  const tokenid = parseCookieField(raw, "x_xhh_tokenid");

  if (!pkey) {
    $.msg($.name, "⚠️ 未提取到 pkey", "请确认已登录小黑盒,再进「我的 → 签到」页面");
    return;
  }

  const ua = $request.headers["user-agent"] || $request.headers["User-Agent"] || "";
  const ck = { params, pkey, tokenid, userAgent: ua };
  $.setdata(JSON.stringify(ck), CK_KEY);
  $.setdata("", "heybox_status"); // 新 Cookie 待签到验证,先撤掉旧的体检结果

  $.msg(
    $.name,
    "✅ 小黑盒 Cookie 获取成功",
    `device_id: ${maskToken(params.device_id)}\npkey: ${maskToken(pkey)}`
  );
}

// ─── 签到主逻辑 ──────────────────────────────────────────────────────────────
async function main() {
  const raw = $.getdata(CK_KEY);
  if (!raw) {
    saveStatus("none", "未抓取 Cookie");
    $.msg($.name, "🚫 缺少 Cookie", "请先开启重写规则,打开小黑盒进「我的 → 签到」页面");
    return;
  }

  let ck;
  try {
    ck = JSON.parse(raw);
  } catch (e) {
    saveStatus("cookie", "Cookie 解析失败");
    $.msg($.name, "🚫 Cookie 解析失败", "请清空后重新触发抓取");
    return;
  }
  if (!ck.pkey || !ck.params || !ck.params.device_id) {
    saveStatus("cookie", "Cookie 不完整");
    $.msg($.name, "🚫 Cookie 不完整", "请重新进「我的 → 签到」页面抓取");
    return;
  }

  // 1. 发起签到(异步接口,成功返回 result.state = "")
  const signResp = await apiGet(ck, "/task/sign_v3/sign", {}, true);
  if (!signResp || signResp.status !== "ok") {
    const m = (signResp && signResp.msg) || "请求失败";
    if (handleCookieFail(m)) return;
    saveStatus("fail", `发起签到失败: ${m}`);
    $.msg($.name, "❌ 签到失败", m);
    return;
  }

  // 2. 轮询签到结果,state: waiting → 继续, ok → 成功
  let state = null;
  for (let i = 0; i < 6; i++) {
    await wait(1500);
    const sr = await apiGet(ck, "/task/sign_v3/get_sign_state", {});
    if (!sr || sr.status !== "ok") {
      const m = (sr && sr.msg) || "查询失败";
      if (handleCookieFail(m)) return;
      continue;
    }
    state = sr.result && sr.result.state;
    if (state === "ok") {
      const r = sr.result;
      const coin = r.sign_in_coin != null ? r.sign_in_coin : "?";
      const streak = r.sign_in_streak != null ? r.sign_in_streak : "?";
      const tip = r.msg || sr.msg || "";
      saveStatus("ok", `签到成功 +${coin}H币 连签${streak}天`);
      $.msg($.name, "✅ 签到成功", `💰 +${coin} H 币  连签 ${streak} 天${tip ? "\n" + tip : ""}`);
      return;
    }
    if (state && state !== "waiting") break;
  }

  // waiting 超时: 服务端已受理但未返回结果,不算失败
  saveStatus("ok", `已发起签到,结果处理中(state=${state || "waiting"})`);
  $.msg($.name, "⏳ 签到已发起", "服务端处理中,请稍后在 APP 确认");
}

// ─── 请求封装 ────────────────────────────────────────────────────────────────
// 组装带签名的 GET 请求: 公共参数 + _time/nonce/(可选 _rnd) + 查询 hkey,
// 再按最终 URL 算 Cookie hkey。响应体是 Base64 包的 JSON,解码后返回。
async function apiGet(ck, path, extra, withRnd) {
  const time = String(Math.floor(Date.now() / 1000));
  const nonce = genNonce(time);
  const params = Object.assign({}, ck.params, { _time: time, nonce }, extra || {});
  params.hkey = queryHkey(path, time, params.device_id, params.version || "1.3.397", nonce);
  // _rnd 需与本次请求的 _time 一致,故在此现算(仅签到接口需要)
  if (withRnd) {
    params._rnd = genRnd(
      path, time, params.device_id, params.heybox_id || "",
      params.os_version || "", params.version || "1.3.397"
    );
  }

  const query = Object.keys(params)
    // 与 App 一致: ":" 转义、"/" 保留(time_zone=Asia/Shanghai)
    .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%2F/g, "/")}`)
    .join("&");
  const finalUrl = `${BASE}${path}?${query}`;

  const cookieParts = [`pkey=${ck.pkey}`, `hkey=${cookieHkey(finalUrl)}`];
  if (ck.tokenid) cookieParts.push(`x_xhh_tokenid=${ck.tokenid}`);

  const headers = {
    accept: "*/*",
    referer: REFERER,
    "user-agent":
      ck.userAgent ||
      "xiaoheihe/1.3.397 (com.max.xiaoheihe; build:1847; iOS 26.1.0) Alamofire/5.9.0",
    cookie: cookieParts.join("; "),
  };

  return new Promise((resolve) => {
    $.get({ url: finalUrl, headers, timeout: 10000 }, (err, resp, data) => {
      if (err) {
        $.log(`[ERROR] ${path} 网络错误: ${err}`);
        resolve({ status: "error", msg: `网络错误: ${err}` });
        return;
      }
      const code = resp && resp.statusCode;
      const raw = String(data || "").trim();
      // 正常响应是 Base64 包的 JSON;报错时可能直接回明文 JSON
      const text = raw.startsWith("{") ? raw : b64decode(raw);
      debug(`${path} HTTP ${code} => ${text.slice(0, 300)}`);
      let json = null;
      try { json = JSON.parse(text); } catch (e) {}
      if (!json || json.status !== "ok") {
        $.log(`[ERROR] ${path} HTTP ${code} 原始响应: ${raw.slice(0, 300)}`);
      }
      resolve(json || { status: "error", msg: `HTTP ${code} 响应无法解析: ${raw.slice(0, 80)}` });
    });
  });
}

function handleCookieFail(msg) {
  if (/relogin|重新登录|未登录|请登录|登录失效|登录已失效|token\s*(失效|过期|无效)/i.test(String(msg))) {
    saveStatus("cookie", msg);
    $.msg($.name, "🚫 登录失效", "请重新进小黑盒「我的 → 签到」页面抓取 Cookie");
    return true;
  }
  return false;
}

// ─── 签名相关(算法已用真实抓包离线对拍验证)──────────────────────────────────
// nonce: 按 _time 的 UTC 日期生成当日字符集,再随机取 32 个(服务端只认集合)
const NONCE_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function genNonce(time) {
  const d = new Date(Number(time) * 1000);
  const seed =
    d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  const daily = [];
  for (let i = 0; i < 32; i++) daily.push(NONCE_ALPHABET[(seed + 267 + 7 * i) % 62]);
  let out = "";
  for (let i = 0; i < 32; i++) out += daily[Math.floor(Math.random() * daily.length)];
  return out;
}

// _rnd: 签到接口的 RNDCode v14。取 5 项输入(path/time/device_id+heybox_id/os_version/version),
// 各按 C 字符串在首个 NUL 截断,经 eE2/eE3 字节变换 + QuickJS 解码 → 取 UTF-16 低字节,
// 再做魔改 SHA-512 的 HMAC(H14),摘要转小写 hex 后过自定义 CRC32,格式 "14:大写无前导零 hex"。
function genRnd(path, time, deviceId, heyboxId, osVersion, version) {
  const P = bridgeNul(path.endsWith("/") ? path : path + "/");
  const T = bridgeNul(String(time));
  const I = bridgeNul(String(deviceId) + String(heyboxId));
  const O = bridgeNul(String(osVersion));
  const V = bridgeNul(String(version));
  const key = utf16Low(eE(P + T, 2));
  const data = utf16Low(eE(I + O + V, 3));
  const crc = crc14(asciiBytes(hexLower(hmac14(key, data))));
  return "14:" + crc.toString(16).toUpperCase();
}

function bridgeNul(s) { const i = s.indexOf("\0"); return i < 0 ? s : s.slice(0, i); }
function asciiBytes(s) { const o = []; for (let i = 0; i < s.length; i++) o.push(s.charCodeAt(i) & 255); return o; }
function hexLower(bytes) { let s = ""; for (const b of bytes) s += b.toString(16).padStart(2, "0"); return s; }
function utf16Low(str) { const o = new Array(str.length); for (let i = 0; i < str.length; i++) o[i] = str.charCodeAt(i) & 255; return o; }

// eE2/eE3: signed 字节 + C 截断取模 + 127 字节上限,输出再按这版 QuickJS 的 JS_NewString 解码
function eE(text, which) { return quickjsDecode(transformStage(utf8Bytes(text), which)); }
function signedMod128(v) { return v >= 0 ? (v & 127) : -((-v) & 127); }
function stage(data, key, shift, period) {
  const out = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const c = data[i] < 128 ? data[i] : data[i] - 256;
    const plain = signedMod128(c ^ key);
    const altered = signedMod128((c << shift) ^ key);
    out[i] = (((i + 1) % period === 0 || plain === 0) ? altered : plain) & 255;
  }
  return out;
}
function transformStage(bytes, which) {
  const nul = bytes.indexOf(0);
  let d = (nul >= 0 ? bytes.slice(0, nul) : bytes).slice(0, 127);
  d = stage(d, 0x37, 4, 3);
  return which === 2 ? d : stage(d, 0x46, 2, 5);
}
function quickjsDecode(data) {
  let out = "", i = 0;
  const MIN = [0x80, 0x800, 0x10000, 0x200000, 0x4000000];
  while (i < data.length) {
    const c = data[i];
    if (c < 128) { out += String.fromCharCode(c); i++; continue; }
    const count = c < 0xe0 ? 2 : c < 0xf0 ? 3 : c < 0xf8 ? 4 : c < 0xfc ? 5 : 6;
    let value = c & (0x7f >> count);
    let valid = c >= 0xc0 && c <= 0xfd && i + count <= data.length;
    if (valid) {
      for (let j = i + 1; j < i + count; j++) {
        const b = data[j];
        if (!(b >= 0x80 && b < 0xc0)) { valid = false; break; }
        value = (value << 6) | (b & 63);
      }
      valid = valid && MIN[count - 2] <= value && value < 0x110000;
    }
    if (valid) { out += String.fromCodePoint(value); i += count; }
    else {
      while (i < data.length && data[i] >= 0x80 && data[i] < 0xc0) i++;
      if (i < data.length) i++;
      while (i < data.length && data[i] >= 0x80 && data[i] < 0xc0) i++;
      out += "�";
    }
  }
  return out;
}

// 魔改 SHA-512(H14): Σ0=ROTR21^31^39、σ1=ROTR38^55^SHR6、Ch=(x&(y^z))^y、K[60..79] 与 pad 均改
const H14_K = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
  0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x7ba0ea2d98160007n, 0x7eabf2d0c21f964an, 0x8dbe8d038b409545n, 0x90bb1721582e8285n,
  0x99a2ad45936d4e61n, 0x9f86e289fe03e73an, 0xa84c4472faa9a82fn, 0xb3df34fce89e0532n,
  0xb99bb8d7b173534fn, 0xbc76cbab1aea1f9cn, 0xc226a69a780f3cc3n, 0xd304f19aa233957dn,
  0xde1be20a212129ddn, 0xe39bb43755141950n, 0xee84927cea48ddd2n, 0xf3edd2773c523b67n,
  0xfbfdfe53a8d32f2an, 0x0bee2c7ab77e9e25n, 0x0e90181cf1b09e56n, 0x25f57204c725bed8n,
];
const H14_IV = [
  0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n,
];
const M64 = (1n << 64n) - 1n;
function rotr64(x, n) { const b = BigInt(n); return ((x >> b) | (x << (64n - b))) & M64; }
function h14digest(bytes) {
  const data = bytes.slice();
  const bitLen = BigInt(data.length * 8);
  data.push(0x80);
  while (data.length % 128 !== 112) data.push(0);
  for (let i = 15; i >= 0; i--) data.push(Number((bitLen >> BigInt(8 * i)) & 0xffn));
  let [a0, b0, c0, d0, e0, f0, g0, h0] = H14_IV;
  for (let off = 0; off < data.length; off += 128) {
    const w = [];
    for (let i = 0; i < 16; i++) {
      let lane = 0n;
      for (let b = 0; b < 8; b++) lane = (lane << 8n) | BigInt(data[off + i * 8 + b]);
      w.push(lane);
    }
    for (let i = 16; i < 80; i++) {
      const x = w[i - 15], y = w[i - 2];
      const s0 = rotr64(x, 1) ^ rotr64(x, 8) ^ (x >> 7n);
      const s1 = rotr64(y, 38) ^ rotr64(y, 55) ^ (y >> 6n);
      w.push((s1 + w[i - 7] + s0 + w[i - 16]) & M64);
    }
    let a = a0, b = b0, c = c0, d = d0, e = e0, f = f0, g = g0, h = h0;
    for (let i = 0; i < 80; i++) {
      const sigma1 = rotr64(e, 14) ^ rotr64(e, 18) ^ rotr64(e, 41);
      const ch = (e & (f ^ g)) ^ f;
      const t1 = (h + sigma1 + ch + H14_K[i] + w[i]) & M64;
      const sigma0 = rotr64(a, 21) ^ rotr64(a, 31) ^ rotr64(a, 39);
      const maj = (a & (b | c)) | (b & c);
      const t2 = (sigma0 + maj) & M64;
      h = g; g = f; f = e; e = (d + t1) & M64; d = c; c = b; b = a; a = (t1 + t2) & M64;
    }
    a0 = (a0 + a) & M64; b0 = (b0 + b) & M64; c0 = (c0 + c) & M64; d0 = (d0 + d) & M64;
    e0 = (e0 + e) & M64; f0 = (f0 + f) & M64; g0 = (g0 + g) & M64; h0 = (h0 + h) & M64;
  }
  const out = [];
  for (const v of [a0, b0, c0, d0, e0, f0, g0, h0])
    for (let b = 7; b >= 0; b--) out.push(Number((v >> BigInt(8 * b)) & 0xffn));
  return out;
}
function hmac14(key, data) {
  let k = key.slice();
  if (k.length > 128) k = h14digest(k);
  while (k.length < 128) k.push(0);
  const inner = k.map((x) => x ^ 0x52);
  const outer = k.map((x) => x ^ 0x6c);
  return h14digest(outer.concat(h14digest(inner.concat(data))));
}

// 外层 CRC32: reflected poly 0xAD350290, init=xorout=0xFFFFFFFF(与查询 hkey 的 CRC 不同)
function crc14(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let b = 0; b < 8; b++) crc = ((crc >>> 1) ^ ((crc & 1) ? 0xad350290 : 0)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function queryHkey(path, time, deviceId, version, nonce) {
  if (!path.endsWith("/")) path += "/";
  const A = base64(hmacSha3_512(utf8Bytes(deviceId), utf8Bytes(version + "/" + time)));
  const B = base64(hmacSha3_512(utf8Bytes(A), utf8Bytes(path + "+" + time + "+" + deviceId + "+" + nonce)));
  return hex8(crc32Custom(utf8Bytes(A + B)));
}

function cookieHkey(finalUrl) {
  const inner = md5hex(utf8Bytes(finalUrl));
  return md5hex(utf8Bytes(inner.replace(/a/g, "a1")));
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
function parseQuery(url) {
  const out = {};
  const qi = url.indexOf("?");
  if (qi < 0) return out;
  for (const seg of url.slice(qi + 1).split("&")) {
    const i = seg.indexOf("=");
    if (i < 0) continue;
    out[seg.slice(0, i)] = decodeURIComponent(seg.slice(i + 1));
  }
  return out;
}

function normalizeCookie(raw) {
  if (!raw) return "";
  const parts = raw
    .split("\n")
    .flatMap((line) => line.replace(/^cookie:\s*/i, "").split(";"));
  return parts.map((s) => s.trim()).filter(Boolean).join("; ");
}

function parseCookieField(cookieStr, field) {
  if (!cookieStr) return undefined;
  const seg = cookieStr.split(";").find((s) => s.trim().startsWith(field + "="));
  return seg ? seg.trim().slice(field.length + 1) : undefined;
}

// 记录本次结果,供「签到汇总」:ok 正常 / cookie 需重新抓取 / fail 其他失败 / none 未使用
function saveStatus(s, msg) {
  msg = String(msg).slice(0, 100);
  if (s === "fail" && /过期|重新登录|未登录|请登录|登录失效|登录已失效|token\s*(失效|过期|无效)|relogin/i.test(msg)) s = "cookie";
  let keep = null;
  if (s === "ok" && /^(今日已|已发起)/.test(msg)) {
    const day = (t) => new Date(t + 8 * 3600 * 1000).toISOString().slice(0, 10);
    let old = null;
    try { old = JSON.parse($.getdata("heybox_status") || "null"); } catch (e) {}
    if (old && old.s === "ok" && !/^(今日已|已发起)/.test(old.msg) && day(old.t) === day(Date.now())) keep = old;
  }
  checkinReport("heybox_status", keep ? keepReward(keep, { s, msg }) : { s, msg }, { name: "小黑盒", author: "MaYIHEI", run: "http://1.1.1.1/checkin/heybox", open: "https://apps.apple.com/app/id1244505010" });
}

function maskToken(s) {
  if (!s || s.length < 12) return "***";
  return s.slice(0, 6) + "..." + s.slice(-4);
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function debug(content) {
  if (($.getdata("heybox_debug") || "false") !== "true") return;
  $.log(`[DEBUG] ${typeof content === "string" ? content : JSON.stringify(content)}`);
}

// ═══ 纯 JS 密码学原语(沙箱无 crypto 库)═══════════════════════════════════════
function utf8Bytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c >= 0xd800 && c <= 0xdbff) {
      const c2 = str.charCodeAt(++i);
      const cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return out;
}

const B64CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
    out += B64CHARS[b0 >> 2];
    out += B64CHARS[((b0 & 3) << 4) | ((b1 === undefined ? 0 : b1) >> 4)];
    out += b1 === undefined ? "=" : B64CHARS[((b1 & 15) << 2) | ((b2 === undefined ? 0 : b2) >> 6)];
    out += b2 === undefined ? "=" : B64CHARS[b2 & 63];
  }
  return out;
}
function b64decode(str) {
  str = String(str).replace(/[^A-Za-z0-9+/=]/g, "");
  let bytes = [];
  for (let i = 0; i < str.length; i += 4) {
    const e = [0, 1, 2, 3].map((j) => B64CHARS.indexOf(str[i + j] || "="));
    const n = (e[0] << 18) | (e[1] << 12) | ((e[2] & 63) << 6) | (e[3] & 63);
    bytes.push((n >> 16) & 0xff);
    if (str[i + 2] !== "=" && e[2] !== -1) bytes.push((n >> 8) & 0xff);
    if (str[i + 3] !== "=" && e[3] !== -1) bytes.push(n & 0xff);
  }
  // bytes → UTF-8 string
  let out = "", i = 0;
  while (i < bytes.length) {
    const c = bytes[i++];
    if (c < 0x80) out += String.fromCharCode(c);
    else if (c < 0xe0) out += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (c < 0xf0) out += String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    else {
      const cp = ((c & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      const u = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (u >> 10), 0xdc00 + (u & 0x3ff));
    }
  }
  return out;
}

// SHA3-512 (FIPS 202, Keccak-f[1600], rate 72B, domain 0x06) via BigInt
const RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
const ROT = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];
const KMASK = (1n << 64n) - 1n;
function rotl(x, n) { n = BigInt(n); return ((x << n) | (x >> (64n - n))) & KMASK; }
function keccakF(s) {
  for (let round = 0; round < 24; round++) {
    const C = new Array(5);
    for (let x = 0; x < 5; x++) C[x] = s[x] ^ s[x + 5] ^ s[x + 10] ^ s[x + 15] ^ s[x + 20];
    const D = new Array(5);
    for (let x = 0; x < 5; x++) D[x] = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) s[x + 5 * y] ^= D[x];
    const B = new Array(25);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(s[x + 5 * y], ROT[x + 5 * y]);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) s[x + 5 * y] = (B[x + 5 * y] ^ ((~B[((x + 1) % 5) + 5 * y]) & B[((x + 2) % 5) + 5 * y])) & KMASK;
    s[0] ^= RC[round];
  }
}
function sha3_512(bytes) {
  const rate = 72;
  const s = new Array(25).fill(0n);
  const msg = bytes.slice();
  msg.push(0x06);
  while (msg.length % rate !== 0) msg.push(0x00);
  msg[msg.length - 1] |= 0x80;
  for (let off = 0; off < msg.length; off += rate) {
    for (let i = 0; i < rate; i += 8) {
      let lane = 0n;
      for (let b = 0; b < 8; b++) lane |= BigInt(msg[off + i + b]) << BigInt(8 * b);
      s[i / 8] ^= lane;
    }
    keccakF(s);
  }
  const out = [];
  let laneIdx = 0;
  while (out.length < 64) {
    let lane = s[laneIdx++];
    for (let b = 0; b < 8 && out.length < 64; b++) { out.push(Number(lane & 0xffn)); lane >>= 8n; }
  }
  return out;
}
function hmacSha3_512(keyBytes, msgBytes) {
  const B = 72;
  let k = keyBytes.slice();
  if (k.length > B) k = sha3_512(k);
  while (k.length < B) k.push(0);
  const ipad = new Array(B), opad = new Array(B);
  for (let i = 0; i < B; i++) { ipad[i] = k[i] ^ 0x36; opad[i] = k[i] ^ 0x5c; }
  return sha3_512(opad.concat(sha3_512(ipad.concat(msgBytes))));
}

function crc32Custom(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xe5a623e0 : 0);
    crc = crc >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function hex8(n) { return (n >>> 0).toString(16).padStart(8, "0"); }

function md5hex(bytes) {
  const add = (a, b) => (a + b) & 0xffffffff;
  const rol = (x, c) => (x << c) | (x >>> (32 - c));
  const s = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
    4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const K = [];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) & 0xffffffff;
  const msg = bytes.slice();
  const lenBits = msg.length * 8;
  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0);
  for (let i = 0; i < 8; i++) msg.push((lenBits / Math.pow(2, 8 * i)) & 0xff);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < msg.length; off += 64) {
    const M = [];
    for (let i = 0; i < 16; i++) M[i] = msg[off + i * 4] | (msg[off + i * 4 + 1] << 8) | (msg[off + i * 4 + 2] << 16) | (msg[off + i * 4 + 3] << 24);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = add(add(add(F, A), K[i]), M[g]);
      A = D; D = C; C = B;
      B = add(B, rol(F, s[i]));
    }
    a0 = add(a0, A); b0 = add(b0, B); c0 = add(c0, C); d0 = add(d0, D);
  }
  const toHex = (n) => { let h = ""; for (let i = 0; i < 4; i++) h += ((n >>> (8 * i)) & 0xff).toString(16).padStart(2, "0"); return h; };
  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

// 保留当天带奖励的旧记录(状态、奖励文字、时间),合并本次拿到的资产、过期时间等;本次没有的沿用旧值
function keepReward(old, rec) {
  const out = { s: old.s, msg: old.msg, t: old.t, asset: old.asset, exp: old.exp };
  for (const k in rec) if (rec[k] !== undefined && k !== "s" && k !== "msg") out[k] = rec[k];
  return out;
}

// 签到状态协议 v1:写本次结果,并把自己登记进公共索引 checkin_registry(Loon/Surge/QX/Stash 通用,不依赖 Env)
function checkinReport(key, rec, info) {
  const read = (k) => (typeof $prefs !== "undefined" ? $prefs.valueForKey(k) : $persistentStore.read(k));
  const write = (v, k) => (typeof $prefs !== "undefined" ? $prefs.setValueForKey(v, k) : $persistentStore.write(v, k));
  const registry = () => { try { return JSON.parse(read("checkin_registry") || "{}") || {}; } catch (e) { return {}; } };
  write(JSON.stringify(Object.assign({ v: 1, t: Date.now(), name: info.name, author: info.author }, rec)), key);
  const reg = registry();
  if (JSON.stringify(reg[key]) === JSON.stringify(info)) return;
  reg[key] = info;
  write(JSON.stringify(reg), "checkin_registry");
  if (!registry()[key]) console.log(`[checkin] ${key} 登记没写上,下次运行再补`);
}

// ─── Env（轻量版，兼容 Loon / Surge / QX / Stash）────────────────────────────
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
    }
  };
  this.done = (v = {}) => { if (typeof $done !== "undefined") $done(v); };
}

// ─── 入口(放文件末尾,确保上面的常量已初始化)──────────────────────────────
if (typeof $request !== "undefined" && !CHECKIN_RUN) {
  getCookie();
  $.done();
} else {
  (async () => {
    if (JSON.parse($.getdata("heybox_clear") || "false")) {
      $.setdata("", CK_KEY);
      $.setdata("false", "heybox_clear");
      $.msg($.name, "", "✅ Cookie 已清除，请重新抓取");
      return $.done();
    }
    try {
      await main();
    } catch (e) {
      saveStatus("fail", String(e));
      $.msg($.name, "❌ 运行异常", String(e));
    } finally {
      $.done();
    }
  })();
}
