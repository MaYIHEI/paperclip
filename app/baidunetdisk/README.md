<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/baidunetdisk.png" width="80" alt="百度网盘" />
</p>

# 百度网盘 🧪

百度网盘会员成长值每日签到 + 每日答题,助力 SVIP 升级。

## 文件

- `baidunetdisk.js` — 既是重写抓 cookie 也是 cron 签到,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开百度网盘 APP →「我的」→ 进入「签到 / 会员」页面,停留 1 秒
3. 收到 `✅ 百度网盘 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到 + 答题(都加会员成长值)

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
| 2026-06-24 | 初版,基于百度网盘抓包验证 |
| 2026-06-26 | 改为会员成长值签到 + 每日答题(纯 Cookie,免风控);移除金币中心方案 |

## 已知限制

- **未经多日真机验证**:签到 + 答题流程已比对社区方案,完整链路尚未在真机定时任务下长期跑过;首次 cron 跑时留意通知结果
- Cookie(BDUSS/STOKEN)长期有效但非永久,失效后需重新打开 APP 进签到 / 会员页抓取
- 「距 SVIP10 还差 X(约 N 天)」是按当前每日节奏的估算,续费等大额成长值无法预测,仅供参考
