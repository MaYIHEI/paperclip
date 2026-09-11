<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png" width="80" alt="AgentRouter" />
</p>

# AgentRouter

🧪 待验证

每日登录签到并通知结果、余额。支持单账号和 Loon 多账号，无需青龙、服务器、抓包或 MITM。

## 文件

- `agentrouter.js` — 定时签到脚本。
- `agentrouter.lpx` — Loon 定时任务插件。

## 使用步骤

1. 在 Loon 导入或更新 [AgentRouter 插件](https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.lpx)。
2. 打开插件设置，单账号填写账号和密码；多账号按下方示例填写「多账号（JSON）」，保存。
3. 手动运行一次「AgentRouter签到」核对结果，之后每天 **09:00（设备时间）**自动运行。

Loon 无需配置 BoxJS。旧版用户更新插件后，需在插件里填写一次账号密码；若之前另加过独立 cron，请关闭那条任务，保留插件任务即可。

### 插件设置

| 参数 | 说明 |
|---|---|
| 账号 | 网站账号或邮箱，不填 API Key |
| 密码 | 网站登录密码，首尾空格原样保留 |
| 多账号（JSON） | 选填，填写后优先使用列表；留空使用上面的单账号 |
| 调试模式 | 默认关闭；仅记录请求状态和签到判定 |

清除全部账号：清空账号、密码和多账号三个输入框并保存。只清空多账号会恢复使用单账号。暂停签到：关闭插件即可。账号密码由 Loon 插件设置保存，不要分享包含这些内容的配置或备份。

### 多账号示例

在插件的「多账号（JSON）」中粘贴下面内容，替换为自己的账号和密码：

```json
[{"username":"账号1","password":"密码1"},{"username":"账号2","password":"密码2"}]
```

可继续追加账号，不固定为两个；结果按列表顺序显示为「账号 1、账号 2……」。账号逐个执行，某个失败会继续后面的账号，最后只发一条汇总通知。密码里的双引号和反斜杠需要按 JSON 格式转义。

格式错误会直接提示，不会改用单账号或跳过错误项。插件最长运行 300 秒，账号较多或网络较慢时可能超时。

## Loon

[插件地址](https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.lpx) · 无需 MITM、重写或 BoxJS。

以下内容用于插件内部配置，直接导入插件即可：

```ini
[Argument]
username = input,"",tag=账号,desc=网站账号或邮箱
password = input,"",tag=密码,desc=网站登录密码
accounts = input,"",tag=多账号（JSON）,desc=选填；填写后优先使用列表；格式见插件主页
debug = switch,false,tag=调试模式,desc=仅记录请求状态和签到判定

[Script]
cron "0 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.js, argument=[{username},{password},{accounts},{debug}], tag=AgentRouter签到, timeout=300, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enable=true
```

### 其他平台

Surge、Quantumult X、Stash 继续使用 [BoxJS testing 订阅](https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/paperclip.boxjs.json)中的 **AgentRouter（Surge / QX / Stash）**，填写账号密码并按下方配置添加任务。BoxJS 提供调试开关，以及运行一次后生效并复位的「清除账号信息」。

## Surge

```ini
[Script]
AgentRouter签到 = type=cron,cronexp=0 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png
```

## Quantumult X

```ini
[task_local]
0 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.js, tag=AgentRouter签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: AgentRouter签到
      cron: '0 9 * * *'
      timeout: 60

script-providers:
  AgentRouter签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-09-11 | r3：Loon 插件新增多账号列表、逐账号处理与汇总通知 |
| 2026-09-11 | r2：账号密码和调试开关移入 Loon 插件，简化使用步骤与插件简介 |
| 2026-09-11 | 移植账号密码签到，增加 BoxJS、Loon 插件与签到记录确认；模拟测试通过，待真机验证 |

## 已知限制

- 仅支持账号密码登录；第三方登录、验证码和二次验证流程未实现。Surge / QX / Stash 暂保留单账号模式。
- 「今日签到已确认」表示查到了今日签到记录，不表示本次运行新领到了额度；实际奖励以网站规则和使用日志为准。
- 「今日」按设备本地日期核对；站点结算日界尚待跨日实测。每次运行都会登录，不会因为本地日期判断跳过登录。
- 查询最近 20 条记录；找不到今日签到记录、查询失败或登录响应不完整时提示「签到待确认」，请到网站核对。
- 余额显示服务端返回的原始额度，不擅自换算美元。
- 网站要求网页验证或被风控拦截时，需自行在浏览器处理。网络请求使用当前分流；失败会通知，不自动重试登录。
- 已完成模拟验证，尚无 Loon 真机或真实账号签到结果；其他三平台配置随仓库格式保留，同样待真机验证。

## 致谢

- 原版 Python 脚本：[@773075692/agentrouter-checkin](https://github.com/773075692/agentrouter-checkin)。
