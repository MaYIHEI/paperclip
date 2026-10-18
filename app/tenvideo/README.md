<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png" width="80" alt="腾讯视频" />
</p>

# 腾讯视频

> ✅ **维护中** · 从归档复活,实测稳定,**无人值守**

腾讯视频 VIP 每日签到,自动领取 V力值。Cookie 抓取一次后,cron 会自动续期并签到,无需每天手动开 app。

## 文件

- `tenvideo.js` — 单脚本架构,既是重写抓 Cookie 也是 cron 签到,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方平台配置,开启重写脚本 + cron
2. **抓 Cookie(二选一,小程序最省事)**:
   - **iOS 微信打开「腾讯视频」小程序**,随便点几下 → 触发 `pbaccess.video.qq.com` 请求(带 cookie)
   - 或 iOS Safari 登录 `v.qq.com`(请求桌面网站)→ 切后台再切回
3. 收到 `✅ 腾讯视频 Cookie 获取成功` 通知即成功
4. cron 会按计划自动续期并签到

> 调试:脚本首行打印版本号;`tenvideo_debug=true` 开详细日志。

## Loon

```ini
[MITM]
hostname = pbaccess.video.qq.com, vip.video.qq.com

[Script]
request if ${url} ~= /^https:\/\/pbaccess\.video\.qq\.com\//i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js") with tag="腾讯视频 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png"

cron "10 0 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js") with tag="腾讯视频签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png"
```

## Surge

```ini
[MITM]
hostname = pbaccess.video.qq.com, vip.video.qq.com

[Script]
腾讯视频 Cookie = type=http-request,pattern=^https:\/\/pbaccess\.video\.qq\.com\/,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png

腾讯视频签到 = type=cron,cronexp=10 0 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png
```

## Quantumult X

```ini
[MITM]
hostname = pbaccess.video.qq.com, vip.video.qq.com

[rewrite_local]
^https:\/\/pbaccess\.video\.qq\.com\/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js

[task_local]
10 0 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js, tag=腾讯视频签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 腾讯视频签到
      cron: '10 0 * * *'
      timeout: 60

http:
  mitm:
    - "pbaccess.video.qq.com"
    - "vip.video.qq.com"
  script:
    - match: ^https:\/\/pbaccess\.video\.qq\.com\/
      name: 腾讯视频 Cookie
      type: request
      require-body: false

script-providers:
  腾讯视频签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| — | 初版(@WowYiJiu):抓 cookie 回放签到 |
| 2026-06-05 | 复活:自动续期后再签到,无人值守。状态 📦→🧪。实测 `✅ 获得 10 V力值` |
| 2026-06-10 | 多日实测稳定,🧪→✅ 维护中 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../summary/)」一条通知查看是否需要重新抓取 |

## 已知限制

- **Cookie 会滚动,尽量别在周期内频繁用腾讯视频**:你平时用 app/小程序/网页时,脚本存的 Cookie 可能被顶失效 → cron 报"刷新失败"时,**iOS 微信开下「腾讯视频」小程序即可重抓**
- **Cookie 长期但非永久**:长期未跑/被吊销后需重抓
- **奖励仅 V力值**,无实物兑换

## 致谢

- 原作者:[@WowYiJiu](https://github.com/WowYiJiu) — 初版签到逻辑
