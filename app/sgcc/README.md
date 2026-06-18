# 网上国网(SGCC / 95598)积分签到 🧪 待验证

> ⚠️ **WIP,未长期实测**。`t` 寿命与签到生效待验证,不要当成品用。

国家电网「网上国网」App(包名 `com.wsgw.zsdl95`)每日积分签到。网关 `csc-service.sgcc.com.cn:28630`,签到模块 `osg-omgmt1042`。

## 方案:复用信封 + 本地抓 token

App 业务请求是国密信封 `{data, sign, skey, timestamp}`(SM2+SM4+SM3)。app 的 SM2 公钥烧在 native 框架(`HTBaseFramework`,iprotect 白盒加固),**静态挖不出**。绕过办法:

| 环节 | 做法 |
|---|---|
| **签到信封** | **复用**真实抓包的 `skey`+`data` —— 服务器用私钥解 `skey` 拿会话密钥 T、再解 `data`,**与会话无关 → 永久有效**;只需重算 `sign=SM3(skey+data+timestamp)`、刷新 `timestamp`。**不需要 app 公钥。** |
| **鉴权** | 明文头 `t`/`userid`/`device_token`/`devicetokentx`/`appguid`… 由 cookie 钩子抓取 |
| **签到端点** | `/osg-omgmt1042/member/m1/0103514`(真正"提交签到",抓包里一天只调一次;`signInConfig/f90` 仅状态轮询) |

`skey`/`data`/`t` 全部由 cookie 钩子在**本地**抓、存 BoxJS,**仓库不含任何个人数据**。

## 文件

- `sgcc.cookie.js` — Loon http-request 钩子。进积分签到页时抓 `t` 等头(→`sgcc_data`)+ 签到信封 `skey`/`data`(→`sgcc_signin`)
- `sgcc.js` — cron 签到。读 BoxJS 复用信封 + 重算 `sign` + 配当前 `t`,POST 签到端点
- `sgcc.plugin` — 一键导入(cookie 抓取 http-request + 签到 cron)
- `sgcc-crypto.js` / `sgcc-login-probe.js` — 研究产物(web 路线国密引擎 + 登录探针;web 端无签到入口,存档备查)

## 使用

1. Loon 导入 `sgcc.plugin`,开 **MITM**(hostname `csc-service.sgcc.com.cn`)+ 安装信任 CA 证书
2. 开 App 进「我的 / 积分签到」页一次 → 收到两条通知:
   - `✅ 网上国网 Cookie 获取成功`(t)
   - `✅ 网上国网 签到信封已抓`(skey+data,存本地)
3. cron 每天 8:30 自动签到;也可在 Loon 手动跑 `网上国网签到`

## 已知限制 / 待验证

1. **`t` 寿命** —— 抓一次能撑几天?太短则需常开 App 刷新(而开 App 进签到页本身已自动签到,意义打折)
2. **签到生效** —— m1/0103514 复用是否真记一次签到(响应加密本地解不开,需开 App 查积分核对)
3. **信封跨天复用** —— 若提交体明文内含时间戳/nonce,昨天的信封今天可能失效
4. **共享性** —— 信封含本人身份(加密态),每人需各自抓;脚本通用、数据全在本地

## 为什么不走别的路

- **web 账密登录**可免滑块(关键字段 `complexSliderRet:0`,非 IP 问题),但 **web 端没有签到入口** → 拿到 web token 也没用
- **app 账密登录** `{enc,key}` 是 Aegis/mPaaS native 加密(RSA 公钥 `pub.der` 找到但派生破不动)→ 暂不可复刻
- 故采用「本地抓 token + 复用信封」,免公钥、免登录、免滑块
