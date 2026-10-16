<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png" width="80" alt="NodeSeek" />
</p>

# NodeSeek ✅

NodeSeek 每日签到。

## 文件

- `nodeseek.cookie.js` — Cookie 抓取脚本（http-request 重写）
- `nodeseek.js` — 签到主脚本（cron）
- `nodeseek.inject.js` — 浏览器注入签到（备用方案，无需 cron）

## 使用步骤

1. 按下方对应平台配置，开启重写脚本 + cron
2. 用浏览器打开 [nodeseek.com](https://www.nodeseek.com) 并登录 → 停留片刻
3. 收到 `✅ NodeSeek Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = www.nodeseek.com

[Script]
request if ${url} ~= /^https:\/\/www\.nodeseek\.com\//i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js") with tag="NodeSeek Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png"

cron "0 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js") with tag="NodeSeek签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png"
```

## Surge

```ini
[MITM]
hostname = www.nodeseek.com

[Script]
NodeSeek Cookie = type=http-request,pattern=^https://www\.nodeseek\.com/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png

NodeSeek签到 = type=cron,cronexp=0 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png
```

## Quantumult X

```ini
[MITM]
hostname = www.nodeseek.com

[rewrite_local]
^https://www\.nodeseek\.com/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js

[task_local]
0 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js, tag=NodeSeek签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/nodeseek.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: NodeSeek签到
      cron: '0 8 * * *'
      timeout: 60

http:
  mitm:
    - "www.nodeseek.com"
  script:
    - match: ^https://www\.nodeseek\.com/
      name: NodeSeek Cookie
      type: request
      require-body: false

script-providers:
  NodeSeek签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.js
    interval: 86400
  NodeSeek Cookie:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/nodeseek/nodeseek.cookie.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-07-07 | 重复签到单独提示“今日已签到”，中继响应按 UTF-8 解码 |
| 2026-07-07 | 优化中继超时诊断，补中继健康检查说明 |
| 2026-06-25 | 初版，VPS 中继方案签到 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../checkup/)」一条通知查看是否需要重新抓取 |
| 2026-10-16 | 改为手机直接签到，不再需要中继服务器 |

## 已知限制

- 如提示「被 Cloudflare 拦截」，用浏览器重新打开 nodeseek.com 刷新 Cookie 后再运行
