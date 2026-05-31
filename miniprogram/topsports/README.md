<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png" width="80" alt="滔搏" />
</p>

# 滔搏

滔搏运动(Topsports)微信小程序「每日中心」签到送积分。鉴权用 Cookie 里的 `Authorization`(UUID 会话票据)+ `memberId`,无签名。`activityId` 由 `actInfo` 接口动态获取,不写死。

## 文件

- `topsports.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「滔搏运动」→ 进入「每日中心 / 签到」页(`dailycenter`),停留即触发 `actInfo`
3. 收到 `🎉 Cookie 抓取成功` 通知即入库
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = m.topsports.com.cn

[Script]
http-request ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo tag=滔搏 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png

cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, tag=滔搏签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png, enable=true
```

## Surge

```ini
[MITM]
hostname = m.topsports.com.cn

[Script]
滔搏 Cookie = type=http-request,pattern=^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png

滔搏签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
```

## Quantumult X

```ini
[MITM]
hostname = m.topsports.com.cn

[rewrite_local]
^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js

[task_local]
15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, tag=滔搏签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 滔搏签到
      cron: '15 8 * * *'
      timeout: 60

http:
  mitm:
    - "m.topsports.com.cn"
  script:
    - match: ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo
      name: 滔搏 Cookie
      type: request
      require-body: false

script-providers:
  滔搏签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
    interval: 86400
```

## 实现细节

- **鉴权** — Cookie 里的 `Authorization`(UUID Bearer 会话票据)+ `memberId`,无签名;由 `/shopMember/auth/wxMiniProgram/login?code=<jscode>` 登录签发
- **activityId 动态获取** — 先 GET `/h5/act/signIn/actInfo?brandCode=TS` 拿当前 `activityId`,再 POST `/h5/act/signIn/doSign`,不写死活动 ID
- **签到判定** — 以 `data.signInSuccess === true` 为成功(读 `signInTips` + 奖励明细);重复签到按 `bizMsg` 文案识别为「今日已签」;`actInfo` 失败即判 Cookie 失效

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-31 | 初版,Cookie 鉴权,activityId 走 actInfo 动态获取,brandCode=TS |

## 已知限制

- 单脚本架构(`$request` 是否存在区分抓 cookie / cron)
- `Authorization` 为 UUID 会话票据,过期后 `actInfo` 失败、脚本提示「Cookie 失效」,需重新进小程序「每日中心」页重抓
- `brandCode` 固定 `TS`
