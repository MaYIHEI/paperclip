# 海底捞

微信小程序 海底捞 每日签到,签到获得菜品碎片🧩。

## 配置

### Loon

```ini
[Script]
http-request ^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin) tag=海底捞#, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/haidilao/haidilao.js, requires-body=0

cron "23 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/haidilao/haidilao.js, tag=海底捞, enable=true

[MITM]
hostname = superapp-public.kiwa-tech.com
```

### Surge

```ini
[Script]
海底捞# = type=http-request, pattern=^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin), requires-body=0, max-size=0, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/haidilao/haidilao.js

海底捞 = type=cron, cronexp=23 7 * * *, timeout=60, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/haidilao/haidilao.js, script-update-interval=0

[MITM]
hostname = superapp-public.kiwa-tech.com
```

### Quantumult X

```ini
[rewrite_local]
^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/haidilao/haidilao.js

[task_local]
23 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/haidilao/haidilao.js, tag=海底捞, enabled=true

[MITM]
hostname = superapp-public.kiwa-tech.com
```

### Stash

```yaml
cron:
  script:
    - name: 海底捞
      cron: '23 7 * * *'
      timeout: 10

http:
  mitm:
    - "superapp-public.kiwa-tech.com"
  script:
    - match: ^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin)
      name: 海底捞
      type: request
      require-body: false

script-providers:
  海底捞:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/haidilao/haidilao.js
    interval: 86400
```

## 获取 Token

1. 启用上面的重写规则,打开 MITM
2. 打开微信 → 海底捞小程序 → 我的 → 进入"签到"页面
3. 看到通知 `🎉 获取 Token 成功`,即抓取完成

Token 形如 `TOKEN_APP_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,会保存到 BoxJS key `hdl_data`。

## 多账号

环境变量 `hdl_data`,多账号用 `@` 分隔。重复抓取同一账号会自动去重。

## 失败排查

- **未触发通知**: 确认 MITM 已开,小程序进的是"签到"页面而不是"积分中心",签到页面会调 `/activity/wxapp/signin/query`
- **签到返回 token 失效**: 重新进小程序"我的"→"签到"页抓一次 token
- **未抓到 token**: 在脚本日志里看 `headers keys` 字段,确认有没有 `_haidilao_app_token`

## 致谢

- 原作者: [@Sliverkiss](https://gist.github.com/Sliverkiss)
- 修改: [@MaYIHEI](https://github.com/MaYIHEI/paperclip) — 修复 getCookie 抓错字段、适配新版签到流程、修正函数命名
