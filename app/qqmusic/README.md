<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png" width="80" alt="QQ 音乐" />
</p>

# QQ 音乐

> 🧪 **待验证** · 续期 + 签到全链路已实测打通(`refresh_key` 换新 musickey 3 天有效 → 签到 `Ret:0`/`Ret:20019`)。待观察:`refresh_key` 的长期寿命(目前看长期不变)。

QQ 音乐 App「我的 / 会员 / 每日签到」绿钻成长值每日签到。**一次抓取后挂着代理即可,cron 自动续期 + 签到,无需再开 App。**

## 文件

- `qqmusic.js` — 单脚本架构,既是抓取也是 cron 签到,按 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开 QQ 音乐 App →「我的 / 会员 / 每日签到」进签到页
3. 收到 `✅ QQ 音乐 Cookie 获取成功` 通知即抓取成功
4. 之后挂着代理就行,cron 每天自动续期 + 签到,**无需再开 App**;只有手机关机 / 断代理超过 3 天才需重抓

## 工作原理

签到接口是 `music.lvz.MuFest13TaskSvr / EveryDaySignLvzScore`(绿钻成长值,`Cmd:get` 即领取)。

**两个突破点都在解包 QQ 音乐微信小程序(`wxada7aab80ba27074`)里找到:**

**① 免签名通道。** QQ 音乐 App 自己调 `musics.fcg`,带私有混淆签名 `sign`(`zzc…`),**重算不现实**。但小程序所有 CGI 都走 **`https://u.y.qq.com/cgi-bin/musicu.fcg`(无 sign)**,鉴权只靠请求体 `comm.authst`(就是 `qm_keyst` / musickey)。实测 App 抓的 `qm_keyst` 直接当 `authst` 即可跨通道认。

**② 自动续期。** `qm_keyst`(musickey)**只有 3 天有效期**(`keyExpiresIn=259200`),这正是原脚本要天天进 App 的原因。但 Cookie 里的 `refresh_key` **长期不变**,可调 `music.login.LoginServer / Login` 换一把全新的 musickey(每次都换新值,3 天有效)。所以 cron 每天先续期、再签到,musickey 永远在有效期内滚动 —— 真后台,挂着就行。

**流程:**
- 抓取:从签到页 Cookie 取 `uin` + `qm_keyst` + `refresh_key` + `tmeLoginType`(**不要请求体 / sign / g_tk**)
- 续期:cron 先 POST `musicu.fcg` 调 `LoginServer/Login`(`comm.tmeLoginType` + `param.refresh_key`),拿新 `musickey` 滚动存回
- 签到:用刚续的 `authst` POST `musicu.fcg` 调 `EveryDaySignLvzScore`

成败判断:`req_0.data.Ret === 0` 真签成功;`Ret === 20019`(「今天已经领取过」)= 今日已签;续期 `req1.code === 0` + 返回 `musickey` = 续期成功。

## Loon

```ini
[MITM]
hostname = u6.y.qq.com

[Script]
http-request ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?_webcgikey=EveryDaySignLvzScore& tag=QQ音乐 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png

cron "20 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, tag=QQ音乐签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enable=true
```

## Surge

```ini
[MITM]
hostname = u6.y.qq.com

[Script]
QQ音乐 Cookie = type=http-request,pattern=^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?_webcgikey=EveryDaySignLvzScore&,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png

QQ音乐签到 = type=cron,cronexp=20 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
```

## Quantumult X

```ini
[MITM]
hostname = u6.y.qq.com

[rewrite_local]
^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?_webcgikey=EveryDaySignLvzScore& url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js

[task_local]
20 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, tag=QQ音乐签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: QQ音乐签到
      cron: '20 9 * * *'
      timeout: 60

http:
  mitm:
    - "u6.y.qq.com"
  script:
    - match: ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?_webcgikey=EveryDaySignLvzScore&
      name: QQ音乐 Cookie
      type: request
      require-body: false

script-providers:
  QQ音乐签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js
    interval: 86400
```

## BoxJS 开关

| key | 默认 | 说明 |
|---|---|---|
| `qqmusic_debug` | `false` | 打印请求/响应日志 |

## 已知限制

- **`refresh_key` 的长期寿命未实测** —— 当前唯一的不确定点。实测 `refresh_key` 长期不变、`needRefreshKeyIn=0`(无临期信号),续期能无限换新 musickey;但它最终会不会过期(几个月?)需长期观察。一旦失效,续期会失败、签到报错,重进签到页重抓即可。
- **手机关机 / 断代理超过 3 天**:musickey 过期且续期可能也需有效 musickey 配合,此时需重抓。日常挂着代理 + 每日 cron 不会触发。
- **`tmeLoginType` 因号而异**:本脚本从 Cookie 自动读取(实测某 QQ 号为 `2`)。纯 QQ 登录(`1`)的续期未实测,若续期失败看日志 `req1.code`。
- **签到走小程序 `appid`**:`comm.appid` 用 QQ 音乐小程序的 `wxada7aab80ba27074`,配 App 抓的 `qm_keyst` 实测照认。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-15 | 初版。三版迭代:① 整包抓取+原样回放 → ② 解包小程序发现 `musicu.fcg` 免签名通道(只存 uin+qm_keyst)→ ③ 发现 musickey 仅 3 天有效但 `refresh_key` 可续期,加 cron 自动续期。全链路真 token 实测通(续期换新 key 3 天有效 → 签到 `Ret:20019`) |
