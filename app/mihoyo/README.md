# mihoyo (米游社)

米游社多游戏每日签到 + 米游币任务,支持原神、星穹铁道、绝区零、崩坏3(国服)。

## 特点

- 一次抓 cookie 全游戏通签,自动遍历绑定的游戏角色
- 已签状态识别,不会重复请求
- 风控触发会单独提示
- 米游币任务: 打卡 / 浏览 3 帖 / 点赞 5 次(立即取消) / 分享 1 帖,每日 +90 米游币
- 米游币任务可关闭(默认开启)

## 安装

### Loon

```ini
[Script]
http-request https?:\/\/api-takumi(\.miyoushe|\.mihoyo)\.com\/(binding\/api\/getUserGameRolesByStoken|event\/luna\/[a-z0-9]+\/(info|home|sign))|https?:\/\/bbs-api\.miyoushe\.com\/apihub\/(sapi\/getUserMissionsState|app\/api\/signIn) tag=米游社cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/mihoyo/mihoyo.cookie.js, requires-body=0, enable=true

cron "30 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/mihoyo/mihoyo.js, tag=米游社, enable=true

[MITM]
hostname = api-takumi.mihoyo.com, api-takumi.miyoushe.com, bbs-api.miyoushe.com
```

### Surge

```ini
[Script]
米游社cookie# = type=http-request, pattern=https?:\/\/api-takumi(\.miyoushe|\.mihoyo)\.com\/(binding\/api\/getUserGameRolesByStoken|event\/luna\/[a-z0-9]+\/(info|home|sign))|https?:\/\/bbs-api\.miyoushe\.com\/apihub\/(sapi\/getUserMissionsState|app\/api\/signIn), requires-body=0, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/mihoyo/mihoyo.cookie.js

米游社 = type=cron, cronexp=30 7 * * *, timeout=60, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/mihoyo/mihoyo.js, script-update-interval=0

[MITM]
hostname = %APPEND% api-takumi.mihoyo.com, api-takumi.miyoushe.com, bbs-api.miyoushe.com
```

## 使用

### 第一次配置

1. 启用上面的 cookie 重写规则
2. 打开米游社 APP → 进入「我的」页面(抓 stoken)
3. 进任一游戏签到页面手动签到一次(抓 web cookie)
4. 进「我的」→「米游币」页面(抓任务 v1 headers)
5. **在米游币页面手动点一次打卡**(抓打卡 v2 headers,即使已签到也会触发接口)
6. 通知里 4 项全部 ✅ 后,关闭 cookie 重写规则
7. cron 自动执行,默认每天 07:30

> 想偷懒可以跳过步骤 5,自动跳过打卡但保留浏览/点赞/分享(每天少 30 米游币)

### BoxJS 参数(可选)

| 参数 | 默认 | 说明 |
|---|---|---|
| `mhy_delete_cookie` | `false` | 设为 `true` 清空已存的 cookie |
| `mhy_req_interval` | `2000` | 游戏间签到间隔(毫秒) |
| `mhy_games` | 空 | 要签到的 game_biz,逗号分隔。留空 = 全部绑定游戏。可选: `hk4e_cn` (原神), `hkrpg_cn` (星穹铁道), `nap_cn` (绝区零), `bh3_cn` (崩坏3) |
| `mhy_enable_micoin` | `true` | 是否执行米游币任务 |
| `mhy_micoin_forum` | `26` | 米游币任务从哪个版块拉帖子。可选: `26` 原神, `34` 大别野, `30` 崩坏2, `37` 未定事件簿, `52` 星穹铁道, `57` 绝区零 |

## 失效排查

| 现象 | 处理 |
|---|---|
| 「缺少 stoken cookie」 | 重抓: 米游社 APP → 我的 |
| 「缺少 web 签到 cookie」 | 重抓: 任一游戏签到页面手动签到一次 |
| 「米游币任务: 缺少 BBS headers」 | 重抓: 米游社 → 我的 → 米游币 |
| 「触发风控(risk_code=N)」 | 米哈游官方风控验证,只能去 APP 手动签一次解除 |
| 「web cookie 可能已过期」 | 重抓签到页面 cookie |
| 米游币任务报错 invalid request / DS expired | DS 时效过期了,重抓 BBS headers 或关闭米游币任务 |
| 没有签到任何游戏 | 检查游戏角色是否绑定米游社,以及 `mhy_games` 过滤是否写错 |

## 致谢

- 原版 v1 业务逻辑参考 [@daye99](https://github.com/daye99/genshin-sign-helper)
- 原版 v2 业务逻辑参考 [@kayanouriko](https://github.com/kayanouriko/quantumultx-mihoyobbs-auto-helper)
- Python 版思路参考 [@Womsxd/MihoyoBBSTools](https://github.com/Womsxd/MihoyoBBSTools) (各游戏国服 act_id 来源)
- 米游社接口逆向参考 [@starudream/miyoushe-task](https://github.com/starudream/miyoushe-task)

## 更新历史

- 2026-05-13: 基于 2026-05 抓包从零重写,完全适配新版接口
  - 域名: `bbs-api.mihoyo.com` → `bbs-api.miyoushe.com`
  - 签到接口: `/event/bbs_sign_reward/sign` → `/event/luna/{biz}/sign` (按游戏分路径)
  - 鉴权: cookie_token (web) + stoken (角色列表)
  - 新增游戏: 绝区零、星穹铁道
  - 米游币任务: 用新接口重做 (打卡/浏览/点赞/分享, 4 项每日 +90)
  - 点赞会立即取消,不污染他人
