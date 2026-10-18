<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/huisheng.png" width="80" alt="惠省红包墙" />
</p>

# 惠省红包墙

微信小程序「惠省」(`wx0b42a347aafbe0d0`)红包墙活动全部 7 个 tab 可领券自动领取。

## 文件

- `huisheng.cookie.js` — Cookie 抓取脚本(http-request/response 重写)
- `huisheng.js` — 签到主脚本(cron)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 微信打开「惠省」小程序,首页停留 3 秒(自动触发 listActivityCoupon)
3. 收到 `✅ 惠省 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = media.meituan.com

[Script]
request if ${url} ~= /^https:\/\/media\.meituan\.com\/fulishemini\/couponActivity\/listActivityCoupon/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/huisheng/huisheng.cookie.js") with tag="惠省红包墙 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/huisheng.png", requires_body=true

cron "5 0 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/huisheng/huisheng.js") with tag="惠省红包墙签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/huisheng.png"
```

## Surge

```ini
[MITM]
hostname = media.meituan.com

[Script]
惠省红包墙 Cookie = type=http-request,pattern=^https:\/\/media\.meituan\.com\/fulishemini\/couponActivity\/listActivityCoupon,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/huisheng/huisheng.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/huisheng.png

惠省红包墙签到 = type=cron,cronexp=5 0 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/huisheng/huisheng.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/huisheng.png
```

## Quantumult X

```ini
[MITM]
hostname = media.meituan.com

[rewrite_local]
^https:\/\/media\.meituan\.com\/fulishemini\/couponActivity\/listActivityCoupon url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/huisheng/huisheng.cookie.js

[task_local]
5 0 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/huisheng/huisheng.js, tag=惠省红包墙签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/huisheng.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 惠省红包墙签到
      cron: '5 0 * * *'
      timeout: 60

http:
  mitm:
    - "media.meituan.com"
  script:
    - match: ^https:\/\/media\.meituan\.com\/fulishemini\/couponActivity\/listActivityCoupon
      name: 惠省红包墙 Cookie
      type: request
      require-body: true

script-providers:
  惠省红包墙签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/huisheng/huisheng.js
    interval: 86400
```

## BoxJS 参数

| key | 类型 | 说明 |
|---|---|---|
| `huisheng_delete_cookie` | bool | 开启后下次跑会清空已存鉴权(强制重抓) |
| `huisheng_debug` | bool | 打印完整 headers/body 到 console |
| `huisheng_request_time` | int | list → grant 之间的间隔毫秒(默认 500) |

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05 | 初版,针对「惠省」红包墙独立分析实现 |
| 2026-05-24 | tag 统一为 `惠省红包墙 Cookie` / `惠省红包墙签到`,加 img-url 图标 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../../app/summary/)」一条通知查看是否需要重新抓取 |

## 已知限制

- 美团签名持续迭代,官方大改时可能需要重新适配
- 部分券有「特定身份」前置条件(如新人券),领取失败会在统计里算作失败

## 致谢

- 接口分析思路参考 [@Sliverkiss](https://github.com/Sliverkiss) 与 FoKit 等前辈在美团生态的工作,本脚本针对「惠省」入口重新分析实现
