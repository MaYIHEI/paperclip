<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png" width="80" alt="123网盘社区" />
</p>

# 123网盘社区

123网盘社区每日签到，领取经验和金币。

> 🧪 待验证：脚本已按真实签到请求编写，需观察 Cookie 跨日稳定性。

## 文件

- `pan1.js` — 既是重写抓 Cookie 也是 cron 签到，根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置，开启重写脚本 + cron
2. 用 Safari 登录 123网盘社区并打开任意页面
3. 收到 `✅ 123社区 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = pan1.me

[Script]
http-request ^https:\/\/pan1\.me\/(?:\?|$) tag=123社区 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png

cron "10 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js, tag=123社区签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png, enable=true
```

## Surge

```ini
[MITM]
hostname = %APPEND% pan1.me

[Script]
123社区 Cookie = type=http-request,pattern=^https:\/\/pan1\.me\/(?:\?|$),requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png

123社区签到 = type=cron,cronexp=10 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png
```

## Quantumult X

```ini
[MITM]
hostname = pan1.me

[rewrite_local]
^https:\/\/pan1\.me\/(?:\?|$) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js

[task_local]
10 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js, tag=123社区签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/pan1.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 123社区签到
      cron: '10 8 * * *'
      timeout: 60

http:
  mitm:
    - "pan1.me"
  script:
    - match: ^https:\/\/pan1\.me\/(?:\?|$)
      name: 123社区 Cookie
      type: request
      require-body: false

script-providers:
  123社区签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/pan1/pan1.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-07-14 | 初版，支持自动抓取登录 Cookie 与每日签到 |

## 已知限制

- 登录 Cookie 由网站下发的有效期约为 100 天；退出登录或凭据失效后需重新抓取
- `pan1.png` 上传到 pin 仓库前，任务图标暂时不会显示
