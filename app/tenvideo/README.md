# 腾讯视频

每日签到领取 V 力值。

> 精简版:已删除腾讯体育/球票/抽抽乐功能(接口下线 + 多数人用不到)。

## 来源 / 致谢

- 原作者: [@WowYiJiu](https://github.com/WowYiJiu)
- 精简改造 + 适配新接口: [@MaYIHEI](https://github.com/MaYIHEI)

## 抓取 Cookie

1. 启用下方"抓取重写"配置
2. 打开腾讯视频 APP → "我的" → 点击头像下的"视频VIP"进入会员中心
3. 看到"🎉 Cookie写入成功"通知即可,**抓完请把抓取重写禁用**

## 环境变量

| 变量名 | 必填 | 说明 |
|---|---|---|
| `txspCookie` | ✅ | 腾讯视频 APP 的 Cookie (从重写抓取自动写入,无需手动填) |
| `isSkipTxspCheckIn` | ❌ | `true` 时跳过签到 (账号需要验证码/滑块时用),默认 `false` |

## 重写规则(抓 Cookie)

### Loon

```
[MITM]
hostname = vip.video.qq.com

[Script]
http-request https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList tag=腾讯视频#, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js,requires-body=0
```

### Surge

```
[MITM]
hostname = vip.video.qq.com

[Script]
腾讯视频# = type=http-request,pattern=https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList,requires-body=0,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js
```

### Quantumult X

```
[MITM]
hostname = vip.video.qq.com

[rewrite_local]
https:\/\/vip\.video\.qq\.com\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js
```

## 定时任务

### Loon

```
cron "5 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js,tag=腾讯视频,enable=true
```

### Surge

```
腾讯视频 = type=cron,cronexp=5 7 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js,script-update-interval=0
```

### Quantumult X

```
[task_local]
5 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/tenvideo/tenvideo.js, tag=腾讯视频, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/main/app/tenvideo.png, enabled=true
```

## 变更说明

### 2026-05-15 修复

| 改动 | 原因 |
|---|---|
| ReadTaskList 参数 `business_id` → `businessId` | 后端新版只在 `businessId`(驼峰)+`platform:5` 时返回完整任务列表(含 task_id=101 和 limit_info),旧的下划线写法返回空 |
| "本月活跃任务已满"判断更严格 | 旧逻辑里 `month_limit` 为 undefined 时也会触发"已满 nullV力值"假阳性,导致脚本不调 CheckIn 直接退出 |

### 2026-05-13 初版精简

| 改动 | 原因 |
|---|---|
| 删腾讯体育签到 / 每日球票 / 每月球票 / 抽抽乐 | `act_id=118561` 已下线(抓包确认),且体育会员是付费小众功能 |
| 删 `refresh_vusession` 逻辑 | 老接口 `WebLoginTrpc/NewRefresh` 已下线,v.qq.com 改用新登录流(`anywhere_door`)。抓包验证只要 `txspCookie` 里 vusession 没过期就能直接签到,无需主动刷新 |
| 删环境变量 `txspRefreshCookie` / `txspRefreshBody` / `dayOfGetMonthTicket` / `isLottery` | 配合以上两项废弃 |
| 删 wx 登录分支 bug | 原 `vusession` 变量未定义,且整个 refresh 函数已删 |
| 重写规则只保留一条 | 原本三条(抓 APP cookie / 网页 cookie / 网页 body)只剩抓 APP cookie 这一条还有用 |
