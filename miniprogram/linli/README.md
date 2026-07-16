<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png" width="80" alt="林里" />
</p>

# 林里

林里微信小程序会员每日签到领积分,可选自动兑换指定鸭币商品。

> ✅ **维护中** — 每日签到与打开小程序后的 Cookie 自动更新已稳定；限时兑换受库存、售卖窗口和商品规则限制。

## 文件

- `linli.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 签到 / 兑换,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「林里」→ 进入「签到」页面
3. 收到 `✅ 林里 Cookie 获取成功` 通知即抓取成功
4. 如需兑换,在 BoxJS 分别开启「单杯免单券」或「游乐园周边」开关
5. cron 每天 10:00 自动签到,并仅在商品售卖时间内尝试兑换

兑换开关默认关闭。开启会消耗鸭币,请自行确认商品、库存、地址和兑换规则。

## Loon

```ini
[MITM]
hostname = webapi.qmai.cn

[Script]
http-request ^https:\/\/webapi\.qmai\.cn\/web\/(cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar)|catering\/common\/common-info|mall-apiserver\/integral\/(home\/index|item\/goods(\/detail)?)) tag=林里 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png

cron "0 10 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js, tag=林里签到兑换, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png, enable=true
```

## Surge

```ini
[MITM]
hostname = webapi.qmai.cn

[Script]
林里 Cookie = type=http-request,pattern=^https:\/\/webapi\.qmai\.cn\/web\/(cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar)|catering\/common\/common-info|mall-apiserver\/integral\/(home\/index|item\/goods(\/detail)?)),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png

林里签到兑换 = type=cron,cronexp=0 10 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png
```

## Quantumult X

```ini
[MITM]
hostname = webapi.qmai.cn

[rewrite_local]
^https:\/\/webapi\.qmai\.cn\/web\/(cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar)|catering\/common\/common-info|mall-apiserver\/integral\/(home\/index|item\/goods(\/detail)?)) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js

[task_local]
0 10 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js, tag=林里签到兑换, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linli.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 林里签到兑换
      cron: '0 10 * * *'
      timeout: 60

http:
  mitm:
    - "webapi.qmai.cn"
  script:
    - match: ^https:\/\/webapi\.qmai\.cn\/web\/(cmk-center\/sign\/(activityInfo|userSignStatistics|userSignRecordCalendar)|catering\/common\/common-info|mall-apiserver\/integral\/(home\/index|item\/goods(\/detail)?))
      name: 林里 Cookie
      type: request
      require-body: true

script-providers:
  林里签到兑换:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/linli/linli.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-07-16 | 转为维护中,脚本与 BoxJS 地址切换至 main |
| 2026-07-14 | 增加两个独立兑换开关,定时调整为 10:00,打开首页或商城即可自动更新 Cookie |
| 2026-07-11 | 初版 |

## 已知限制

- Cookie 不能由脚本主动续期;失效后打开一次小程序首页或鸭币商城即可自动更新,无需再进入签到页
- 实体周边订单仍待有库存时真机验证,默认关闭
