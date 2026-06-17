/*
 * 网上国网 Cookie 抓取(Loon http-request)
 * 抓 csc-service 业务请求头里的鉴权三件套 + 设备头,存 sgcc_data
 *
 * [Script] 配置(Loon):
 * http-request ^https?:\/\/csc-service\.sgcc\.com\.cn:28630\/.+\/member\/ \
 *   script-path=<raw url>/app/sgcc/sgcc.cookie.js, requires-body=0, timeout=10, tag=网上国网 Cookie
 *
 * @Author MaYIHEI
 * @Updated 2026-06-17
 * 状态:🧪 待验证(token 寿命与签到链路真机未跑通)
 */
const KEY = 'sgcc_data';
const WANT = [
  'authorization', 't', 'userid', 'device_token',
  'appguid', 'appguidnew', 'devicetokentx', 'devicetokentxtime',
  'wtoken', 'appcode', 'os', 'version', 'ip', 'province', 'language',
  'wsgwtype', 'accessmethod', 'user-agent',
];

function read(k){ return typeof $persistentStore!=='undefined' ? $persistentStore.read(k) : null; }
function write(v,k){ return typeof $persistentStore!=='undefined' ? $persistentStore.write(v,k) : false; }
function notify(t,s,b){ if(typeof $notification!=='undefined') $notification.post(t,s,b); }

try {
  const h = ($request && $request.headers) || {};
  const low = {};
  for (const k in h) low[k.toLowerCase()] = h[k];
  const t = low['t'], uid = low['userid'];
  if (!t || !uid) { $done({}); }
  else {
    // 去重:t 没变就静默更新,不再弹通知(member 接口每页几十条,避免刷屏)
    let prevT = null;
    try { prevT = JSON.parse(read(KEY) || '{}').t; } catch (e) {}
    const picked = {};
    for (const k of WANT) if (low[k] != null) picked[k] = low[k];
    picked._ts = Date.now();
    const ok = write(JSON.stringify(picked), KEY);
    const back = read(KEY); // 写后读回校验(踩坑 #24)
    if (t !== prevT) {
      if (ok && back) {
        notify('✅ 网上国网 Cookie 获取成功',
          `userid: ${uid.slice(0,6)}…${uid.slice(-4)}`,
          `t: ${t.slice(0,6)}…${t.slice(-4)}  共 ${Object.keys(picked).length-1} 个头`);
      } else {
        notify('⚠️ 网上国网 Cookie 写入失败', '请检查 Loon 脚本权限', '');
      }
    }
    $done({});
  }
} catch (e) {
  notify('⚠️ 网上国网 Cookie 异常', e.message || String(e), '');
  $done({});
}
