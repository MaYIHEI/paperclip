<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png" width="80" alt="一点万象" />
</p>

# 一点万象

华润万象生活「一点万象」APP 每日签到,覆盖万象汇/万象城/万象天地等华润商场。

## 文件

- `newmixc.cookie.js` — Cookie 抓取脚本(http-request/response 重写)
- `newmixc.js` — 签到主脚本(cron)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开「一点万象」APP → 任意页面停留 1 秒(自动触发 getPersonalData 接口)
3. 收到 `✅ 一点万象 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = app.mixcapp.com

[Script]
http-request ^https:\/\/app\.mixcapp\.com\/mixc\/api\/v4\/member\/getPersonalData tag=一点万象 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png

cron "37 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.js, tag=一点万象签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png, enable=true
```

## Surge

```ini
[MITM]
hostname = app.mixcapp.com

[Script]
一点万象 Cookie = type=http-request,pattern=^https:\/\/app\.mixcapp\.com\/mixc\/api\/v4\/member\/getPersonalData,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png

一点万象签到 = type=cron,cronexp=37 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png
```

## Quantumult X

```ini
[MITM]
hostname = app.mixcapp.com

[rewrite_local]
^https:\/\/app\.mixcapp\.com\/mixc\/api\/v4\/member\/getPersonalData url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.cookie.js

[task_local]
37 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.js, tag=一点万象签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/newmixc.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 一点万象签到
      cron: '37 8 * * *'
      timeout: 60

http:
  mitm:
    - "app.mixcapp.com"
  script:
    - match: ^https:\/\/app\.mixcapp\.com\/mixc\/api\/v4\/member\/getPersonalData
      name: 一点万象 Cookie
      type: request
      require-body: false

script-providers:
  一点万象签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/newmixc/newmixc.js
    interval: 86400
```

## 实现细节

- 网关: `POST /mixc/gateway` 统一网关 + `action` 字段区分业务
- 签到 action: `mixc.app.memberSign.sign`
- 签名: `md5(sort_keys + '&' 拼接 + 盐)`,盐 `P@Gkbu0shTNHjhM!7F` 从 H5 包挖出
- 已内联轻量 md5 实现,无外部依赖

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-23 | 初版,适配万象 H5 网关签名 |
| 2026-05-23 | 改名 `yidian` → `newmixc`(对齐英文命名规范),CK_KEY `yidian_data` → `newmixc_data`,中文显示名保持「一点万象」不变 |
| 2026-05-24 | tag 统一为 `一点万象 Cookie` / `一点万象签到`,加 img-url 图标 |

## 已知限制

- **单商场签到**:脚本按 cookie 里的 `mallNo` 签到一家。多家万象会员需切换商场重抓
- Token 时效较长但风控未知,签到失败提示「未登录」时重抓 cookie
