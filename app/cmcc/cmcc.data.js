/**
 * 中国移动 · 账号数据模块(供小组件等只读展示用)
 *
 * 用途:用已登录的凭证刷新会话,查询并返回当前账号的 积分 / 话费余额 / 本月消费 /
 *       套餐流量·语音·短信余量 / 用户信息,返回结构化 JSON。不签到、不改任何账号数据。
 *
 * 输入:两份凭证信封(由中国移动签到脚本抓取一次后长期有效,免短信):
 *   - loginEnvelope:登录凭证,用于刷新会话
 *   - bizEnvelope  :查询凭证,一份即可查全部数据项
 * 运行时:不依赖任何框架。调用方注入一个 request(发 HTTPS 请求),因此在
 *         Scripting / Node / 代理工具等任意环境都能用。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-10-21
 *
 * 用法:
 *   const { getAccountData } = require("./cmcc.data.js");
 *   const data = await getAccountData({ loginEnvelope, bizEnvelope, request });
 *   // request({url, method:"POST", headers, body}) => Promise<{status, headers, body}>
 *   // data => { ok, points, fee:{balance,consumed}, flow:{items,remainGB,...}, user:{...}, raw }
 */

(function (root, factory) {
  const mod = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else root.cmccData = mod;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const HOST_LOGIN = "client.app.coc.10086.cn";
  const HOST_BIZ = "clientaccess.10086.cn";
  const P_AUTOLOGIN = "/biz-orange/LN/uamrandcodelogin/autoLogin";
  const PATHS = {
    points: "/biz-orange/BN/scoreQueryService/getScoreQuery",
    fee: "/biz-orange/BN/payFeesQuery/getPayFeesQueryInfo",
    flow: "/biz-orange/BH/newPlanRemainQry/getNewPlanRemainQry",
    user: "/biz-orange/BN/userInformationService/getUserInformation",
  };
  const UA = "ChinaMobile/12.5.5 (iPhone; iOS 26.1; Scale/3.00)";
  const SALT = "Leadeon/SecurityOrganization";
  const LK = "tVkdaRWRY0ZkV1Vr", LSK = "RYV0hCV1lV25KYVJ", LIV = "VjFSQ1ZtVkQxRTlQ";
  const BK = "bAIgvwAuA4tbDr9d", BSK = "GS7VelkJl5IT1uwQ", BIV = "9791027341711819";
  const TK = "bAIgvwAuA4tbDr9d", TIV = "9791027341711819";

  function nonce8() { let s = ""; for (let i = 0; i < 8; i++) s += Math.floor(Math.random() * 10); return s; }

  function headersFor(host, path, J, sid, qen) {
    const t = String(Date.now()), n = nonce8();
    const xk = JSON.parse(J).xk || "";
    const xs = md5hex("https://" + host + path + "_" + J + "_" + SALT);
    const xtoken = encB64(xk + "_" + path + "_" + t + "_" + n, TK, TIV);
    const xsign = md5hex(xtoken + "_" + t + "_" + n + "_" + sid);
    return { "Content-Type": "application/Json", "User-Agent": UA, "x-qen": qen, "x-time": t, "x-nonce": n, "xs": xs, "x-token": xtoken, "x-sign": xsign };
  }

  function pickCookie(headers) {
    let raw = "";
    for (const k in headers) if (k.toLowerCase() === "set-cookie") raw = Array.isArray(headers[k]) ? headers[k].join("; ") : String(headers[k]);
    const pick = (name) => { const m = raw.match(new RegExp(name + "=([^;,\\s]+)")); return m ? name + "=" + m[1] : ""; };
    return ["JSESSIONID", "UID", "ticketID"].map(pick).filter(Boolean).join("; ");
  }

  // 刷新会话:用登录凭证换一组新的会话 cookie
  async function refresh(loginEnvelope, request) {
    if (!loginEnvelope) throw new Error("缺登录凭证");
    const h = headersFor(HOST_LOGIN, P_AUTOLOGIN, loginEnvelope, "null", "14");
    const r = await request({ url: "https://" + HOST_LOGIN + P_AUTOLOGIN, method: "POST", headers: h, body: encB64(loginEnvelope, LK, LIV) });
    const out = JSON.parse(decStr(String(r.body || ""), LSK, LIV) || "{}");
    if (out.retCode !== "000000") throw new Error(`刷新会话失败 ${out.retDesc || ""} [${out.retCode || (r && r.status)}]`);
    const cookie = pickCookie(r.headers || {});
    if (!cookie) throw new Error("刷新会话未返回 cookie");
    return cookie;
  }

  // 用一份查询凭证打某个数据接口,返回解出的 rspBody
  async function queryOne(path, bizEnvelope, cookie, request) {
    const sid = (cookie.match(/JSESSIONID=([^;]+)/) || [, ""])[1];
    const h = headersFor(HOST_BIZ, path, bizEnvelope, sid, "2");
    h["Cookie"] = cookie;
    const r = await request({ url: "https://" + HOST_BIZ + path, method: "POST", headers: h, body: encB64(bizEnvelope, BK, BIV) });
    const out = JSON.parse(decStr(String(r.body || ""), BSK, BIV) || "{}");
    if (out.retCode === "410000") throw new Error("会话失效,请重新刷新");
    if (out.retCode !== "000000") throw new Error(`${out.retDesc || "查询失败"} [${out.retCode || (r && r.status)}]`);
    return out.rspBody;
  }

  function parseFlow(rsp) {
    try {
      const fl = rsp.newPlanRemainQryRes.planRemianFlowListRes.planRemianFlowRes || [];
      const items = fl.map((f) => {
        const sum = Number(f.flowSumNum || 0), used = Number(f.flowUsdNum || 0);
        return { type: f.flowtype, totalMB: sum, usedMB: used, remainMB: Math.max(0, sum - used) };
      });
      const main = items[0] || { totalMB: 0, usedMB: 0, remainMB: 0 };
      return { items, remainMB: main.remainMB, remainGB: +(main.remainMB / 1024).toFixed(2), usedGB: +(main.usedMB / 1024).toFixed(2), totalGB: +(main.totalMB / 1024).toFixed(2) };
    } catch (e) { return { items: [], remainMB: null }; }
  }

  // 主入口:刷新 + 按需查询,返回结构化数据
  // opts.want: 需要哪些项(默认全要) ["points","fee","flow","user"]
  // 查询信封可选:没传就从登录信封合成(顶层复用,reqBody 换成 {cellNum:手机号})
  function bizFromLogin(loginEnvelope) {
    const lo = JSON.parse(loginEnvelope);
    return JSON.stringify(Object.assign({}, lo, { reqBody: { cellNum: lo.tel } }));
  }

  async function getAccountData(opts) {
    const { loginEnvelope, request } = opts || {};
    const bizEnvelope = (opts && opts.bizEnvelope) || bizFromLogin(loginEnvelope);
    const want = (opts && opts.want) || ["points", "fee", "flow", "user"];
    const cookie = await refresh(loginEnvelope, request);
    const raw = {}, data = { ok: true };
    for (const key of want) {
      if (!PATHS[key]) continue;
      try {
        const rsp = await queryOne(PATHS[key], bizEnvelope, cookie, request);
        raw[key] = rsp;
        if (key === "points") data.points = rsp && rsp.pointValue != null ? Number(rsp.pointValue) : null;
        else if (key === "fee") data.fee = rsp ? { balance: Number(rsp.balance), consumed: Number(rsp.payAmount), at: rsp.oprTime } : null;
        else if (key === "flow") data.flow = parseFlow(rsp || {});
        else if (key === "user") data.user = rsp && rsp.userInfo ? rsp.userInfo : rsp;
      } catch (e) {
        data.ok = false;
        data[key] = null;
        (data.errors = data.errors || {})[key] = String(e.message || e);
      }
    }
    data.raw = raw;
    return data;
  }

  // ==================== 工具函数 ====================
  function u8(s){if(s instanceof Uint8Array)return s;const o=[];for(let i=0;i<s.length;i++){let c=s.charCodeAt(i);if(c>=0xd800&&c<0xdc00&&i+1<s.length){const d=s.charCodeAt(i+1);if(d>=0xdc00&&d<0xe000){c=0x10000+((c-0xd800)<<10)+(d-0xdc00);i++;}}if(c<0x80)o.push(c);else if(c<0x800)o.push(0xc0|(c>>6),0x80|(c&63));else if(c<0x10000)o.push(0xe0|(c>>12),0x80|((c>>6)&63),0x80|(c&63));else o.push(0xf0|(c>>18),0x80|((c>>12)&63),0x80|((c>>6)&63),0x80|(c&63));}return new Uint8Array(o);}
  function u8s(b){let s='';for(let i=0;i<b.length;){const c=b[i++];let cp;if(c<0x80)cp=c;else if(c<0xe0)cp=((c&31)<<6)|(b[i++]&63);else if(c<0xf0)cp=((c&15)<<12)|((b[i++]&63)<<6)|(b[i++]&63);else cp=((c&7)<<18)|((b[i++]&63)<<12)|((b[i++]&63)<<6)|(b[i++]&63);if(cp>0xffff){cp-=0x10000;s+=String.fromCharCode(0xd800+(cp>>10),0xdc00+(cp&1023));}else s+=String.fromCharCode(cp);}return s;}
  function toHex(b){let s='';for(let i=0;i<b.length;i++)s+=b[i].toString(16).padStart(2,'0');return s;}
  const B64A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function b64(b){let s='',i=0;for(;i+2<b.length;i+=3){const n=(b[i]<<16)|(b[i+1]<<8)|b[i+2];s+=B64A[(n>>18)&63]+B64A[(n>>12)&63]+B64A[(n>>6)&63]+B64A[n&63];}if(i<b.length){const n=(b[i]<<16)|((i+1<b.length?b[i+1]:0)<<8);s+=B64A[(n>>18)&63]+B64A[(n>>12)&63]+(i+1<b.length?B64A[(n>>6)&63]:'=')+'=';}return s;}
  function b64dec(s){s=String(s).replace(/[^A-Za-z0-9+/]/g,'');const out=[];let buf=0,bits=0;for(const ch of s){buf=(buf<<6)|B64A.indexOf(ch);bits+=6;if(bits>=8){bits-=8;out.push((buf>>bits)&0xff);}}return new Uint8Array(out);}
  function md5(input){const msg=u8(input);const S=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];const K=[];for(let i=0;i<64;i++)K[i]=Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0;let a0=0x67452301,b0=0xefcdab89,c0=0x98badcfe,d0=0x10325476;const ml=msg.length,withOne=ml+1,total=withOne+((56-withOne%64+64)%64)+8,m=new Uint8Array(total);m.set(msg);m[ml]=0x80;const bitLen=ml*8,dv=new DataView(m.buffer);dv.setUint32(total-8,bitLen>>>0,true);dv.setUint32(total-4,Math.floor(bitLen/4294967296)>>>0,true);for(let off=0;off<total;off+=64){const M=[];for(let i=0;i<16;i++)M[i]=dv.getUint32(off+i*4,true);let A=a0,B=b0,C=c0,D=d0;for(let i=0;i<64;i++){let F,g;if(i<16){F=(B&C)|(~B&D);g=i;}else if(i<32){F=(D&B)|(~D&C);g=(5*i+1)%16;}else if(i<48){F=B^C^D;g=(3*i+5)%16;}else{F=C^(B|~D);g=(7*i)%16;}F=(F+A+K[i]+M[g])>>>0;A=D;D=C;C=B;const rot=(F<<S[i])|(F>>>(32-S[i]));B=(B+rot)>>>0;}a0=(a0+A)>>>0;b0=(b0+B)>>>0;c0=(c0+C)>>>0;d0=(d0+D)>>>0;}const out=new Uint8Array(16),o=new DataView(out.buffer);o.setUint32(0,a0,true);o.setUint32(4,b0,true);o.setUint32(8,c0,true);o.setUint32(12,d0,true);return out;}
  const md5hex=x=>toHex(md5(x));
  const ASB=(()=>{const s=new Uint8Array(256);let p=1,q=1;do{p=p^(p<<1)^((p&0x80)?0x11b:0);p&=0xff;q^=q<<1;q^=q<<2;q^=q<<4;q&=0xff;if(q&0x80)q^=0x09;const x=q^((q<<1)|(q>>>7))^((q<<2)|(q>>>6))^((q<<3)|(q>>>5))^((q<<4)|(q>>>4));s[p]=(x^0x63)&0xff;}while(p!==1);s[0]=0x63;return s;})();
  const AISB=(()=>{const inv=new Uint8Array(256);for(let i=0;i<256;i++)inv[ASB[i]]=i;return inv;})();
  function xt(a){return ((a<<1)^((a&0x80)?0x11b:0))&0xff;}
  function mul(a,b){let r=0;for(let i=0;i<8;i++){if(b&1)r^=a;const hi=a&0x80;a=(a<<1)&0xff;if(hi)a^=0x1b;b>>=1;}return r&0xff;}
  function expand128(key){const Nk=4,Nr=10,w=new Uint8Array(16*(Nr+1));w.set(key);const rcon=[0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];let i=Nk;const t=new Uint8Array(4);while(i<4*(Nr+1)){for(let k=0;k<4;k++)t[k]=w[(i-1)*4+k];if(i%Nk===0){const tmp=t[0];t[0]=ASB[t[1]]^rcon[i/Nk-1];t[1]=ASB[t[2]];t[2]=ASB[t[3]];t[3]=ASB[tmp];}for(let k=0;k<4;k++)w[i*4+k]=w[(i-Nk)*4+k]^t[k];i++;}return {w,Nr};}
  function encBlock(st,w,Nr){const s=st.slice();for(let k=0;k<16;k++)s[k]^=w[k];for(let r=1;r<Nr;r++){for(let k=0;k<16;k++)s[k]=ASB[s[k]];shiftRows(s);mixCols(s);for(let k=0;k<16;k++)s[k]^=w[r*16+k];}for(let k=0;k<16;k++)s[k]=ASB[s[k]];shiftRows(s);for(let k=0;k<16;k++)s[k]^=w[Nr*16+k];return s;}
  function decBlock(st,w,Nr){const s=st.slice();for(let k=0;k<16;k++)s[k]^=w[Nr*16+k];for(let r=Nr-1;r>=1;r--){invShiftRows(s);for(let k=0;k<16;k++)s[k]=AISB[s[k]];for(let k=0;k<16;k++)s[k]^=w[r*16+k];invMixCols(s);}invShiftRows(s);for(let k=0;k<16;k++)s[k]=AISB[s[k]];for(let k=0;k<16;k++)s[k]^=w[k];return s;}
  function shiftRows(s){const t=[s[0],s[5],s[10],s[15],s[4],s[9],s[14],s[3],s[8],s[13],s[2],s[7],s[12],s[1],s[6],s[11]];for(let i=0;i<16;i++)s[i]=t[i];}
  function invShiftRows(s){const t=[s[0],s[13],s[10],s[7],s[4],s[1],s[14],s[11],s[8],s[5],s[2],s[15],s[12],s[9],s[6],s[3]];for(let i=0;i<16;i++)s[i]=t[i];}
  function mixCols(s){for(let c=0;c<4;c++){const o=c*4,a0=s[o],a1=s[o+1],a2=s[o+2],a3=s[o+3];s[o]=xt(a0)^(xt(a1)^a1)^a2^a3;s[o+1]=a0^xt(a1)^(xt(a2)^a2)^a3;s[o+2]=a0^a1^xt(a2)^(xt(a3)^a3);s[o+3]=(xt(a0)^a0)^a1^a2^xt(a3);}}
  function invMixCols(s){for(let c=0;c<4;c++){const o=c*4,a0=s[o],a1=s[o+1],a2=s[o+2],a3=s[o+3];s[o]=mul(a0,14)^mul(a1,11)^mul(a2,13)^mul(a3,9);s[o+1]=mul(a0,9)^mul(a1,14)^mul(a2,11)^mul(a3,13);s[o+2]=mul(a0,13)^mul(a1,9)^mul(a2,14)^mul(a3,11);s[o+3]=mul(a0,11)^mul(a1,13)^mul(a2,9)^mul(a3,14);}}
  function aesCbcEnc(plainBytes,keyText,ivText){const {w,Nr}=expand128(u8(keyText)),iv=u8(ivText),pad=16-(plainBytes.length%16),buf=new Uint8Array(plainBytes.length+pad);buf.set(plainBytes);for(let i=plainBytes.length;i<buf.length;i++)buf[i]=pad;const out=new Uint8Array(buf.length);let prev=iv;for(let i=0;i<buf.length;i+=16){const blk=buf.subarray(i,i+16).slice();for(let k=0;k<16;k++)blk[k]^=prev[k];const ct=encBlock(blk,w,Nr);out.set(ct,i);prev=ct;}return out;}
  function aesCbcDec(cipherBytes,keyText,ivText){const {w,Nr}=expand128(u8(keyText)),iv=u8(ivText),out=new Uint8Array(cipherBytes.length);let prev=iv;for(let i=0;i<cipherBytes.length;i+=16){const blk=cipherBytes.subarray(i,i+16),pt=decBlock(blk.slice(),w,Nr);for(let k=0;k<16;k++)pt[k]^=prev[k];out.set(pt,i);prev=blk;}const pad=out[out.length-1];return out.slice(0,out.length-(pad>0&&pad<=16?pad:0));}
  function encB64(plainStr,keyText,ivText){return b64(aesCbcEnc(u8(plainStr),keyText,ivText));}
  function decStr(b64str,keyText,ivText){return u8s(aesCbcDec(b64dec(b64str),keyText,ivText));}

  return { getAccountData, refresh };
});
