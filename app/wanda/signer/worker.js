/**
 * 万达电影签名服务 (Cloudflare Worker)
 *
 * 万达电影的请求签名 x-ry-check 由小程序内一段 WASM 算出(自定义哈希,非 md5/sha)。
 * Loon 的 JavaScriptCore 跑不了 WASM,所以把这段 wasm 放到 Worker 里跑:
 * Loon 脚本 POST {ts, uri, body} → 本 Worker 返回 {check}。
 *
 * - 不接收、不存储任何 token —— 只算签名,凭证全程留在 Loon。
 * - wasm 来自万达电影小程序公开包,内部硬校验 appId=wx6718...,Worker 调用时按需提供。
 *
 * 部署见同目录 README.md。
 *
 * @Author: MaYIHEI <https://github.com/MaYIHEI/paperclip>
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: 2026-06-10
 */

import wasmModule from './index_bg.wasm';
import { createSigner, urlEncodeUnicode } from './sign-core.js';

let _signer = null;
async function getSigner() {
    if (_signer) return _signer;
    const s = createSigner();
    const instance = await WebAssembly.instantiate(wasmModule, s.imports);
    s.bindExports((instance.instance || instance).exports);
    _signer = s;
    return s;
}

export default {
    async fetch(request, env) {
        if (request.method !== 'POST') {
            return json({ error: 'POST {ts, uri, body} only' }, 405);
        }
        // 可选:设置 env.AUTH_KEY 后,请求需带 ?key= 或 x-auth 头一致才放行
        if (env && env.AUTH_KEY) {
            const url = new URL(request.url);
            const key = url.searchParams.get('key') || request.headers.get('x-auth') || '';
            if (key !== env.AUTH_KEY) return json({ error: 'unauthorized' }, 401);
        }
        let p;
        try { p = await request.json(); } catch (_) { return json({ error: 'bad json' }, 400); }
        const ts = String(p.ts || '');
        const uri = String(p.uri || '');
        const body = typeof p.body === 'string' ? p.body : JSON.stringify(p.body || {});
        if (!ts || !uri) return json({ error: 'missing ts/uri' }, 400);
        try {
            const s = await getSigner();
            const c = urlEncodeUnicode(body);
            const check = s.signature(ts, uri, c);
            return json({ check });
        } catch (err) {
            return json({ error: String(err && err.message || err) }, 500);
        }
    },
};

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
}
