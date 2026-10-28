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
  "dreame_status": {"name":"追觅","author":"MaYIHEI","run":"http://1.1.1.1/checkin/dreame","open":"https://apps.apple.com/app/id1564419343"},
  "foo_status": {"name":"某某签到","author":"someone","url":"https://example.com/foo.js"}
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 显示名 |
| `author` | 是 | 作者 |
| `url` | 否 | 脚本地址或主页 |
| `run` | 否 | 补签入口地址，见第 4 节；没有就表示不支持现跑 |
| `open` | 否 | 「打开 App」跳转地址，方便用户重新抓 Cookie：优先 App 的 URL scheme，其次 App Store 链接 `https://apps.apple.com/app/id<数字>`，网页类填网址，小程序填 `weixin://`（需要手动进入对应小程序）；核实不了就不填 |

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

## 5. 数据地址（可选，Loon）

`http://1.1.1.1/checkin/all` 一次返回全部数据，读取方（如桌面小组件）不用逐个 key 去读：

```json
{"v":1,"t":1793154646718,"registry":{...checkin_registry 原样...},"status":{"<状态 key>":{...该 key 的状态记录...}}}
```

- `status` 包含索引里登记的所有 key（不论作者），没有值的 key 不出现；只读，不跑签到，不发通知。
- `all` 不是任何脚本的 id，和各脚本的 `checkin/<id>` 规则不会冲突。

插件规则（实现见签到汇总脚本里的 `$request` 分支）：

```ini
[Script]
request if ${url} ~= /^http:\/\/1\.1\.1\.1\/checkin\/all(\?|$)/i then script("<签到汇总脚本地址>") with tag="签到数据", timeout=10
```

其他工具：

- **Surge**：http-request 脚本同样支持 `$done({response: {status, headers, body}})`，数据地址和补签入口的脚本可以原样使用，只是规则要写成 Surge 格式，例如 `签到数据 = type=http-request,pattern=^http:\/\/1\.1\.1\.1\/checkin\/all,script-path=<签到汇总脚本地址>,timeout=10`。没有实测。
- **Stash**：兼容 Surge 风格的请求脚本，按理可以用，但没有实测，这里不给配置。
- **Quantumult X**：直接返回响应要用 `script-echo-response`，`$done` 的格式也和 Loon / Surge 不一样（`{status: "HTTP/1.1 200 OK", headers, body}`），现在的脚本不能直接用。

## 6. 读取方

1. 读 `checkin_registry`，得到所有登记过的 key；
2. 逐个读 key，解析 JSON，空值或解析失败视为没有记录；
3. 用 `t` 判断是不是今天的结果，非今天的建议标上日期；
4. 有 `exp` 时可以提示凭证快过期；有 `run` 时可以提供补签按钮，请求后用返回的 JSON 直接刷新；有 `open` 时可以提供「打开 App」按钮。

用 Loon 时也可以直接请求第 5 节的数据地址，一次拿全。

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
| 名创优品 `miniso` | 抓到的 skey（JWT） |

带 `asset` 的脚本：

| 脚本 | asset | 来源 |
|---|---|---|
| 追觅 `dreame` | `积分 735` | 积分查询 |
| 灵狐灵购 `linghu` | `积分 N` | 积分查询（与追觅同一套接口） |
| 一点万象 `newmixc` | `积分 N` | 签到状态里的积分余额 |
| 味多美 `wedome` | `积分 N` | 签到前后本来就查的积分 |
| 北京华联 `bhg` / 龙德广场 `longde` | `积分 N` | 会员信息里的积分余额 |
| 途虎养车 `tuhu` | `积分 N` | 积分查询（单账号时） |
| 中国移动 `cmcc` | `积分 N` | 积分查询（单账号时） |
| 网上国网 `sgcc` | `签到金 N` | 签到金余额查询 |
| 听听FM `tingtingfm` | `金币 N` | 金币查询 |
| 名创优品 `miniso` | `mini币 N` | mini币余额查询 |
| 林里 `linli` | `鸭币 N` | 积分商城商品详情里的当前鸭币 |
| 海底捞 `haidilao` | `碎片 N` | 碎片总数查询（单账号时） |
| 百度网盘 `baidunetdisk` | `成长值 N` | 会员成长值查询 |
| NodeSeek `nodeseek` | `鸡腿 N` | 签到返回的当前鸡腿 |
| AgentRouter `agentrouter` | `余额 $12.30` | 余额查询（单账号时；没有换算比例时为 `额度 N`） |

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

`open` 地址（App Store 编号都用 Apple 官方查询接口 `itunes.apple.com/lookup` 核实过名称、开发商和 bundle id；仓库里没有现成的 URL scheme 依据，所以 App 一律用 App Store 链接）：

| 脚本 | open | 依据 |
|---|---|---|
| 小米有品 `youpin` | `https://apps.apple.com/app/id1212182562` | App Store「小米有品」，com.xiaomi.youpin |
| 一点万象 `newmixc` | `https://apps.apple.com/app/id1142151719` | App Store「一点万象」，com.crland.newMixc |
| 追觅 `dreame` | `https://apps.apple.com/app/id1564419343` | App Store「DREAME」（追觅生活），com.dreame.smarthome；脚本基于其 2.x 版本 |
| 徕芬 `laifen` | `https://apps.apple.com/app/id6463205325` | App Store「徕芬」，开发商 Shenzhen Shuye，和脚本的 shuye.com 接口一致 |
| 小米抽奖 `milottery` | `https://apps.apple.com/app/id1024958046` | 活动在小米商城 App 里，App Store「小米商城」，com.xiaomi.mishop |
| 小米商城 `mishop` | `https://apps.apple.com/app/id1024958046` | 同上 |
| 万达电影 `wanda` | `https://apps.apple.com/app/id517644732` | App Store「万达影城」，com.wandafilm.appname，和脚本的 wandafilm.com 接口一致 |
| QQ 音乐 `qqmusic` | `https://apps.apple.com/app/id414603431` | App Store「QQ音乐」，com.tencent.QQMusic |
| 123社区 `pan1` | `https://pan1.me` | 网页登录抓取，网址取自脚本 |
| 中国移动 `cmcc` | `https://apps.apple.com/app/id583700738` | App Store「中国移动（手机营业厅）」，cn.10086.app |
| 听听FM `tingtingfm` | `https://apps.apple.com/app/id885422779` | App Store「听听FM」，com.tingting.fm |
| 米游社 `mihoyo` | `https://apps.apple.com/app/id1470182559` | App Store「米游社」，com.miHoYo.mhybbs |
| WPS `wps` | `https://apps.apple.com/app/id599852710` | App Store「WPS Office」，com.kingsoft.www.office.wpsoffice |
| 腾讯视频 `tenvideo` | `https://apps.apple.com/app/id458318329` | App Store「腾讯视频」，com.tencent.live4iphone |
| 小黑盒 `heybox` | `https://apps.apple.com/app/id1244505010` | App Store「小黑盒」，com.max.xiaoheihe |
| 灵狐灵购 `linghu` | `https://apps.apple.com/app/id6753839135` | App Store「灵狐灵购」，com.dreame.yx |
| 龙湖天街 App `lhtj_app` | `https://apps.apple.com/app/id6636468806` | App Store「龙湖」，com.longfor.supera，官方描述写明涵盖龙湖天街会员服务 |
| 百度网盘 `baidunetdisk` | `https://apps.apple.com/app/id547166701` | App Store「百度网盘」，com.baidu.netdisk |
| NodeSeek `nodeseek` | `https://www.nodeseek.com` | 网页登录抓取，网址取自脚本 README |
| 扫描全能王 `camscanner` | `https://apps.apple.com/app/id388627783` | App Store「扫描全能王」，com.intsig.CamScannerLite |
| 微博超话 `weibotalk` | `https://apps.apple.com/app/id350962117` | App Store「微博」，com.sina.weibo |
| 海底捞、味多美、惠省红包墙、龙湖天街（小程序）、北京华联、途虎养车、名创优品、龙德广场、林里、泡泡玛特 | `weixin://` | 微信小程序，打开微信后需要手动进入对应小程序 |
| 网上国网 `sgcc`、AgentRouter `agentrouter` | 不填 | 用账号密码自动登录，不需要重新抓 Cookie |
