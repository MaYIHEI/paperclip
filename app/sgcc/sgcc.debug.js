/**
 * 网上国网 · 签到响应解密调试(一次性)
 *
 * 用已抓的 Cookie + 签到请求提交一次签到,打印原始响应和解密结果。
 * 在 Loon「脚本」里手动运行,看日志即可;不需要加 cron。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Updated: 2026-10-15
 */
const SCRIPT_VERSION = "2026-10-15.r1";
console.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);

// App 客户端私钥(解响应 respKey),来自 stevenjoezhang/hass-state-grid(MIT)
const CLIENT_PRIV = "50C4AF48DF75808050729977AA6BC127DC21A404755C660B94222F9D50FA4A75";
const AUTH_KEYS = ["t","userid","device_token","devicetokentx","devicetokentxtime","appguid","appguidnew","wtoken","appcode","os","version","ip","province","language","wsgwtype","accessmethod","user-agent"];

const done = (title, body) => { $notification.post("网上国网 解密调试", title, body || ""); $done(); };
function main() {
const hdr = JSON.parse($persistentStore.read("sgcc_data") || "null");
const env0 = JSON.parse($persistentStore.read("sgcc_signin") || "null");
if (!hdr || !env0 || !hdr.t || !env0.data || !env0.skey) {
  done("缺少 Cookie 或签到请求", "先开 App 进积分签到页抓取");
} else {
  const headers = { "content-type": "application/json", "accept": "application/json;charset=UTF-8" };
  AUTH_KEYS.forEach(k => { if (hdr[k] != null) headers[k] = hdr[k]; });
  const ts = "" + Date.now();
  const body = { data: env0.data, sign: sm3hex(env0.skey + env0.data + ts), skey: env0.skey, timestamp: ts };
  const path = env0.path || "/osg-omgmt1042/member/m1/0103514";
  $httpClient.post({ url: "https://csc-service.sgcc.com.cn:28630" + path, headers, body: JSON.stringify(body) }, (err, resp, data) => {
    if (err) return done("网络错误", String(err));
    console.log("[RAW] HTTP " + resp.status + " " + String(data).slice(0, 1000));
    let o; try { o = JSON.parse(data); } catch (e) { return done("响应不是 JSON", String(data).slice(0, 120)); }
    console.log("[RAW] 字段: " + Object.keys(o).join(","));
    if (!o.respKey || !o.encryptData) return done("❌ 响应没有 respKey/encryptData,解不了", "字段: " + Object.keys(o).join(",") + " | " + String(data).slice(0, 100));
    try {
      const k2 = utf8dec(sm2DecryptKey(String(o.respKey), CLIENT_PRIV));
      const plain = utf8dec(sm4DecryptHex(String(o.encryptData), k2));
      console.log("[PLAIN] " + plain);
      done("✅ 解密成功", plain.slice(0, 200));
    } catch (e) {
      done("❌ 有 respKey 但解密失败", String(e));
    }
  });
}
}

/* ===== 国密(移植自 stevenjoezhang/hass-state-grid,MIT License, Copyright (c) 2026 stevenjoezhang)===== */
function utf8enc(s){const o=[];for(let i=0;i<s.length;i++){let c=s.charCodeAt(i);if(c>=0xd800&&c<0xdc00&&i+1<s.length){const d=s.charCodeAt(i+1);if(d>=0xdc00&&d<0xe000){c=0x10000+((c-0xd800)<<10)+(d-0xdc00);i++;}}if(c<0x80)o.push(c);else if(c<0x800)o.push(0xc0|(c>>6),0x80|(c&63));else if(c<0x10000)o.push(0xe0|(c>>12),0x80|((c>>6)&63),0x80|(c&63));else o.push(0xf0|(c>>18),0x80|((c>>12)&63),0x80|((c>>6)&63),0x80|(c&63));}return new Uint8Array(o);}
function utf8dec(b){let s='';for(let i=0;i<b.length;){const c=b[i++];let cp;if(c<0x80)cp=c;else if(c<0xe0)cp=((c&31)<<6)|(b[i++]&63);else if(c<0xf0){cp=((c&15)<<12)|((b[i++]&63)<<6)|(b[i++]&63);}else{cp=((c&7)<<18)|((b[i++]&63)<<12)|((b[i++]&63)<<6)|(b[i++]&63);}if(cp>0xffff){cp-=0x10000;s+=String.fromCharCode(0xd800+(cp>>10),0xdc00+(cp&1023));}else s+=String.fromCharCode(cp);}return s;}
function u8(x){ if(x instanceof Uint8Array) return x; if(typeof x==='string') return utf8enc(x); return new Uint8Array(x);}
function toHex(b){let s='';for(let i=0;i<b.length;i++)s+=b[i].toString(16).padStart(2,'0');return s;}
function fromHex(h){const b=new Uint8Array(h.length/2);for(let i=0;i<b.length;i++)b[i]=parseInt(h.substr(i*2,2),16);return b;}
function rotl(x,n){n&=31;return ((x<<n)|(x>>>(32-n)))>>>0;}
function concat(...arrs){let n=0;for(const a of arrs)n+=a.length;const o=new Uint8Array(n);let p=0;for(const a of arrs){o.set(a,p);p+=a.length;}return o;}
/* ===== SM3 ===== */
function sm3(input){
  const m=u8(input);const len=m.length;const bitLen=len*8;
  const padLen=((len%64)<56?56:120)-(len%64);
  const buf=new Uint8Array(len+padLen+8);buf.set(m);buf[len]=0x80;
  const dv=new DataView(buf.buffer);
  dv.setUint32(buf.length-4,bitLen>>>0);dv.setUint32(buf.length-8,Math.floor(bitLen/4294967296)>>>0);
  let V=[0x7380166f,0x4914b2b9,0x172442d7,0xda8a0600,0xa96f30bc,0x163138aa,0xe38dee4d,0xb0fb0e4e];
  for(let b=0;b<buf.length;b+=64){
    const W=new Array(68),W1=new Array(64);
    for(let i=0;i<16;i++)W[i]=dv.getUint32(b+i*4);
    for(let i=16;i<68;i++){const x=W[i-16]^W[i-9]^rotl(W[i-3],15);W[i]=(x^rotl(x,15)^rotl(x,23)^rotl(W[i-13],7)^W[i-6])>>>0;}
    for(let i=0;i<64;i++)W1[i]=(W[i]^W[i+4])>>>0;
    let [A,B,C,D,E,F,G,H]=V;
    for(let j=0;j<64;j++){const Tj=j<16?0x79cc4519:0x7a879d8a;const SS1=rotl((rotl(A,12)+E+rotl(Tj,j))>>>0,7);const SS2=(SS1^rotl(A,12))>>>0;const FF=j<16?(A^B^C):((A&B)|(A&C)|(B&C));const GG=j<16?(E^F^G):((E&F)|((~E>>>0)&G));const TT1=(FF+D+SS2+W1[j])>>>0;const TT2=(GG+H+SS1+W[j])>>>0;D=C;C=rotl(B,9);B=A;A=TT1;H=G;G=rotl(F,19);F=E;E=(TT2^rotl(TT2,9)^rotl(TT2,17))>>>0;}
    V=[(V[0]^A)>>>0,(V[1]^B)>>>0,(V[2]^C)>>>0,(V[3]^D)>>>0,(V[4]^E)>>>0,(V[5]^F)>>>0,(V[6]^G)>>>0,(V[7]^H)>>>0];
  }
  const out=new Uint8Array(32);const o=new DataView(out.buffer);for(let i=0;i<8;i++)o.setUint32(i*4,V[i]);return out;
}
const sm3hex=x=>toHex(sm3(x));
// sm3 kdf: z is bytes
function sm3kdf(z,klen){let ct=1;let out=new Uint8Array(0);const n=Math.ceil(klen/32);for(let i=0;i<n;i++){const cnt=new Uint8Array(4);new DataView(cnt.buffer).setUint32(0,ct);out=concat(out,sm3(concat(z,cnt)));ct++;}return out.slice(0,klen);}

/* ===== SM4 ECB PKCS7 ===== */
const SM4_SBOX=fromHex('d690e9fecce13db716b614c228fb2c05 2b679a762abe04c3aa441326498606999c4250f491ef987a33540b43edcfac62 e4b31ca9c908e89580df94fa758f3fa6 4707a7fcf37317ba83593c19e6854fa8 686b81b27164da8bf8eb0f4b70569d35 1e240e5e6358d1a225227c3b01217887 d40046579fd327524c3602e7a0c4c89e eabf8ad240c738b5a3f7f2cef96115a1 e0ae5da49b341a55ad933230f58cb1e3 1df6e22e8266ca60c02923ab0d534e6f d5db3745defd8e2f03ff6a726d6c5b51 8d1baf92bbddbc7f11d95c411f105ad8 0ac13188a5cd7bbd2d74d012b8e5b4b0 8969974a0c96777e65b9f109c56ec684 18f07dec3adc4d2079ee5f3ed7cb3948'.replace(/\s/g,''));
const SM4_CK=[0x00070e15,0x1c232a31,0x383f464d,0x545b6269,0x70777e85,0x8c939aa1,0xa8afb6bd,0xc4cbd2d9,0xe0e7eef5,0xfc030a11,0x181f262d,0x343b4249,0x50575e65,0x6c737a81,0x888f969d,0xa4abb2b9,0xc0c7ced5,0xdce3eaf1,0xf8ff060d,0x141b2229,0x30373e45,0x4c535a61,0x686f767d,0x848b9299,0xa0a7aeb5,0xbcc3cad1,0xd8dfe6ed,0xf4fb0209,0x10171e25,0x2c333a41,0x484f565d,0x646b7279];
const SM4_FK=[0xa3b1bac6,0x56aa3350,0x677d9197,0xb27022dc];
function sm4tau(a){return ((SM4_SBOX[(a>>>24)&0xff]<<24)|(SM4_SBOX[(a>>>16)&0xff]<<16)|(SM4_SBOX[(a>>>8)&0xff]<<8)|SM4_SBOX[a&0xff])>>>0;}
function sm4L(b){return (b^rotl(b,2)^rotl(b,10)^rotl(b,18)^rotl(b,24))>>>0;}
function sm4Lp(b){return (b^rotl(b,13)^rotl(b,23))>>>0;}
function sm4Key(key){const MK=[];for(let i=0;i<4;i++)MK[i]=((key[i*4]<<24)|(key[i*4+1]<<16)|(key[i*4+2]<<8)|key[i*4+3])>>>0;const K=[MK[0]^SM4_FK[0],MK[1]^SM4_FK[1],MK[2]^SM4_FK[2],MK[3]^SM4_FK[3]];const rk=[];for(let i=0;i<32;i++){const t=(K[i+1]^K[i+2]^K[i+3]^SM4_CK[i])>>>0;const r=(K[i]^sm4Lp(sm4tau(t)))>>>0;K[i+4]=r;rk[i]=r;}return rk;}
function sm4Block(rk,inp,enc){let X=[((inp[0]<<24)|(inp[1]<<16)|(inp[2]<<8)|inp[3])>>>0,((inp[4]<<24)|(inp[5]<<16)|(inp[6]<<8)|inp[7])>>>0,((inp[8]<<24)|(inp[9]<<16)|(inp[10]<<8)|inp[11])>>>0,((inp[12]<<24)|(inp[13]<<16)|(inp[14]<<8)|inp[15])>>>0];for(let i=0;i<32;i++){const k=enc?rk[i]:rk[31-i];const t=(X[i+1]^X[i+2]^X[i+3]^k)>>>0;X[i+4]=(X[i]^sm4L(sm4tau(t)))>>>0;}const o=[X[35],X[34],X[33],X[32]];const out=new Uint8Array(16);for(let i=0;i<4;i++){out[i*4]=(o[i]>>>24)&0xff;out[i*4+1]=(o[i]>>>16)&0xff;out[i*4+2]=(o[i]>>>8)&0xff;out[i*4+3]=o[i]&0xff;}return out;}
function sm4EncryptEcb(data,key){const rk=sm4Key(key);const pad=16-(data.length%16);const buf=new Uint8Array(data.length+pad);buf.set(data);for(let i=data.length;i<buf.length;i++)buf[i]=pad;const out=new Uint8Array(buf.length);for(let i=0;i<buf.length;i+=16)out.set(sm4Block(rk,buf.subarray(i,i+16),true),i);return out;}
function sm4DecryptEcb(data,key){const rk=sm4Key(key);const out=new Uint8Array(data.length);for(let i=0;i<data.length;i+=16)out.set(sm4Block(rk,data.subarray(i,i+16),false),i);const pad=out[out.length-1];return out.slice(0,out.length-pad);}
// App: key text 32 hex chars, uses first 16 ASCII bytes as key
function sm4KeyBytes(keyText){return u8(keyText.slice(0,16));}
function sm4EncryptHex(plain,keyText){return toHex(sm4EncryptEcb(u8(plain),sm4KeyBytes(keyText))).toUpperCase();}
function sm4DecryptHex(hex,keyText){return sm4DecryptEcb(fromHex(hex),sm4KeyBytes(keyText));}
/* ===== SM2 ===== */
const SM2_P=BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF');
const SM2_A=BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC');
const SM2_B=BigInt('0x28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93');
const SM2_GX=BigInt('0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7');
const SM2_GY=BigInt('0xBC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0');
function mod(a,m){return ((a%m)+m)%m;}
function inv(a,m){let [old_r,r]=[mod(a,m),m];let [old_s,s]=[1n,0n];while(r!==0n){const q=old_r/r;[old_r,r]=[r,old_r-q*r];[old_s,s]=[s,old_s-q*s];}return mod(old_s,m);}
function ptAdd(P,Q){if(!P)return Q;if(!Q)return P;const [x1,y1]=P,[x2,y2]=Q;if(x1===x2&&mod(y1+y2,SM2_P)===0n)return null;let l;if(x1===x2&&y1===y2){l=mod((3n*x1*x1+SM2_A)*inv(2n*y1,SM2_P),SM2_P);}else{l=mod((y2-y1)*inv(mod(x2-x1,SM2_P),SM2_P),SM2_P);}const x3=mod(l*l-x1-x2,SM2_P);const y3=mod(l*(x1-x3)-y1,SM2_P);return [x3,y3];}
function ptMul(k,P){let R=null,N=P;while(k>0n){if(k&1n)R=ptAdd(R,N);N=ptAdd(N,N);k>>=1n;}return R;}
const G=[SM2_GX,SM2_GY];
function b32(n){let h=n.toString(16).padStart(64,'0');return fromHex(h);}
function sm2DecryptKey(wrapHex,privHex){let w=wrapHex.toLowerCase().startsWith('04')?wrapHex.slice(2):wrapHex;const C1=[BigInt('0x'+w.slice(0,64)),BigInt('0x'+w.slice(64,128))];const C3=w.slice(128,192);const C2=fromHex(w.slice(192));const d=BigInt('0x'+privHex);const xy=ptMul(d,C1);const x2=b32(xy[0]),y2=b32(xy[1]);const t=sm3kdf(concat(x2,y2),C2.length);const M=new Uint8Array(C2.length);for(let i=0;i<C2.length;i++)M[i]=C2[i]^t[i];return M;}
function sm2DerivePub(privHex){const d=BigInt('0x'+privHex);const P=ptMul(d,G);return toHex(b32(P[0]))+toHex(b32(P[1]));}

main();
