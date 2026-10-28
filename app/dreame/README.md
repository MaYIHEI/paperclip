<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png" width="80" alt="追觅" />
</p>

# 追觅

追觅商城每日签到,得积分 / 成长值,支持连签奖励。

## 文件

- `dreame.js` — 既是重写抓 cookie 也是 cron 签到,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开追觅 APP → 进入「商城」或「我的」页
3. 收到 `✅ 追觅 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到(Cookie 约 90 天有效,失效后重抓一次)

## Loon

```ini
[MITM]
hostname = cn-wxmall.dreame.tech

[Script]
request if ${url} ~= /^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js") with tag="追觅 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png", requires_body=true

cron "33 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js") with tag="追觅签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png"
```

## Surge

```ini
[MITM]
hostname = cn-wxmall.dreame.tech

[Script]
追觅 Cookie = type=http-request,pattern=^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png

追觅签到 = type=cron,cronexp=33 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png
```

## Quantumult X

```ini
[MITM]
hostname = cn-wxmall.dreame.tech

[rewrite_local]
^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js

[task_local]
33 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js, tag=追觅签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 追觅签到
      cron: '33 8 * * *'
      timeout: 60

http:
  mitm:
    - "cn-wxmall.dreame.tech"
  script:
    - match: ^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info
      name: 追觅 Cookie
      type: request
      require-body: true

script-providers:
  追觅签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-21 | 初版,基于追觅 2.5.1 抓包验证 |
| 2026-06-25 | 修复 Cookie 获取偶发失败问题 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../summary/)」一条通知查看是否需要重新抓取 |
| 2026-10-27 | 签到结果按签到状态协议 v1 记录,并登记到公共索引,供签到汇总和桌面小组件读取 |
| 2026-10-28 | 新增补签入口,配合签到合集插件,桌面小组件可以一键现跑一次签到;签到记录里带上 Cookie 过期时间 |
| 2026-10-28 | 今日已签时也记录积分总数 |
| 2026-10-28 | 当天重复运行时,保留早上的奖励记录并补上本次查到的资产等信息 |
