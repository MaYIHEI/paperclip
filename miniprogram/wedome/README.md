<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png" width="80" alt="味多美" />
</p>

# 味多美

> ✅ **维护中** · 一次抓取后凭据长期有效、免续期,cron 自动签到。

味多美微信小程序每日签到送积分(每日 +2 分)。

## 文件

- `wedome.js` — 单脚本架构:`http-response` 抓 openid(`$response` 存在)/ cron 自动签到(否则)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「味多美」→ 进「我的/会员」或「签到」页(触发 `member/find` 或 `minaLogin`),自动抓公众号 openid。**已登录态正常浏览即可,无需删小程序重登**
3. 收到 `✅ 味多美 Cookie 获取成功` 通知即入库(openid 永久有效,基本无需再抓)
4. cron 会按计划自动签到

> 也可直接在 BoxJS 手填 `wedome_openid`(你的公众号 openid),跳过抓取。

> **清除 Cookie**:切账号或 openid 失效时,BoxJS 把「清除 Cookie」开关设为开启 → 手动跑一次签到脚本(或等下次 cron),即清空 `wedome_openid` 并自动复位开关,之后重进小程序「我的」页重新抓取。

## Loon

```ini
[MITM]
hostname = scrm-b.zjian.net

[Script]
response if ${url} ~= /^https:\/\/scrm-b\.zjian\.net\/api\/member\/(minaLogin|find)/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js") with tag="味多美 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png", requires_body=true

cron "10 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js") with tag="味多美签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png"
```

## Surge

```ini
[MITM]
hostname = scrm-b.zjian.net

[Script]
味多美 Cookie = type=http-response,pattern=^https:\/\/scrm-b\.zjian\.net\/api\/member\/(minaLogin|find),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png

味多美签到 = type=cron,cronexp=10 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png
```

## Quantumult X

```ini
[MITM]
hostname = scrm-b.zjian.net

[rewrite_local]
^https:\/\/scrm-b\.zjian\.net\/api\/member\/(minaLogin|find) url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js

[task_local]
10 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, tag=味多美签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 味多美签到
      cron: '10 8 * * *'
      timeout: 60

http:
  mitm:
    - "scrm-b.zjian.net"
  script:
    - match: ^https:\/\/scrm-b\.zjian\.net\/api\/member\/(minaLogin|find)
      name: 味多美 Cookie
      type: response
      require-body: true

script-providers:
  味多美签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-31 | 初版 |
| 2026-06-01 | 📦 归档:凭据续期需小程序登录,脚本无解 |
| 2026-06-05 | 🧪 复活:改用公众号 openid 自动换 token,免重登,实测签到成功 |
| 2026-06-07 | 适配签到接口拆分,补必填字段 + activityId 变动检测 |
| 2026-06-10 | 长期稳定,🧪→✅ 维护中 |
| 2026-06-13 | 🐞 修复天天误报签到成功:改为按签到前后积分差判成败 |
| 2026-06-14 | ✅ 验证生效:隔夜积分 +2 真实到账 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../../app/summary/)」一条通知查看是否需要重新抓取 |

## 已知限制

- **openid 永久固定**,但换微信号 / 解绑会员后需重抓
- 抓取挂 `minaLogin`(全新登录触发)+ `member/find`(「我的/会员」页触发);若都没命中(没逛到含会员信息的页) → 进一次「我的」页,或直接 BoxJS 手填 `wedome_openid`
- 仅适配 `brandId=2039`(味多美北京),其他品牌需改 brandId + 对应 openid
