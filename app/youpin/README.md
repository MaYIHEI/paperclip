<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png" width="80" alt="小米有品" />
</p>

# 小米有品

小米有品 APP「每日签到」红包活动，每日签到随机领取现金红包。

## 文件

- `youpin.js` — Cookie 抓取 + 签到主脚本（单文件）

## 使用步骤

1. 按下方对应平台配置，开启重写脚本 + cron
2. 打开小米有品 APP → **「我的」→「红包」**（即每日签到红包活动页），停留 1 秒
3. 收到「✅ Cookie 已保存」通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = m.xiaomiyoupin.com

[Script]
http-request ^https:\/\/m\.xiaomiyoupin\.com\/mtop\/act\/redPacketSign\/getActInfo tag=有品 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png

cron "5 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js, tag=有品签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png, enable=true
```

## Surge

```ini
[MITM]
hostname = m.xiaomiyoupin.com

[Script]
有品 Cookie = type=http-request,pattern=^https:\/\/m\.xiaomiyoupin\.com\/mtop\/act\/redPacketSign\/getActInfo,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png

有品签到 = type=cron,cronexp=5 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png
```

## Quantumult X

```ini
[MITM]
hostname = m.xiaomiyoupin.com

[rewrite_local]
^https:\/\/m\.xiaomiyoupin\.com\/mtop\/act\/redPacketSign\/getActInfo url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js

[task_local]
5 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js, tag=有品签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 有品签到
      cron: '5 9 * * *'
      timeout: 60

http:
  mitm:
    - "m.xiaomiyoupin.com"
  script:
    - match: ^https:\/\/m\.xiaomiyoupin\.com\/mtop\/act\/redPacketSign\/getActInfo
      name: 有品 Cookie
      type: request
      require-body: false

script-providers:
  有品签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js
    interval: 86400
```

## 实现细节

- 签到页 H5 host: `m.xiaomiyoupin.com`（区别于 APP 原生 API `shopapi.io.mi.com`）
- 触发接口（cookie 抓取）: `POST /mtop/act/redPacketSign/getActInfo`，页面打开时自动发出
- 签到执行: `POST /mtop/act/redPacketSign/fetch`（命名规律推断，待首次未签时验证）
- 需完整 browser-like 头: `origin` + `referer` + `sec-fetch-*`，缺少会被静默降级
- 静态 cookie `mijiasn=YPQD_YPMRQD` / `mjclient=YouPin` 硬编码；动态 cookie（`serviceToken` / `youpin_sessionid` / `youpindistinct_id`）从重写请求里抓取
- 活动 ID `686b76a6ac546f0001b930c5` 固定（Xiaomi 更新活动后可能变）

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-27 | 初版，基于 YouPin 5.32.0 抓包 |

## 已知限制

- **签到接口未实测**：`fetch` 为命名推断，首次 cron 跑时验证；若失败，在未签状态下抓包「签到」按钮的实际请求路径后告知作者修复
- 活动 ID 硬编码，Xiaomi 更换活动时需更新 `ACT_ID` 常量
