# 节点 IP 质量检测 · 模块化网页测试

> 🧪 待真机验证 · Loon 3.5.1(979)+

独立验证“节点页启动器 + Rewrite v2 本地网页 + 按需检测接口”的方案。现有 `loon/ipquality` 不受影响。

## 使用

导入测试插件：

`https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality-web-test/ipquality-web-test.lpx?v=poc4`

在节点或策略组页面运行“节点 IP 质量检测 · 模块化网页测试”，再点击通知进入 Safari。网页内选择需要的项目并开始检测。

## 实现

- 启动器只保存本次检测 ID、目标节点与时间，不执行检测。
- 报告外壳使用 Rewrite v2 `response.body.mock_file("html", ...)`，不连接真实报告服务器。
- 15 个检测项目对应 15 个本地 GET 接口；固定 `argument="模块名"`，不依赖插件参数插值。
- 每个接口恢复节点页保存的目标节点，复用固定 r32 检测逻辑，并由其 `$httpClient` 显式绑定该节点。
- 网页最多并发两个模块，关闭的项目完全不请求；每项独立显示成功、失败、耗时和完整报告。
- 选中状态只保存在 Safari 本地，30 分钟后检测会话失效。

## 当前边界

这是架构 PoC。每个模块暂时独立执行一次 r32，因此同时开启很多项目会重复请求基础来源；真机确认方案可行后，再拆出共享基础数据和模块专用探测，减少重复请求与 API 限流。
