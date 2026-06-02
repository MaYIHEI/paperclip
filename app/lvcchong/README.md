# 驴充充

> ⚠️ **实验性** · 依赖「服务端不认 JWT 短过期、按 jti 记账」这一实测行为,跨天能否续命待长期观察(见下)

驴充充(充电桩)App「积分中心 → 签到」每日签到领积分。鉴权用 `refreshToken`(存 BoxJS,自动滚动更新),签到接口本身无签名、无验证码。

## 文件

- `lvcchong.js` — 单脚本架构,既是抓 `refreshToken` 的重写脚本,也是 cron 签到(按 `$request` 是否存在区分)

## 使用步骤

1. 按下方平台配置,开启重写脚本 + cron
2. Loon 开抓包,打开**驴充充 App**(已登录,**无需退出登录**)
3. 进入「我的 → 积分中心 / 签到」页(触发 `accessToken/refresh` + `h5/accessEntrance` 两个请求)
4. 收到 `🎉 凭证已抓取` 通知即入库
5. **抓完关掉 App**(避免 App 继续把 `refreshToken` 滚到新值,作废脚本手里的那个)
6. cron 自动签到

## Loon

```ini
[MITM]
hostname = appapi.lvcchong.com

[Script]
http-request ^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance) tag=驴充充 凭证, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js, requires-body=true

cron "20 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js, tag=驴充充签到, enable=true
```

## Surge

```ini
[MITM]
hostname = appapi.lvcchong.com

[Script]
驴充充 凭证 = type=http-request,pattern=^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js

驴充充签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js
```

## Quantumult X

```ini
[MITM]
hostname = appapi.lvcchong.com

[rewrite_local]
^https:\/\/appapi\.lvcchong\.com\/(accessToken\/refresh|appBaseApi\/h5\/accessEntrance) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js

[task_local]
20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/lvcchong/lvcchong.js, tag=驴充充签到, enabled=true
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
      name: 驴充充 凭证
      type: request
      require-body: true
```

## 实现细节

- **能成立的前提** — 驴充充所有 token 的 JWT 只写 30 秒(userToken)/ 90 秒(refreshToken)过期,但服务端**实测不认这个 exp**:抓包里一个 refreshToken 在 JWT 过期 **52 分钟后**仍成功换新 token(`code:200`)。说明服务端按 `jti` 后台记账,JWT 的过期时间是幌子。本脚本正是靠这点存 `refreshToken` 续命
- **三步链**(全走 `appapi.lvcchong.com`):
  1. `POST /accessToken/refresh` 送 `refreshToken` → 新 `userToken` + 新 `refreshToken`(**滚动,必须写回 BoxJS**)
  2. `POST /appBaseApi/h5/accessEntrance` 送 `userToken`+`phone`+`userId` → 积分 H5 专用 `userToken`
  3. `POST /appBaseApi/scoreUser/sign/userSign` 送 H5 token + `sourceType=3` → 签到
- **签到判定** — `code===200` 且有 `data` 即成功,读 `signDays`(累计天数)+ `score`(本次积分)
- **凭证存储** — BoxJS key `lvcchong_auth`(JSON),含 `refreshToken`/`userToken`/`phone`/`userId`/`deviceId` 等;`refreshToken` 每次刷新自动更新

## 已知限制 / 待观察

- **跨天续命未验证**:只实测了 refreshToken 过期 52 分钟仍可用,cron 一天一跑需要 ≥24 小时宽限。若隔天失效,把 cron 改成**每几小时跑一次**保温(refreshToken 滚动,刷一次就续命)即可
- **`refreshToken` 滚动**:脚本和 App 不能同时滚同一个家族的 token。抓完凭证后尽量别再开 App 的积分页,否则可能把脚本存的那个滚作废 → 需重抓
- **`deviceId` 绑定**:`refresh` 校验设备指纹,脚本用抓包时那台的 `deviceId`,换设备可能触发风控
- **只做基础签到**:「看视频多领积分」(`receiveTaskScore`)带加密 `nonce`+`content` 且依赖腾讯激励视频广告观看回执,脚本不做
- 失效时脚本提示「重抓凭证」,按使用步骤重抓即可

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-02 | 初版,refreshToken 续命,三步链 refresh→accessEntrance→userSign,sourceType=3 |
