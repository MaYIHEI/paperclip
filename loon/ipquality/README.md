# 节点 IP 质量检测

> 🧪 待验证

在 Loon 的节点或策略组页面查询所选节点的出口 IP、基础网络信息、多源风险、风险因素，以及常见流媒体和 AI 服务可用性。

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

- 基础信息：IP、ASN、位置、网络类型
- 风险评分：IPPure、ipapi、IP2Location、Scamalytics、AbuseIPDB、IPQS、DB-IP
- 风险因素：代理、Tor、VPN、机房、滥用、机器人、中继等多源标记
- 服务可用性：TikTok、Disney+、Netflix、YouTube、Prime Video、Reddit、ChatGPT

## 维护记录

- 2026-07-18：初版，进入 testing

## 已知限制

- 检测会把节点出口 IP 发送给所列第三方查询服务；介意时请勿使用
- 各数据库的更新时间、口径和评分标准不同，结果可能互相矛盾
- 第三方页面或接口限流、改版时会显示“未取到”，不代表低风险
- Loon 脚本环境不提供原始 TCP/socket，无法复现 VPS 的 25 端口出站检测
- 公共 DoH 查询 DNSBL 容易被名单服务拒绝或产生误报，因此首版不检测黑名单
- 流媒体检测只能反映运行当时的网络响应，不能代替账号实际播放测试

## 致谢

- [Roddy-D 的 Loon 节点质量查询插件](https://github.com/Roddy-D/Loon_plugins)
- [xykt 的 IPQuality](https://github.com/xykt/IPQuality)
