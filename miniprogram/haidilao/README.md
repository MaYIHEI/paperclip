<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png" width="80" alt="海底捞" />
</p>

# 海底捞

微信小程序「海底捞」每日签到,签到获得菜品碎片🧩。

## 文件

- `haidilao.js` — 单脚本架构,既是重写抓 token 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「海底捞」→ 进入「我的」→ 任意签到入口,触发签到接口
3. 收到 `✅ 海底捞 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = superapp-public.kiwa-tech.com

[Script]
request if ${url} ~= /^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin)/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js") with tag="海底捞 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png"

cron "23 7 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js") with tag="海底捞签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png"
```

## Surge

```ini
[MITM]
hostname = superapp-public.kiwa-tech.com

[Script]
海底捞 Cookie = type=http-request,pattern=^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin),requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png

海底捞签到 = type=cron,cronexp=23 7 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png
```

## Quantumult X

```ini
[MITM]
hostname = superapp-public.kiwa-tech.com

[rewrite_local]
^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js

[task_local]
23 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js, tag=海底捞签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 海底捞签到
      cron: '23 7 * * *'
      timeout: 60

http:
  mitm:
    - "superapp-public.kiwa-tech.com"
  script:
    - match: ^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin)
      name: 海底捞 Cookie
      type: request
      require-body: false

script-providers:
  海底捞签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| - | 原作者 [@Sliverkiss](https://gist.github.com/Sliverkiss) 初版 |
| 2026-05-13 | 修复 Cookie 抓错字段,放宽重写匹配路径 |
| 2026-05-24 | tag 统一为 `海底捞 Cookie` / `海底捞签到`,加 img-url 图标 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../../app/summary/)」一条通知查看是否需要重新抓取 |
| 2026-10-27 | 签到结果按签到状态协议 v1 记录,并登记到公共索引,供签到汇总和桌面小组件读取 |
| 2026-10-28 | 新增补签入口,配合签到合集插件,桌面小组件可以一键现跑一次签到 |

## 致谢

- 原作者: [@Sliverkiss](https://gist.github.com/Sliverkiss)
- 修改: [@MaYIHEI](https://github.com/MaYIHEI/paperclip) — 修复 getCookie 抓错字段、放宽重写规则、修正函数命名
