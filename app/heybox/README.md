<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png" width="80" alt="小黑盒" />
</p>

# 小黑盒

> 🧪 待验证

小黑盒 APP「每日签到」，每日签到领 20 H 币。

## 文件

- `heybox.js` — Cookie 抓取 + 签到主脚本（单文件）

## 使用步骤

1. 按下方对应平台配置，开启重写脚本 + cron
2. 打开小黑盒 APP → **「我的」→「签到」**（每日签到页），停留 1 秒
3. 收到「✅ 小黑盒 Cookie 获取成功」通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = api.xiaoheihe.cn

[Script]
request if ${url} ~= /^https:\/\/api\.xiaoheihe\.cn\/task\/sign_list/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/heybox/heybox.js") with tag="小黑盒 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png"

cron "20 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/heybox/heybox.js") with tag="小黑盒签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png"
```

## Surge

```ini
[MITM]
hostname = api.xiaoheihe.cn

[Script]
小黑盒 Cookie = type=http-request,pattern=^https:\/\/api\.xiaoheihe\.cn\/task\/sign_list,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/heybox/heybox.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png

小黑盒签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/heybox/heybox.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png
```

## Quantumult X

```ini
[MITM]
hostname = api.xiaoheihe.cn

[rewrite_local]
^https:\/\/api\.xiaoheihe\.cn\/task\/sign_list url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/heybox/heybox.js

[task_local]
20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/heybox/heybox.js, tag=小黑盒签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/heybox.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 小黑盒签到
      cron: '20 8 * * *'
      timeout: 60

http:
  mitm:
    - "api.xiaoheihe.cn"
  script:
    - match: ^https:\/\/api\.xiaoheihe\.cn\/task\/sign_list
      name: 小黑盒 Cookie
      type: request
      require-body: false

script-providers:
  小黑盒签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/heybox/heybox.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-10-22 | 初版，基于小黑盒 iOS 1.3.397 抓包 |
