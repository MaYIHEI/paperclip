<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/longde.png" width="80" alt="龙德广场" />
</p>

# 龙德广场

北京龙德广场微信小程序每日签到送积分(底层芝麻科技 SaaS,JWT 到 2099)。

## 文件

- `longde.js` — 单脚本架构,既是重写抓 token 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「龙德广场」→ 进入「我的」→「签到」页面,触发 checkInForm 接口
3. 收到 `✅ Token 获取成功` 或类似抓取成功通知
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = a.china-smartech.com

[Script]
http-request https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm tag=龙德广场 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/longde/longde.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/longde.png

cron "5 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/longde/longde.js, tag=龙德广场签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/longde.png, enable=true
```

## Surge

```ini
[MITM]
hostname = a.china-smartech.com

[Script]
龙德广场 Cookie = type=http-request,pattern=https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/longde/longde.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/longde.png

龙德广场签到 = type=cron,cronexp=5 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/longde/longde.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/longde.png
```

## Quantumult X

```ini
[MITM]
hostname = a.china-smartech.com

[rewrite_local]
https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/longde/longde.js

[task_local]
5 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/longde/longde.js, tag=龙德广场签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/longde.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 龙德广场签到
      cron: '5 8 * * *'
      timeout: 60

http:
  mitm:
    - "a.china-smartech.com"
  script:
    - match: https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm
      name: 龙德广场 Cookie
      type: request
      require-body: false

script-providers:
  龙德广场签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/longde/longde.js
    interval: 86400
```

## 实现细节

- **JWT 永不过期** — token `exp` 字段 = 4092599349 (2099-09-22),抓一次永久有效
- **签名算法本地复现** — `X-ZHIMA-SIGNATURE = HmacSHA256(url + JSON.stringify(body) + ts + nonce, JWT)`,纯 JS 实现无外部依赖
- **同套 SaaS 通用** — 底层是芝麻科技(china-smartech)给商场做的 SaaS,改 `mall_id` 理论上能适配其他商场

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-23 | 初版,签名算法本地复现,无外部依赖 |
| 2026-05-24 | tag 统一为 `龙德广场 Cookie` / `龙德广场签到`,加 img-url 图标 |

## 已知限制

- 单脚本架构(`$request` 是否存在区分抓 cookie / cron)
