<div align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png" width="80" />
</div>

# mishop (小米商城)

小米商城 APP 米金签到。每日 5 米金,连签 2/7/14 天有阶段红包奖励。

> 米金可在 APP 首页的「米金商城」兑换商品 / 优惠券。

## 文件

- `mishop.cookie.js` — Cookie 抓取脚本(http-request 重写)
- `mishop.js` — 签到主脚本(cron)

## 使用

### 1. 抓取 Cookie

按下方配置开启重写 + cron,打开小米商城 APP → 首页 → 「米金商城」入口 → 进入活动页 → 点签到按钮,看到「✅ Cookie 获取成功」通知后,**关闭重写**(避免后续被反复覆盖)。

> 抓签到接口要触发 `/mtop/mf/act/infinite/do` 或 `/mtop/mf/act/infinite/done`,所以必须**手动点签到一次**(已经签过也可以点,会返回失败但 cookie 照样被抓到)。

### 2. Loon

```ini
[MITM]
hostname = shop-api.retail.mi.com

[Script]
http-request ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done) tag=小米商城 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.cookie.js, requires-body=0, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png

cron "15 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js, tag=小米商城签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, enable=true
```

### 3. Surge

```ini
[MITM]
hostname = %APPEND% shop-api.retail.mi.com

[Script]
小米商城 Cookie = type=http-request, pattern=^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done), requires-body=0, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.cookie.js, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png

小米商城签到 = type=cron, cronexp=15 8 * * *, timeout=60, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, script-update-interval=0
```

### 4. Quantumult X

```ini
[MITM]
hostname = shop-api.retail.mi.com

[rewrite_local]
^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.cookie.js

[task_local]
15 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js, tag=小米商城签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mishop.png, enabled=true
```

### 5. Stash

```yaml
http:
  mitm:
    - "shop-api.retail.mi.com"
  script:
    - match: ^https:\/\/shop-api\.retail\.mi\.com\/mtop\/mf\/act\/infinite\/(do|done)
      name: 小米商城 Cookie
      type: request
      require-body: false
cronjob:
  - name: 小米商城签到
    cronexp: "15 8 * * *"
    timeout: 60
    script-path: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mishop/mishop.js
```

## 实现细节

- **接口**:`shop-api.retail.mi.com` 是小米商城 mtop 网关,所有 RN 页面的 API 都走这里
- **签到流程两步**:
  1. `POST /mtop/mf/act/infinite/do` body `[{}, {taskId, actId}]` → 拿 `taskToken`
  2. `POST /mtop/mf/act/infinite/done` body `[{}, {taskToken, actId, taskType:110}]` → 领奖
- **鉴权**:仅靠 cookie 里的 `serviceToken` + `userId`,无签名要求
- **任务 ID 硬编码**:`actId` / `taskId` 是从 `/mtop/navi/venue/page?page_id=13880` 响应里挖出来的常量,`endTime` 到 2027 年,理论上很久不会变
- **已签判断**:重复签到时 `do` 接口会返回非 0 错误码,脚本据此识别"今日已签",无需独立的状态查询接口

## 已知限制

- 米金签到任务 ID 硬编码。如果小米官方换 actId / taskId,需要重新抓 `venue/page` 拿新 ID
- `serviceToken` 时效未知,理论上和 APP 登录态同生命周期。如签到失败提示 "未登录"/"token 失效",重抓即可
