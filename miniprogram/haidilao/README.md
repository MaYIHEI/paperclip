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
http-request ^https:\/\/superapp-public\.kiwa-tech\.com\/activity\/wxapp\/signin\/(query|querySite|querySwitch|queryFragment|signin) tag=海底捞 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png

cron "23 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/haidilao/haidilao.js, tag=海底捞签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/haidilao.png, enable=true
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

## 实现细节

- **抓取**:http-request 模式,匹配 `/activity/wxapp/signin/` 下所有接口(`query`/`querySite`/`querySwitch`/`queryFragment`/`signin`),进签到页即触发
- **鉴权**:签到接口认 `_haidilao_app_token`(格式 `TOKEN_APP_xxx-xxx`),**原脚本抓错成 `Authorization`** 是失效主因
- **无签名**:仅靠 token 鉴权,body 原样回放
- **单脚本架构**:`$request` 存在时抓 token,不存在时 cron 签到

## 维护记录

| 日期 | 变更 |
|---|---|
| - | 原作者 [@Sliverkiss](https://gist.github.com/Sliverkiss) 初版 |
| 2026-05-13 | 修复 getCookie 抓错字段(`Authorization` → `_haidilao_app_token`),放宽重写匹配路径,适配 paperclip raw URL |
| 2026-05-24 | tag 统一为 `海底捞 Cookie` / `海底捞签到`,加 img-url 图标 |

## 已知限制

- token 时效未知,如返回未授权请重抓
- 单脚本同时承担「抓 token」和「签到」两个角色(通过 `$request` 是否存在区分),架构沿用原作

## 致谢

- 原作者: [@Sliverkiss](https://gist.github.com/Sliverkiss)
- 修改: [@MaYIHEI](https://github.com/MaYIHEI/paperclip) — 修复 getCookie 抓错字段、放宽重写规则、修正函数命名
