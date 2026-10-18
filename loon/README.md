# Loon 插件

Loon 专用插件文件,后缀 `.lpx`(Loon Plugin Extension,旧称 `.plugin`,内容格式相同)。

---

## 📜 插件清单

| 插件 | 功能 | 状态 |
|---|---|---|
| [`paperclip-checkin/`](./paperclip-checkin/) | 签到合集:全部在用签到脚本的定时签到 + Cookie 体检,签到开关默认全开,设置在 BoxJS | 🧪 待验证 |
| [`paperclip-cookie/`](./paperclip-cookie/) | 集中抓取全部在用签到脚本的 Cookie(29 个),规则常开,抓完关掉插件;签到用签到合集 | 🧪 待验证 |
| [`nodecheck/`](./nodecheck/) | 在节点/策略组页面检测代理出口、本机网络与远端 TCP 可达性，辅助判断节点阻断或离线 | 🧪 待验证 |
| [`ipquality/`](./ipquality/) | 查询节点出口 IP、多源风险、代理属性及流媒体与 AI 服务可用性 | ✅ 维护中 |
| [`agentrouter`](../app/agentrouter/) | AgentRouter 每日登录签到，插件内配置单账号或多账号 | 🧪 待验证 |

Cookie 抓取合集（testing）:`https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/paperclip-cookie/paperclip-cookie.lpx`

签到合集（testing）:`https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/paperclip-checkin/paperclip-checkin.lpx`

节点阻断检测（testing）:`https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/nodecheck/nodecheck.lpx`

节点 IP 质量检测:`https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/loon/ipquality/ipquality.lpx`

AgentRouter 签到（testing）:[插件地址](https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.lpx)

---

## 添加新插件规范

> 见仓库根目录 [`CONTRIBUTING.md`](../CONTRIBUTING.md)。
