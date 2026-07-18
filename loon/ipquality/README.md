# 节点 IP 质量检测

> 🧪 待验证

在 Loon 的节点或策略组页面生成接近 VPS `IP.Check.Place` 的节点 IP 质量报告，完整展开基础网络信息、类型属性、多源风险、风险因素，以及常见流媒体和 AI 服务可用性。

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

- 基础信息：IP、ASN、组织、坐标、地图、城市、使用地、注册地、时区、原生/广播属性和网络类型
- 类型属性：IPinfo、ipregistry、ipapi、IP2Location、AbuseIPDB 的使用类型和公司类型
- 风险评分：IPPure、ipapi、IP2Location、Scamalytics、AbuseIPDB、IPQS、DB-IP 的原始值及各库自身判定
- 风险因素：IP2Location、ipapi、ipregistry、IPQS、Scamalytics、ipdata、IPinfo、DB-IP 的地区、代理、Tor、VPN、服务器、滥用和机器人字段
- 服务可用性：TikTok、Disney+、Netflix、YouTube、Prime Video、Reddit、ChatGPT；同时显示地区和判定依据
- 数据完整性：显示成功、失败的数据源，缺失来源不参与判断

## 数据真实性

- 所有查询请求都指定当前选中的 Loon 节点
- 每个评分和风险标记均保留来源，不生成自创的综合分
- 只有服务响应中存在明确支持状态、地区字段或测试资源可访问证据时，才报告解锁
- 接口失败、字段缺失或出口不一致时显示“未取到/未确认”，不会按低风险或已解锁处理
- 不同数据库互相矛盾时原样展示，不替用户选择结论

## 维护记录

- 2026-07-18：r2 按 VPS 报告结构重构，增加类型/风险矩阵、判定依据和数据完整性审计
- 2026-07-18：r1 初版，进入 testing

## 已知限制

- 检测会把节点出口 IP 发送给所列第三方查询服务；介意时请勿使用
- 各数据库的更新时间、口径和评分标准不同，结果可能互相矛盾
- 第三方页面或接口限流、改版时会显示“未取到”，不代表低风险
- Loon 脚本环境不提供原始 TCP/socket，无法复现 VPS 的 25 端口出站检测
- Loon `generic` 不提供节点 DNS 查询 API，无法等价复现 400+ DNSBL，也不能可靠区分“原生/DNS”解锁方式
- 公共 DoH 容易被名单服务拒绝或产生误报，因此不会用它冒充 VPS 本机 `dig`
- 流媒体检测只能反映运行当时的网络响应，不能代替账号实际播放测试

## 致谢

- [Roddy-D 的 Loon 节点质量查询插件](https://github.com/Roddy-D/Loon_plugins)
- [xykt 的 IPQuality](https://github.com/xykt/IPQuality)
