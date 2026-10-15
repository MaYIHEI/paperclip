<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png" width="80" alt="小米商城" />
</p>

# 小米商城

小米商城 APP 米金签到。每日 5 米金,连签 2/7/14 天有阶段红包奖励。

> 米金可在 APP 首页的「米金商城」兑换商品 / 优惠券。

## 文件

- `mishop.cookie.js` — Cookie 抓取脚本(http-request 重写)
- `mishop.js` — 签到主脚本(cron)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开小米商城 APP → 首页 →「米金商城」入口 → 进入活动页 → **手动点一次签到**(触发 `/mtop/mf/act/infinite/do` 或 `/done`,已签过也可点,会返回失败但 cookie 照样抓到)
3. 收到 `✅ 小米商城 Cookie 获取成功` 通知后,**关闭重写**(避免后续被反复覆盖)
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = shop-api.retail.mi.com

[Script]
http-request ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done) tag=小米商城 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png

cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js, tag=小米商城签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, enable=true
```

## Surge

```ini
[MITM]
hostname = %APPEND% shop-api.retail.mi.com

[Script]
小米商城 Cookie = type=http-request,pattern=^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done),requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png

小米商城签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png
```

## Quantumult X

```ini
[MITM]
hostname = shop-api.retail.mi.com

[rewrite_local]
^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.cookie.js

[task_local]
15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js, tag=小米商城签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 小米商城签到
      cron: '15 8 * * *'
      timeout: 60

http:
  mitm:
    - "shop-api.retail.mi.com"
  script:
    - match: ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done)
      name: 小米商城 Cookie
      type: request
      require-body: false

script-providers:
  小米商城签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-27 | 初版 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../checkup/)」一条通知查看是否需要重新抓取 |

## 已知限制

- 米金签到任务 ID 硬编码。如果小米官方换 actId / taskId,需要重新抓 `venue/page` 拿新 ID
- `serviceToken` 时效未知,理论上和 APP 登录态同生命周期。如签到失败提示 "未登录"/"token 失效",重抓即可
