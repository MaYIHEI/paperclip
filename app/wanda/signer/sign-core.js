/**
 * 万达签名核心(wasm-bindgen glue + urlEncodeUnicode)。
 * 不导入 wasm,供 worker.js 与本地 node 测试共用。
 */

// ---- wasm-bindgen glue (从小程序 wasm/index.js 还原的精简版) ----
function createSigner(wasm) {
    let e; // wasm exports
    const heap = new Array(128).fill(undefined);
    heap.push(undefined, null, true, false);
    let heapNext = heap.length;
    const dec = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    dec.decode();
    const enc = new TextEncoder('utf-8');
    let u8 = null, i32 = null, wlen = 0;

    const getU8 = () => (u8 === null || u8.byteLength === 0) ? (u8 = new Uint8Array(e.memory.buffer)) : u8;
    const getI32 = () => (i32 === null || i32.byteLength === 0) ? (i32 = new Int32Array(e.memory.buffer)) : i32;
    const getObj = (i) => heap[i];
    const dropObj = (i) => { if (i >= 132) { heap[i] = heapNext; heapNext = i; } };
    const takeObj = (i) => { const v = getObj(i); dropObj(i); return v; };
    const addObj = (v) => {
        if (heapNext === heap.length) heap.push(heap.length + 1);
        const i = heapNext; heapNext = heap[i]; heap[i] = v; return i;
    };
    const readStr = (ptr, len) => { ptr >>>= 0; return dec.decode(getU8().subarray(ptr, ptr + len)); };
    const encInto = (typeof enc.encodeInto === 'function')
        ? (s, view) => enc.encodeInto(s, view)
        : (s, view) => { const t = enc.encode(s); view.set(t); return { read: s.length, written: t.length }; };

    function writeStr(s, malloc, realloc) {
        if (realloc === undefined) {
            const buf = enc.encode(s);
            const ptr = malloc(buf.length, 1) >>> 0;
            getU8().subarray(ptr, ptr + buf.length).set(buf);
            wlen = buf.length;
            return ptr;
        }
        let len = s.length, ptr = malloc(len, 1) >>> 0;
        const mem = getU8(); let k = 0;
        for (; k < len; k++) { const c = s.charCodeAt(k); if (c > 127) break; mem[ptr + k] = c; }
        if (k !== len) {
            if (k !== 0) s = s.slice(k);
            ptr = realloc(ptr, len, len = k + 3 * s.length, 1) >>> 0;
            const view = getU8().subarray(ptr + k, ptr + len);
            k += encInto(s, view).written;
        }
        wlen = k;
        return ptr;
    }

    function guard(fn, args) {
        try { return fn.apply(null, args); } catch (err) { e.__wbindgen_exn_store(addObj(err)); }
    }

    const imports = { wbg: {} };
    imports.wbg.__wbindgen_object_drop_ref = (i) => { takeObj(i); };
    imports.wbg.__wbindgen_string_new = (p, l) => addObj(readStr(p, l));
    imports.wbg.__wbg_log_1d3ae0273d8f4f8a = () => {};
    // wasm 内部硬校验运行环境 appId,必须返回小程序的 appId 才走真算法分支
    imports.wbg.__wbg_getAccountInfoSync_ffd24ea7251be69a = () =>
        addObj({ miniProgram: { appId: 'wx6718e4b1e9cce6b2', envVersion: 'release', version: '6.5.3' } });
    imports.wbg.__wbg_is_205d914af04a8faa = (a, b) => Object.is(getObj(a), getObj(b));
    imports.wbg.__wbindgen_is_string = (i) => typeof getObj(i) === 'string';
    imports.wbg.__wbg_get_97b561fb56f034b5 = function () {
        return guard((a, b) => addObj(Reflect.get(getObj(a), getObj(b))), arguments);
    };
    imports.wbg.__wbindgen_debug_string = (ret, i) => {
        const ptr = writeStr(String(getObj(i)), e.__wbindgen_malloc, e.__wbindgen_realloc);
        getI32()[ret / 4 + 1] = wlen; getI32()[ret / 4 + 0] = ptr;
    };
    imports.wbg.__wbindgen_throw = (p, l) => { throw new Error(readStr(p, l)); };

    function bindExports(exports) { e = exports; u8 = null; i32 = null; return e; }

    // signature(ts, uri, c) -> 32 hex
    function signature(ts, uri, c) {
        let r0, r1;
        try {
            const sp = e.__wbindgen_add_to_stack_pointer(-16);
            const p0 = writeStr(ts, e.__wbindgen_malloc, e.__wbindgen_realloc), l0 = wlen;
            const p1 = writeStr(uri, e.__wbindgen_malloc, e.__wbindgen_realloc), l1 = wlen;
            const p2 = writeStr(c, e.__wbindgen_malloc, e.__wbindgen_realloc), l2 = wlen;
            e.signature(sp, p0, l0, p1, l1, p2, l2);
            r0 = getI32()[sp / 4 + 0]; r1 = getI32()[sp / 4 + 1];
            return readStr(r0, r1);
        } finally {
            e.__wbindgen_add_to_stack_pointer(16);
            e.__wbindgen_free(r0, r1, 1);
        }
    }

    return { imports, bindExports, signature };
}

// 万达 urlEncodeUnicode —— 签名 body 的规范化(与小程序 MxApiHelper.urlEncodeUnicode 逐字对齐)
function urlEncodeUnicode(s) {
    if (typeof s !== 'string') s += '';
    const isSafe = (c) =>
        (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') ||
        c === "'" || c === '(' || c === ')' || c === '*' || c === '-' ||
        c === '.' || c === '_' || c === '!';
    const hex = (n) => n <= 9 ? String.fromCharCode(n + 48) : String.fromCharCode(n - 10 + 97);
    const out = [];
    for (let i = 0; i < s.length; i++) {
        const ch = s.charAt(i), n = s.charCodeAt(i);
        if (n > 0 && n < 128) {
            if (isSafe(ch)) out.push(ch);
            else if (ch === ' ') out.push('+');
            else { out.push('%'); out.push(hex(n >> 4 & 15)); out.push(hex(15 & n)); }
        } else {
            out.push('%u'); out.push(hex(n >> 12 & 15)); out.push(hex(n >> 8 & 15));
            out.push(hex(n >> 4 & 15)); out.push(hex(15 & n));
        }
    }
    return out.join('');
}

export { createSigner, urlEncodeUnicode };
