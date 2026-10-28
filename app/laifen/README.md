<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/laifen.png" width="80" alt="徕芬" />
</p>

# 徕芬

徕芬 App「会员签到」每日签到，每天领 1 积分，同月连签 5 天额外 5 积分。

## 文件

- `laifen.js` — 既是重写抓 Cookie 也是 cron 签到，根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置，开启重写脚本 + cron
2. 打开徕芬 App → 进「我的」页
3. 收到 `✅ 徕芬 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = app-gw.shuye.com

[Script]
request if ${url} ~= /^https:\/\/app-gw\.shuye\.com\/member\/user\/profile/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/laifen/laifen.js") with tag="徕芬 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/laifen.png"

cron "40 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/laifen/laifen.js") with tag="徕芬签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/laifen.png"
```

## Surge

```ini
[MITM]
hostname = %APPEND% app-gw.shuye.com

[Script]
徕芬 Cookie = type=http-request,pattern=^https:\/\/app-gw\.shuye\.com\/member\/user\/profile,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/laifen/laifen.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/laifen.png

徕芬签到 = type=cron,cronexp=40 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/laifen/laifen.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/laifen.png
```

## Quantumult X

```ini
[MITM]
hostname = app-gw.shuye.com

[rewrite_local]
^https:\/\/app-gw\.shuye\.com\/member\/user\/profile url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/laifen/laifen.js

[task_local]
40 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/laifen/laifen.js, tag=徕芬签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/laifen.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 徕芬签到
      cron: '40 8 * * *'
      timeout: 60

http:
  mitm:
    - "app-gw.shuye.com"
  script:
    - match: ^https:\/\/app-gw\.shuye\.com\/member\/user\/profile
      name: 徕芬 Cookie
      type: request
      require-body: false

script-providers:
  徕芬签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/laifen/laifen.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-10-19 | 初版，基于徕芬 App 3.4.7 抓包 |
| 2026-10-27 | 签到结果按签到状态协议 v1 记录,并登记到公共索引,供签到汇总和桌面小组件读取 |
| 2026-10-28 | 新增补签入口,配合签到合集插件,桌面小组件可以一键现跑一次签到 |
| 2026-10-28 | 当天重复运行时,保留早上的奖励记录并补上本次查到的资产等信息 |
