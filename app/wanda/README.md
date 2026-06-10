<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wanda.png" width="80" alt="万达电影" />
</p>

# 万达电影 🧪

万达电影 APP 每日签到,签到送成长值 +1。

> **全自包含,无需任何外部服务。** 万达的请求签名 `x-ry-check` 由 APP/小程序内一段 WASM 算出,
> Loon 的 JavaScriptCore 跑不了 WASM —— 解法是把那段 wasm 用 `wasm2js` 转成**纯 JS** 直接内嵌进 `wanda.js`,
> Loon 本地离线算签名,不联网、不依赖 Worker/VPS。

## 文件

- `wanda.cookie.js` — Cookie 抓取(从「我的」页请求头抠 `x-ry-token` / `x-ry-user` / `shumeiboxid`)
- `wanda.js` — cron 签到,**已内嵌纯 JS 签名引擎**(约 68KB,前半段是 wasm2js 自动生成的引擎,勿手改)

就这两个脚本,无任何外部依赖。

## 使用步骤

1. 按下方平台配置,开启重写脚本 + cron
2. 打开万达电影 APP → 底部「我的」,触发 `user_info`
3. 收到 `✅ 万达电影 Cookie 获取成功` 即抓取成功
4. cron 按计划自动签到(本地算签名,无需联网取签名)

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
- **签名 `x-ry-check`**:小程序 `wasm/index_bg.wasm` 的 `signature(ts, uri, c)` —— 自定义哈希(实测**非任何标准 md5/sha**),wasm 内硬校验运行环境 `appId=wx6718e4b1e9cce6b2` 才走真算法。
  - `c = urlEncodeUnicode(JSON.stringify(body))`(百分号编码),但**实际发送的 body 是原始 JSON**;服务端按解析后的 body 重新规范化校验。
  - 签名 `uri = /sign_in/do_sign_in.api`(带前导斜杠)。
- **跨渠道复用**:APP 端原生签名器无源码不可复现,但**用小程序渠道签名(`cCode=XIAOCHENGXUGP`, `appId=3`, `ver=6.5.3`)配 APP 抓到的 token,服务端照样认**(实测 `code:0`)。
- **签名怎么在 Loon 里算**:Loon JSC 不支持 WebAssembly。把 `index_bg.wasm` 经 `wasm-opt -Oz` → `wasm2js` → `terser` 转成 ~57KB 纯 JS 引擎,内嵌进 `wanda.js` 顶部(`WANDA_ASM_FN`),配 wasm-bindgen glue(`createSigner`)本地调用。端到端实测:内嵌引擎算出的 check 与原始 wasm 逐字一致。

### 万达若更新 wasm 换签名算法 —— 重建内嵌引擎

`index_bg.wasm` 来自万达电影小程序公开包(`wx6718e4b1e9cce6b2`,`wasm/index_bg.wasm`)。换算法时重新解包拿到新 wasm,然后:

```bash
npm i binaryen terser
node node_modules/binaryen/bin/wasm-opt index_bg.wasm -Oz --strip-debug --strip-producers -o opt.wasm
node node_modules/binaryen/bin/wasm2js opt.wasm -Oz -o asm.js
# 1) 删 asm.js 顶部的 `import * as wbg from 'wbg';`
# 2) 把结尾 `var retasmFunc = asmFunc({...` 起替换成 `return asmFunc;`
# 3) 整体包成 `var WANDA_ASM_FN=(function(){ ...上面内容... })();`
# 4) terser 压一下,替换 wanda.js 顶部「签名引擎」段
```

glue(`createSigner` / `urlEncodeUnicode`)和签名入参(`signature(ts, uri, urlEncodeUnicode(body))`)就在 `wanda.js` 里,照着调即可。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-10 | 初版(🧪 待验证)。逆向小程序 wasm 签名,跨渠道用 APP token;签名引擎 wasm2js 转纯 JS 内嵌,全自包含 |

## 已知限制

- **token 时效未知**:`x-ry-token` 是会话票据,TTL 未实测。若像部分 APP 那样「开 APP 即轮换」,daily cron 会间歇失败 —— 届时按通知重抓即可。**这是本脚本标 🧪 待验证的主因**,需观察几天稳定性。
- **签名校验失败(403)** = token 失效:脚本会提示「重开万达 APP 我的页重抓 Cookie」。
- **万达若更新小程序 wasm**(换签名算法),内嵌引擎需按上方「重建内嵌引擎」步骤重新生成。目前 `ver=6.5.3` 引擎稳定。
