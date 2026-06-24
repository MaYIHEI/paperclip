<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png" width="80" alt="北京移动" />
</p>

# 北京移动

中国移动 APP(北京)「签到赢好礼」每日签到,送流量 / 积分。

## 文件

- `cmccbj.js` — 既是抓 Cookie 的重写脚本,也是 cron 签到脚本,根据 `$request` 是否存在区分。

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开中国移动 APP(北京)→ 进入「签到赢好礼」活动页 → **点一次「签到」按钮**
3. 收到 `✅ 北京移动 Cookie 获取成功` 通知即抓取成功(提示「constid 已就绪」才算齐)
4. cron 会按计划自动签到

> 进页面只能抓到 token,**必须亲手点一次签到**才能抓到 constid,二者齐了 cron 才跑得通。

## Loon

```ini
[MITM]
hostname = h5.bj.10086.cn

[Script]
http-request ^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/ tag=北京移动 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png

cron "20 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js, tag=北京移动签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png, enable=true
```

## Surge

```ini
[MITM]
hostname = %APPEND% h5.bj.10086.cn

[Script]
北京移动 Cookie = type=http-request,pattern=^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/,requires-body=0,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png

北京移动签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png
```

## Quantumult X

```ini
[MITM]
hostname = h5.bj.10086.cn

[rewrite_local]
^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js

[task_local]
20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js, tag=北京移动签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 北京移动签到
      cron: '20 8 * * *'
      timeout: 60

http:
  mitm:
    - "h5.bj.10086.cn"
  script:
    - match: ^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/(getSignIn|doPrize)\/JT\/
      name: 北京移动 Cookie
      type: request
      require-body: false

script-providers:
  北京移动签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/cmccbj/cmccbj.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-24 | 初版(抓 token + constid,cron 先查状态再签) |
| 2026-06-24 | 📦 归档:实测 token 仅 ~2h 有效,无可复用刷新接口,daily cron 不可行 |

## 已知限制(📦 已归档)

- **token 仅 ~2 小时失效**:它由中国移动 APP 经统一登录(SSO 票据 `uniTokenValidateH5`)现场签发,实测约 2h 即废。
- **无可复用刷新接口**:统一登录链路根在原生一键登录 / 短信登录,整个 `client.app.coc.10086.cn` 接口面是 leadeon 原生 SDK 加密信封 + 双 md5 签名;短信登录信封里装一次性验证码无法回放,脚本环境复现不了——与网上国网 app 登录同一类天花板。
- 二者叠加:token 撑不到次日 cron,且只在「打开签到页」时刷新(而那一刻 APP 已原生签到),脚本失去「免开 APP 代签」的意义 → **归档**。
- **仅北京移动**:活动域名 `h5.bj.10086.cn`、接口含 `isBj` 标识,其他省份是独立后台,不适用。
