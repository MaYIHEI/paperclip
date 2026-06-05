/**
 * 龙湖天街 · 微信小程序「龙湖天街」每日签到「日日签 日日赚」,签到得成长值 + 珑珠
 *
 * 抓取:打开「龙湖天街」小程序 →「会员」→「日日签」点签到一次,抓鉴权 headers
 * 签到:cron 定时自动签到
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-05-24
 *
 * ===== Loon =====
 * [MITM]
 * hostname = gw2c-hw-open.longfor.com
 * [Script]
 * http-request ^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$ tag=龙湖天街 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png
 * cron "0 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js, tag=龙湖天街签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = gw2c-hw-open.longfor.com
 * [Script]
 * 龙湖天街 Cookie = type=http-request,pattern=^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png
 * 龙湖天街签到 = type=cron,cronexp=0 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = gw2c-hw-open.longfor.com
 * [rewrite_local]
 * ^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js
 * [task_local]
 * 0 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js, tag=龙湖天街签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 龙湖天街签到
 *       cron: '0 9 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "gw2c-hw-open.longfor.com"
 *   script:
 *     - match: ^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$
 *       name: 龙湖天街 Cookie
 *       type: request
 *       require-body: false
 * script-providers:
 *   龙湖天街签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js
 *     interval: 86400
 */

const $ = new Env('龙湖天街');

const SCRIPT_VERSION = "2026-05-24.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);
const CK_KEY = 'lhtj_headers';
const ACTIVITY_NO = '11111111111686241863606037740000';
const SIGN_URL = 'https://gw2c-hw-open.longfor.com/lmarketing-task-api-mvc-prod/openapi/task/v1/signature/clock';

// ────────────────────────────────────────────────────────────────────
// 重写脚本分支:抓 headers
// ────────────────────────────────────────────────────────────────────
if (typeof $request !== "undefined" && $request.url && $request.url.includes('/signature/clock')) {
  getCookie();
} else {
  // ──────────────────────────────────────────────────────────────────
  // Cron 分支:执行签到
  // ──────────────────────────────────────────────────────────────────
  (async () => {
    const raw = $.getdata(CK_KEY);
    if (!raw) {
      $.msg($.name, '', '❌ 未抓取到 token,请按 README 重写规则抓取');
      return $.done();
    }
    let headers;
    try {
      headers = JSON.parse(raw);
    } catch (e) {
      $.msg($.name, '', '❌ token 数据格式异常,请重新抓取');
      return $.done();
    }
    if (!headers['x-lf-usertoken']) {
      $.msg($.name, '', '❌ token 缺失 x-lf-usertoken,请重新抓取');
      return $.done();
    }
    await sign(headers);
    $.done();
  })();
}

function getCookie() {
  const h = $request.headers;
  // 取关键鉴权头(大小写不敏感)
  const pick = (k) => {
    const key = Object.keys(h).find(x => x.toLowerCase() === k.toLowerCase());
    return key ? h[key] : '';
  };
  const usertoken = pick('x-lf-usertoken');
  if (!usertoken) {
    return $done({});
  }
  const data = {
    'x-lf-usertoken': usertoken,
    'token': pick('token') || usertoken,
    'x-gaia-api-key': pick('x-gaia-api-key'),
    'x-lf-bu-code': pick('x-lf-bu-code'),
    'x-lf-channel': pick('x-lf-channel'),
    'x-lf-dxrisk-source': pick('x-lf-dxrisk-source'),
    'x-lf-dxrisk-token': pick('x-lf-dxrisk-token'),
    'x-lf-dxrisk-captcha-token': pick('x-lf-dxrisk-captcha-token') || 'undefined',
    'user-agent': pick('user-agent'),
    'referer': pick('referer') || 'https://longzhu.longfor.com/',
    'origin': pick('origin') || 'https://longzhu.longfor.com',
  };
  // 校验通道是不是小程序通道,APP 通道直接拒绝避免误抓
  if (data['x-lf-channel'] !== 'C2') {
    $.msg($.name, '⚠️ 通道不匹配', `当前为 ${data['x-lf-channel']} 通道,本脚本仅支持小程序(C2)`);
    return $done({});
  }
  $.setdata(JSON.stringify(data), CK_KEY);
  $.msg($.name, '', '🎉 抓取 token 成功,可关闭重写规则');
  $done({});
}

function sign(headers) {
  return new Promise((resolve) => {
    const opts = {
      url: SIGN_URL,
      headers: {
        ...headers,
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json;charset=UTF-8',
        'accept-language': 'zh-CN,zh-Hans;q=0.9',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
      body: JSON.stringify({ activity_no: ACTIVITY_NO }),
    };
    $.post(opts, (err, resp, body) => {
      try {
        if (err) {
          $.msg($.name, '签到失败', `网络错误: ${err}`);
          return resolve();
        }
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        // 0000 = 成功;签过的有专门错误码,实际抓包未覆盖,按 code 非 0000 走失败分支
        if (data.code === '0000') {
          const reward = (data.data && data.data.reward_info) || [];
          const desc = reward.map(r => {
            const type = r.reward_type === 20 ? '成长值' : (r.reward_type === 30 ? '珑珠' : `类型${r.reward_type}`);
            const tag = r.sign_type === 20 ? '(连签)' : '';
            return `+${r.reward_num}${type}${tag}`;
          }).join(' / ') || '已签到';
          $.msg($.name, '✅ 签到成功', desc);
        } else if (data.code === '8040012' || data.code === '8040013') {
          // 风控被拒(目前小程序通道未观察到,APP 通道才会)
          $.msg($.name, '❌ 风控拦截', `[${data.code}] ${data.message || '请重新抓取 token'} | 响应: ${truncate(body, 200)}`);
        } else if (data.message && /已签|不能重复|今日已/.test(data.message)) {
          $.msg($.name, '✅ 今日已签', data.message);
        } else {
          $.msg($.name, '❌ 签到失败', `[${data.code}] ${data.message || ''} | 响应: ${truncate(body, 200)}`);
        }
      } catch (e) {
        $.msg($.name, '❌ 解析异常', `${e.message} | 响应: ${truncate(body, 300)}`);
      } finally {
        resolve();
      }
    });
  });
}

function truncate(s, n) {
  if (!s) return '';
  const str = typeof s === 'string' ? s : JSON.stringify(s);
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,o)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.logLevels={debug:0,info:1,warn:2,error:3},this.logLevelPrefixs={debug:"[DEBUG] ",info:"[INFO] ",warn:"[WARN] ",error:"[ERROR] "},this.logLevel="info",this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=e&&e.timeout?e.timeout:o;const[r,a]=i.split("@"),h={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"},timeout:o};this.post(h,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),o=JSON.stringify(this.data);s?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(e,o):this.fs.writeFileSync(t,o)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return s;return o}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),o=s?this.getval(s):"";if(o)try{const t=JSON.parse(o);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(e),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const e=JSON.parse(a);this.lodash_set(e,o,t),s=this.setval(JSON.stringify(e),i)}catch(e){const r={};this.lodash_set(r,o,t),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar)))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=t,h=s.decode(a,this.encoding);e(null,{status:i,statusCode:o,headers:r,rawBody:a,body:h},h)},t=>{const{message:i,response:o}=t;e(i,o,o&&s.decode(o.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),void 0===t.followRedirect||t.followRedirect||((this.isSurge()||this.isLoon())&&(t["auto-redirect"]=!1),this.isQuanX()&&(t.opts?t.opts.redirection=!1:t.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=t;e(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(t);const{url:o,...r}=t;this.got[s](o,r).then(t=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=t,h=i.decode(a,this.encoding);e(null,{status:s,statusCode:o,headers:r,rawBody:a,body:h},h)},t=>{const{message:s,response:o}=t;e(s,o,o&&i.decode(o.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",o){const r=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":i}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()||this.isStash()||this.isShadowrocket()?$notification.post(e,s,i,r(o)):this.isQuanX()&&$notify(e,s,i,r(o))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.map(t=>"object"==typeof t?JSON.stringify(t):t).join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon()&&!this.isStash()&&!this.isShadowrocket();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon()||this.isStash()||this.isShadowrocket())&&$done(t)}queryStr(t){let e="";for(const s in t){let i=t[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),e+=`${s}=${i}&`)}return e=e.substring(0,e.length-1),e}}(t,e)}
