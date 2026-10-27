# 签到状态协议 v1

让不同作者的签到脚本把每次运行结果写成同一种格式，签到汇总通知、桌面小组件等读取方只要认这一种格式，就能统一显示每个脚本的状态、奖励和资产数值。

适用于 Loon / Surge / Quantumult X / Stash：数据都放在代理工具的持久化存储里（`$persistentStore` / `$prefs`），BoxJS 也能直接读到。

## 1. 结果记录

每个脚本用**自己的一个 key** 保存最近一次结果，建议命名 `<脚本 id>_status`。值是 JSON 字符串：

```json
{"v":1,"s":"ok","t":1793080800000,"msg":"签到成功 +2 积分","asset":"积分 120","name":"味多美","author":"MaYIHEI"}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `v` | 是 | 协议版本，固定 `1` |
| `s` | 是 | 状态：`ok` 成功（含今日已签）/ `cookie` 需重新抓取 Cookie / `fail` 其他失败 / `none` 未使用（没抓过 Cookie、没配账号） |
| `t` | 是 | 写入时间，毫秒时间戳 |
| `msg` | 是 | 成功写奖励（如 `+2 积分`、`今日已签到`），失败写原因；建议 100 字以内 |
| `asset` | 否 | 资产数值短串，如 `积分 735`、`余额 ¥12.30`；只填签到流程里本来就拿到的数 |
| `name` | 否 | 显示名 |
| `author` | 否 | 作者 |

- 每次运行**整条覆盖**，只保留最近一次。
- 读取方遇到没有 `v` 的旧记录（`{s,t,msg}`）按 v1 处理。
- 想让读取方暂时不显示某条结果（例如刚抓到新 Cookie、还没签到验证），把 key 写成空字符串即可。

## 2. 登记索引

公共 key `checkin_registry`，值是 JSON 对象，按结果记录的 key 索引：

```json
{
  "wedome_status": {"name":"味多美","author":"MaYIHEI"},
  "foo_status": {"name":"某某签到","author":"someone","url":"https://example.com/foo.js"}
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 显示名 |
| `author` | 是 | 作者 |
| `url` | 否 | 脚本地址或主页 |

- 脚本写结果时，如果自己不在索引里，就**读出 → 加上自己 → 写回**，写完再读一次确认；没写上（比如两个脚本同时写互相覆盖）就等下次运行再补。
- 已经在索引里就不再写，重复登记是幂等的。
- 只增不删：别动别人的条目。

## 3. 接入片段

复制下面这个函数到脚本里（不依赖 Env.js，四个工具通用），在拿到签到结果的地方调用：

```js
// 签到状态协议 v1:写本次结果,并把自己登记进公共索引 checkin_registry(Loon/Surge/QX/Stash 通用,不依赖 Env)
function checkinReport(key, rec, info) {
    const read = (k) => (typeof $prefs !== "undefined" ? $prefs.valueForKey(k) : $persistentStore.read(k));
    const write = (v, k) => (typeof $prefs !== "undefined" ? $prefs.setValueForKey(v, k) : $persistentStore.write(v, k));
    const registry = () => { try { return JSON.parse(read("checkin_registry") || "{}") || {}; } catch (e) { return {}; } };
    write(JSON.stringify(Object.assign({ v: 1, t: Date.now(), name: info.name, author: info.author }, rec)), key);
    const reg = registry();
    if (reg[key]) return;
    reg[key] = info;
    write(JSON.stringify(reg), "checkin_registry");
    if (!registry()[key]) console.log(`[checkin] ${key} 登记没写上,下次运行再补`);
}
```

调用示例：

```js
const INFO = { name: "某某签到", author: "someone" };

checkinReport("foo_status", { s: "ok", msg: "签到成功 +5 积分", asset: "积分 735" }, INFO);
checkinReport("foo_status", { s: "cookie", msg: "登录已过期" }, INFO);
checkinReport("foo_status", { s: "fail", msg: "网络错误" }, INFO);
checkinReport("foo_status", { s: "none", msg: "未抓取 Cookie" }, INFO);
```

## 4. 读取方

1. 读 `checkin_registry`，得到所有登记过的 key；
2. 逐个读 key，解析 JSON，空值或解析失败视为没有记录；
3. 用 `t` 判断是不是今天的结果，非今天的建议标上日期。

在 BoxJS 里，这些 key 都可以通过 `/query/data/<key>` 读取。
