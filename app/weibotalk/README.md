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
http-request ^https:\/\/api\.weibo\.cn\/2\/(statuses\/container_timeline_topicsub|page\/button) tag=微博超话 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/weibotalk/weibotalk.cookie.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/weibo.png

cron "0 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/weibotalk/weibotalk.js, tag=微博超话签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/weibo.png, enable=true
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

## 实现细节

### 关键坑

- **必须双 cookie 抓取**:列表接口和签到接口的 `X-Validator` 反爬签名**路径绑定**,跨路径复用会返回「用户不存在」
- 已签判断用 `ext_button.type === 'sign_in'`,不是 `button.name` 文字匹配
- 列表用 POST + `since_id` 翻页,递归找 `card_type:8` 提取超话

### BoxJS 参数

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

## 已知限制

- X-Validator 时效未知,持续观察 cron 稳定性
- 关注超话多时建议把 `wb_request_time` 调到 1000+ 避免触发风控

## 致谢

- 原作者: [@Evilbutcher](https://github.com/Evilbutcher) → [@toulanboy](https://github.com/toulanboy)
- 适配: [@MaYIHEI](https://github.com/MaYIHEI/paperclip)
