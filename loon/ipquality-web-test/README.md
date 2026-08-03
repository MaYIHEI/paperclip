# 节点 IP 质量检测 · Rewrite v2 网页测试

> 🧪 待验证 · 仅支持 Loon 3.5.1(979)+

独立验证“完整检测结果通过 Rewrite v2 本地 Mock 网页，并在 Safari 展示”的可行性。现有 `loon/ipquality` 不受影响。

## 使用

导入测试插件：

`https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality-web-test/ipquality-web-test.lpx?v=poc2`

在插件设置中开启需要的报告分区，然后在节点页面运行“节点 IP 质量检测 · 网页测试”。检测完成后，点击通知进入 Safari 查看完整报告。

## 实现范围

- 插件选项使用最新版 `[Argument]`、`switch` 和 `argument=[{参数}]`。
- 本地页面使用 Rewrite v2 的 `response if … then response.body.mock("html", …)`。
- 同一条 Rewrite 追加 Content-Type、Cache-Control、CSP 和 nosniff Header Action。
- 检测结果经 UTF-8、LZW 和 Base64URL 压缩后放在 URL Fragment；Fragment 不会发送给 HTTP 请求。
- 页面载入后把数据保存在当前 Safari 会话，并立即从地址栏移除 Fragment。
- 虚拟地址为 `http://paperclip.test/ipquality`，Mock 在请求发往上游前生成响应，不连接真实报告服务器。

检测逻辑固定复用 `loon/ipquality` r32 提交 `eaa04fe0a9f37ccfafdd11930d28fd5ff3f04718`，本 PoC 不作为正式插件发布。

## 测试重点

- 19 个 `switch` 参数是否正确传入 generic 脚本。
- 通知能否正常打开 Safari。
- Rewrite v2 是否稳定 Mock HTML，且请求没有发往外部网络。
- 报告能否正确解压，完整字段与样式是否正常。
- 完整报告的滚动是否比 Loon 长弹窗顺畅。
- 浅色、深色模式和折叠分区是否正常。
