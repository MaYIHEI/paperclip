<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/weibo.png" width="80" alt="微博超话" />
</p>

# 微博超话

微博 APP「超话」每日签到所有关注超话。X-Validator 路径绑定,需双 cookie 抓取。

## 文件

- `weibotalk.cookie.js` — Cookie 抓取脚本(http-request/response 重写)
- `weibotalk.js` — 签到主脚本(cron)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开「微博」APP → 进入超话首页 → 任意一个超话点签到一次
3. 分别收到「✅ 已获取关注列表 Cookie」「🎉 已获取签到 Cookie」两条通知即就绪
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = api.weibo.cn

[Script]
request if ${url} ~= /^https:\/\/api\.weibo\.cn\/2\/(statuses\/container_timeline_topicsub|page\/button)/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/weibotalk/weibotalk.cookie.js") with tag="微博超话 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/weibo.png", requires_body=true

cron "0 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/weibotalk/weibotalk.js") with tag="微博超话签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/weibo.png"
```

## Surge

```ini
[MITM]
hostname = api.weibo.cn

[Script]
微博超话 Cookie = type=http-request,pattern=^https:\/\/api\.weibo\.cn\/2\/(statuses\/container_timeline_topicsub|page\/button),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/weibotalk/weibotalk.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/weibo.png

微博超话签到 = type=cron,cronexp=0 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/weibotalk/weibotalk.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/weibo.png
```

## Quantumult X

```ini
[MITM]
hostname = api.weibo.cn

[rewrite_local]
^https:\/\/api\.weibo\.cn\/2\/(statuses\/container_timeline_topicsub|page\/button) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/weibotalk/weibotalk.cookie.js

[task_local]
0 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/weibotalk/weibotalk.js, tag=微博超话签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/weibo.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 微博超话签到
      cron: '0 8 * * *'
      timeout: 60

http:
  mitm:
    - "api.weibo.cn"
  script:
    - match: ^https:\/\/api\.weibo\.cn\/2\/(statuses\/container_timeline_topicsub|page\/button)
      name: 微博超话 Cookie
      type: request
      require-body: true

script-providers:
  微博超话签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/weibotalk/weibotalk.js
    interval: 86400
```

## BoxJS 参数

| key | 说明 |
|---|---|
| `wb_delete_cookie` | 开启后下次跑会清空已存 cookie |
| `wb_msg_max_num` | 单条通知显示的超话数量(默认 30) |
| `wb_request_time` | 签到间请求间隔毫秒(默认 700) |

## 维护记录

| 日期 | 变更 |
|---|---|
| - | 原作者 [@Evilbutcher](https://github.com/Evilbutcher) / [@toulanboy](https://github.com/toulanboy) |
| 2026-05 | 适配新接口: `cardlist` → `container_timeline_topicsub`(POST+since_id);双 cookie 模式适配 X-Validator |
| 2026-05-24 | tag 统一为 `微博超话 Cookie` / `微博超话签到`,加 img-url 图标 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../summary/)」一条通知查看是否需要重新抓取 |

## 已知限制

- X-Validator 时效未知,持续观察 cron 稳定性
- 关注超话多时建议把 `wb_request_time` 调到 1000+ 避免触发风控

## 致谢

- 原作者: [@Evilbutcher](https://github.com/Evilbutcher) → [@toulanboy](https://github.com/toulanboy)
- 适配: [@MaYIHEI](https://github.com/MaYIHEI/paperclip)
