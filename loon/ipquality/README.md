# 节点 IP 质量检测

> 🧪 待验证

在 Loon 的节点或策略组页面生成对齐 VPS `IP.Check.Place` / `xykt/IPQuality` 口径的节点 IP 质量报告。报告针对手机弹窗采用单列卡片排版，展示基础网络信息、多源原始风险、风险标记，以及常见流媒体和 AI 服务可用性。

## 文件

- `ipquality.js` — Loon `generic` 交互脚本
- `ipquality.lpx` — 一键导入插件

## 使用步骤

1. 在 Loon 中导入插件：

   `https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality/ipquality.lpx`

2. 进入节点或策略组页面，对目标运行「节点 IP 质量检测」
3. 等待检测结果弹窗

插件参数：

- `MaskIP`：截图分享时隐藏 IP 后半段，默认关闭
- `MediaTest`：检测流媒体与 AI 服务，默认开启

## Loon

```ini
[Script]
generic script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality/ipquality.js, tag=节点 IP 质量检测, timeout=50, img-url=shield.lefthalf.filled.system, enable=true
```

## 检测项目

- 基础信息：IP、ASN、组织、坐标、地图、城市、使用地、注册地、时区，以及按 MaxMind 使用地/注册地比较得到的原生或广播属性
- 类型属性：IPinfo、ipregistry、ipapi、IP2Location、AbuseIPDB 的使用类型和公司类型
- 风险评分：IPPure、ipapi、IP2Location、Scamalytics、AbuseIPDB、IPQS、DB-IP 的原始值及 VPS 同款分档
- 风险因素：IP2Location、ipapi、ipregistry、IPQS、Scamalytics、ipdata、IPinfo、DB-IP 的代理、Tor、VPN、机房、滥用、机器人等明确字段
- 服务可用性：TikTok、Disney+、Netflix、YouTube、Prime Video、Reddit、ChatGPT；同时显示地区和判定依据
- 数据完整性：多站点探测出口 IP 一致性，并显示成功、失败的数据来源

## 数据真实性

- 所有查询请求都指定当前选中的 Loon 节点
- MaxMind 与受保护数据库优先使用 `ipinfo.check.place` 的同源聚合结果，公开站点保留直连；IP2Location 聚合失败时回退到公开页面
- 每个评分和风险标记均保留来源，不生成自创的综合分
- 只有服务响应中存在明确支持状态、地区字段或测试资源可访问证据时，才报告解锁
- 接口失败、字段缺失或出口不一致时不会按低风险或已解锁处理
- 不可用字段不生成空行；失败来源集中列在“数据状态”
- 不同数据库互相矛盾时原样展示，不替用户选择结论
- `ISP`、`MOB`、`DCH` 等类型名称与风险阈值跟随 `xykt/IPQuality`，避免另造一套社区不认可的标准

## 维护记录

- 2026-07-19：r4 恢复 VPS 同源后端以补齐 MaxMind、IP2Location、Scamalytics、AbuseIPDB、IPQS、ipdata；类型名称、风险阈值和原生/广播口径对齐 `xykt/IPQuality`；去除重复标题并重做移动端信息层级
- 2026-07-19：r3 移除失效的聚合后端依赖，改为 8–9 个独立直连来源；桌面多列表格改为手机单列卡片，隐藏空字段
- 2026-07-18：r2 按 VPS 报告结构重构，增加类型/风险矩阵、判定依据和数据完整性审计
- 2026-07-18：r1 初版，进入 testing

## 已知限制

- 检测会把节点出口 IP 发送给所列第三方查询服务；介意时请勿使用
- 各数据库的更新时间、口径和评分标准不同，结果可能互相矛盾
- 第三方页面或接口限流、改版时会列入失败来源，不代表低风险
- `ipinfo.check.place` 是第三方聚合服务；不可用时公开来源仍可显示，但 MaxMind、Scamalytics、AbuseIPDB、IPQS、ipdata 等受保护字段可能缺失
- Loon 脚本环境不提供原始 TCP/socket，无法复现 VPS 的 25 端口出站检测
- Loon `generic` 不提供节点 DNS 查询 API，无法等价复现 400+ DNSBL，也不能可靠区分“原生/DNS”解锁方式
- 公共 DoH 容易被名单服务拒绝或产生误报，因此不会用它冒充 VPS 本机 `dig`
- 流媒体检测只能反映运行当时的网络响应，不能代替账号实际播放测试

## 致谢

- [Roddy-D 的 Loon 节点质量查询插件](https://github.com/Roddy-D/Loon_plugins)
- [xykt 的 IPQuality](https://github.com/xykt/IPQuality)
