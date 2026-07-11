<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png" width="80" alt="林里" />
</p>

# 林里

林里微信小程序会员每日签到领积分。

> 🧪 **待验证** — 已完成接口验证,Cookie 长期稳定性仍需观察。

## 文件

- `linli.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 签到,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「林里」→ 进入「签到」页面
3. 收到 `✅ 林里 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = webapi.qmai.cn

[Script]
http-request ^https:\/\/webapi\.qmai\.cn\/web\/cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar) tag=林里 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png

cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js, tag=林里签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png, enable=true
```

## Surge

```ini
[MITM]
hostname = webapi.qmai.cn

[Script]
林里 Cookie = type=http-request,pattern=^https:\/\/webapi\.qmai\.cn\/web\/cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png

林里签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png
```

## Quantumult X

```ini
[MITM]
hostname = webapi.qmai.cn

[rewrite_local]
^https:\/\/webapi\.qmai\.cn\/web\/cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js

[task_local]
15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js, tag=林里签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 林里签到
      cron: '15 8 * * *'
      timeout: 60

http:
  mitm:
    - "webapi.qmai.cn"
  script:
    - match: ^https:\/\/webapi\.qmai\.cn\/web\/cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar)
      name: 林里 Cookie
      type: request
      require-body: true

script-providers:
  林里签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/miniprogram/linli/linli.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-07-11 | 初版 |

## 已知限制

- Cookie 的服务端有效期仍待跨日观察;失效后重新进入签到页即可更新
