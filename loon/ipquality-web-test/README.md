# 节点 IP 质量检测 · 网页测试

> 🧪 待验证 · 仅支持 Loon 3.5.1(979)+

独立验证“检测一次、Safari 打开本地网页报告”的可行性。现有 `loon/ipquality` 不受影响。

## 使用

导入测试插件：

`https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/ipquality-web-test/ipquality-web-test.lpx?v=poc1`

在插件设置中开启需要的报告分区，然后在节点页面运行“节点 IP 质量检测 · 网页测试”。检测完成后，点击通知进入 Safari 查看完整报告。

报告通过 `http://paperclip.test/ipquality` 虚拟地址读取本机缓存，由 Loon 请求脚本直接返回 HTML，不会访问真实报告服务器。缓存有效期提示为 30 分钟；重新检测会覆盖上一份报告。

## 测试重点

- 通知能否正常打开 Safari。
- 虚拟地址是否被 Loon 稳定拦截并返回报告。
- 完整报告是否显示正常，长页面滑动是否顺畅。
- 浅色、深色模式及折叠分区是否正常。

这是独立 PoC。检测逻辑固定复用 `loon/ipquality` r32 的提交版本，不作为正式插件发布。
