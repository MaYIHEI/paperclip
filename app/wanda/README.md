<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png" width="80" alt="万达电影" />
</p>

# 万达电影

万达电影 APP 每日签到,签到送成长值 +1。

> **全自包含,无需任何外部服务**(签名本地离线计算,不依赖 Worker/VPS)。

## 文件

- `wanda.cookie.js` — Cookie 抓取(打开「我的」页自动触发)
- `wanda.js` — cron 签到,签名引擎已内嵌,无外部依赖

就这两个脚本,无任何外部依赖。

## 使用步骤

1. 按下方平台配置,开启重写脚本 + cron
2. 打开万达电影 APP → 底部「我的」,触发 `user_info`
3. 收到 `✅ 万达电影 Cookie 获取成功` 即抓取成功
4. cron 按计划自动签到(本地算签名,无需联网取签名)

## Loon

```ini
[MITM]
hostname = user-api-prd-mx.wandafilm.com

[Script]
http-request ^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info tag=万达电影 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png

cron "20 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js, tag=万达电影签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png, enable=true
```

## Surge

```ini
[MITM]
hostname = user-api-prd-mx.wandafilm.com

[Script]
万达电影 Cookie = type=http-request,pattern=^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png

万达电影签到 = type=cron,cronexp=20 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png
```

## Quantumult X

```ini
[MITM]
hostname = user-api-prd-mx.wandafilm.com

[rewrite_local]
^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.cookie.js

[task_local]
20 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js, tag=万达电影签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 万达电影签到
      cron: '20 9 * * *'
      timeout: 60

http:
  mitm:
    - "user-api-prd-mx.wandafilm.com"
  script:
    - match: ^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info
      name: 万达电影 Cookie
      type: request
      require-body: false

script-providers:
  万达电影签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-10 | 初版,全自包含无需外部服务 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../checkup/)」一条通知查看是否需要重新抓取 |

## 已知限制

- **token 时效**:实测可支撑 daily cron 稳定运行;若某天签到失败(403),按通知「重开万达 APP 我的页重抓 Cookie」即可。
