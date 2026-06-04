<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png" width="80" alt="腾讯视频" />
</p>

# 腾讯视频

> 🧪 **待验证** · 从归档复活:改走**网页端 `NewRefresh`** 刷新 vusession(refresh_token ~长期、无需签名),再调 app 的 `CheckIn` 签到。实测网页刷新接口不校验 `q_uskey`,纯 cookie 重放即可

腾讯视频 VIP 每日签到(V力值)。签到接口 `CheckIn` 无签名、纯靠有效 vusession;而 vusession 仅 2 小时,旧版靠用户手动开 app 续命。新版用**网页登录态的 `refresh_token`**走 `pbaccess.video.qq.com/.../NewRefresh` 自动换新 vusession,实现无人值守。

## 文件

- `tenvideo.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 签到,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方平台配置,开启重写脚本 + cron
2. **iOS Safari(走 Loon)登录 `v.qq.com`**(QQ 登录),进任意会员/影视页
3. 切到别的 App 再切回(触发 `pbaccess.video.qq.com` 登录态刷新),即抓到 cookie
4. 收到 `✅ 腾讯视频 Cookie 获取成功` 通知即成功
5. cron 自动签到(每次先 NewRefresh 换新 vusession,再 CheckIn)

> 调试:脚本首行打印版本号;`tenvideo_debug=true` 开详细日志;日志前缀 `[capture]`/`[刷新]`/`[检测]`/`[响应]`。

## Loon

```ini
[MITM]
hostname = pbaccess.video.qq.com, vip.video.qq.com

[Script]
http-request ^https:\/\/pbaccess\.video\.qq\.com\/ tag=腾讯视频 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png

cron "10 0 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js, tag=腾讯视频签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png, enable=true
```

## Surge

```ini
[MITM]
hostname = pbaccess.video.qq.com, vip.video.qq.com

[Script]
腾讯视频 Cookie = type=http-request,pattern=^https:\/\/pbaccess\.video\.qq\.com\/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png

腾讯视频签到 = type=cron,cronexp=10 0 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png
```

## Quantumult X

```ini
[MITM]
hostname = pbaccess.video.qq.com, vip.video.qq.com

[rewrite_local]
^https:\/\/pbaccess\.video\.qq\.com\/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js

[task_local]
10 0 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js, tag=腾讯视频签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 腾讯视频签到
      cron: '10 0 * * *'
      timeout: 60

http:
  mitm:
    - "pbaccess.video.qq.com"
    - "vip.video.qq.com"
  script:
    - match: ^https:\/\/pbaccess\.video\.qq\.com\/
      name: 腾讯视频 Cookie
      type: request
      require-body: false

script-providers:
  腾讯视频签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js
    interval: 86400
```

## 实现细节

- **续期(关键,网页端方案)** — vusession 仅 ~2 小时;cron 先 `POST pbaccess.video.qq.com/.../WebLoginTrpc/NewRefresh`(body `{type:"qq", si:{q36:"", h38:<_qimei_uuid42>}}` + cookie 里的 `vqq_refresh_token`)换新 vusession。**实测该接口不校验请求头里的 `q_uskey` 签名**(软反爬),纯 cookie + 固定 body 重放即可,无任何加密
- **vusession 取自响应体** — `data.vusession`(`data.errcode===0` 为成功);写回 cookie 的 `v_vusession`/`vqq_vusession`,并合并响应 `Set-Cookie`(refresh_token 等若滚动跟上)
- **签到** — `GET vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/CheckIn?rpc_data={}`,带刷新后的 cookie。`ret===0`+`check_in_score` 为成功,`ret===-2002` 为今日已签
- **抓取** — 登录态下 `pbaccess.video.qq.com` 的请求带齐 `vqq_refresh_token`/`openid`/`vusession`/`_qimei_*`,抓 cookie 头入库(多行 cookie 头用 normalizeCookie 拼回)
- **网页 vs app** — app 端 vusession 续期是私有协议(wtlogin)复现不了;网页端把 OAuth refresh 明文摆出来,故改走网页

## 维护记录

| 日期 | 变更 |
|---|---|
| — | 初版(@WowYiJiu):抓 app `ReadTaskList` cookie 回放签到,vusession 2h 靠手动续 |
| 2026-06-05 | 复活:改网页 `NewRefresh` 用 refresh_token 刷 vusession(实测免 q_uskey 签名),无人值守。状态 📦→🧪 |

## 已知限制

- **vusession 取自网页 OAuth**:cron 跑时若 `refresh_token` 已失效(长期未抓/被吊销),NewRefresh 失败,需重登 `v.qq.com` 重抓
- **网页 vusession 喂 app CheckIn**:跨端复用,待长期验证服务端是否始终接受
- **refresh_token 滚动**:刷新响应若 `Set-Cookie` 新 refresh_token,脚本已合并写回;别在 cron 周期内网页重登(会另起会话)
- **q_uskey 免签是当前行为**:腾讯若日后对 NewRefresh 强制校验 q_uskey(qimei 设备签名),则失效
- **奖励仅 V力值**,无实物兑换

## 致谢

- 原作者:[@WowYiJiu](https://github.com/WowYiJiu) — 初版签到逻辑与 CheckIn 接口
