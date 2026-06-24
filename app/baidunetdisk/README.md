<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png" width="80" alt="百度网盘" />
</p>

# 百度网盘 🧪

百度网盘每日签到,得金币 + 成长值,支持连签奖励。

## 文件

- `baidunetdisk.js` — 既是重写抓 cookie 也是 cron 签到,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开百度网盘 APP →「我的」→ 进入「签到」页面,停留 1 秒
3. 收到 `✅ 百度网盘 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = pan.baidu.com

[Script]
http-request ^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist tag=百度网盘 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png

cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js, tag=百度网盘签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png, enable=true
```

## Surge

```ini
[MITM]
hostname = pan.baidu.com

[Script]
百度网盘 Cookie = type=http-request,pattern=^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png

百度网盘签到 = type=cron,cronexp=15 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png
```

## Quantumult X

```ini
[MITM]
hostname = pan.baidu.com

[rewrite_local]
^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js

[task_local]
15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js, tag=百度网盘签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 百度网盘签到
      cron: '15 8 * * *'
      timeout: 60

http:
  mitm:
    - "pan.baidu.com"
  script:
    - match: ^https:\/\/pan\.baidu\.com\/coins\/taskcenter\/signinlist
      name: 百度网盘 Cookie
      type: request
      require-body: false

script-providers:
  百度网盘签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/baidunetdisk/baidunetdisk.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-24 | 初版,基于百度网盘 13.27.5 抓包验证 |

## 已知限制

- **未经多日真机验证**:签到流程已抓包比对,完整链路尚未在真机定时任务下长期跑过;首次 cron 跑时留意通知结果
- Cookie(BDUSS/STOKEN)长期有效但非永久,失效后需重新打开 APP 进签到页抓取
- 客户端设备参数为抓包时的固定值,网盘大版本更新后若签到失败,需重新抓包对照更新脚本常量
