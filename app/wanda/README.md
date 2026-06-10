<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png" width="80" alt="万达电影" />
</p>

# 万达电影 🧪

万达电影 APP 每日签到,签到送成长值 +1。

> ⚠️ **本脚本需配套一个自建签名 Worker**(见 [`signer/`](./signer/))。
> 万达的请求签名 `x-ry-check` 由 APP/小程序内一段 WASM 算出(自定义哈希,非 md5/sha),
> Loon 的 JavaScriptCore 跑不了 WASM,所以把这段 wasm 放到 Cloudflare Worker 上算。
> **token 全程留在 Loon,只把 `{ts, uri, body}` 发给 Worker 换签名。**

## 文件

- `wanda.cookie.js` — Cookie 抓取(从「我的」页请求头抠 `x-ry-token` / `x-ry-user` / `shumeiboxid`)
- `wanda.js` — cron 签到(委托 signer Worker 算签名后打签到接口)
- `signer/` — Cloudflare Worker 签名服务,**先部署它**,见 [`signer/README.md`](./signer/README.md)

## 使用步骤

1. **先部署签名 Worker**:照 [`signer/README.md`](./signer/README.md) 跑 `wrangler deploy`,记下 Worker 地址
2. 把 Worker 地址写入持久化键 `wanda_signer_url`(BoxJS 或手动),或直接改 `wanda.js` 顶部 `SIGNER_URL`
3. 按下方平台配置,开启重写脚本 + cron
4. 打开万达电影 APP → 底部「我的」,触发 `user_info`
5. 收到 `✅ 万达电影 Cookie 获取成功` 即抓取成功
6. cron 按计划自动签到

## Loon

```ini
[MITM]
hostname = user-api-prd-mx.wandafilm.com

[Script]
http-request ^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info tag=万达电影 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png

cron "20 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js, tag=万达电影签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png, enable=true
```

## Surge

```ini
[MITM]
hostname = user-api-prd-mx.wandafilm.com

[Script]
万达电影 Cookie = type=http-request,pattern=^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png

万达电影签到 = type=cron,cronexp=20 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png
```

## Quantumult X

```ini
[MITM]
hostname = user-api-prd-mx.wandafilm.com

[rewrite_local]
^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.cookie.js

[task_local]
20 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js, tag=万达电影签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 万达电影签到
      cron: '20 9 * * *'
      timeout: 60

http:
  mitm:
    - "user-api-prd-mx.wandafilm.com"
  script:
    - match: ^https:\/\/user-api-prd-mx\.wandafilm\.com\/user\/user_info
      name: 万达电影 Cookie
      type: request
      require-body: false

script-providers:
  万达电影签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wanda/wanda.js
    interval: 86400
```

## 实现细节

- **签到接口**:`POST front-gateway-c.wandafilm.com/sign_in/do_sign_in.api`,body `{"signInDate":"YYYY-MM-DD","ruleScene":1,"json":"true"}`,成功返回 `成长值+1`。
- **鉴权**:请求头 `x-ry-token`(用户会话票据) + `x-ry-user` + 每请求一个的签名 `x-ry-check`。token 在所有 `*.wandafilm.com` 已登录请求上通用,抓「我的」页即可。
- **签名 `x-ry-check`**:由小程序 `wasm/index_bg.wasm` 的 `signature(ts, uri, c)` 算出 —— 自定义哈希,实测**不是任何标准 md5/sha 拼接**,且 wasm 内硬校验运行环境 `appId=wx6718e4b1e9cce6b2` 才走真算法。
  - `c = urlEncodeUnicode(JSON.stringify(body))`(百分号编码),但**实际发送的 body 是原始 JSON**;服务端按解析后的 body 重新规范化校验。
  - 签名 `uri = /sign_in/do_sign_in.api`(带前导斜杠)。
- **跨渠道复用**:APP 端原生签名器无源码不可复现,但**用小程序渠道的 wasm 签名(`cCode=XIAOCHENGXUGP`, `appId=3`, `ver=6.5.3`)配 APP 抓到的 token,服务端照样认**(实测 `code:0`)。所以脚本走小程序渠道签名 + APP token。
- **签名为何放 Worker**:Loon 的 JSC 不支持 WebAssembly,wasm 无法在脚本内运行;Cloudflare Worker 原生支持 wasm。Worker 只算签名、不碰 token。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-10 | 初版(🧪 待验证)。逆向小程序 wasm 签名,跨渠道用 APP token,端到端 curl 实测 `code:0` |

## 已知限制

- **依赖自建 Worker**:签名算不出来就没法签(同途虎依赖外部 blackbox 的取舍)。Worker 在 Cloudflare 免费额度内,实际无成本。
- **token 时效未知**:`x-ry-token` 是会话票据,TTL 未实测。若像部分 APP 那样「开 APP 即轮换」,daily cron 会间歇失败 —— 届时按通知重抓即可。**这是本脚本标 🧪 待验证的主因**,需观察几天稳定性。
- **签名校验失败(403)** = token 失效或 Worker 异常:脚本会提示「重开万达 APP 我的页重抓 Cookie」。
