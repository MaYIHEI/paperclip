<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png" width="80" alt="驴充充" />
</p>

# 驴充充(小程序版)

> 🧪 **待验证** · **2026-06-07 从 `app/lvcchong/` 切换小程序通道** —— 小程序走 `wx.login()` → `/getUnionInfo` 换 token,无需 SIM 一键登录;签到直接用 miniprogram userToken(无需 H5 accessEntrance 中转)。Token 寿命尚未实测,首要验证目标。

驴充充微信小程序「积分中心 → 签到」每日签到领积分。AppID `wx0132aa93a8b214ae`。

## 文件

- `lvcchong.js` — 单脚本架构:`http-response` 抓 token(`$response` 存在)/ cron 签到(否则)

## 使用步骤

1. 按下方平台配置添加两条重写规则(Cookie、Auth)+ cron
2. 打开「驴充充」微信小程序任意页面(触发 `/getUnionInfo`)
3. 收到 `✅ 驴充充 Cookie 获取成功` 通知即入库
4. cron 自动签到

> **关键诊断日志**:每次 cron 运行都会打出 `refreshToken 距签发 Xmin`,观察失效阈值。成功则记录，失败也记录——这是判断小程序 token 寿命是否超过 App 的 ~20min 的依据。

## Loon

```ini
[MITM]
hostname = appapi.lvcchong.com

[Script]
http-response ^https:\/\/appapi\.lvcchong\.com\/getUnionInfo tag=驴充充 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png
http-response ^https:\/\/appapi\.lvcchong\.com\/accessToken\/refresh\/ tag=驴充充 Auth, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png

cron "20 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js, tag=驴充充签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png, enable=true
```

## Surge

```ini
[MITM]
hostname = appapi.lvcchong.com

[Script]
驴充充 Cookie = type=http-response,pattern=^https:\/\/appapi\.lvcchong\.com\/getUnionInfo,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png
驴充充 Auth = type=http-response,pattern=^https:\/\/appapi\.lvcchong\.com\/accessToken\/refresh\/,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png

驴充充签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png
```

## Quantumult X

```ini
[MITM]
hostname = appapi.lvcchong.com

[rewrite_local]
^https:\/\/appapi\.lvcchong\.com\/getUnionInfo url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js
^https:\/\/appapi\.lvcchong\.com\/accessToken\/refresh\/ url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js

[task_local]
20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js, tag=驴充充签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 驴充充签到
      cron: '20 8 * * *'
      timeout: 60

http:
  mitm:
    - "appapi.lvcchong.com"
  script:
    - match: ^https:\/\/appapi\.lvcchong\.com\/getUnionInfo
      name: 驴充充 Cookie
      type: response
      require-body: true
    - match: ^https:\/\/appapi\.lvcchong\.com\/accessToken\/refresh\/
      name: 驴充充 Auth
      type: response
      require-body: true

script-providers:
  驴充充签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js
    interval: 86400
```

## 实现细节

- **AppID** — `wx0132aa93a8b214ae`(解包 app-config.json 确认)
- **登录链** — 小程序冷启/402 → `wx.login()` → `POST /getUnionInfo?channelMessage=LVCC-WP-PH_4.1.6_Tencent-G9` body `{code, ownerId:0}` → `userToken` + `refreshToken`;小程序不使用 `/accessToken/refresh/`,每次 402 都重走 `wx.login()`,但脚本抓到 `refreshToken` 后可以用它手动换新
- **与 App 版的关键差异** — ① 登录入口是 `wx.login()`(不是 SIM 一键登录);② 签到直接用 miniprogram `userToken`(token 放 header),无需 H5 `accessEntrance` 中转;③ channelMessage 前缀 `LVCC-WP-PH_` 而非 `LVCC-I-PH_`
- **待验证核心** — `/getUnionInfo` 签发的 `refreshToken` 是否比 App 的 ~20min 更长命?每次 cron 日志打出 `refreshToken 距签发 Xmin`,观察成功/失败的阈值
- **签到查重** — cron 先 `todaySignInfo` 查今日是否已签,已签直接返回,防止重复请求
- **Token 存储** — BoxJS key `lvcchong_mp_auth`(JSON),含 `userToken`/`refreshToken`/`userId`/`captureTime`

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-07 | 初版;小程序通道,抓 /getUnionInfo,直接用 userToken 签到 |

## 已知限制

- **Token 寿命未知**:小程序 `refreshToken` 实际 TTL 需实测。若与 App 相同(~20min),此路不通,需改其他方法
- **`channelMessage` versionCode 可能变**:小程序升级后 `4.1.6` 会变,失效时更新脚本头部常量
- **无 sourceType 参数**:解包确认小程序 `userSign` 不传 sourceType(App 传 `sourceType=3`),若服务端拒绝需补充
