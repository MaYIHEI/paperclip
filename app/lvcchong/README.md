<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png" width="80" alt="驴充充" />
</p>

# 驴充充

> 📦 **已归档** · 实测 refreshToken 空闲仅 **~20 分钟**即失效,长期登录态绑运营商一键登录(SIM),脚本无法定时续命。三步链/抓取逻辑都跑通了,纯卡在 token 寿命。仅保留排查记录(见「归档原因」)

驴充充(充电桩)App「积分中心 → 签到」每日签到领积分。鉴权用 `refreshToken`(存 BoxJS,自动滚动更新),签到接口本身无签名、无验证码。

## 文件

- `lvcchong.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 签到,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. Loon 开抓包,**杀掉驴充充 App 重新冷启动**(触发 `/accessToken/refresh` 拿 `refreshToken`)
3. 进入「我的 → 积分中心 / 签到」页(触发 `/h5/accessEntrance` 拿 `phone`+`userId`)
4. 收到 `✅ 驴充充 Cookie 获取成功` 通知即抓取成功
5. **抓完关掉 App**(避免 App 继续把 `refreshToken` 滚到新值,作废脚本手里的那个)
6. cron 自动签到

> ⚠️ 只开着进页面、不冷启,通常抓不到 `refreshToken`(它只在 App 冷启动 / token 过期时才发)。必须**杀进程重开**。

## Loon

```ini
[MITM]
hostname = appapi.lvcchong.com

[Script]
http-request ^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance) tag=驴充充 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png
http-response ^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance) tag=驴充充 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png

cron "20 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js, tag=驴充充签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png, enable=true
```

## Surge

```ini
[MITM]
hostname = appapi.lvcchong.com

[Script]
驴充充 CookieReq = type=http-request,pattern=^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png

驴充充 CookieResp = type=http-response,pattern=^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png

驴充充签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png
```

## Quantumult X

```ini
[MITM]
hostname = appapi.lvcchong.com

[rewrite_local]
^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js
^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance) url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js

[task_local]
20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js, tag=驴充充签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/lvcchong.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 驴充充签到
      cron: '20 8 * * *'
      timeout: 60

http:
  mitm:
    - "appapi.lvcchong.com"
  script:
    - match: ^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance)
      name: 驴充充 CookieReq
      type: request
      require-body: true
    - match: ^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance)
      name: 驴充充 CookieResp
      type: response
      require-body: true

script-providers:
  驴充充签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js
    interval: 86400
```

## 实现细节

- **能成立的前提** — 驴充充所有 token 的 JWT 只写 30 秒(userToken)/ 90 秒(refreshToken)过期,但服务端**实测不认这个 exp**:抓包里一个 refreshToken 在 JWT 过期 **52 分钟后**仍成功换新 token(`code:200`)。说明服务端按 `jti` 后台记账,JWT 的过期时间是幌子。本脚本正是靠这点存 `refreshToken` 续命
- **三步链**(全走 `appapi.lvcchong.com`):
  1. `POST /accessToken/refresh` 送 `refreshToken` → 新 `userToken` + 新 `refreshToken`(**滚动,必须写回 BoxJS**)
  2. `POST /appBaseApi/h5/accessEntrance` 送 `userToken`+`phone`+`userId` → 积分 H5 专用 `userToken`
  3. `POST /appBaseApi/scoreUser/sign/userSign` 送 H5 token + `sourceType=3` → 签到
- **签到判定** — `code===200` 且有 `data` 即成功,读 `signDays`(累计天数)+ `score`(本次积分)
- **凭证存储** — BoxJS key `lvcchong_auth`(JSON),含 `refreshToken`/`userToken`/`phone`/`userId`/`deviceId` 等;`refreshToken` 每次刷新自动更新
- **抓取分两路** — `refreshToken` 是「一次性滚动」,请求体里的旧值用过即废,所以只从 **http-response** 抓服务端新签发的那个;`phone`/设备指纹不滚动,从 **http-request** 抓。集齐才通知一次,之后随 App 滚动静默存最新

## 归档原因(实测结论)

跑了多轮带"refreshToken 距签发分钟数"标尺的对照实验,失效阈值干净一致:

| token 年龄 | 结果 |
|---|---|
| 7 / 10 / 11 分钟 | ✅ 签到成功 |
| 22 / 25 / 31 / 89 分钟 | ❌ `TOKEN失效` |

- **refreshToken 空闲寿命 ~15-20 分钟**,过了就死。刷新接口确实返回"1 分钟"的新鲜 token(已验证),但**新 token 也只活 ~20 分钟**,刷新换汤不换药
- cron 一天一次(间隔 24h)或 6 小时一次,两次间隔都 ≫ 20 分钟 → token 每次都是死的,**必然失败**
- 唯一能续命的频率是**每 ~15 分钟刷一次**(一天近百次),为一个充电签到这么搞不值,且一次没跑准就得重抓
- **根因**:真实长期登录态是**运营商一键登录(SIM 卡,冷启时静默重登,抓包里 `onekey2.cmpassport.com`)**,脚本碰不到 SIM 那层;refreshToken 只是 20 分钟的临时工作票。与滔搏的「微信登录」同一堵墙,只是多包一层短票
- 早期"App 抓包里 refreshToken 过期 52 分钟仍可用"的观察是误导(App 靠后台保活/或 SIM 重登维持),不代表脚本存的那个能活那么久

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-02 | 初版,refreshToken 续命,三步链 refresh→accessEntrance→userSign,sourceType=3 |
| 2026-06-02 | 修 `TOKEN已刷新` 失效:refreshToken 改从 http-response 抓(请求体里是用过即废的旧值) |
| 2026-06-03 | 加签发时长标尺定位,实测 refreshToken 空闲仅 ~20 分钟,无法定时续命 → 📦 归档 |

## 已知限制

- **跨天续命未验证**:只实测了 refreshToken 过期 52 分钟仍可用,cron 一天一跑需要 ≥24 小时宽限。若隔天失效,把 cron 改成**每几小时跑一次**保温(refreshToken 滚动,刷一次就续命)
- **`refreshToken` 滚动**:脚本和 App 不能同时滚同一家族的 token。抓完 Cookie 后尽量别再开 App 积分页,否则可能把脚本存的滚作废 → 需重抓
- **`deviceId` 绑定**:`refresh` 校验设备指纹,脚本用抓包时那台的 `deviceId`,换设备可能触发风控
- **只做基础签到**:「看视频多领积分」(`receiveTaskScore`)带加密 `nonce`+`content` 且依赖腾讯激励视频广告观看回执,脚本不做
- 失效时脚本提示「重抓 Cookie」,按使用步骤重抓即可
