# 节点阻断检测

在 Loon 中检测目标节点的代理出口、本机直连网络，以及节点服务器的多地 TCP 可达性，辅助区分节点正常、疑似被阻断和疑似离线。

## 文件

- `nodecheck.js` — Loon `generic` 交互脚本
- `nodecheck.lpx` — 一键导入插件

## 使用步骤

1. 在 Loon 中导入插件：

   `https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/nodecheck/nodecheck.lpx`

2. 进入节点或策略组页面，对目标节点运行「节点阻断检测」
3. 等待检测结果弹窗

直接对具体节点运行时结果最完整。对策略组运行时，如果 Loon 未提供底层节点地址，脚本仍可检测代理出口，但无法进行远端 TCP 探测。

## Loon

```ini
[Script]
generic script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/nodecheck/nodecheck.js, tag=节点阻断检测, timeout=20, img-url=bolt.horizontal.icloud.fill.system, enable=true
```

## 维护记录

- 2026-07-17：移植 Quantumult X 版本，适配 Loon `generic`、`nodeInfo` 与指定节点请求

## 已知限制

- “疑似被阻断”是交叉探测结论，不是运营商或 GFW 的直接证明
- 远端探测依赖 `check-host.net`；服务不可用时不会把节点误判为离线
- 节点服务器放行代理端口但代理协议自身失效时，远端可能显示可达

## 致谢

基于 [RavelloH 的 Quantumult X 原脚本](https://gist.github.com/RavelloH/383354955aa3800e1d7e98666e11e16f) 改造。
