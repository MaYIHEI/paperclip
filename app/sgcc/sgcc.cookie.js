/*
 * 网上国网 抓取(Loon http-request)—— 抓两样,全存本地 BoxJS,仓库不留个人数据
 *   ① 鉴权头(t/userid/设备头)→ sgcc_data
 *   ② "提交签到"信封(m1/0103514 的 data+skey)→ sgcc_signin(供 sgcc.js 复用)
 * 开 App 进「我的/积分签到」页一次,两样自动抓全。
 *
 * [Script] 配置(Loon,需 requires-body 才能抓签到信封):
 * http-request ^https?:\/\/csc-service\.sgcc\.com\.cn:28630\/.+\/member\/ \
 *   script-path=<raw>/app/sgcc/sgcc.cookie.js, requires-body=1, timeout=10, tag=网上国网 Cookie
 *
 * @Author MaYIHEI  @Updated 2026-06-17  状态:🧪 待验证
 */
const KEY = 'sgcc_data';
const KEY_ENV = 'sgcc_signin';
const SIGNIN_PATH = '/osg-omgmt1042/member/m1/0103514'; // 真正"提交签到"端点(一天一次)
const WANT = [
  'authorization', 't', 'userid', 'device_token',
  'appguid', 'appguidnew', 'devicetokentx', 'devicetokentxtime',
  'wtoken', 'appcode', 'os', 'version', 'ip', 'province', 'language',
  'wsgwtype', 'accessmethod', 'user-agent',
];

function read(k){ return typeof $persistentStore!=='undefined' ? $persistentStore.read(k) : null; }
function write(v,k){ return typeof $persistentStore!=='undefined' ? $persistentStore.write(v,k) : false; }
function notify(t,s,b){ if(typeof $notification!=='undefined') $notification.post(t,s,b||''); }

try {
  const url = ($request && $request.url) || '';
  const h = ($request && $request.headers) || {};
  const low = {};
  for (const k in h) low[k.toLowerCase()] = h[k];

  // ② 抓"提交签到"信封(只在 m1/0103514 这一条,带 body)
  if (url.indexOf(SIGNIN_PATH) > -1) {
    try {
      const b = JSON.parse(($request && $request.body) || '{}');
      if (b.data && b.skey) {
        const prev = read(KEY_ENV);
        write(JSON.stringify({ data: b.data, skey: b.skey, path: SIGNIN_PATH }), KEY_ENV);
        if (!prev) notify('✅ 网上国网 签到信封已抓', '之后可自动签到', '');
      }
    } catch (e) {}
  }

  // ① 抓鉴权头
  const t = low['t'], uid = low['userid'];
  if (!t || !uid) { $done({}); }
  else {
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
  notify('⚠️ 网上国网 抓取异常', e.message || String(e), '');
  $done({});
}
