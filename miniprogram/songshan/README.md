<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png" width="80" alt="松山棉店" />
</p>

# 松山棉店

松山棉店微信小程序每日签到送积分。底层微盟(Weimob)会员 SaaS,C 端鉴权 `x-wx-token`,签到请求体是一堆固定店铺/会员 ID 且无 body 签名 — 故采用「抓一次签到请求 → 原样回放」。

## 文件

- `songshan.js` — 单脚本架构,既是重写抓「请求头+体」也是 cron 回放签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「松山棉店」→ 进入「签到」页 →**点一次签到按钮**(今日已签也会触发请求,放心点)
3. 收到 `🎉 签到凭据抓取成功` 通知即入库
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = xapi.weimob.com

[Script]
http-request ^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/core\/c\/sign tag=松山棉店 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png

cron "20 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js, tag=松山棉店签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png, enable=true
```

## Surge

```ini
[MITM]
hostname = xapi.weimob.com

[Script]
松山棉店 Cookie = type=http-request,pattern=^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/core\/c\/sign,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png

松山棉店签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png
```

## Quantumult X

```ini
[MITM]
hostname = xapi.weimob.com

[rewrite_local]
^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/core\/c\/sign url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js

[task_local]
20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js, tag=松山棉店签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 松山棉店签到
      cron: '20 8 * * *'
      timeout: 60

http:
  mitm:
    - "xapi.weimob.com"
  script:
    - match: ^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/core\/c\/sign
      name: 松山棉店 Cookie
      type: request
      require-body: true

script-providers:
  松山棉店签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js
    interval: 86400
```

## 实现细节

- **抓头+体原样回放** — 微盟签到 body 含固定店铺/会员 ID 且无 body 签名,鉴权靠请求头 `x-wx-token`;抓取时存整套请求头(JSON)+ 请求体,cron 时 cleanHeaders 后原样发出
- **cleanHeaders** — 剔除 `content-length` / `host` / `connection` / `accept-encoding` 及 HTTP/2 伪头(`:` 开头),其余原样转发
- **签到判定** — 微盟 `errcode === "0"` 为成功,积分取 `data.fixedReward.points + data.extraReward.points`;`已签到` 文案识别为重复签到

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-31 | 初版,抓签到请求头+体原样回放 |

## 已知限制

- 单脚本架构(`$request` 是否存在区分抓 cookie / cron)
- `x-wx-token` 为微信会话票据,有效期有限,过期后回放返回鉴权失败,需重新进小程序点一次签到重抓
- 请求体内含本账号店铺/会员 ID,**仅对抓取者本人账号有效**,不可跨账号复用
- 头+体原样回放:请求头里的 `x-cmssdk-vidticket` 等含时间戳,若微盟后续收紧校验可能失效,届时改为本地刷新对应字段
