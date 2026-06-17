# 网上国网(SGCC / 95598)签到 🧪 待验证

> ⚠️ **WIP,未真机跑通**。仅完成国密信封逆向 + 抓取钩子,签到链路与 token 寿命待验证。不要当成品用。

国家电网「网上国网」App(包名 `com.wsgw.zsdl95`)积分签到。网关 `csc-service.sgcc.com.cn:28630`,签到模块 `osg-omgmt1042`。

## 难点与已破解

每个业务请求 body 是国密信封 `{data, sign, skey, timestamp}`,响应 `{encryptData}`,SM2+SM4+SM3 全加密。已逆向:

| 环节 | 结果 | 来源 |
|---|---|---|
| **sign** | `SM3(skey + data + timestamp)` 直拼,**无盐** | 121 组真实抓包 121/121 验证 |
| **SM2 公钥** | 见 `sgcc-crypto.js` `SERVER_PUBKEY` | 95598.cn web bundle 反混淆 |
| **skey** | `SM2(公钥, sessionKey)` C1C3C2 带 04(258 hex) | 结构吻合 |
| **data** | `SM4-CBC(key=sessionKey, iv=首8+尾8)` | web bundle |
| **响应** | `SM4-CBC` 解密(sessionKey 客户端生成,可解) | 设计闭环 |

## 鉴权:App 明文 header(可被 Loon 抓取)

App 业务请求鉴权是**明文头**(非加密 body 内):`t`(会话 token,全程不变)+ `userid` + `device_token` + `authorization`。`sgcc.cookie.js` 直接抓,每用户抓自己的。**不走账密**(登录撞腾讯天御滑块,且实名账密安全负担大)。

## 文件

- `sgcc.cookie.js` — Loon 抓取钩子,存 `sgcc_data`
- `sgcc-crypto.js` — 国密信封引擎(Node + sm-crypto),`node sgcc-crypto.js` 自测

## 待验证(决定能否成立)

1. **`t` 寿命** —— 抓一次隔日还认不认(session-cookie 型?)
2. **SM4 字节格式** —— key/iv 按 hex 还是 ASCII,真机请求让服务器判
3. **签到接口明文 body 模板** —— 抓包是密文,需浏览器断点扒或试空 body
4. **`appguid`** —— 每请求带时间戳变化,服务器是否严格校验
