<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png" width="80" alt="驴充充" />
</p>

# 驴充充(小程序版)

> 📦 **已归档** · wx.login() 签发的 token(userToken + refreshToken)实测 < 38min 即失效;小程序版与 app 版同量级,每日 cron 无解。

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
response if ${url} ~= /^https:\/\/appapi\.lvcchong\.com\/getUnionInfo/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js") with tag="驴充充 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png", requires_body=true
response if ${url} ~= /^https:\/\/appapi\.lvcchong\.com\/accessToken\/refresh\//i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js") with tag="驴充充 Auth", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png", requires_body=true

cron "20 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lvcchong/lvcchong.js") with tag="驴充充签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png"
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

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-07 | 初版,小程序通道签到 |

## 已知限制

- **Token 寿命未知**:小程序凭据实际有效期需实测,若太短则 daily cron 不通
- 小程序升级后脚本头部的版本常量可能需更新
