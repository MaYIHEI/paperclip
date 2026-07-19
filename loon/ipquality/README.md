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
- `MapNotification`：检测完成后发送可点击通知，并在系统 Apple 地图中定位出口坐标，默认关闭

## Loon

```ini
[Script]
generic script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality/ipquality.js, tag=节点 IP 质量检测, timeout=50, img-url=shield.lefthalf.filled.system, enable=true
```

## 检测项目

- 基础信息：IP、ASN、组织、坐标、城市、使用地、注册地、时区，以及按 MaxMind 使用地/注册地比较得到的原生或广播属性；可选通过系统 Apple 地图定位坐标
- 类型属性：IPinfo、ipregistry、ipapi、IP2Location、AbuseIPDB 的使用类型和公司类型
- 风险评分：IPPure、ipapi、IP2Location、Scamalytics、AbuseIPDB、IPQS、DB-IP 的原始值及 VPS 同款分档
- 风险因素：IP2Location、ipapi、ipregistry、IPQS、Scamalytics、ipdata、IPinfo、DB-IP 的代理、Tor、VPN、机房、滥用、机器人等明确字段
- 服务可用性：TikTok、Disney+、Netflix、YouTube、Prime Video、Reddit、ChatGPT；同时显示地区和判定依据
- 数据完整性：多站点探测出口 IP 一致性，并显示成功、失败的数据来源

## 数据真实性

- 出口探针、IPPure 和要求“查询 IP 必须等于请求来源”的受保护聚合接口使用当前 Loon 节点；聚合接口的检测 IP 取自其 Cloudflare Trace，不再用其他域名猜测，并对出口瞬时变化造成的 403 做有限重试
- 支持明确指定目标 IP 的公开数据库使用 `DIRECT` 查询，并核对响应 IP，减少节点分流、限流和反爬造成的缺失
- MaxMind 与受保护数据库优先使用 `ipinfo.check.place` 的同源聚合结果，公开站点保留直连；IP2Location 聚合失败时回退到公开页面
- IPPure 不支持指定目标 IP；若它走了不同出口，结果会作为补充来源保留并明确标注“分流出口”及对应 IP，不计入主报告来源成功数，也不会影响主报告颜色
- 同源聚合请求使用与 VPS `curl` 客户端一致的 JSON 请求头，避免移动端浏览器 UA 被服务端拦截
- 每个评分和风险标记均保留来源，不生成自创的综合分
- 位置基础信息整组选用同一数据库，优先 MaxMind、缺失时依次降级；ASN 与组织作为一组独立网络身份选用明确返回 ASN 的来源，仍缺失时调用 Loon 自带 `ipasn/ipaso`，并在来源行标注
- `原生 IP / 广播 IP` 只比较该基础来源内的使用地与注册地，不跨库拼接；来源不同时宁可不下结论
- 多字段布尔结果只有“任一明确为真”或“全部明确为假”才下结论；部分字段缺失时保留未知，不当作未命中
- IP2Location 聚合失败时，网页回退只使用页面明确返回的类型、评分和总代理状态，不反推 VPN、机房等细分字段
- ipregistry 使用与 VPS 脚本一致的 JSON API 字段；响应中带有 IP 时会核对是否等于当前检测目标
- 只有服务响应中存在明确支持状态、地区字段或测试资源可访问证据时，才报告解锁
- 接口失败、字段缺失或出口不一致时不会按低风险或已解锁处理
- 不可用字段不生成空行；失败来源集中列在“数据状态”
- 不同数据库互相矛盾时原样展示，不替用户选择结论
- `ISP`、`MOB`、`DCH` 等类型名称与风险阈值跟随 `xykt/IPQuality`，避免另造一套社区不认可的标准

## 维护记录

- 2026-07-19：r8 ASN/组织改为独立选择完整网络来源，并增加 Loon 内置 `ipasn/ipaso` 兜底；地图通知改为系统 Apple 地图；IPPure 对齐参考插件的空请求头访问方式，增加响应校验与三次重试
- 2026-07-19：r7 改用 `ipinfo.check.place/cdn-cgi/trace` 识别聚合后端当前看到的出口，并对后续 403 做有限重试；IPPure 分流结果改为带出口 IP 的补充来源；Scamalytics 增加经所选节点访问官网的严格校验回退。若负载均衡策略每条连接持续更换出口，受保护来源仍可能无法返回
- 2026-07-19：r6 增加 `myip.check.place` 同源出口探针，受保护数据库使用该出口作为检测目标；可指定 IP 的公开数据库改为 `DIRECT` 查询。IPQS 上游额度耗尽时明确标记为跳过，不再冒充普通请求失败
- 2026-07-19：r5 根据真机渲染限制移除依赖 `flex`、圆角和半透明背景的网页式卡片，改用 Loon 稳定支持的富文本层级；增加顶部呼吸区，重做摘要、字段换行、分区间距与底部安全区。同步修复未知布尔假阴性、基础信息跨库合成、IP2Location 回退推导、IP2Location 类型映射和 ipregistry HTML 解析等真实性问题
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
- 当前出口发现优先 IPv4；Loon 单次 generic 报告尚未像 VPS 脚本一样分别输出 IPv4 与 IPv6 两套结果

## 致谢

- [Roddy-D 的 Loon 节点质量查询插件](https://github.com/Roddy-D/Loon_plugins)
- [xykt 的 IPQuality](https://github.com/xykt/IPQuality)
