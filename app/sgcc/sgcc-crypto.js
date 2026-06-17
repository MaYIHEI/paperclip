/*
 * 网上国网(SGCC/95598)国密信封引擎 —— 逆向自抓包 + 95598.cn web bundle 反混淆
 *   sign = SM3(skey + data + timestamp)        ← 121/121 真实抓包验证,无盐
 *   skey = SM2(SERVER_PUBKEY, sessionKey) C1C3C2 带 04 前缀  ← 结构吻合(258 hex)
 *   data = SM4-CBC(key=sessionKey, iv=首8+尾8)  ← key/iv 字节解读【待真机实测锁定】
 *   resp = SM4-CBC 解密(同 sessionKey,客户端生成所以能解)
 *
 * 依赖:sm-crypto(Node 端 / 后续打包进 cron 脚本)
 * @Author MaYIHEI  @Updated 2026-06-17  状态:🧪 待验证
 */
const { sm2, sm3, sm4 } = require('sm-crypto');

// 服务器 SM2 公钥(95598.cn web bundle 反混淆解出,非密钥/非机密)
const SERVER_PUBKEY =
  '042D12DFBC179202AC4B7B7BADCDA6FF7B604339263F6AB732CE7107B7EA3830' +
  'A2CA714DC303920D3CFF7647D898F1A8CC6C24E9EC3CC194E22D984AF7E16B42DC';

function genSessionKey() {
  const cs = '0123456789ABCDEF';
  let s = '';
  for (let i = 0; i < 32; i++) s += cs[(Math.random() * 16) | 0];
  return s; // 32 hex 字符
}
function makeSign(skey, data, timestamp) { return sm3(skey + data + timestamp); }
function deriveIvBytes(key) {
  const ivStr = key.substring(0, 8) + key.substring(key.length - 8); // 16 字符
  return Array.from(ivStr).map(c => c.charCodeAt(0));                // 16 字节 ASCII
}

function encrypt(plainObj, sessionKey = genSessionKey()) {
  const plaintext = typeof plainObj === 'string' ? plainObj : JSON.stringify(plainObj);
  const iv = deriveIvBytes(sessionKey);
  const data = sm4.encrypt(plaintext, sessionKey, { mode: 'cbc', iv }).toUpperCase();
  let skey = sm2.doEncrypt(sessionKey, SERVER_PUBKEY, 1).toUpperCase();
  if (!skey.startsWith('04')) skey = '04' + skey;
  const timestamp = String(Date.now());
  const sign = makeSign(skey, data, timestamp);
  return { data, sign, skey, timestamp, _sessionKey: sessionKey };
}
function decrypt(encryptData, sessionKey) {
  const iv = deriveIvBytes(sessionKey);
  return sm4.decrypt(encryptData, sessionKey, { mode: 'cbc', iv });
}
module.exports = { encrypt, decrypt, makeSign, genSessionKey, SERVER_PUBKEY };

// 自包含自测(不依赖抓包数据):skey 结构 + SM4 往返 + sign 自洽
if (require.main === module) {
  let skey = sm2.doEncrypt(genSessionKey(), SERVER_PUBKEY, 1).toUpperCase();
  if (!skey.startsWith('04')) skey = '04' + skey;
  console.log(`[自测1] skey 长度=${skey.length}(抓包=258) 前缀=${skey.slice(0,2)}(抓包=04)`);
  const probe = { foo: 'bar', n: 123 };
  const env = encrypt(probe);
  const back = decrypt(env.data, env._sessionKey);
  console.log(`[自测2] SM4-CBC 往返一致: ${back === JSON.stringify(probe)}(字节格式待真机锁定)`);
  console.log(`[自测3] 自造信封 sign 自洽: ${makeSign(env.skey, env.data, env.timestamp) === env.sign}`);
  console.log('注:sign 公式对 121 组真实抓包 121/121 验证(抓包数据不入库)。');
}
