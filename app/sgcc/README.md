<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/sgcc.png" width="80" alt="网上国网" />
</p>

# 网上国网

国家电网「网上国网」(95598)App 积分每日签到。

## 文件

- `sgcc.js` — cron 签到脚本(手机号 + 密码自动登录并签到,无需抓包)
- Loon 插件见 [`loon/sgcc`](../../loon/sgcc/)

## 使用步骤

1. 按下方对应平台添加任务,不需要 MITM 和重写
2. 填写手机号和密码(没设过密码的先在 App 里设置):Loon 在插件设置里填;其他平台用 BoxJS「网上国网」
3. 手动运行一次签到脚本:若提示「首次登录需短信验证」,把收到的 6 位验证码填进同一处的「短信验证码」,15 分钟内再运行一次
4. 之后 cron 每天自动签到,登录凭证到期或失效会自动重新登录

## Loon

推荐导入插件,在插件设置里填手机号、密码:

```
https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/loon/sgcc/sgcc.lpx
```

或手动添加:

```ini
[Script]
cron "30 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.js") with tag="网上国网签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/sgcc.png", timeout=60
```

## Surge

```ini
[Script]
网上国网签到 = type=cron,cronexp=30 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/sgcc.png
```

## Quantumult X

```ini
[task_local]
30 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.js, tag=网上国网签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/sgcc.png, enabled=true
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
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-22 | 初版:复用签到请求 + 本地抓 Cookie;Loon 实测连续多天可签,Cookie ≥4.5 天 |
| 2026-10-15 | 🧪 改为手机号 + 密码自动登录并直接签到,不再需要抓包和 MITM;可读到签到结果 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../summary/)」一条通知查看是否需要重新抓取 |
| 2026-10-16 | r5:登录凭证被其他登录挤掉时自动重新登录再签到;国网请求强制直连;脚本头和插件说明标注版本号 |
| 2026-10-16 | r6:通知增加签到金余额 |
| 2026-10-16 | r7:精简日志与插件说明 |

## 已知限制

- **需要账号密码**:账号密码只存在本机(Loon 插件设置 / BoxJS),仓库和脚本不含任何账号数据;不要分享含账号密码的插件配置或 BoxJS 备份
- **密码连续错误 5 次锁定 30 分钟**:填错时先改对再运行,不要反复重试

## 致谢

- 登录与加密代码:脑瓜([@anker1209](https://t.me/anker1209))的 [Scriptable/SGCC.js](https://github.com/githubdulong/Script/blob/master/Scriptable/SGCC.js)([发布帖](https://t.me/scriptableJS/178))。本脚本的加密、设备令牌与登录部分直接取自该脚本,做了精简和适配
- 协议与设备令牌算法:[@stevenjoezhang](https://github.com/stevenjoezhang) 的开源项目 [hass-state-grid](https://github.com/stevenjoezhang/hass-state-grid)(MIT),许可证原文保留在 `sgcc.js` 中
