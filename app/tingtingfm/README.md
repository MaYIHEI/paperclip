<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png" width="80" alt="听听FM" />
</p>

# 听听FM

听听FM APP「任务中心」每日签到，领成长值 + 金币。

## 文件

- `tingtingfm.js` — 既是重写抓 Cookie 也是 cron 签到，根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置，开启重写脚本 + cron
2. 打开听听FM APP →「我的」→「任务中心」，停留 1 秒触发 `/sns/app` 请求
3. 收到 `✅ 听听FM Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = xunting.vbegin.com.cn

[Script]
http-request ^https:\/\/xunting\.vbegin\.com\.cn\/sns\/app tag=听听FM Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png

cron "20 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js, tag=听听FM签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png, enable=true
```

## Surge

```ini
[MITM]
hostname = xunting.vbegin.com.cn

[Script]
听听FM Cookie = type=http-request,pattern=^https:\/\/xunting\.vbegin\.com\.cn\/sns\/app,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png

听听FM签到 = type=cron,cronexp=20 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png
```

## Quantumult X

```ini
[MITM]
hostname = xunting.vbegin.com.cn

[rewrite_local]
^https:\/\/xunting\.vbegin\.com\.cn\/sns\/app url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js

[task_local]
20 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js, tag=听听FM签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 听听FM签到
      cron: '20 9 * * *'
      timeout: 60

http:
  mitm:
    - "xunting.vbegin.com.cn"
  script:
    - match: ^https:\/\/xunting\.vbegin\.com\.cn\/sns\/app
      name: 听听FM Cookie
      type: request
      require-body: false

script-providers:
  听听FM签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js
    interval: 86400
```

## 实现细节

- **任务中心是内嵌 H5**(`tingtingfm.vbegin.com.cn`)，所有任务接口走 `xunting.vbegin.com.cn`。
- **凭证 = User-Agent 里的 `s_k` 会话密钥**：请求**无 cookie、无鉴权头**，唯一身份信息是 UA 中的
  `s_k:<uid>_<token>_<sign>`。脚本存完整 UA 回放，cron 直接复用。
- **token 每次现生成**：`POST /sns/app`(带 s_k UA、无 body)返回一个一次性会话 `token`，
  每调一次都是新值，**不能长期缓存** → 必须 cron 时现换。后续所有 `/api/sns/...` 接口靠
  `?token=` 查询参数鉴权。
- **签到接口**：`POST /api/sns/grow/daily/tasks?token=X`，body `task=2`(每日签到，+2 成长值 +5 金币，
  每日 1 次)。响应 `data.logs` 非空 = 本次新签到；为 `null` 且无 `error` = 今日已签(服务端幂等)。
- **只做签到(task=2)**：`task=1`(听 15 分钟，+2 成长值/次×3)需真实收听服务端才发放，纯 POST 无效；
  `task=3`(分享广播)同理，均不处理。
- 金币余额来自 `GET /api/sns/app/point?token=X`，仅用于通知展示，失败不影响签到。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-18 | 初版(HAR 抓包逆向，签到响应解析离线验证通过) |

## 已知限制

- **`s_k` 时效未实测**(标 🧪 待验证)：会话密钥随 APP 登录态签发，理论上较长效，但具体有效期与
  风控策略尚未跟踪。失效时签到会收到「🚫 会话密钥失效」通知，重进「任务中心」抓一次即可。
- token 为一次性，cron 每次会先 `POST /sns/app` 换新，无需手动维护。
