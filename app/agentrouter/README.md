<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png" width="80" alt="AgentRouter" />
</p>

# AgentRouter

🧪 待验证

每日登录签到并通知结果、余额。单账号使用，无需青龙、服务器、抓包或 MITM。

## 文件

- `agentrouter.js` — 定时签到脚本。
- `agentrouter.lpx` — Loon 定时任务插件。

## 使用步骤

1. 在 BoxJS 添加或更新 [Paperclip testing 订阅](https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/paperclip.boxjs.json)。
2. 打开 **AgentRouter**，分别填写能在 [AgentRouter 网页](https://agentrouter.org/login)登录的账号和密码，保存。不填 API Key，也不需要 `邮箱#密码` 格式。
3. 在 Loon 导入下方插件，或添加定时任务配置，二选一即可。
4. 手动运行一次「AgentRouter签到」，到网站使用日志核对结果；之后每天 **09:00（设备时间）**自动运行。

> 使用 testing 订阅与插件；只更新 main 订阅不会出现这个待验证脚本。

### BoxJS 参数

| 参数 | 说明 |
|---|---|
| 账号 | 必填，网站账号或邮箱 |
| 密码 | 必填，网站登录密码；首尾空格会原样保留 |
| 清除账号信息 | 开启后运行一次脚本，清空账号密码并自动关闭，不发起签到 |
| 调试模式 | 默认关闭；仅打印请求状态和签到判定，不输出账号密码、Cookie 或完整响应 |

账号密码保存在本机 BoxJS 对应存储中，运行时发给 AgentRouter 登录。不要分享包含这些内容的 BoxJS 备份。

## Loon

[插件地址](https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.lpx) · 无需添加 MITM 或重写规则。

```ini
[Script]
cron "0 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/agentrouter/agentrouter.js, tag=AgentRouter签到, timeout=60, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enable=true
```

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
| 2026-09-11 | 移植账号密码签到，增加 BoxJS、Loon 插件与签到记录确认；模拟测试通过，待真机验证 |

## 已知限制

- 首版仅支持一个可用账号密码登录的账号；第三方登录、验证码和二次验证流程未实现。
- 「今日签到已确认」表示查到了今日签到记录，不表示本次运行新领到了额度；实际奖励以网站规则和使用日志为准。
- 「今日」按设备本地日期核对；站点结算日界尚待跨日实测。每次运行都会登录，不会因为本地日期判断跳过登录。
- 查询最近 20 条记录；找不到今日签到记录、查询失败或登录响应不完整时提示「签到待确认」，请到网站核对。
- 余额显示服务端返回的原始额度，不擅自换算美元。
- 网站要求网页验证或被风控拦截时，需自行在浏览器处理。网络请求使用当前分流；失败会通知，不自动重试登录。
- 已完成模拟验证，尚无 Loon 真机或真实账号签到结果；其他三平台配置随仓库格式保留，同样待真机验证。

## 致谢

- 原版 Python 脚本：[@773075692/agentrouter-checkin](https://github.com/773075692/agentrouter-checkin)。
