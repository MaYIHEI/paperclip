# 📎 paperclip

小程序签到 & 代理重写脚本合集 · Loon / Surge / Quantumult X / Stash

> 把零散的脚本夹在一起。

---

## 📂 目录

| 目录 | 内容 | 索引 |
|---|---|---|
| [`miniprogram/`](./miniprogram/) | 微信小程序签到、自动化脚本 | [查看](./miniprogram/README.md) |
| [`app/`](./app/) | 原生 APP 签到、自动化脚本 | [查看](./app/README.md) |
| [`proxy/`](./proxy/) | 通用代理重写规则、Hostname、URL Filter | [查看](./proxy/README.md) |
| [`loon/`](./loon/) | Loon 专用 `.plugin` 文件 | [查看](./loon/README.md) |
| [`surge/`](./surge/) | Surge 专用 `.sgmodule` 文件 | [查看](./surge/README.md) |

每个子目录的 README 里有该类下所有脚本的清单、引用地址、使用说明。

---

## 🚀 通用引用方式

所有脚本均通过 GitHub Raw URL 引用,格式:

```
https://raw.githubusercontent.com/MaYIHEI/paperclip/main/<分类>/<脚本名>/<脚本名>.<ext>
```

具体每个脚本的重写规则与 cron 配置,请进入对应子目录的 README 查看。

---

## 🤝 贡献规范

新增脚本请遵循 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 中的"一脚本一文件夹"规范。
里面提供了完整的脚本 README 模板,直接复制填空即可。

---

## 🛠 脚本来源与改造

本仓库部分脚本基于社区开源项目改造,**版权归原作者所有**,本人仅做适配性维护与修复。
修改内容主要包括:

- 适配最新版小程序接口与鉴权方式
- 修复因小程序版本升级导致的失效问题
- 统一代码风格与日志输出

每个脚本头部 `@Author` / `@Modifier` 注释中标注了原作者与本仓库修改记录。

如原作者认为本仓库的修改方式不妥或希望下架相关脚本,请通过 GitHub Issue 联系,本人将立即处理。

---

## ⚠️ 免责声明

详见 [`DISCLAIMER.md`](./DISCLAIMER.md)。

简言之:本仓库脚本仅供学习研究使用,使用者需自行评估风险并承担全部责任。

---

## 📄 License

[MIT](./LICENSE)
