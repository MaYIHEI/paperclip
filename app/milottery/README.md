<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png" width="80" alt="小米抽奖" />
</p>

# 小米抽奖

小米商城 APP 活动任务自动完成与抽奖。

## 文件

- `milottery.js` — 既是重写抓 Cookie 也是 cron 自动任务，根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置，开启重写脚本 + cron
2. 打开小米商城 APP →「狂欢礼」→ 进入抽奖活动页
3. 收到 `✅ 小米抽奖 Cookie 获取成功` 通知即抓取成功
4. cron 会自动完成支持的分享/浏览任务，并使用当前可用抽奖次数

## Loon

```ini
[MITM]
hostname = shop-api.retail.mi.com

[Script]
request if ${url} ~= /^https:\/\/shop-api\.retail\.mi\.com\/mtop\/navi\/venue\/batch/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/milottery/milottery.js") with tag="小米抽奖 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png", requires_body=true

cron "30 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/milottery/milottery.js") with tag="小米抽奖签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png", timeout=240
```

## Surge

```ini
[MITM]
hostname = %APPEND% shop-api.retail.mi.com

[Script]
小米抽奖 Cookie = type=http-request,pattern=^https:\/\/shop-api\.retail\.mi\.com\/mtop\/navi\/venue\/batch,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/milottery/milottery.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png

小米抽奖签到 = type=cron,cronexp=30 8 * * *,timeout=240,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/milottery/milottery.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png
```

## Quantumult X

```ini
[MITM]
hostname = shop-api.retail.mi.com

[rewrite_local]
^https:\/\/shop-api\.retail\.mi\.com\/mtop\/navi\/venue\/batch url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/milottery/milottery.js

[task_local]
30 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/milottery/milottery.js, tag=小米抽奖签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 小米抽奖签到
      cron: '30 8 * * *'
      timeout: 240

http:
  mitm:
    - "shop-api.retail.mi.com"
  script:
    - match: ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/navi\/venue\/batch
      name: 小米抽奖 Cookie
      type: request
      require-body: true

script-providers:
  小米抽奖签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/milottery/milottery.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-07-11 | 初版，支持动态读取活动、随机间隔完成分享/浏览任务与自动抽奖 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../summary/)」一条通知查看是否需要重新抓取 |

## 已知限制

- 只处理当前已验证的分享与浏览任务；活动新增其他任务类型时会跳过
- 自动任务一次运行可能需要 2–3 分钟；Quantumult X 请避免手动提前终止任务
