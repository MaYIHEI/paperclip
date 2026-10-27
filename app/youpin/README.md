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
3. 收到「✅ 小米有品 Cookie 获取成功」通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = m.xiaomiyoupin.com

[Script]
request if ${url} ~= /^https:\/\/m\.xiaomiyoupin\.com\/mtop\/act\/redPacketSign\/getActInfo/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js") with tag="有品 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png"

cron "5 9 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/youpin/youpin.js") with tag="有品签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/youpin.png"
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

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-27 | 初版，基于 YouPin 5.32.0 抓包 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../summary/)」一条通知查看是否需要重新抓取 |
| 2026-10-27 | 签到结果按签到状态协议 v1 记录,并登记到公共索引,供签到汇总和桌面小组件读取 |
