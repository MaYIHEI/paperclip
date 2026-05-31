<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png" width="80" alt="腾讯视频" />
</p>

# 腾讯视频

腾讯视频 APP VIP 签到(V力值)。cookie 2h TTL,需用户睡前用 APP 自然续 cookie 配合。

## 文件

- `tenvideo.js` — 单脚本架构,既是重写抓 token 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开「腾讯视频」APP → 进入「会员」→ 任务列表(触发 ReadTaskList)
3. 收到 `✅ Token 获取成功` 或类似抓取成功通知
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = vip.video.qq.com

[Script]
http-request https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList tag=腾讯视频 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png

cron "5 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js, tag=腾讯视频签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png, enable=true
```

## Surge

```ini
[MITM]
hostname = vip.video.qq.com

[Script]
腾讯视频 Cookie = type=http-request,pattern=https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png

腾讯视频签到 = type=cron,cronexp=5 7 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png
```

## Quantumult X

```ini
[MITM]
hostname = vip.video.qq.com

[rewrite_local]
https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js

[task_local]
5 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js, tag=腾讯视频签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tenvideo.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 腾讯视频签到
      cron: '5 7 * * *'
      timeout: 60

http:
  mitm:
    - "vip.video.qq.com"
  script:
    - match: https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList
      name: 腾讯视频 Cookie
      type: request
      require-body: false

script-providers:
  腾讯视频签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js
    interval: 86400
```

## 实现细节

- cookie 2h 过期,续期协议私有不可复现
- cron 设 23:00 配合用户睡前用 APP 自然续 cookie
- 已删除腾讯体育所有功能(act_id=118561 已被官方下线)

## 维护记录

| 日期 | 变更 |
|---|---|
| - | 原作者 [@WowYiJiu](https://github.com/WowYiJiu) |
| 2026-05 | 精简:删除腾讯体育(已下线)+ 删除 vusession 主动刷新逻辑(接口已下线) |
| 2026-05-24 | tag 统一为 `腾讯视频 Cookie` / `腾讯视频签到`,加 img-url 图标 |

## 已知限制

- cookie 2h TTL,作息配合(用户白天用 APP 自然续 cookie)
- 偶尔漏一天没事

## 致谢

- 原作者: [@WowYiJiu](https://github.com/WowYiJiu)
- 精简 + 适配新接口: [@MaYIHEI](https://github.com/MaYIHEI/paperclip)
