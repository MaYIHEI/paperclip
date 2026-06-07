<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png" width="80" alt="味多美" />
</p>

# 味多美

> 🧪 **待验证** · **2026-06-05 从归档复活** —— 解包发现 `loginByOpenid` 旁路,用「公众号 openid 换 token」绕开 `wx.login()`,openid 永久固定、免续期。2026-06-07 适配签到接口拆分(新增 `signIn` 接口 + `memberName`)。长期稳定性观察中。

味多美微信小程序每日签到送积分(每日 +2 分)。底层卓健科技(zjian.net)+ 大咖(bigaka)会员 SaaS,`brandId=2039`(味多美北京)。

## 文件

- `wedome.js` — 单脚本架构:`http-response` 抓 openid(`$response` 存在)/ cron 自动签到(否则)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「味多美」→ 进「我的/会员」或「签到」页(触发 `member/find` 或 `minaLogin`),自动抓公众号 openid。**已登录态正常浏览即可,无需删小程序重登**
3. 收到 `✅ 味多美 openid 已获取` 通知即入库(openid 永久有效,基本无需再抓)
4. cron 会按计划自动签到

> 也可直接在 BoxJS 手填 `wedome_openid`(你的公众号 openid),跳过抓取。

> **清除 Cookie**:切账号或 openid 失效时,BoxJS 把「清除 Cookie」开关设为开启 → 手动跑一次签到脚本(或等下次 cron),即清空 `wedome_openid` 并自动复位开关,之后重进小程序「我的」页重新抓取。

## Loon

```ini
[MITM]
hostname = scrm-b.zjian.net

[Script]
http-response ^https:\/\/scrm-b\.zjian\.net\/api\/member\/(minaLogin|find) tag=味多美 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png

cron "10 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/wedome/wedome.js, tag=味多美签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wedome.png, enable=true
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

## 实现细节

- **复活核心:`loginByOpenid` 旁路** — 原 `buyer-token` 续期绑死 `wx.login()`(归档主因)。解包发现登录测试页有 `GET /api/member/h5/loginByOpenid?openid=<公众号openid>&brandId=2039`,**用公众号 openid 直接换 token,完全不碰 wx.login**,生产环境放行、无额外鉴权,openid 永久固定 → 一次抓取长期有效(和龙德广场「一次抓取永久有效」同级)
- **抓的是「公众号 openid」** — `http-response` 挂 `minaLogin`(全新登录触发)或 `member/find`(「我的/会员」页正常浏览即触发,**已登录态也发,免删小程序重登**),两接口响应结构一致,均取 `data.member.openid`(公众号 openid)。**注意不是小程序 openid**(`miniWeixinInfo.openid` / `memberWeixinApps[].openid`),小程序 openid 调 loginByOpenid 会返回 `410 根据openid获取unionid失败`
- **签到链(全动态,无写死易变值)** — `loginByOpenid` 换 token + memberId → POST `pointSignInActivitySet/get` 取当前 `activityId` → POST `signInLog?activityId&memberId` **查询**今日是否已签(有 `createTime` = 已签,跳过) → POST `pointSignInActivitySet/signIn` JSON body `{activityId,memberId,memberName,index:1}` **执行签到**
- **memberName** — 从 `member/find` 响应的 `data.member.name` 抓取并存入 BoxJS `wedome_membername`，签到 body 必填；进一次小程序「我的」页即可同步
- **鉴权头** — `buyer-token`(loginByOpenid 换来的)+ `brandId: 2039`,无 body 签名
- **同套 SaaS 通用** — 卓健/大咖服务大量品牌小程序,改 `brandId` + `openid` 即可适配其他商家

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-05-31 | 初版;抓页面加载的 `get` 拿 buyer-token,cron 现取 activityId/memberId 重建 signIn |
| 2026-06-01 | 📦 归档:`buyer-token` 续期需小程序登录(`401 用户未登录`),脚本无解 |
| 2026-06-05 | 🧪 **复活**:解包发现 `loginByOpenid` 旁路(公众号 openid 换 token,免 wx.login),改抓公众号 openid + cron 自动换 token,端到端实测签到成功 |
| 2026-06-05 | 抓取规则放宽到 `member/find`(「我的/会员」页正常浏览触发),免删小程序重登;原仅 `minaLogin` 须全新登录才命中 |
| 2026-06-07 | 适配签到接口拆分:`signInLog` 由执行变为查询,实际签到改为新接口 `signIn`,body 增加 `memberName`；新增 `tentacle-content` 系列必填 header；捕获规则同步存储 `member.name` |
| 2026-06-07 | 新增 `activityId` 变动检测:每次签到后存储 activityId,下次对比,变了通知用户 |

## 已知限制

- **openid 永久固定**,但换微信号 / 解绑会员后需重抓
- 抓取挂 `minaLogin`(全新登录触发)+ `member/find`(「我的/会员」页触发);若都没命中(没逛到含会员信息的页) → 进一次「我的」页,或直接 BoxJS 手填 `wedome_openid`
- 仅适配 `brandId=2039`(味多美北京),其他品牌需改 brandId + 对应 openid
