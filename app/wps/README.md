<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png" width="80" alt="WPS" />
</p>

# WPS

WPS Office 每日签到 + 福利中心多项任务,送 WPS 积分与超级会员时长。

> 🧪 **待验证**:已用真账号实测请求被服务端接受;奖励发放需在「未完成」状态下次日观察。

## 任务清单

| 任务 | 说明 |
|---|---|
| 每日签到 | 任务中心签到,积分 +1 |
| 打卡领会员 | 福利中心连续打卡领会员 |
| 天天抽奖 | 福利中心每日 1 次抽奖 |
| 会员试用申请 | 福利中心会员免费试用,**次日开奖,仅申请** |
| 限量爆款领取 | 福利中心限量爆款(任选 1 个,每天限 1 次) |

## 文件

- `wps.cookie.js` — Cookie 抓取脚本(http-request 重写)
- `wps.js` — 签到主脚本(cron,含全部任务)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开「WPS」APP → 进任意活动页(任务中心 / 福利中心「天天领福利」)停留 1 秒
3. 收到 `✅ WPS Cookie 获取成功` 通知即抓取成功
4. cron 每天 **10:00** 触发(活动均 10 点开抢):先抢限量爆款,顺手把签到等其余任务做了

> 青龙:在环境变量设 `wps_sid`(值为抓到的 wps_sid),直接拉 `wps.js` 跑。

## 执行节奏 + 反风控

- **10 点触发,一口气做完**:抢完限量爆款后顺手做签到/打卡/抽奖/试用,模拟真人操作,不空等。
- 任务**逐个串行,动作之间随机间隔几秒、各不相等**,绝不并发,尽量避开风控。
- `wps_clear` 写 `true` 可清除已存 Cookie(下次运行生效)。

## Loon

```ini
[MITM]
hostname = personal-act.wps.cn

[Script]
http-request ^https:\/\/personal-act\.wps\.cn\/activity-rubik\/activity\/page_info tag=WPS Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png

cron "0 10 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.js, tag=WPS签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png, enable=true
```

## Surge

```ini
[MITM]
hostname = personal-act.wps.cn

[Script]
WPS Cookie = type=http-request,pattern=^https:\/\/personal-act\.wps\.cn\/activity-rubik\/activity\/page_info,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png

WPS签到 = type=cron,cronexp=0 10 * * *,timeout=120,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png
```

## Quantumult X

```ini
[MITM]
hostname = personal-act.wps.cn

[rewrite_local]
^https:\/\/personal-act\.wps\.cn\/activity-rubik\/activity\/page_info url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.cookie.js

[task_local]
0 10 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.js, tag=WPS签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/wps.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: WPS签到
      cron: '0 10 * * *'
      timeout: 120

http:
  mitm:
    - "personal-act.wps.cn"
  script:
    - match: ^https:\/\/personal-act\.wps\.cn\/activity-rubik\/activity\/page_info
      name: WPS Cookie
      type: request
      require-body: false

script-providers:
  WPS签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/wps/wps.js
    interval: 86400
```

## 说明

- 只需抓 `wps_sid`(WPS 登录态,长效,不轮换,抓一次长期可用);失效仅在手动退登 / 改密 / 异地风控。
- 账号信息运行时动态获取,脚本不保存任何个人信息。
- 纯 JS 实现,无外部依赖,Loon/Surge/QX/青龙通用。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-19 | 初版:每日签到 + 福利中心打卡/抽奖/试用申请/限量爆款 |
| 2026-06-19 | 改单条 10 点 cron,抢完爆款顺手做完其余,任务串行、动作间随机间隔避风控 |

## 已知限制

- **活动期相关**:福利中心相关配置绑定当前「WPS618 天天领福利」活动,**活动换期需更新** `wps.js` 顶部常量。
- **限量爆款**:界面「任选 1 个」,每天限 1 次,脚本只领其中一项。
- 福利中心奖励发放细节需在「未完成」状态实测确认。
