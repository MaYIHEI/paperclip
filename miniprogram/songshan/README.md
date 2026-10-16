<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png" width="80" alt="松山棉店" />
</p>

# 松山棉店

松山棉店微信小程序每日签到送积分(底层微盟会员体系)。Cookie 抓取后进签到页即可自动签到,无需手动点签到。

## 文件

- `songshan.js` — 单脚本架构,既是重写抓「请求头+体」也是 cron 回放签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「松山棉店」→ 进入「签到」页(进页面自动触发 `signMainInfo`,**无需手动点签到**)
3. 收到 `✅ 松山棉店 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = xapi.weimob.com

[Script]
request if ${url} ~= /^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign))/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js") with tag="松山棉店 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png", requires_body=true

cron "20 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js") with tag="松山棉店签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png"
```

## Surge

```ini
[MITM]
hostname = xapi.weimob.com

[Script]
松山棉店 Cookie = type=http-request,pattern=^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign)),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png

松山棉店签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png
```

## Quantumult X

```ini
[MITM]
hostname = xapi.weimob.com

[rewrite_local]
^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign)) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js

[task_local]
20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js, tag=松山棉店签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 松山棉店签到
      cron: '20 8 * * *'
      timeout: 60

http:
  mitm:
    - "xapi.weimob.com"
  script:
    - match: ^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign))
      name: 松山棉店 Cookie
      type: request
      require-body: true

script-providers:
  松山棉店签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-31 | 初版 |
| 2026-06-01 | 抓取改为进签到页即触发,无需手动点签到 |
| 2026-06-04 | 实测数日稳定可用,状态转 ✅ 维护中 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../../app/checkup/)」一条通知查看是否需要重新抓取 |

## 已知限制

- 单脚本架构(`$request` 是否存在区分抓 cookie / cron)
- `x-wx-token` 为微信会话票据,有效期有限,过期后回放返回鉴权失败,需重新进小程序签到页(进页面即可)重抓
- 请求体内含本账号店铺/会员 ID,**仅对抓取者本人账号有效**,不可跨账号复用
- 头+体原样回放:请求头里的 `x-cmssdk-vidticket` 等含时间戳,若微盟后续收紧校验可能失效,届时改为本地刷新对应字段
