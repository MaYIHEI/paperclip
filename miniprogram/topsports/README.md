<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png" width="80" alt="滔搏" />
</p>

# 滔搏

> 📦 **已归档** · Authorization(微信小程序会话)服务端 TTL ~1 小时;QZ_SID(H5 公众号 OAuth)实测 < 1 天即失效。两道 auth 均无法撑过 24 小时,每日定时签到无解。

滔搏运动(Topsports)微信小程序「每日中心」签到送积分。

## 文件

- `topsports.js` — 单脚本,http-request 抓 Cookie / http-response 捕获 H5 会话 / cron 签到

## 使用步骤

1. 按下方平台配置添加三条重写规则(Cookie、Auth、H5)+ cron
2. 首次:打开「滔搏运动」小程序 → 进「每日中心 / 签到」页,收到「✅ 滔搏 Cookie 获取成功」通知
3. 此后开小程序任意页面即自动刷新 Authorization
4. (可选,增强稳定性)在微信内打开任意滔搏 H5 链接,自动捕获 QZ_SID,Authorization 过期时 cron 自动降级使用

## Loon

```ini
[MITM]
hostname = m.topsports.com.cn, wxmall.topsports.com.cn

[Script]
http-request ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo tag=滔搏 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
http-request ^https:\/\/wxmall\.topsports\.com\.cn\/shopMember\/ tag=滔搏 Auth, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
http-response ^https:\/\/m\.topsports\.com\.cn\/ tag=滔搏 H5, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png

cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, tag=滔搏签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png, enable=true
```

## Surge

```ini
[MITM]
hostname = m.topsports.com.cn, wxmall.topsports.com.cn

[Script]
滔搏 Cookie = type=http-request,pattern=^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
滔搏 Auth = type=http-request,pattern=^https:\/\/wxmall\.topsports\.com\.cn\/shopMember\/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
滔搏 H5 = type=http-response,pattern=^https:\/\/m\.topsports\.com\.cn\/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png

滔搏签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png
```

## Quantumult X

```ini
[MITM]
hostname = m.topsports.com.cn, wxmall.topsports.com.cn

[rewrite_local]
^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
^https:\/\/wxmall\.topsports\.com\.cn\/shopMember\/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
^https:\/\/m\.topsports\.com\.cn\/ url script-response-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js

[task_local]
15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js, tag=滔搏签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/topsports.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 滔搏签到
      cron: '15 8 * * *'
      timeout: 60

http:
  mitm:
    - "m.topsports.com.cn"
    - "wxmall.topsports.com.cn"
  script:
    - match: ^https:\/\/m\.topsports\.com\.cn\/h5\/act\/signIn\/actInfo
      name: 滔搏 Cookie
      type: request
      require-body: false
    - match: ^https:\/\/wxmall\.topsports\.com\.cn\/shopMember\/
      name: 滔搏 Auth
      type: request
      require-body: false
    - match: ^https:\/\/m\.topsports\.com\.cn\/
      name: 滔搏 H5
      type: response
      require-body: false

script-providers:
  滔搏签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/topsports/topsports.js
    interval: 86400
```

## 实现细节

- **鉴权** — Cookie 里的 `Authorization`(UUID Bearer 会话票据)+ `memberId`，无签名；服务端 TTL 约 1 小时
- **Authorization 自动刷新** — `wxmall.topsports.com.cn/shopMember/` 重写监听原生小程序请求，开 app 即静默更新存储的 token，无需每次手动重抓
- **H5 会话降级(QZ_SID)** — `http-response` 规则监听 `m.topsports.com.cn` 所有响应头，WeChat 公众号 OAuth 回调(`snsapi_base`，用户无感)会在 `Set-Cookie` 下发 `QZ_SID`；Authorization 失效时 cron 自动用 QZ_SID + `originH5Flag:true` 降级重试 doSign；QZ_SID 有效期通常远超 1 小时
- **activityId 动态获取** — 先 GET `/h5/act/signIn/actInfo?brandCode=TS` 拿当前 activityId，再 POST `/h5/act/signIn/doSign`
- **acw_tc 刷新** — `refreshAcwTc()` 重放 `/static/setCookieApplets.html` 入口拿新 acw_tc（阿里云 WAF cookie，Max-Age=1800）；同时探测该入口是否下发 QZ_SID（日志可见）

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-31 | 初版，Cookie 鉴权，activityId 走 actInfo 动态获取 |
| 2026-06-02 | 确诊 doSign 50010 真因：Authorization 轮换；refreshAcwTc() 处理 acw_tc |
| 2026-06-06 | 增加 `wxmall.topsports.com.cn/shopMember/` 重写，开 app 自动刷新 Authorization，脚本复活 |
| 2026-06-06 | 增加 H5 会话(QZ_SID)捕获与降级路径；Authorization 1 小时过期后自动切 H5 会话重试 |
| 2026-06-07 | 实测 QZ_SID < 1 天即失效，两道 auth 均无法撑过 24 小时 → 📦 归档 |

## 归档原因

| auth | TTL | 结论 |
|---|---|---|
| Authorization(小程序 Bearer) | ~1 小时 | 每次开小程序才刷新，无感 cron 不可用 |
| QZ_SID(H5 公众号 OAuth) | < 1 天 | 实测隔天失效，无法保证每日自动签到 |

两道 auth 都短于 24 小时，且均依赖微信前台交互才能续命；纯后台 cron 无法维持登录态。
