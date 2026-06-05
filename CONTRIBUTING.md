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

如脚本包含独立的 cookie 抓取脚本,统一用 **点号风格** 命名(见下方"命名规范"):

```
miniprogram/jd/
├── jd.js
├── jd.cookie.js
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

直接复制下面这段,把所有 `<...>` 占位符替换成实际值。
**章节顺序固定**:图标预览 → 标题 → 简介 → 文件 → 使用步骤 → Loon → Surge → Quantumult X → Stash → 实现细节 → 维护记录 → 已知限制 →(致谢,仅改造他人脚本时保留)。

````markdown
<p align="center">
  <img src="<pin 图标 URL>" width="80" alt="<显示名>" />
</p>

# <显示名>

<一句话功能介绍:签到/领券,送什么>。

## 文件

- `<脚本名>.js` — <脚本主体说明;单脚本架构则注明"既是重写抓 cookie 也是 cron 签到,根据 `$request` 是否存在区分">
- `<脚本名>.cookie.js` — <如有独立 cookie 抓取脚本则保留此行,否则删掉>

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开 <小程序名 / APP 名> → 进入 <触发页面>,触发 <触发接口>
3. 收到 `✅ <显示名> Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = <域名>

[Script]
http-request <重写正则> tag=<显示名> Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/<分类>/<脚本名>/<脚本名>.js, requires-body=false, img-url=<pin 图标 URL>

cron "0 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/<分类>/<脚本名>/<脚本名>.js, tag=<显示名>签到, img-url=<pin 图标 URL>, enable=true
```

## Surge

```ini
[MITM]
hostname = <域名>

[Script]
<显示名> Cookie = type=http-request,pattern=<重写正则>,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/<分类>/<脚本名>/<脚本名>.js,img-url=<pin 图标 URL>

<显示名>签到 = type=cron,cronexp=0 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/<分类>/<脚本名>/<脚本名>.js,img-url=<pin 图标 URL>
```

## Quantumult X

```ini
[MITM]
hostname = <域名>

[rewrite_local]
<重写正则> url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/<分类>/<脚本名>/<脚本名>.js

[task_local]
0 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/<分类>/<脚本名>/<脚本名>.js, tag=<显示名>签到, img-url=<pin 图标 URL>, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: <显示名>签到
      cron: '0 9 * * *'
      timeout: 60

http:
  mitm:
    - "<域名>"
  script:
    - match: <重写正则>
      name: <显示名> Cookie
      type: request
      require-body: false

script-providers:
  <显示名>签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/<分类>/<脚本名>/<脚本名>.js
    interval: 86400
```

## 实现细节

- <鉴权方式 / 签名算法 / 关键坑,逐条列出>

## 维护记录

| 日期 | 变更 |
|---|---|
| YYYY-MM-DD | 初版 / 适配 / 修复 |

## 已知限制

- <列出已知问题、token 有效期、需手动刷新的场景等>

## 致谢

- 原作者:[@xxx](链接)
````

> **图标(img-url / 预览)**:
> - URL 用 `refs/heads/main/`(不是裸 `main/`),指向 `pin` 仓库:`https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/<分类>/<图标名>.png`
> - **pin 图标名可能和脚本目录名不一样**(如 `ppmt` → `popmart.png`、`weibotalk` → `weibo.png`),写之前先看 `pin/app/README.md` 清单,别重复造图标
>
> **致谢段**:只有基于他人脚本改造、参考别人思路时才写。**自研脚本整段删掉**,不要写"自研"占位——空段比"致谢自己"自然。

---

## 🧩 脚本头部规范

`.js` 脚本头部统一格式,新脚本直接套骨架改占位符(以最新的 `teld` / `tenvideo` 为准)。

### 主脚本头部

```js
/**
 * <显示名> · <一句话功能,送什么>
 *
 * 抓取:<打开哪个 APP/小程序 → 进哪页 → 触发什么 → 抓什么凭据>
 * 签到:cron <做什么>(<可选提示;细节见 README>)
 *
 * @Author: <自研写 MaYIHEI <url>;改造他人脚本写原作者,带 @>
 * @Modifier: MaYIHEI <https://github.com/MaYIHEI/paperclip>   // 仅改造他人脚本时加,自研删掉
 * @Channel: Telegram 频道 https://t.me/mayihei
 * @Updated: YYYY-MM-DD
 *
 * ===== Loon =====
 * ...(4 段平台配置,与本脚本 README 的四平台逐字一致)
 * ===== Surge =====   ===== Quantumult X =====   ===== Stash =====
 */

const $ = new Env("<显示名>");

const SCRIPT_VERSION = "YYYY-MM-DD.r1"; // 改一次 +1,确认拉到最新版
$.log(`[INFO] 脚本版本 ${SCRIPT_VERSION}`);
```

### cookie 副脚本头部

与主脚本差异:标题固定 `<显示名> · Cookie 抓取`、**无 `SCRIPT_VERSION`**、**只有抓取行(无签到行)**。

### 规则要点

- **描述区两行对仗**:`抓取:` + `签到:`(全角冒号)。**需要抓多个 Cookie**(去两个页分别抓)时写 `抓取①:` / `抓取②:` 分步,**主脚本和 cookie 脚本都要写清每步**(见 `mihoyo` / `weibotalk`)
- **日期**只用 `@Updated`(`YYYY-MM-DD`);署名:原作者带 `@` 前缀,MaYIHEI 用 `<尖括号>`,`@Modifier` 仅改造他人脚本时加
- **`SCRIPT_VERSION`**:主脚本必带 + 首行 `$.log` 打印;cookie 副脚本不带(版本归主脚本)
- **4 段平台配置注释保留在头部**,与 README 的四平台逐字一致(精简 = 把实现细节移 README,不删配置)
- **入口判断**统一 `if (typeof $request !== "undefined")`(双引号、`!==`);**若是 http-response 抓取**(读 `$response.body`,如 `wedome` / `casetify`)则判 `$response`,不要改成 `$request`

---

## 🏷️ 状态徽章约定

清单表格里"状态"列建议使用以下徽章:

| 徽章 | 含义 |
|---|---|
| ✅ 维护中 | 当前可用,定期验证 |
| 🧪 待验证 | 新增/改造完成,token 时效与稳定性尚未实测 |
| ⚠️ 待修 | 已知问题,暂未修复 |
| ❌ 已失效 | 接口下线或风控,无法使用 |
| 🔜 计划中 | 占位,尚未开发 |
| 📦 已归档 | 不再维护,仅保留历史 |

---

## 🧹 命名规范

- **脚本目录与文件名**:全小写,英文单词或缩写,如 `ppmt` / `jd` / `meituan`
- **单一标识**不使用空格、驼峰、下划线、连字符,直接小写连写,如 `weibotalk`
- **副文件命名(cookie/api/sub-module 等)用点号**: `<脚本名>.<role>.js`
  - 例: `weibotalk.cookie.js` / `mihoyo.cookie.js` / `huisheng.cookie.js`
  - 不要用下划线(`xxx_cookie.js`)或连字符(`xxx-cookie.js`)
- README 标题可以用中文 + emoji,但**路径必须全英文**
- **脚本 tag 命名**:
  - 抓 cookie 重写脚本: `<显示名> Cookie`（中文名与 Cookie 之间一个空格）
  - cron 签到脚本: `<显示名>签到`（纯中文直接拼接,不加空格）
  - `<显示名>` 优先用用户熟悉的简称(如「有品」而非「小米有品」),4 字以内为宜
  - 不要用 `#` 后缀、`获取token`、`抓token`、纯裸名等旧风格

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
