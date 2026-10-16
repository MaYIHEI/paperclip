<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/casetify.png" width="80" alt="CASETiFY" />
</p>

# CASETiFY

> 📦 **已归档** · token 续期依赖 wx.login(),脚本环境无解,不再维护,仅保留历史

CASETiFY 微信小程序每日签到。一天 1 C 币,连签 7 天 6 C 币奖励,无实物兑换价值。

## 为什么不维护

技术上**没有 cron 自动签到的方案**:token 续期 100% 依赖在小程序里触发 `wx.login()` 拿新凭据,代理脚本环境无法做到。token 有效期只有约 10 小时,过窗口即失效。

## 文件

- `casetify.js` — 抓 token + 签到一体脚本,token 新鲜时能正常工作(用户冷启动小程序后约 10 小时窗口内)

## 配置(如果你坚持要试)

### Loon

```ini
[MITM]
hostname = mini-app-api.casetify.cn

[Script]
response if ${url} ~= /^https:\/\/mini-app-api\.casetify\.cn\/api\/v4\/estore\/member\/checkWebToken/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/casetify/casetify.js") with tag="CASETiFY Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/casetify.png", requires_body=true

cron "5 0 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/casetify/casetify.js") with tag="CASETiFY签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/casetify.png"
```

### Surge

```ini
[MITM]
hostname = mini-app-api.casetify.cn

[Script]
CASETiFY Cookie = type=http-response, pattern=^https:\/\/mini-app-api\.casetify\.cn\/api\/v4\/estore\/member\/checkWebToken, requires-body=1, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/casetify/casetify.js, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/casetify.png
CASETiFY签到 = type=cron, cronexp=5 0 * * *, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/casetify/casetify.js, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/casetify.png
```

### Quantumult X

```ini
[MITM]
hostname = mini-app-api.casetify.cn

[rewrite_local]
^https:\/\/mini-app-api\.casetify\.cn\/api\/v4\/estore\/member\/checkWebToken url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/casetify/casetify.js

[task_local]
5 0 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/casetify/casetify.js, tag=CASETiFY签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/casetify.png, enabled=true
```

### Stash

```yaml
cron:
  script:
    - name: CASETiFY签到
      cron: '5 0 * * *'
      timeout: 10

http:
  mitm:
    - "mini-app-api.casetify.cn"
  script:
    - match: ^https:\/\/mini-app-api\.casetify\.cn\/api\/v4\/estore\/member\/checkWebToken
      name: CASETiFY Cookie
      type: response
      require-body: true
```

## 使用说明

打开 CASETiFY 小程序"我的"或"积分商城"页面 → 抓到 token 入库 → cron 在 10 小时内跑一次 = 可签。
不在窗口内 → token 失效,通知"请重新打开小程序"。

如果你能接受"打开小程序就当天能签"的弱保证,可以用。如果想 cron 全自动无人值守,**做不到**。
