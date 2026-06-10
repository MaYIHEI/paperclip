/**
 * 龙湖天街 App · 龙珠 H5「日日签」每日签到 + 幸运抽奖,签到得成长值/珑珠,抽奖随机珑珠(含大奖)
 *
 * 抓取:龙湖天街 App →「会员 / 日日签」点签到一次,抓 L0 通道鉴权头(usertoken + 顶象 dxrisk-token)
 * 签到:cron 先签到(clock),再领抽奖次数(lottery/sign)并抽到次数耗尽(lottery/click);支持随机时间(细节见 README)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-10
 *
 * ===== Loon =====
 * [MITM]
 * hostname = gw2c-hw-open.longfor.com
 * [Script]
 * http-request ^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$ tag=龙湖App Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png
 * cron "0-59/19 8-10 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js, tag=龙湖App签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = gw2c-hw-open.longfor.com
 * [Script]
 * 龙湖App Cookie = type=http-request,pattern=^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png
 * 龙湖App签到 = type=cron,cronexp=0-59/19 8-10 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = gw2c-hw-open.longfor.com
 * [rewrite_local]
 * ^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js
 * [task_local]
 * 0-59/19 8-10 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js, tag=龙湖App签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 龙湖App签到
 *       cron: '0-59/19 8-10 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "gw2c-hw-open.longfor.com"
 *   script:
 *     - match: ^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$
 *       name: 龙湖App Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   龙湖App签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js
 *     interval: 86400
 */

const $ = new Env('龙湖天街 App');

const SCRIPT_VERSION = "2026-06-10.r3"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

// ── 持久化 key ──
const CK_KEY = 'lhtj_app_data';          // 抓取的鉴权对象
const CLEAR_KEY = 'lhtj_app_clear';      // BoxJS 清除开关
const DONE_KEY = 'lhtj_app_done';        // 今日已完成日期(yyyy-MM-dd),幂等
const TARGET_KEY = 'lhtj_app_target';    // 今日随机目标({date, minute})
const RANDOM_KEY = 'lhtj_app_random';    // 随机时间开关(默认 true)
const WINDOW_KEY = 'lhtj_app_window';    // 随机时段(小时),默认 "8-10"
const LOTTERY_KEY = 'lhtj_app_lottery';  // 抽奖开关(默认 true)
const DEBUG_KEY = 'lhtj_app_debug';      // 调试开关

// ── 业务常量(APP 公开常量,非隐私) ──
const HOST = 'https://gw2c-hw-open.longfor.com';
const CLOCK_URL = `${HOST}/lmarketing-task-api-mvc-prod/openapi/task/v1/signature/clock`;
const LOTTERY_BASE = `${HOST}/llt-gateway-prod/api/v1/activity`;
const SIGN_ACTIVITY_NO = '11111111111736501868255956070000'; // APP 通道签到活动号(与小程序版不同)
const LOTTERY_ACTIVITY_NO = 'AP26A052Q8CDQZMJ';
const LOTTERY_COMPONENT_NO = 'C311908N01I94VR9';
const SIGN_GAIA = 'c06753f1-3e68-437d-b592-b94656ea5517';     // 签到网关 key(固定)
const LOTTERY_GAIA = '2f9e3889-91d9-4684-8ff5-24d881438eaf';  // 抽奖网关 key(固定)
const UA_FALLBACK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const MAX_DRAW = 10; // 抽奖循环上限,防御性

const DEBUG = ($.getdata(DEBUG_KEY) || 'false') === 'true';
function dlog(...a) { if (DEBUG) $.log('[DEBUG]', ...a); }

// ────────────────────────────────────────────────────────────────────
// 入口:$request 存在 = 抓取钩子;否则 cron 签到 + 抽奖
// ────────────────────────────────────────────────────────────────────
if (typeof $request !== "undefined" && $request.url && $request.url.includes('/signature/clock')) {
  getCookie();
} else {
  (async () => {
    // BoxJS 一键清除
    if (JSON.parse($.getdata(CLEAR_KEY) || "false")) {
      $.setdata("", CK_KEY);
      $.setdata("", DONE_KEY);
      $.setdata("", TARGET_KEY);
      $.setdata("false", CLEAR_KEY);
      $.msg($.name, "", "✅ Cookie 已清除,请重新抓取");
      return $.done();
    }

    const raw = $.getdata(CK_KEY);
    if (!raw) {
      $.msg($.name, '', '❌ 未抓取到鉴权,请按 README 重写规则在 App 内点一次签到');
      return $.done();
    }
    let auth;
    try {
      auth = JSON.parse(raw);
    } catch (e) {
      $.msg($.name, '', '❌ 鉴权数据格式异常,请重新抓取');
      return $.done();
    }
    if (!auth.usertoken) {
      $.msg($.name, '', '❌ 鉴权缺失 usertoken,请重新抓取');
      return $.done();
    }

    // 随机时间窗口:开启时需配密集 cron(见 README);未到目标时间静默退出
    if (!shouldRunNow()) {
      return $.done();
    }

    await sign(auth);

    if (($.getdata(LOTTERY_KEY) || 'true') === 'true') {
      await lottery(auth);
    }

    $.done();
  })();
}

// ────────────────────────────────────────────────────────────────────
// 抓取钩子:从 clock 请求头提取 L0 通道鉴权
// ────────────────────────────────────────────────────────────────────
function getCookie() {
  const h = $request.headers;
  const pick = (k) => {
    const key = Object.keys(h).find(x => x.toLowerCase() === k.toLowerCase());
    return key ? h[key] : '';
  };
  const usertoken = pick('x-lf-usertoken');
  const channel = pick('x-lf-channel');
  $.log(`[抓取] channel=${channel} usertoken=${usertoken ? usertoken.slice(0, 8) + '…' : '(空)'}`);

  if (!usertoken) {
    $.msg($.name, '⚠️ 抓取失败', '没拿到 x-lf-usertoken,请在 App 内重新点一次签到');
    return $done({});
  }
  // 本脚本是 APP 通道(L0);小程序通道(C2)请用 miniprogram/lhtj
  if (channel !== 'L0') {
    $.msg($.name, '⚠️ 通道不匹配', `当前为 ${channel || '未知'} 通道,本脚本仅支持 App(L0);小程序(C2)请用小程序版`);
    return $done({});
  }

  const data = {
    usertoken,
    dxrisk_token: pick('x-lf-dxrisk-token'),
    dxrisk_source: pick('x-lf-dxrisk-source') || '2',
    dxrisk_captcha_token: pick('x-lf-dxrisk-captcha-token') || 'undefined',
    user_agent: pick('user-agent') || UA_FALLBACK,
  };
  $.setdata(JSON.stringify(data), CK_KEY);
  $.setdata("", DONE_KEY); // 重新抓取 → 清今日完成标记,允许当天再签
  $.msg($.name, '', '✅ 龙湖天街 App Cookie 获取成功');
  $done({});
}

// ────────────────────────────────────────────────────────────────────
// 随机时间窗口:摇当天目标分钟,未到点静默退出(依赖密集 cron)
// ────────────────────────────────────────────────────────────────────
function shouldRunNow() {
  const today = $.time('yyyy-MM-dd');

  // 今日已完成 → 静默跳过(避免密集 cron 重复弹通知)
  if ($.getdata(DONE_KEY) === today) {
    dlog('今日已完成,跳过');
    return false;
  }

  // 随机开关关闭 → cron 命中即执行(配单点 cron)
  if (($.getdata(RANDOM_KEY) || 'true') !== 'true') {
    return true;
  }

  // 取/生成今日随机目标分钟
  let target = $.getjson(TARGET_KEY, null);
  if (!target || target.date !== today) {
    const win = ($.getdata(WINDOW_KEY) || '8-10').split('-').map(n => parseInt(n, 10));
    const startH = isNaN(win[0]) ? 8 : win[0];
    const endH = isNaN(win[1]) ? 10 : win[1];
    const startMin = startH * 60;
    const endMin = Math.max(endH * 60, startMin + 1);
    const minute = startMin + Math.floor(Math.random() * (endMin - startMin));
    target = { date: today, minute };
    $.setjson(target, TARGET_KEY);
    $.log(`[随机] 今日目标签到时间 ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
  }

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < target.minute) {
    dlog(`未到目标时间(now ${nowMin} < target ${target.minute}),等待下次 cron`);
    return false;
  }
  return true;
}

// ────────────────────────────────────────────────────────────────────
// 签到(lmarketing clock)
// ────────────────────────────────────────────────────────────────────
function signHeaders(auth) {
  return {
    'x-lf-usertoken': auth.usertoken,
    'token': auth.usertoken,
    'x-gaia-api-key': SIGN_GAIA,
    'x-lf-channel': 'L0',
    'x-lf-bu-code': 'L00602',
    'x-lf-dxrisk-source': auth.dxrisk_source || '2',
    'x-lf-dxrisk-token': auth.dxrisk_token || '',
    'x-lf-dxrisk-captcha-token': auth.dxrisk_captcha_token || 'undefined',
    'content-type': 'application/json;charset=UTF-8',
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh-Hans;q=0.9',
    'origin': 'https://longzhu.longfor.com',
    'referer': 'https://longzhu.longfor.com/',
    'user-agent': auth.user_agent || UA_FALLBACK,
  };
}

function sign(auth) {
  return new Promise((resolve) => {
    const opts = {
      url: CLOCK_URL,
      headers: signHeaders(auth),
      body: JSON.stringify({ activity_no: SIGN_ACTIVITY_NO }),
    };
    $.post(opts, (err, resp, body) => {
      try {
        if (err) {
          $.msg($.name, '签到失败', `网络错误: ${err}`);
          return resolve();
        }
        dlog('clock 响应', truncate(body, 300));
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        if (data.code === '0000') {
          const reward = (data.data && data.data.reward_info) || [];
          const desc = reward.map(r => {
            const type = r.reward_type === 20 ? '成长值' : (r.reward_type === 30 ? '珑珠' : `类型${r.reward_type}`);
            const tag = r.sign_type === 20 ? '(连签)' : '';
            return `+${r.reward_num}${type}${tag}`;
          }).join(' / ') || '已签到';
          $.msg($.name, '✅ 签到成功', desc);
          markDone();
        } else if (data.code === '8040012' || data.code === '8040013') {
          // 顶象风控拦截:账号已被标记,重抓也无效,只能停脚本手动养号
          $.msg($.name, '⚠️ 账号已被风控', `重抓 Cookie 也无效,建议暂停脚本、改用 App 手动签到养号一段时间再恢复 [${data.code}] ${truncate(body, 120)}`);
        } else if (data.message && /已签|不能重复|今日已/.test(data.message)) {
          $.msg($.name, '✅ 今日已签', data.message);
          markDone();
        } else {
          $.msg($.name, '❌ 签到失败', `[${data.code}] ${data.message || ''} | ${truncate(body, 200)}`);
        }
      } catch (e) {
        $.msg($.name, '❌ 签到解析异常', `${e.message} | ${truncate(body, 300)}`);
      } finally {
        resolve();
      }
    });
  });
}

function markDone() {
  $.setdata($.time('yyyy-MM-dd'), DONE_KEY);
}

// ────────────────────────────────────────────────────────────────────
// 抽奖(llt-gateway):领次数(sign) → 查 chance → 循环 click
// ────────────────────────────────────────────────────────────────────
function lotteryHeaders(auth, withRisk) {
  const h = {
    'authtoken': auth.usertoken,
    'x-gaia-api-key': LOTTERY_GAIA,
    'channel': 'L0',
    'bucode': 'L00602',
    'content-type': 'application/json',
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh-Hans;q=0.9',
    'origin': 'https://llt.longfor.com',
    'referer': 'https://llt.longfor.com/',
    'user-agent': auth.user_agent || UA_FALLBACK,
  };
  if (withRisk) {
    h['x-lf-dxrisk-source'] = auth.dxrisk_source || '2';
    h['x-lf-dxrisk-token'] = auth.dxrisk_token || '';
  }
  return h;
}

function lotteryPost(auth, path, payload) {
  return new Promise((resolve) => {
    $.post({
      url: `${LOTTERY_BASE}${path}`,
      headers: lotteryHeaders(auth, true),
      body: JSON.stringify(payload),
    }, (err, resp, body) => {
      if (err) return resolve({ err });
      try { resolve({ data: typeof body === 'string' ? JSON.parse(body) : body, raw: body }); }
      catch (e) { resolve({ err: e.message, raw: body }); }
    });
  });
}

function getChance(auth) {
  return new Promise((resolve) => {
    const q = `?component_no=${LOTTERY_COMPONENT_NO}&activity_no=${LOTTERY_ACTIVITY_NO}`;
    $.get({
      url: `${LOTTERY_BASE}/auth/lottery/chance${q}`,
      headers: lotteryHeaders(auth, false),
    }, (err, resp, body) => {
      if (err) return resolve(0);
      try {
        const d = typeof body === 'string' ? JSON.parse(body) : body;
        resolve((d && d.data && Number(d.data.chance)) || 0);
      } catch (e) { resolve(0); }
    });
  });
}

async function lottery(auth) {
  const payload = { component_no: LOTTERY_COMPONENT_NO, activity_no: LOTTERY_ACTIVITY_NO };

  // 1. 领取当日抽奖次数(完成签到任务换次数)
  const signRes = await lotteryPost(auth, '/auth/lottery/sign', payload);
  if (signRes.err) {
    $.msg($.name, '🎰 抽奖跳过', `领次数网络错误: ${signRes.err}`);
    return;
  }
  dlog('lottery/sign 响应', truncate(signRes.raw, 200));
  if (signRes.data && signRes.data.code !== '0000') {
    // 已领过 / 风控,签到已成功就不打扰,debug 才提示
    dlog('lottery/sign 非 0000', signRes.data.code, signRes.data.message);
  }

  // 2. 查剩余次数
  let chance = await getChance(auth);
  $.log(`[抽奖] 剩余次数 ${chance}`);
  if (chance <= 0) {
    dlog('无抽奖次数,结束');
    return;
  }

  // 3. 循环抽奖到次数耗尽
  const prizes = [];
  let loop = 0;
  while (chance > 0 && loop < MAX_DRAW) {
    loop++;
    const clickRes = await lotteryPost(auth, '/auth/lottery/click', { ...payload, batch_no: '' });
    if (clickRes.err) {
      $.log(`[抽奖] click 网络错误: ${clickRes.err}`);
      break;
    }
    dlog('lottery/click 响应', truncate(clickRes.raw, 200));
    const d = clickRes.data;
    if (d && d.code === '0000' && d.data) {
      const name = d.data.prize_name || '未知奖品';
      const num = d.data.reward_num != null ? d.data.reward_num : '';
      const type = d.data.reward_type === 30 ? '珑珠' : '';
      prizes.push(num !== '' ? `${name} +${num}${type}` : name);
    } else if (d && (d.code === '8040012' || d.code === '8040013')) {
      $.msg($.name, '⚠️ 账号已被风控', `抽奖触发风控,重抓也无效,建议暂停脚本、改用 App 手动操作养号一段时间再恢复 [${d.code}]`);
      break;
    } else {
      $.log(`[抽奖] click 非预期: ${truncate(clickRes.raw, 200)}`);
      break;
    }
    await $.wait(1200); // 间隔,避免过快触发风控
    chance = await getChance(auth);
  }

  if (prizes.length) {
    $.msg($.name, `🎁 抽奖 ${prizes.length} 次`, prizes.join('\n'));
  }
}

function truncate(s, n) {
  if (!s) return '';
  const str = typeof s === 'string' ? s : JSON.stringify(s);
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,o)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.logLevels={debug:0,info:1,warn:2,error:3},this.logLevelPrefixs={debug:"[DEBUG] ",info:"[INFO] ",warn:"[WARN] ",error:"[ERROR] "},this.logLevel="info",this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=e&&e.timeout?e.timeout:o;const[r,a]=i.split("@"),h={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"},timeout:o};this.post(h,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),o=JSON.stringify(this.data);s?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(e,o):this.fs.writeFileSync(t,o)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return s;return o}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),o=s?this.getval(s):"";if(o)try{const t=JSON.parse(o);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(e),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const e=JSON.parse(a);this.lodash_set(e,o,t),s=this.setval(JSON.stringify(e),i)}catch(e){const r={};this.lodash_set(r,o,t),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar)))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=t,h=s.decode(a,this.encoding);e(null,{status:i,statusCode:o,headers:r,rawBody:a,body:h},h)},t=>{const{message:i,response:o}=t;e(i,o,o&&s.decode(o.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(t);const{url:o,...r}=t;this.got[s](o,r).then(t=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=t,h=i.decode(a,this.encoding);e(null,{status:s,statusCode:o,headers:r,rawBody:a,body:h},h)},t=>{const{message:s,response:o}=t;e(s,o,o&&i.decode(o.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",o){const r=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":i}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()||this.isStash()||this.isShadowrocket()?$notification.post(e,s,i,r(o)):this.isQuanX()&&$notify(e,s,i,r(o))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.map(t=>"object"==typeof t?JSON.stringify(t):t).join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon()&&!this.isStash()&&!this.isShadowrocket();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon()||this.isStash()||this.isShadowrocket())&&$done(t)}queryStr(t){let e="";for(const s in t){let i=t[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),e+=`${s}=${i}&`)}return e=e.substring(0,e.length-1),e}}(t,e)}
