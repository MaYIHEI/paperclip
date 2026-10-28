# 签到状态协议 v1

让不同作者的签到脚本把每次运行结果写成同一种格式，签到汇总通知、桌面小组件等读取方只要认这一种格式，就能统一显示每个脚本的状态、奖励和资产数值。

适用于 Loon / Surge / Quantumult X / Stash：数据都放在代理工具的持久化存储里（`$persistentStore` / `$prefs`），BoxJS 也能直接读到。

## 1. 结果记录

每个脚本用**自己的一个 key** 保存最近一次结果，建议命名 `<脚本 id>_status`。值是 JSON 字符串：

```json
{"v":1,"s":"ok","t":1793080800000,"msg":"签到成功 +5 积分","asset":"积分 735","exp":1800000000000,"name":"追觅","author":"MaYIHEI"}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `v` | 是 | 协议版本，固定 `1` |
| `s` | 是 | 状态：`ok` 成功（含今日已签）/ `cookie` 需重新抓取 Cookie / `fail` 其他失败 / `none` 未使用（没抓过 Cookie、没配账号） |
| `t` | 是 | 写入时间，毫秒时间戳 |
| `msg` | 是 | 成功写奖励（如 `+2 积分`、`今日已签到`），失败写原因；建议 100 字以内 |
| `asset` | 否 | 资产数值短串，如 `积分 735`、`余额 ¥12.30`；只填签到流程里本来就拿到的数 |
| `exp` | 否 | Cookie / 凭证过期时间，毫秒时间戳；只在脚本手里的数据能算出来时才写（如 JWT 的 `exp`、Set-Cookie 的 Expires / Max-Age），算不出来就不写，不要猜 |
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
  "dreame_status": {"name":"追觅","author":"MaYIHEI","run":"http://1.1.1.1/checkin/dreame"},
  "foo_status": {"name":"某某签到","author":"someone","url":"https://example.com/foo.js"}
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 显示名 |
| `author` | 是 | 作者 |
| `url` | 否 | 脚本地址或主页 |
| `run` | 否 | 补签入口地址，见第 4 节；没有就表示不支持现跑 |

- 脚本写结果时，如果索引里没有自己（或自己那一项过时了），就**读出 → 加上自己 → 写回**，写完再读一次确认；没写上（比如两个脚本同时写互相覆盖）就等下次运行再补。
- 自己那一项和当前要登记的完全一样就不再写，重复登记是幂等的；不一样（比如新加了 `run`）就覆盖自己那一项。
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
    if (JSON.stringify(reg[key]) === JSON.stringify(info)) return;
    reg[key] = info;
    write(JSON.stringify(reg), "checkin_registry");
    if (!registry()[key]) console.log(`[checkin] ${key} 登记没写上,下次运行再补`);
}
```

调用示例：

```js
const INFO = { name: "某某签到", author: "someone" };

checkinReport("foo_status", { s: "ok", msg: "签到成功 +5 积分", asset: "积分 735", exp: 1800000000000 }, INFO);
checkinReport("foo_status", { s: "cookie", msg: "登录已过期" }, INFO);
checkinReport("foo_status", { s: "fail", msg: "网络错误" }, INFO);
checkinReport("foo_status", { s: "none", msg: "未抓取 Cookie" }, INFO);
```

## 4. 补签入口（可选，Loon）

让小组件一键现跑某个脚本的签到：

- 地址统一为 `http://1.1.1.1/checkin/<脚本 id>`，`<脚本 id>` 是状态 key 去掉 `_status`。用 IP、明文 http，不依赖 DNS，也不需要 MITM；请求会被 Loon 的脚本拦下，不会真的发到 1.1.1.1。
- 脚本在登记项里写上 `run`，读取方据此知道能不能补签、该请求哪个地址。
- 请求返回的是这次运行后的状态记录（第 1 节的 JSON），`Content-Type: application/json`。

插件规则（Loon 新语法；每个脚本一条，路径各不相同，所以不会互相抢；同一个地址只会命中一条规则，同一脚本别在两个插件里同时开）：

```ini
[Script]
request if ${url} ~= /^http:\/\/1\.1\.1\.1\/checkin\/foo(\?|$)/i then script("https://example.com/foo.js") with tag="某某补签", timeout=60
```

脚本里加一个触发分支：命中地址时不走抓 Cookie，改走签到流程，结束时把状态记录作为响应返回（以 Env.js 的 `$.done` 为例）：

```js
const CHECKIN_RUN = typeof $request !== "undefined" && /^http:\/\/1\.1\.1\.1\/checkin\//.test($request.url);
if (CHECKIN_RUN) { const end = $.done.bind($); $.done = () => end({ response: { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, body: $.getdata("foo_status") || "{}" } }); }

if (typeof $request !== "undefined" && !CHECKIN_RUN) {
    // 原来的抓 Cookie 分支
} else {
    // 原来的签到流程
}
```

跑一次超过插件 `timeout` 的脚本（多次抽奖、浏览任务要等几十秒、随机签到时间之类）不要提供 `run`。

## 5. 读取方

1. 读 `checkin_registry`，得到所有登记过的 key；
2. 逐个读 key，解析 JSON，空值或解析失败视为没有记录；
3. 用 `t` 判断是不是今天的结果，非今天的建议标上日期；
4. 有 `exp` 时可以提示凭证快过期；有 `run` 时可以提供补签按钮，请求后用返回的 JSON 直接刷新。

在 BoxJS 里，这些 key 都可以通过 `/query/data/<key>` 读取。

## 附：已接入的脚本

签到合集插件里的 33 个脚本都已按本协议写结果。

带 `exp` 的脚本，都取自 Cookie 本身就是 JWT 的 `exp` 字段，JWT 里没有 `exp` 时不写：

| 脚本 | 来源 |
|---|---|
| 追觅 `dreame` | 抓到的 sessid（JWT） |
| 灵狐灵购 `linghu` | 抓到的 sessid（JWT） |
| 北京华联 `bhg` | 抓到的 token（JWT） |
| 龙德广场 `longde` | 抓到的 token（JWT） |
| 泡泡玛特 `ppmt` | 各账号 PopVip-Auth（JWT），取最早过期的 |

没有补签入口（不提供 `run`）的脚本：

| 脚本 | 原因 |
|---|---|
| 小米抽奖 `milottery` | 多次抽奖之间要等待，定时任务给了 6 分钟 |
| QQ 音乐 `qqmusic` | 每日任务、定时金币、红包雨按时段分流，一次要跑很多任务 |
| WPS `wps` | 多个任务之间随机等待 5～10 秒 |
| AgentRouter `agentrouter` | 多账号逐个登录，定时任务给了 5 分钟 |
| 扫描全能王 `camscanner` | 每次抽奖之间等待 4～5 秒，次数不定 |
| 名创优品 `miniso` | 浏览任务每个要等 21～30 秒 |
| 微博超话 `weibotalk` | 按关注的超话逐个签，数量不定 |
| 龙湖天街 App `lhtj_app` | 按当天随机时间签到，没到点会直接退出；签完还要把抽奖次数抽完 |
