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
request if ${url} ~= /^https:\/\/xunting\.vbegin\.com\.cn\/sns\/app/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js") with tag="听听FM Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png"

cron "20 9 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js") with tag="听听FM签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png"
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

## 说明

- 每日自动签到(+2 成长值 +5 金币,每日 1 次);只做签到——「听 15 分钟」「分享广播」需真实行为,脚本不刷。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-18 | 初版 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../summary/)」一条通知查看是否需要重新抓取 |
| 2026-10-27 | 签到结果按签到状态协议 v1 记录,并登记到公共索引,供签到汇总和桌面小组件读取 |
