<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png" width="80" alt="龙湖天街 App" />
</p>

# 龙湖天街 App

> ✅ **维护中** · 跨天 cron 已稳定运行;顶象 `x-lf-dxrisk-token` 失效时给 `8040012/8040013` 提示重抓。

龙湖天街 App 龙珠 H5「日日签」每日签到(成长值 / 珑珠)+ 幸运抽奖(随机珑珠,含大奖)。一次抓取同时拿到签到和抽奖的鉴权 —— 两者共用同一个 `usertoken` 和顶象 `dxrisk-token`。

> 小程序通道(C2)请用 [`miniprogram/lhtj`](../../miniprogram/lhtj/)。本脚本是 **App 通道(L0)**,两者签到活动号不同、抽奖功能 App 独有。**装一个即可**,别同时启用(同域名同抓取 URL 会互相弹「通道不匹配」)。

## 文件

- `lhtj.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 签到 + 抽奖,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开龙湖天街 App →「会员 / 日日签」→ 点签到按钮一次,抓 L0 通道鉴权头
3. 收到 `✅ 龙湖天街 App Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到 + 抽奖

## 随机签到时间

App 通道走顶象风控,固定整点签到不理想。脚本内置**当日随机目标时间**:cron 在一个时段密集唤醒,脚本当天随机摇一个目标分钟,没到点静默退出,到点才签、签完当天不再触发。

- 默认 `lhtj_app_random=true` + 时段 `lhtj_app_window=8-10`(8:00–10:00 内随机),**需配密集 cron**(模板已是 `0-59/19 8-10 * * *`)
- 想固定时间:`lhtj_app_random` 设 `false`,cron 改单点(如 `0 9 * * *`)即可,行为同普通签到脚本

> ⚠️ 随机时间防的是「按固定时刻识别脚本」类弱风控,对顶象 `dxrisk-token` 的**时效**无帮助 —— 那是 token 寿命问题,看实测。

## Loon

```ini
[MITM]
hostname = gw2c-hw-open.longfor.com

[Script]
request if ${url} ~= /^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$/i && ${request.header['x-lf-channel']} == "L0" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js") with tag="龙湖App Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png"

cron "0-59/19 8-10 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js") with tag="龙湖App签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png"
```

## Surge

```ini
[MITM]
hostname = gw2c-hw-open.longfor.com

[Script]
龙湖App Cookie = type=http-request,pattern=^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png

龙湖App签到 = type=cron,cronexp=0-59/19 8-10 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png
```

## Quantumult X

```ini
[MITM]
hostname = gw2c-hw-open.longfor.com

[rewrite_local]
^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js

[task_local]
0-59/19 8-10 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js, tag=龙湖App签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lhtj.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 龙湖App签到
      cron: '0-59/19 8-10 * * *'
      timeout: 60

http:
  mitm:
    - "gw2c-hw-open.longfor.com"
  script:
    - match: ^https:\/\/gw2c-hw-open\.longfor\.com\/lmarketing-task-api-mvc-prod\/openapi\/task\/v1\/signature\/clock$
      name: 龙湖App Cookie
      type: request
      require-body: false

script-providers:
  龙湖App签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lhtj/lhtj.js
    interval: 86400
```

## BoxJS 开关

| key | 默认 | 说明 |
|---|---|---|
| `lhtj_app_random` | `true` | 随机签到时间(需配密集 cron);关掉则 cron 命中即签 |
| `lhtj_app_window` | `8-10` | 随机时段(小时),仅 random 开启时生效 |
| `lhtj_app_lottery` | `true` | 是否自动抽奖 |
| `lhtj_app_clear` | `false` | 一键清除已抓 Cookie,运行一次后自动复位 |
| `lhtj_app_debug` | `false` | 打印各接口请求/响应日志 |

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-10 | 初版,App(L0)通道签到 + 抽奖,内置当日随机签到时间 |
| 2026-06-10 | 风控码 8040012/8040013 提示改为「账号已被风控,重抓无效,暂停脚本手动养号」 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../summary/)」一条通知查看是否需要重新抓取 |
| 2026-10-27 | 签到结果按签到状态协议 v1 记录,并登记到公共索引,供签到汇总和桌面小组件读取 |
| 2026-10-28 | 当天重复运行时,保留早上的奖励记录并补上本次查到的资产等信息 |

## 已知限制

- **风控**:签到返回 `8040012/8040013` 时建议暂停脚本、手动签到一段时间再恢复
- **签到与抽奖跨端共享次数**:同账号每天签到一次、抽奖次数当日领当日清,App / 小程序 / H5 共用
- **随机时间依赖密集 cron**:`lhtj_app_random=true` 时必须用 `0-59/19 8-10 * * *` 这类密集 cron;若配单点 cron 又开随机,可能当天摇到的目标点错过后整天不再触发
