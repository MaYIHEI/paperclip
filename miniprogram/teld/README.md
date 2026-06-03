<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png" width="80" alt="特来电" />
</p>

# 特来电

> 🧪 **待验证** · WVER 签名 + teldb 刷新 telda + 打卡全链路已逆向,crypto 用真实抓包逐字节验证通过;打卡机制已实测(服务端返回 12904)。teldb 隔天续期是否稳定,待长期观察

特来电(充电桩)微信小程序「签到365天领手机」每日打卡。打卡接口 `ProSrv-CompleteCheckInTask` 跑在内嵌 H5(`c2.teld.cc` / `sgi.teld.cc`),鉴权用 Cookie 里的 `telda`(X-Token),签名 `WVER` 本地算。

## 文件

- `teld.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 打卡,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方平台配置,开启重写脚本 + cron
2. 打开微信小程序「特来电」→ 进入「签到365天」活动页(触发 `sgi.teld.cc` 接口,带 `telda`/`teldb`)
3. 收到 `✅ 特来电 Cookie 获取成功` 通知即抓取成功
4. cron 自动打卡

> 当前为 PoC:先验证「抓到的 telda + 本地算的 WVER」能否直接打卡成功。跑通后再补 `teldb` 自动续期(见已知限制)。

## Loon

```ini
[MITM]
hostname = sgi.teld.cc, c2.teld.cc

[Script]
http-request ^https:\/\/sgi\.teld\.cc\/api\/invoke tag=特来电 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png

cron "30 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js, tag=特来电签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png, enable=true
```

## Surge

```ini
[MITM]
hostname = sgi.teld.cc, c2.teld.cc

[Script]
特来电 Cookie = type=http-request,pattern=^https:\/\/sgi\.teld\.cc\/api\/invoke,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png

特来电签到 = type=cron,cronexp=30 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png
```

## Quantumult X

```ini
[MITM]
hostname = sgi.teld.cc, c2.teld.cc

[rewrite_local]
^https:\/\/sgi\.teld\.cc\/api\/invoke url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js

[task_local]
30 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js, tag=特来电签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 特来电签到
      cron: '30 8 * * *'
      timeout: 60

http:
  mitm:
    - "sgi.teld.cc"
    - "c2.teld.cc"
  script:
    - match: ^https:\/\/sgi\.teld\.cc\/api\/invoke
      name: 特来电 Cookie
      type: request
      require-body: false

script-providers:
  特来电签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/teld/teld.js
    interval: 86400
```

## 实现细节

- **WVER 签名(已逆向 + 本地验证通过)** — `WVER = hex( RSA-1024-PKCS#1v15( WTS的ASCII ) )`,256 hex。公钥(指数 `010001`、模数 `C2D84A72…17FC55959`)硬编码在 H5 库 `teld-thirdpart.min.js`。用 iOS JavaScriptCore 原生 `BigInt` 做 modpow,纯本地、无联网。已用自生成密钥对做加密→私钥解密的闭环验证,确认实现正确
- **Sign / t 省略** — 旧版 H5 还发 `Sign`(4×SHA256)+ `t`,但当前官方 `teld-core.min.js` 的 `_webSgParamSetting` 已不发这俩,服务端不再校验,故省略
- **鉴权 + 续期(已实现)** — `telda`(X-Token)仅 ~20 分钟,cron 时早过期;故每次先用 `teldb`(~15 天 refresh token)走 `UserAPI-WEBUI-SRefreshToken` 换新 `telda`。刷新请求体 `Data` 用 **AES-128-CBC**(key=`UTS+"000000"`、iv=随机 16 字符)加密 `{DeviceType,ReqSource,RefreshToken:teldb,ClientIP}`;响应两层 AES 解密(外层默认 key/iv `7fb4…`/`98d7…`,内层用响应的 UTS/UVER)拿到新 `AccessToken`(telda)+ 新 `RefreshToken`(teldb,**滚动写回**)
- **AES 纯 JS 自带** — Loon 无 crypto,脚本内置 AES-CBC(加/解密),已用抓包数据验证:加密结果与服务端 `Data` 逐字节一致、解密能还原响应
- **打卡判定** — `state==="1"` 且 `data.IsCheckInSuccess` 为成功,读 `ContinuousDays`/`TotalDays`;`12904 今日已打卡` 按已签处理

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-03 | PoC 初版:逆向 WVER(RSA-1024 PKCS1v15)本地验证通过,省略 Sign/t,telda 直接打卡 |
| 2026-06-03 | **核心机制实测通过**:服务端返回 `12904 今日已打卡`,证明 WVER 被接受、Sign/t 不需、telda 可用。修 12904 误判为失败 |
| 2026-06-03 | 实测 telda 真 20 分钟即失效(`Token自身已过期`),确认必须做 teldb 刷新 |
| 2026-06-04 | r1:逆向并实现 teldb 刷新 telda(cajess=AES-CBC,默认 key/iv 找到、cajess 内 `_a/_b` 为诱饵)。内置纯 JS AES,抓包数据逐字节验证通过。telda/teldb 滚动写回,可日常 cron |

## 已知限制

- **PoC 阶段**:只做「抓 telda → 本地 WVER → 打卡」。待实测确认 ① 服务端接受省略 Sign/t ② telda 直接可用
- **未做 teldb 续期**:telda 是短期访问令牌,过期后需重抓。下一步用 `teldb`(~15 天)走 `UserAPI-WEBUI-SRefreshToken` 自动续 telda(刷新 `Data` 用 `cajess`/AES 加密,待移植)
- **未做账密登录**:teldb 过期(~15 天)后需重进签到页重抓;后续可加 app 账密登录自动 bootstrap
- **WTS 用本机时间**:若与服务器时差过大可能被拒,届时补 `WRPFrame-GetDateTime` 校时
- **加速乐**:当前对 API 为放行模式(只需 `__jsluid_s`,已随 Cookie 抓取);若日后升级 JS 挑战会失效
