/**
 * 网上国网 · 国家电网 95598 积分每日签到
 *
 * 抓取:打开「网上国网」App → 进「我的 / 积分签到」页(自动签到时触发),抓 Cookie + 签到请求
 * 签到:cron 复用抓到的签到请求自动提交(细节见 README)
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-22
 *
 * ===== Loon =====
 * [MITM]
 * hostname = csc-service.sgcc.com.cn
 * [Script]
 * http-request ^https?:\/\/csc-service\.sgcc\.com\.cn:28630\/.+\/member\/ tag=网上国网 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.cookie.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png
 * cron "30 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.js, tag=网上国网签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enable=true
 *
 * ===== Surge =====
 * [MITM]
 * hostname = csc-service.sgcc.com.cn
 * [Script]
 * 网上国网 Cookie = type=http-request,pattern=^https?:\/\/csc-service\.sgcc\.com\.cn:28630\/.+\/member\/,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png
 * 网上国网签到 = type=cron,cronexp=30 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png
 *
 * ===== Quantumult X =====
 * [MITM]
 * hostname = csc-service.sgcc.com.cn
 * [rewrite_local]
 * ^https?:\/\/csc-service\.sgcc\.com\.cn:28630\/.+\/member\/ url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.cookie.js
 * [task_local]
 * 30 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.js, tag=网上国网签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enabled=true
 *
 * ===== Stash =====
 * cron:
 *   script:
 *     - name: 网上国网签到
 *       cron: '30 8 * * *'
 *       timeout: 60
 * http:
 *   mitm:
 *     - "csc-service.sgcc.com.cn"
 *   script:
 *     - match: ^https?:\/\/csc-service\.sgcc\.com\.cn:28630\/.+\/member\/
 *       name: 网上国网 Cookie
 *       type: request
 *       require-body: true
 * script-providers:
 *   网上国网签到:
 *     url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.js
 *     interval: 86400
 */

// ----- SM3(sm-crypto,用于重算 sign)-----
var __SM3=(function(){var module={exports:{}};var exports=module.exports;
!function(r,n){"object"==typeof exports&&"object"==typeof module?module.exports=n():"function"==typeof define&&define.amd?define([],n):"object"==typeof exports?exports.sm3=n():r.sm3=n()}("undefined"!=typeof self?self:this,function(){return function(r){function n(e){if(t[e])return t[e].exports;var o=t[e]={i:e,l:!1,exports:{}};return r[e].call(o.exports,o,o.exports,n),o.l=!0,o.exports}var t={};return n.m=r,n.c=t,n.d=function(r,t,e){n.o(r,t)||Object.defineProperty(r,t,{configurable:!1,enumerable:!0,get:e})},n.n=function(r){var t=r&&r.__esModule?function(){return r.default}:function(){return r};return n.d(t,"a",t),t},n.o=function(r,n){return Object.prototype.hasOwnProperty.call(r,n)},n.p="",n(n.s=6)}({1:function(r,n,t){"use strict";function e(r){if(Array.isArray(r)){for(var n=0,t=Array(r.length);n<r.length;n++)t[n]=r[n];return t}return Array.from(r)}function o(r,n){var t=31&n;return r<<t|r>>>32-t}function u(r,n){for(var t=[],e=r.length-1;e>=0;e--)t[e]=255&(r[e]^n[e]);return t}function i(r){return r^o(r,9)^o(r,17)}function f(r){return r^o(r,15)^o(r,23)}function a(r){var n=8*r.length,t=n%512;t=t>=448?512-t%448-1:448-t-1;for(var u=new Array((t-7)/8),a=new Array(8),s=0,p=u.length;s<p;s++)u[s]=0;for(var h=0,v=a.length;h<v;h++)a[h]=0;n=n.toString(2);for(var y=7;y>=0;y--)if(n.length>8){var g=n.length-8;a[y]=parseInt(n.substr(g),2),n=n.substr(0,g)}else n.length>0&&(a[y]=parseInt(n,2),n="");for(var d=new Uint8Array([].concat(e(r),[128],u,a)),w=new DataView(d.buffer,0),m=d.length/64,A=new Uint32Array([1937774191,1226093241,388252375,3666478592,2842636476,372324522,3817729613,2969243214]),b=0;b<m;b++){c.fill(0),l.fill(0);for(var x=16*b,j=0;j<16;j++)c[j]=w.getUint32(4*(x+j),!1);for(var U=16;U<68;U++)c[U]=f(c[U-16]^c[U-9]^o(c[U-3],15))^o(c[U-13],7)^c[U-6];for(var E=0;E<64;E++)l[E]=c[E]^c[E+4];for(var I=A[0],O=A[1],P=A[2],k=A[3],S=A[4],_=A[5],D=A[6],M=A[7],V=void 0,q=void 0,z=void 0,B=void 0,C=void 0,F=0;F<64;F++)C=F>=0&&F<=15?2043430169:2055708042,V=o(o(I,12)+S+o(C,F),7),q=V^o(I,12),z=(F>=0&&F<=15?I^O^P:I&O|I&P|O&P)+k+q+l[F],B=(F>=0&&F<=15?S^_^D:S&_|~S&D)+M+V+c[F],k=P,P=o(O,9),O=I,I=z,M=D,D=o(_,19),_=S,S=i(B);A[0]^=I,A[1]^=O,A[2]^=P,A[3]^=k,A[4]^=S,A[5]^=_,A[6]^=D,A[7]^=M}for(var G=[],H=0,J=A.length;H<J;H++){var K=A[H];G.push((4278190080&K)>>>24,(16711680&K)>>>16,(65280&K)>>>8,255&K)}return G}function s(r,n){for(n.length>p&&(n=a(n));n.length<p;)n.push(0);var t=u(n,h),o=u(n,v),i=a([].concat(e(t),e(r)));return a([].concat(e(o),e(i)))}for(var c=new Uint32Array(68),l=new Uint32Array(64),p=64,h=new Uint8Array(p),v=new Uint8Array(p),y=0;y<p;y++)h[y]=54,v[y]=92;r.exports={sm3:a,hmac:s}},6:function(r,n,t){"use strict";function e(r,n){return r.length>=n?r:new Array(n-r.length+1).join("0")+r}function o(r){return r.map(function(r){return r=r.toString(16),1===r.length?"0"+r:r}).join("")}function u(r){var n=[],t=r.length;t%2!=0&&(r=e(r,t+1)),t=r.length;for(var o=0;o<t;o+=2)n.push(parseInt(r.substr(o,2),16));return n}function i(r){for(var n=[],t=0,e=r.length;t<e;t++){var o=r.codePointAt(t);if(o<=127)n.push(o);else if(o<=2047)n.push(192|o>>>6),n.push(128|63&o);else if(o<=55295||o>=57344&&o<=65535)n.push(224|o>>>12),n.push(128|o>>>6&63),n.push(128|63&o);else{if(!(o>=65536&&o<=1114111))throw n.push(o),new Error("input is not supported");t++,n.push(240|o>>>18&28),n.push(128|o>>>12&63),n.push(128|o>>>6&63),n.push(128|63&o)}}return n}var f=t(1),a=f.sm3,s=f.hmac;r.exports=function(r,n){if(r="string"==typeof r?i(r):Array.prototype.slice.call(r),n){if("hmac"!==(n.mode||"hmac"))throw new Error("invalid mode");var t=n.key;if(!t)throw new Error("invalid key");return t="string"==typeof t?u(t):Array.prototype.slice.call(t),o(s(r,t))}return o(a(r))}}})});
return module.exports;})();
var sm3=(typeof __SM3==='function')?__SM3:(__SM3.sm3||__SM3.default||__SM3);


const $ = new Env("网上国网");
const SCRIPT_VERSION = "2026-06-22.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

const KEY_HDR = "sgcc_data";    // Cookie:t + 设备头
const KEY_ENV = "sgcc_signin";  // 签到请求体 {data,skey,path}
const MAX_RETRY = 3;

const AUTH_KEYS = ["t","userid","device_token","devicetokentx","devicetokentxtime","appguid","appguidnew","wtoken","appcode","os","version","ip","province","language","wsgwtype","accessmethod","user-agent"];

!(function main(){
  const rawH = $.getdata(KEY_HDR), rawE = $.getdata(KEY_ENV);
  if (!rawH || !rawE) { $.msg("⚠️ 网上国网签到", "缺少 Cookie 或签到请求", "打开 App 进积分签到页抓取(收到两条通知即可)"); return $.done(); }
  let hdr, env0;
  try { hdr = JSON.parse(rawH); env0 = JSON.parse(rawE); } catch (e) { $.msg("⚠️ 网上国网签到", "Cookie 解析失败,请重抓", ""); return $.done(); }
  if (!hdr.t || !hdr.userid || !env0.data || !env0.skey) { $.msg("⚠️ 网上国网签到", "Cookie/签到请求字段缺失,请重抓", ""); return $.done(); }

  const path = env0.path || "/osg-omgmt1042/member/m1/0103514";
  const headers = { "content-type": "application/json", "accept": "application/json;charset=UTF-8" };
  AUTH_KEYS.forEach(k => { if (hdr[k] != null) headers[k] = hdr[k]; });

  const attempt = (n) => {
    const ts = "" + Date.now();
    const body = { data: env0.data, sign: sm3(env0.skey + env0.data + ts), skey: env0.skey, timestamp: ts };
    $.post({ url: "https://csc-service.sgcc.com.cn:28630" + path, headers, body: JSON.stringify(body) }, (err, resp, data) => {
      // 网络错误 → 重试
      if (err) {
        if (n < MAX_RETRY) { setTimeout(() => attempt(n + 1), 3000); return; }
        $.msg("⚠️ 网上国网签到", "网络错误,重试" + MAX_RETRY + "次失败", String(err).slice(0, 80)); return $.done();
      }
      let ok = false, msg = String(data || "").slice(0, 140);
      try { const j = JSON.parse(data); ok = !!j.encryptData; if (!ok) msg = (j.message || "") + " [" + (j.code || "") + "]"; } catch (e) {}
      // 有 encryptData = 成功
      if (ok) { $.msg("✅ 网上国网签到", "今日签到完成 ✓", ""); return $.done(); }
      // 服务器对所有失败都只回"系统正忙",无法靠码区分;重试应对偶发,持久失败即判 Cookie 失效
      if (n < MAX_RETRY) { setTimeout(() => attempt(n + 1), 3000); return; }
      $.msg("⚠️ 网上国网签到", "签到失败(重试" + MAX_RETRY + "次)· Cookie 多半失效", "开 App 进积分签到页重抓;若 App 也异常则服务器问题 | " + msg); $.done();
    });
  };
  attempt(1);
})();


// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}getdata(t){return this.getval(t)}setdata(t,e){return this.setval(t,e)}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}
