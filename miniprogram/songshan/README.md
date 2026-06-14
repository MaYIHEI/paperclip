<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png" width="80" alt="松山棉店" />
</p>

# 松山棉店

松山棉店微信小程序每日签到送积分。底层微盟(Weimob)会员 SaaS,C 端鉴权 `x-wx-token`,签到请求体是一堆固定店铺/会员 ID 且无 body 签名 — 故采用「抓页面加载请求(`signMainInfo`,body 与 `sign` 完全相同)→ 原样回放到 sign 接口」,进页面即可抓,无需手动点签到。

## 文件

- `songshan.js` — 单脚本架构,既是重写抓「请求头+体」也是 cron 回放签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「松山棉店」→ 进入「签到」页(进页面自动触发 `signMainInfo`,**无需手动点签到**)
3. 收到 `✅ 松山棉店 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = xapi.weimob.com

[Script]
http-request ^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign)) tag=松山棉店 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png

cron "20 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js, tag=松山棉店签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png, enable=true
```

## Surge

```ini
[MITM]
hostname = xapi.weimob.com

[Script]
松山棉店 Cookie = type=http-request,pattern=^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign)),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png

松山棉店签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/songshan.png
```

## Quantumult X

```ini
[MITM]
hostname = xapi.weimob.com

[rewrite_local]
^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign)) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js

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
    - match: ^https:\/\/xapi\.weimob\.com\/api3\/onecrm\/mactivity\/sign\/misc\/sign\/activity\/(c\/signMainInfo|core\/c\/(getActivityInfo|sign))
      name: 松山棉店 Cookie
      type: request
      require-body: true

script-providers:
  松山棉店签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/songshan/songshan.js
    interval: 86400
```

## 实现细节

- **抓头+体原样回放** — 微盟签到 body 含固定店铺/会员 ID 且无 body 签名,鉴权靠请求头 `x-wx-token`;抓取时存整套请求头(JSON)+ 请求体,cron 时 cleanHeaders 后 POST 到 `core/c/sign`
- **进页面即抓** — 钩子匹配进页面就触发的 `signMainInfo` / `getActivityInfo`(body 与 `sign` 完全相同)及 `sign` 本身,任一触发即抓,**不依赖手动点签到**(避免「今日已签 → 抓不到」)
- **cleanHeaders** — 剔除 `content-length` / `host` / `connection` / `accept-encoding` 及 HTTP/2 伪头(`:` 开头),其余原样转发
- **签到判定** — 微盟 `errcode === "0"` 为成功,积分取 `data.fixedReward.points + data.extraReward.points`;`已签到` 文案识别为重复签到

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-31 | 初版,抓签到请求头+体原样回放 |
| 2026-06-01 | 抓取钩子改为页面加载的 `signMainInfo`(body 与 sign 相同),进页面即抓无需点签到 |
| 2026-06-04 | 实测数日稳定可用,状态转 ✅ 维护中 |

## 已知限制

- 单脚本架构(`$request` 是否存在区分抓 cookie / cron)
- `x-wx-token` 为微信会话票据,有效期有限,过期后回放返回鉴权失败,需重新进小程序签到页(进页面即可)重抓
- 请求体内含本账号店铺/会员 ID,**仅对抓取者本人账号有效**,不可跨账号复用
- 头+体原样回放:请求头里的 `x-cmssdk-vidticket` 等含时间戳,若微盟后续收紧校验可能失效,届时改为本地刷新对应字段
