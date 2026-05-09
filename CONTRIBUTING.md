# 贡献规范

本仓库采用 **"一脚本一文件夹"** 的组织方式,任何新增脚本/规则/插件请遵循以下规范。

---

## 📁 文件夹结构

每个脚本应该是一个独立子目录,放在对应的分类目录下:

```
<分类>/
├── README.md           ← 分类索引(已有,只需更新表格)
└── <脚本名>/           ← 新建这个文件夹
    ├── <脚本名>.js     ← 脚本主体
    └── README.md       ← 该脚本的详细文档
```

例如新增小程序脚本 `jd`(京东):

```
miniprogram/
├── README.md           ← 在表格里加一行 jd
└── jd/
    ├── jd.js
    └── README.md
```

---

## 📝 添加步骤

### 1. 创建脚本目录

在对应分类下创建目录,放入脚本文件:

```
miniprogram/jd/jd.js
```

### 2. 写脚本 README

在脚本目录下创建 `README.md`,**直接复制下方模板**填写。

### 3. 更新分类索引

打开分类目录的 README(如 `miniprogram/README.md`),在脚本清单表格里追加一行:

```markdown
| [`jd/`](./jd/) | 京东 - 每日签到 | ✅ 维护中 |
```

### 4. 提交

commit message 建议:

```
feat: 新增 jd 脚本(京东每日签到)
```

---

## 📄 脚本 README 模板

直接复制下面这段,把所有 `<脚本名>` / `<功能>` / `<域名>` / `<重写正则>` 替换成实际值即可。

```markdown
# 📎 <脚本名> · <功能短描述>

<一句话功能介绍>

---

## 📍 Raw URL

\`\`\`
https://raw.githubusercontent.com/MaYIHEI/paperclip/main/<分类>/<脚本名>/<脚本名>.js
\`\`\`

---

## ⚙️ 重写规则

### Surge / Loon

\`\`\`ini
[Script]
http-response <重写正则> script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/<分类>/<脚本名>/<脚本名>.js, requires-body=true, timeout=60, tag=<脚本名>获取token

[MITM]
hostname = <域名>
\`\`\`

### Quantumult X

\`\`\`ini
[rewrite_local]
<重写正则> url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/main/<分类>/<脚本名>/<脚本名>.js

[mitm]
hostname = <域名>
\`\`\`

---

## 🚀 使用步骤

1. 在代理工具中配置上述重写规则与 MITM 主机名
2. 打开微信小程序 **<小程序名>**
3. 进入<触发页面>,触发<触发接口>
4. 通知栏出现 "🎉账号[xxx]更新token成功!" 即抓取成功
5. 配置定时任务每日执行

---

## ⏰ Cron 配置

### Surge / Loon / Stash

\`\`\`ini
[Script]
cron "0 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/<分类>/<脚本名>/<脚本名>.js, tag=<显示名>签到
\`\`\`

### Quantumult X

\`\`\`ini
[task_local]
0 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/main/<分类>/<脚本名>/<脚本名>.js, tag=<显示名>签到, enabled=true
\`\`\`

---

## 📝 维护记录

| 日期 | 变更 |
|---|---|
| YYYY-MM-DD | 初版 / 适配 / 修复 |

---

## ⚠️ 已知限制

- 列出已知问题、有效期、需要手动刷新的场景等

---

## 🙏 致谢

- 原作者: [@xxx](链接)(如基于他人改造)
```

---

## 🏷️ 状态徽章约定

清单表格里"状态"列建议使用以下徽章:

| 徽章 | 含义 |
|---|---|
| ✅ 维护中 | 当前可用,定期验证 |
| ⚠️ 待修 | 已知问题,暂未修复 |
| ❌ 已失效 | 接口下线或风控,无法使用 |
| 🔜 计划中 | 占位,尚未开发 |
| 📦 已归档 | 不再维护,仅保留历史 |

---

## 🧹 命名规范

- 脚本目录与文件名:**全小写**,英文单词或缩写,如 `ppmt` / `jd` / `meituan`
- 不用空格、不用驼峰、不用下划线连接(单一标识不需要)
- 多词组合用连字符:`jd-cookie`(不推荐 `jd_cookie` / `JdCookie`)
- README 标题可以用中文 + emoji,但路径全英文

---

## 📋 Commit Message 约定

简单遵守 conventional commits:

| 类型 | 用途 | 示例 |
|---|---|---|
| `feat` | 新增脚本/功能 | `feat: 新增 jd 脚本(京东每日签到)` |
| `fix` | 修复 bug | `fix(ppmt): 修复 phone_num.length 异常` |
| `docs` | 仅改文档 | `docs(ppmt): 更新已知限制说明` |
| `refactor` | 重构(行为不变) | `refactor: 拆分到独立子目录` |
| `chore` | 杂项(依赖、配置) | `chore: 更新 .gitignore` |
