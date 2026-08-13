/**
 * 网上国网 · 凭据抓取
 *
 * 抓取两类数据：
 * 1. 任意 member 请求中的鉴权头（sgcc_data）
 * 2. 签到提交请求 m1/0103514 的加密信封（sgcc_signin）
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-08-13
 */

const SCRIPT_VERSION = "2026-08-13.r2";
const KEY_AUTH = "sgcc_data";
const KEY_SIGNIN = "sgcc_signin";
const SIGNIN_PATH = "/osg-omgmt1042/member/m1/0103514";
const AUTH_KEYS = [
  "authorization", "t", "userid", "device_token", "appguid", "appguidnew",
  "devicetokentx", "devicetokentxtime", "wtoken", "appcode", "os", "version",
  "ip", "province", "language", "wsgwtype", "accessmethod", "user-agent"
];

const runtime = detectRuntime();

function detectRuntime() {
  if (typeof $task !== "undefined" && typeof $prefs !== "undefined") return "Quantumult X";
  if (typeof $persistentStore !== "undefined") return "Surge/Loon/Stash";
  return "Unknown";
}

function read(key) {
  if (runtime === "Quantumult X") return $prefs.valueForKey(key);
  if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
  return null;
}

function write(value, key) {
  if (runtime === "Quantumult X") return $prefs.setValueForKey(value, key);
  if (typeof $persistentStore !== "undefined") return $persistentStore.write(value, key);
  return false;
}

function notify(title, subtitle, body) {
  if (typeof $notify !== "undefined") $notify(title, subtitle || "", body || "");
  else if (typeof $notification !== "undefined") $notification.post(title, subtitle || "", body || "");
  console.log([title, subtitle, body].filter(Boolean).join(" | "));
}

function finish() {
  if (typeof $done !== "undefined") $done({});
}

function parseObject(raw) {
  if (!raw || typeof raw !== "string") return null;
  try { return JSON.parse(raw); } catch (_) {}
  try { return JSON.parse(decodeURIComponent(raw)); } catch (_) {}
  return null;
}

function saveVerified(key, value) {
  const encoded = JSON.stringify(value);
  if (!write(encoded, key)) return false;
  const stored = read(key);
  if (!stored) return false;
  const check = parseObject(stored);
  return !!check && check._fingerprint === value._fingerprint;
}

function fingerprint(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${(hash >>> 0).toString(16)}`;
}

(function main() {
  console.log(`[INFO] 网上国网抓取 ${SCRIPT_VERSION} · ${runtime}`);
  if (typeof $request === "undefined") {
    notify("⚠️ 网上国网抓取", "运行方式错误", "请通过 http-request 规则触发");
    return finish();
  }

  try {
    const url = String($request.url || "");
    const sourceHeaders = $request.headers || {};
    const headers = {};
    Object.keys(sourceHeaders).forEach(k => { headers[k.toLowerCase()] = sourceHeaders[k]; });

    let authSaved = false;
    let signinSaved = false;
    let signinSeen = false;

    const token = headers.t;
    const userid = headers.userid;
    if (token && userid) {
      const picked = {};
      AUTH_KEYS.forEach(k => { if (headers[k] != null) picked[k] = headers[k]; });
      picked._ts = Date.now();
      picked._fingerprint = fingerprint(token);
      const previous = parseObject(read(KEY_AUTH));
      authSaved = saveVerified(KEY_AUTH, picked);
      if (!authSaved) {
        notify("⚠️ 网上国网抓取", "鉴权写入失败", `${runtime} 未能回读 ${KEY_AUTH}`);
      } else if (!previous || previous._fingerprint !== picked._fingerprint) {
        notify("✅ 网上国网鉴权已抓", `userid: ${String(userid).slice(0, 6)}…${String(userid).slice(-4)}`, "还需抓到签到请求后才能自动签到");
      }
    }

    if (url.includes(SIGNIN_PATH)) {
      signinSeen = true;
      const body = parseObject(typeof $request.body === "string" ? $request.body : "");
      if (body && body.data && body.skey) {
        const envelope = {
          data: body.data,
          skey: body.skey,
          path: SIGNIN_PATH,
          _ts: Date.now(),
          _fingerprint: fingerprint(body.skey + body.data)
        };
        const previous = parseObject(read(KEY_SIGNIN));
        signinSaved = saveVerified(KEY_SIGNIN, envelope);
        if (!signinSaved) {
          notify("⚠️ 网上国网抓取", "签到请求写入失败", `${runtime} 未能回读 ${KEY_SIGNIN}`);
        } else if (!previous || previous._fingerprint !== envelope._fingerprint) {
          notify("✅ 网上国网签到请求已抓", "自动签到所需数据已齐", "抓取开关现在可以关闭");
        }
      } else {
        console.log(`[WARN] 命中签到接口但请求体不可用，body长度=${String($request.body || "").length}`);
        notify("⚠️ 网上国网抓取", "命中签到接口但没有请求体", "确认规则启用 requires-body，并在未签到当天重试");
      }
    }

    if (!token || !userid) console.log("[INFO] 当前请求没有完整 t/userid，未更新鉴权");
    if (!signinSeen) console.log("[INFO] 当前请求不是签到提交，仅尝试更新鉴权");
    console.log(`[INFO] 保存结果 auth=${authSaved} signin=${signinSaved}`);
    finish();
  } catch (error) {
    notify("⚠️ 网上国网抓取异常", error.message || String(error), "");
    finish();
  }
})();
