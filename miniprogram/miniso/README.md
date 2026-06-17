<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png" width="80" alt="名创优品" />
</p>

# 名创优品

微信小程序「名创优品」(`wx2a212470bade49bf`)每日签到 mini 币。

## 文件

- `miniso.js` — 单脚本架构,既是重写抓 token 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「名创优品」→ 进入会员页(自动刷新会员信息)
3. 收到 `✅ 名创优品 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = member-center.miniso.com

[Script]
http-request ^https:\/\/member-center\.miniso\.com\/userinfo\/userinfo\/GetUserInfoV3 tag=名创优品 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png

cron "37 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js, tag=名创优品签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png, enable=true
```

## Surge

```ini
[MITM]
hostname = member-center.miniso.com

[Script]
名创优品 Cookie = type=http-request,pattern=^https:\/\/member-center\.miniso\.com\/userinfo\/userinfo\/GetUserInfoV3,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png

名创优品签到 = type=cron,cronexp=37 7 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png
```

## Quantumult X

```ini
[MITM]
hostname = member-center.miniso.com

[rewrite_local]
^https:\/\/member-center\.miniso\.com\/userinfo\/userinfo\/GetUserInfoV3 url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js

[task_local]
37 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js, tag=名创优品签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 名创优品签到
      cron: '37 7 * * *'
      timeout: 60

http:
  mitm:
    - "member-center.miniso.com"
  script:
    - match: ^https:\/\/member-center\.miniso\.com\/userinfo\/userinfo\/GetUserInfoV3
      name: 名创优品 Cookie
      type: request
      require-body: false

script-providers:
  名创优品签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js
    interval: 86400
```

## 实现细节

- 微信小程序 `wx2a212470bade49bf`
- signature 算法已本地复现(反编译 wxapkg),无外部依赖
- 支持多账号(BoxJS `miniso_data` 用 `@` 分隔)

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05 | 初版,反编译 wxapkg 复现 signature 算法 |
| 2026-05-24 | tag 统一为 `名创优品 Cookie` / `名创优品签到`,加 img-url 图标 |
| 2026-06-17 | 抓取接口从 `login` 换成 `GetUserInfoV3`(login 仅登录时触发,导致间歇抓不到),改 http-request |

## 已知限制

- mini 币每日上限较低,主要为打卡奖励
- signature 算法若官方升级需重新反编译
