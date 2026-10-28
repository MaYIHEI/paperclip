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
request if ${url} ~= /^https:\/\/member-center\.miniso\.com\/userinfo\/userinfo\/GetUserInfoV3/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js") with tag="名创优品 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png"

cron "37 7 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/miniso/miniso.js") with tag="名创优品签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/miniso.png"
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

## 说明

- 支持多账号:BoxJS `miniso_data` 用 `@` 分隔多个 Cookie。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05 | 初版 |
| 2026-05-24 | tag 统一为 `名创优品 Cookie` / `名创优品签到`,加 img-url 图标 |
| 2026-06-17 | 抓取接口换成进「我的」页即触发,修间歇抓不到 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../../app/summary/)」一条通知查看是否需要重新抓取 |
| 2026-10-27 | 签到结果按签到状态协议 v1 记录,并登记到公共索引,供签到汇总和桌面小组件读取 |
| 2026-10-28 | 签到记录里带上mini币余额,供签到汇总和桌面小组件显示 |
| 2026-10-28 | 签到记录里带上 Cookie 过期时间 |
