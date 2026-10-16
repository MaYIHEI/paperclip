<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/sgcc.png" width="80" alt="网上国网" />
</p>

# 网上国网

国家电网「网上国网」(95598)App 积分每日签到。🧪 待验证

## 文件

- `sgcc.js` — cron 签到脚本(手机号 + 密码自动登录并签到,无需抓包)
- `sgcc.lpx` — Loon 插件(cron + 账号设置)

## 使用步骤

1. 按下方对应平台添加任务,不需要 MITM 和重写
2. 填写手机号和密码(没设过密码的先在 App 里设置):Loon 在插件设置里填;其他平台用 BoxJS「网上国网」
3. 手动运行一次签到脚本:若提示「首次登录需短信验证」,把收到的 6 位验证码填进同一处的「短信验证码」,15 分钟内再运行一次
4. 之后 cron 每天自动签到,登录凭证到期或失效会自动重新登录

## Loon

推荐导入插件,在插件设置里填手机号、密码:

```
https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/sgcc/sgcc.lpx
```

或手动添加:

```ini
[Script]
cron "30 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/sgcc/sgcc.js") with tag="网上国网签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/sgcc.png", timeout=60
```

## Surge

```ini
[Script]
网上国网签到 = type=cron,cronexp=30 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/sgcc/sgcc.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/sgcc.png
```

## Quantumult X

```ini
[task_local]
30 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/sgcc/sgcc.js, tag=网上国网签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/sgcc.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 网上国网签到
      cron: '30 8 * * *'
      timeout: 60

script-providers:
  网上国网签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/sgcc/sgcc.js
    interval: 86400
```

## 实现细节

- **按 App 方式登录**:手机号 + 密码登录拿凭证,到期或失效自动重新登录;新设备首次登录需短信验证一次
- **签到与 App 签到页同一请求**,通知显示签到结果、本次获得的签到金和签到金余额;今日已签会提示「今日已签到」
- **数据全在本地**(Loon 插件设置 / BoxJS),仓库与脚本不含任何账号数据
- 协议部分移植自 [stevenjoezhang/hass-state-grid](https://github.com/stevenjoezhang/hass-state-grid)(MIT)

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-22 | 初版:复用签到请求 + 本地抓 Cookie;Loon 实测连续多天可签,Cookie ≥4.5 天 |
| 2026-10-15 | 🧪 改为手机号 + 密码自动登录并直接签到,不再需要抓包和 MITM;可读到签到结果 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../checkup/)」一条通知查看是否需要重新抓取 |
| 2026-10-16 | r5:登录凭证被其他登录挤掉时自动重新登录再签到;国网请求强制直连;脚本头和插件说明标注版本号 |
| 2026-10-16 | r6:通知增加签到金余额 |
| 2026-10-16 | r7:精简日志与插件说明 |

## 已知限制

- **🧪 待验证**:真账号登录、短信验证和每日签到尚未真机跑通;是否影响手机 App 登录状态待观察
- **需要账号密码**:密码只存在本机,不要分享含账号密码的插件配置或 BoxJS 备份
- **密码连续错误 5 次锁定 30 分钟**:填错时先改对再运行,不要反复重试
