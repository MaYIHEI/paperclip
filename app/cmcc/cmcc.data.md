# 中国移动 · 账号数据模块（`cmcc.data.js`）

给**小组件 / 只读展示**用的模块：用已登录的凭证刷新会话，返回当前账号的
**积分 / 话费余额 / 本月消费 / 套餐流量·语音·短信余量 / 用户信息**。
不签到、不下单、不改任何账号数据，只读。

## 一、需要凭证（信封）

凭证由中国移动签到脚本抓取一次后**长期有效、自动续期、免短信**，存在 BoxJS：

- `loginEnvelope`（BoxJS 键 `cmcc_login`）— 登录凭证，刷新会话用。**必需**。
- `bizEnvelope`（BoxJS 键 `cmcc_score`）— 查询凭证，**可选**；不传就自动从登录凭证合成，一份查全部数据项。

> 获取方式：在 paperclip 的「中国移动」脚本（`app/cmcc/cmcc.js` + 对应 Loon/Surge 插件）里**冷启动打开一次**中国移动 APP，脚本把凭证存进 BoxJS。小组件从 BoxJS 读 `cmcc_login` 即可查询（只读这一个就够），不需要账号密码、不需要点签到、不需要每次登录。

## 二、调用

```js
const { getAccountData } = require("./cmcc.data.js");

const data = await getAccountData({
  loginEnvelope,   // 字符串，必需（BoxJS cmcc_login）
  // bizEnvelope,  // 可选；不传自动从 loginEnvelope 合成
  request,         // 由你的运行时提供，见下
  want: ["points", "fee", "flow", "user"], // 可选，默认全要
});
```

### `request`：由调用方注入的 HTTPS 发送函数

模块不绑定任何框架，网络请求由你的运行时实现并注入：

```js
// 返回 Promise<{ status, headers, body }>；body 为响应原文字符串
async function request({ url, method, headers, body }) { /* ... */ }
```

- Scripting / Scriptable：用内置 `Request`，把响应头和 body 文本按上面结构返回
- Node：用 `https`（见仓库里的本地自测脚本）

## 三、返回结构

```jsonc
{
  "ok": true,
  "points": 735,                       // 积分
  "fee": { "balance": 91.9, "consumed": 0, "at": "2026-10-21 20:55:23" }, // 话费余额 / 本月消费
  "flow": {                            // 流量余量（主套餐取第一项）
    "remainGB": 181.58, "usedGB": 14.42, "totalGB": 196,
    "remainMB": 185938,
    "items": [ { "type": "0", "totalMB": 200704, "usedMB": 14766, "remainMB": 185938 }, ... ]
  },
  "user": { "userBrand": "03", "userChannel": "北京移动", "starLevel": "1", "...": "..." },
  "raw": { "points": {...}, "fee": {...}, "flow": {...}, "user": {...} } // 各接口原始返回
}
```

- 某一项查询失败时该项为 `null`，`ok` 变 `false`，错误放在 `errors[项名]`，其余项照常返回。
- `raw` 保留各接口完整返回，字段比上面多，按需自取。
- 流量单位按套餐返回值换算（MB → GB）；多套餐 / 定向流量在 `flow.items` 里逐项列出。

## 四、刷新频率

会话有时效，模块每次调用都会先刷新再查询，适合小组件按刷新周期（如每 30–60 分钟）调用一次。登录凭证长期有效，无需人工干预；万一失效，重新打开一次 APP 让签到脚本补一次凭证即可。
