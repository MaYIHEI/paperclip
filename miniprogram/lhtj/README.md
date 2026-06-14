<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png" width="80" alt="龙湖天街" />
</p>

# 龙湖天街

微信小程序「龙湖天街」(`wx50282644351869da`)每日签到「日日签 日日赚」,签到得成长值 + 珑珠。

## 文件

- `lhtj.js` — 单脚本架构,既是重写抓 token 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「龙湖天街」→ 底部「会员」→「日日签 日日赚」→ 点击签到按钮一次
3. 收到 `✅ 龙湖天街 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = gw2c-hw-open.longfor.com

[Script]
http-request ^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$ tag=龙湖天街 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png

cron "0 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js, tag=龙湖天街签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png, enable=true
```

## Surge

```ini
[MITM]
hostname = gw2c-hw-open.longfor.com

[Script]
龙湖天街 Cookie = type=http-request,pattern=^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png

龙湖天街签到 = type=cron,cronexp=0 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png
```

## Quantumult X

```ini
[MITM]
hostname = gw2c-hw-open.longfor.com

[rewrite_local]
^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js

[task_local]
0 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js, tag=龙湖天街签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 龙湖天街签到
      cron: '0 9 * * *'
      timeout: 60

http:
  mitm:
    - "gw2c-hw-open.longfor.com"
  script:
    - match: ^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$
      name: 龙湖天街 Cookie
      type: request
      require-body: false

script-providers:
  龙湖天街签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/lhtj/lhtj.js
    interval: 86400
```

## 实现细节

- 签到接口: `POST /lmarketing-task-api-mvc-prod/openapi/task/v1/signature/clock`
- 鉴权: `x-lf-usertoken` + `x-gaia-api-key` + `x-lf-dxrisk-token`(顶象 SDK 设备指纹)
- 通道校验: 抓取时强制 `x-lf-channel === 'C2'`,APP 通道(L0)会被拒绝避免误抓
- 风控码 `8040012` / `8040013` 表示顶象拦截(目前仅 APP 通道会触发)

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-24 | 初版,仅支持微信小程序通道 |
| 2026-05-24 | tag 统一为 `龙湖天街 Cookie` / `龙湖天街签到`,加 img-url 图标 |

## 已知限制

- **仅支持微信小程序通道**(`x-lf-channel=C2`)。APP 通道(`L0`)被顶象风控强制要求交互式图形验证,脚本无法自动通过
- `x-lf-dxrisk-token` 是顶象 SDK 跑出来的设备/会话指纹,寿命未知,实测每次进小程序会刷新
- **APP 抽奖功能**(每日 0.3 珑珠)同样因顶象交互式验证不可自动化,不做
- 同一账号每天只能签一次,跨小程序/APP/H5 共享次数
