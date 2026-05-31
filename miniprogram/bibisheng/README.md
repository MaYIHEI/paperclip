<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png" width="80" alt="笔笔省" />
</p>

# 笔笔省

微信支付「笔笔省」小程序 (`wxdb3c0e388702f785`) 天天领券页面每日免费券自动领取。

## 文件

- `bibisheng.cookie.js` — Cookie 抓取脚本(http-request/response 重写)
- `bibisheng.js` — 签到主脚本(cron)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 微信打开「微信支付笔笔省」小程序 → 进入「我的-提现笔笔省-天天领」页面,自动触发抓取
3. 收到 `✅ Token 获取成功` 或类似抓取成功通知
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = discount.wxpapp.wechatpay.cn

[Script]
http-request ^https:\/\/discount\.wxpapp\.wechatpay\.cn\/txbbs-mall\/coupon\/(querydailygiftcoupons|claimdailygiftcoupon) tag=笔笔省 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png

cron "30 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.js, tag=笔笔省签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png, enable=true
```

## Surge

```ini
[MITM]
hostname = discount.wxpapp.wechatpay.cn

[Script]
笔笔省 Cookie = type=http-request,pattern=^https:\/\/discount\.wxpapp\.wechatpay\.cn\/txbbs-mall\/coupon\/(querydailygiftcoupons|claimdailygiftcoupon),requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png

笔笔省签到 = type=cron,cronexp=30 7 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png
```

## Quantumult X

```ini
[MITM]
hostname = discount.wxpapp.wechatpay.cn

[rewrite_local]
^https:\/\/discount\.wxpapp\.wechatpay\.cn\/txbbs-mall\/coupon\/(querydailygiftcoupons|claimdailygiftcoupon) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.cookie.js

[task_local]
30 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.js, tag=笔笔省签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bibisheng.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 笔笔省签到
      cron: '30 7 * * *'
      timeout: 60

http:
  mitm:
    - "discount.wxpapp.wechatpay.cn"
  script:
    - match: ^https:\/\/discount\.wxpapp\.wechatpay\.cn\/txbbs-mall\/coupon\/(querydailygiftcoupons|claimdailygiftcoupon)
      name: 笔笔省 Cookie
      type: request
      require-body: false

script-providers:
  笔笔省签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bibisheng/bibisheng.js
    interval: 86400
```

## 实现细节

- 鉴权依赖 `session-token`(来自小程序 `wx.login()` 的 jscode → `/txbbs-user/user/login` 换取)
- jscode 是一次性的,脚本无法主动刷新,**token 过期必须重新进小程序触发**

### BoxJS 参数

| key | 说明 |
|---|---|
| `bbs_session_token` | 鉴权 token |
| `bbs_appid` / `bbs_module` / `bbs_page` | 小程序上下文 |

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-12 | 初版,适配 `wxdb3c0e388702f785`,支持自动领取每日免费券 |
| 2026-05-23 | cookie 文件改名 `bibisheng_cookie.js` → `bibisheng.cookie.js`(对齐命名规范) |
| 2026-05-24 | tag 统一为 `笔笔省 Cookie` / `笔笔省签到`,加 img-url 图标 |

## 已知限制

- **session-token 有效期 7h 上限**(jscode 一次性),已验证 4 种续期方案全部失败 — **接受现状**:每天打开一次小程序自然刷 token
- 提示「token 失效」时请重新进小程序「天天领」页面
