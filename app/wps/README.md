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
| 会员试用申请 | 福利中心会员免费试用瓜分,**三档(7天/月卡/3个月卡)全部申领,次日开奖** |
| 限量爆款领取 | 福利中心限量爆款(任选 1 个,每天限 1 次) |
| 小程序打卡 | WPS 小程序每日打卡,抽 PDF / 图片权益包等 🧪 待验证 |

## 文件

- `wps.cookie.js` — Cookie 抓取脚本(http-request 重写)
- `wps.js` — 签到主脚本(cron,含全部任务)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开「WPS」APP → 进任意活动页(任务中心 / 福利中心「天天领福利」)停留 1 秒
3. 收到 `✅ WPS Cookie 获取成功` 通知即抓取成功
4. cron 每天 **10:00** 触发(活动均 10 点开抢):先抢限量爆款,顺手把签到等其余任务做了

> 青龙:在环境变量设 `wps_sid`(值为抓到的 wps_sid),直接拉 `wps.js` 跑。

## BoxJS 单独开关(可自定义)

在 BoxJS 订阅里 `WPS` 面板,每个任务可单独开/关(默认全开),关掉的整项跳过:

| 开关 key | 任务 |
|---|---|
| `wps_task_hot` | 限量爆款 |
| `wps_task_trial` | 会员试用 |
| `wps_task_signin` | 每日签到 |
| `wps_task_fragment` | 打卡领会员 |
| `wps_task_lottery` | 天天抽奖 |
| `wps_task_clockin` | 小程序打卡 |

> 不用 BoxJS 的(青龙等):不设这些键即全部开启;要关某项就把对应键值设为 `false`。

面板还含:`wps_sid`(Cookie,可手填)、`清除 Cookie`、`调试模式`(开启打印各任务接口原始响应,排错用)。

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
| 2026-06-20 | 并入小程序每日打卡(同一 wps_sid,无需额外抓取)🧪 待验证 |
| 2026-06-20 | 修复会员试用:旧接口失效(报已完成但未申请),改 preview 拿当天奖品三档全部申领 |
| 2026-06-20 | 通知文案统一:已签到/已打卡/已申领/已领取/已达上限/已领完/没资格,逐项状态写清 |
| 2026-06-20 | 接入 BoxJS;每个任务支持单独开关(默认全开)+ 调试模式 |

## 已知限制

- **活动期相关**:福利中心相关配置绑定当前「WPS618 天天领福利」活动,**活动换期需更新** `wps.js` 顶部常量。
- **限量爆款**:界面「任选 1 个」,每天限 1 次,脚本只领其中一项。
- 福利中心奖励发放细节需在「未完成」状态实测确认。
- **小程序打卡**:复用同一个 `wps_sid`,无需额外抓取;奖品为权益包体验类(价值有限),首次需真账号实测确认服务端是否接受。
