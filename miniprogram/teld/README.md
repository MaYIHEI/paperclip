<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/teld.png" width="80" alt="特来电" />
</p>

# 特来电

> ✅ **维护中** · **全链路实测跑通**:间隔 40 分钟两次 cron,均成功 teldb 刷新 telda → 打卡(服务端 `12904 今日已打卡`)。剩待长期观察:① 明天未签时拿到 `✅ 签到成功`(目前只测到「已打卡」)② teldb 滚动跨多日续期稳定性

特来电(充电桩)微信小程序「签到365天领手机」每日打卡。打卡接口 `ProSrv-CompleteCheckInTask` 跑在内嵌 H5(`c2.teld.cc` / `sgi.teld.cc`),鉴权用 Cookie 里的 `telda`(X-Token,仅 ~20 分钟,cron 时用 `teldb` 自动刷新),签名 `WVER` 本地用 BigInt 算,无任何外部依赖。

## 文件

- `teld.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 打卡,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方平台配置,开启重写脚本 + cron
2. 打开微信小程序「特来电」→ 进入「签到365天」活动页(触发 `sgi.teld.cc` 接口,带 `telda`/`teldb`)
3. 收到 `✅ 特来电 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动打卡(每次先用 teldb 刷新 telda 再签到)

> 调试:脚本首行打印版本号(确认拉到最新);`teld_debug=true` 开详细日志;日志前缀 `[capture]`/`[刷新]`/`[检测]`/`[响应]` 分别对应抓取/续期/请求参数/响应。

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
- **teldb 颠倒序** — cookie 与刷新响应里的 teldb 都是 `签名.载荷.A01头部` **颠倒**存的,发刷新请求前要 `split(".").reverse().join(".")` 还原成正常 JWT,否则报 `BIZ-User-0143`
- **打卡判定** — `state==="1"` 且 `data.IsCheckInSuccess` 为成功,读 `ContinuousDays`/`TotalDays`;`12904 今日已打卡` 按已签处理
- **关键常量/接口**(均硬编码在 `teld.js`,逆向自 H5 库,无抓包也能维护):

  | 用途 | 值 / 来源 |
  |---|---|
  | WVER RSA 模数 `__d` | `C2D84A72…17FC55959`(1024 位) |
  | WVER RSA 指数 `__c` | `010001`(65537) |
  | cajess AES key `__a` | `7fb498553e3c462988c3b9573692bd5f`(注:cajess 函数里 `_a=6fb…` 是诱饵,差一字符) |
  | cajess AES iv `__b` | `98d71fe589499967`(诱饵 `_b=…968`) |
  | 打卡接口 | `sgi.teld.cc/api/invoke?SID=ProSrv-CompleteCheckInTask` |
  | 刷新接口 | `sgi.teld.cn/api/Invoke?SID=UserAPI-WEBUI-SRefreshToken` |
  | 小程序 appid | `wx8d32c1a71ecd965d` |

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-03 | PoC 初版:逆向 WVER(RSA-1024 PKCS1v15)本地验证通过,省略 Sign/t,telda 直接打卡 |
| 2026-06-03 | **核心机制实测通过**:服务端返回 `12904 今日已打卡`,证明 WVER 被接受、Sign/t 不需、telda 可用。修 12904 误判为失败 |
| 2026-06-03 | 实测 telda 真 20 分钟即失效(`Token自身已过期`),确认必须做 teldb 刷新 |
| 2026-06-04 | r1:逆向并实现 teldb 刷新 telda(cajess=AES-CBC,默认 key/iv 找到、cajess 内 `_a/_b` 为诱饵)。内置纯 JS AES,抓包数据逐字节验证通过。telda/teldb 滚动写回,可日常 cron |
| 2026-06-04 | r2 修抓 Cookie(多行 cookie 头);r3 修 `BIZ-User-0143`(teldb cookie 为颠倒序,发请求前还原)。**全链路实测跑通**:间隔 40 分钟两次 cron 均刷新+打卡成功 |
| 2026-06-10 | 多日 cron 稳定,🧪→✅ 维护中 |

## 已知限制

- **teldb 滚动,勿在周期内手动开签到页**:每次刷新 teldb 都换新、脚本自动写回;若你手动打开特来电小程序签到页,会把 teldb 滚走、作废脚本存的那个 → 需重抓 Cookie
- **teldb ~15 天有效**:过期后需重进签到页重抓 Cookie(暂未做 app 账密登录自动 bootstrap)
- **WTS 用本机时间**:与服务器时差过大可能验签被拒,届时可补 `WRPFrame-GetDateTime` 校时
- **加速乐**:当前对 API 为放行模式(只需 `__jsluid_s`,已随 Cookie 抓取);若日后升级 JS 挑战会失效
- **长期稳定性待观察**:目前实测到 `12904 今日已打卡`,未签日的 `✅ 签到成功` 及 teldb 跨多日续期待持续验证
