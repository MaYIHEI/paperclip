# 万达电影签名服务 (Cloudflare Worker)

万达的请求签名 `x-ry-check` 由小程序内一段 WASM 算出。Loon 的 JavaScriptCore 跑不了 WASM,
所以把这段 wasm 跑在 Cloudflare Worker 上,Loon 脚本发 `{ts, uri, body}` 来换签名。

**Worker 只算签名,不接收/不存储任何 token。** 凭证全程留在 Loon。

## 文件

- `worker.js` — Worker 入口(`POST {ts, uri, body}` → `{check}`)
- `sign-core.js` — wasm-bindgen glue + `urlEncodeUnicode`(从小程序 `wasm/index.js` 还原)
- `index_bg.wasm` — 万达电影小程序公开包里的签名 wasm(33KB)
- `wrangler.toml` — 部署配置

## 部署(一次性,约 2 分钟)

需要 [Node](https://nodejs.org) + Cloudflare 账号(免费版即可)。

```bash
cd app/wanda/signer
npx wrangler login          # 浏览器授权一次
npx wrangler deploy
```

部署完会打印地址,形如 `https://wanda-signer.<你的子域>.workers.dev`。

把这个地址填到 Loon 持久化键 **`wanda_signer_url`**(BoxJS 加一项,或脚本里直接改 `wanda.js` 顶部 `SIGNER_URL`)。

## 验证

```bash
curl -X POST https://wanda-signer.<你的子域>.workers.dev \
  -H 'content-type: application/json' \
  -d '{"ts":"1781077076053","uri":"/sign_in/do_sign_in.api","body":"{\"signInDate\":\"2026-06-10\",\"ruleScene\":1,\"json\":\"true\"}"}'
# 期望: {"check":"ed345126ba6dcb5efa7022f4d3a6eebb"}
```

返回这个固定值就说明 wasm 跑通了(这是该输入的确定签名,可作回归基准)。

## 可选:加访问限制

Worker 默认公开(但只会算签名,没 token 啥也干不了)。要限制就在 `wrangler.toml` 里设 `AUTH_KEY`,
然后 Loon 的 `wanda_signer_url` 末尾带 `?key=同一个值`。

## 接口

```
POST /
Content-Type: application/json
{ "ts": "<毫秒时间戳字符串>", "uri": "/sign_in/do_sign_in.api", "body": "<要发送的原始 JSON body 字符串>" }

→ { "check": "<32位十六进制签名>" }
```

Worker 内部对 `body` 做 `urlEncodeUnicode` 后算 `signature(ts, uri, c)`。调用方(Loon)发送给万达的 body 用**原始 JSON**,`ts` 必须与本次请求头里的 `X-RY-TIMESTAMP` 一致。
