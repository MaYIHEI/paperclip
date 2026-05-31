# CASETiFY

> ⚠️ **不维护** · 仅作技术存档,不建议使用

CASETiFY 微信小程序每日签到。一天 1 C 币,连签 7 天 6 C 币奖励,无实物兑换价值。

## 为什么不维护

技术上**没有 cron 自动签到的方案**:

- 鉴权 token 服务端 TTL 约 10 小时,客户端 2 小时缓存
- token 颁发接口 `/api/v4/estore/member/onLogin/<jscode>/260` 把 jscode 原样转发微信 `code2session`,服务端不做任何缓存
- 续期 100% 依赖小程序内 `wx.login()` 获取新鲜 jscode,代理脚本环境无法触发

已穷尽以下尝试,全部失败:

- `hqToken`(响应里的 365 天 JWT,含 sessionId+userId)→ 业务接口不接受它做鉴权
- 用 openId / unionid / webUserId / customerNo / phone 替代 jscode 调 onLogin → 微信返回 `40029 invalid code`
- 旧 jscode 重放 → `40163 code been used`

详细分析见仓库 `project.md` 第 13.5 条。

## 文件

- `casetify.js` — 抓 token + 签到一体脚本,token 新鲜时能正常工作(用户冷启动小程序后约 10 小时窗口内)

## 实现细节(供参考)

- Host: `mini-app-api.casetify.cn` · 小程序 appid: `wxd0c71d6bf928a416`
- 鉴权: 请求头 `token: xxx`
- 抓取: `http-response` 拦截 `checkWebToken`,从 `$request.headers.token` 取 token,从 `$response.body.data.phone` 取手机号用于通知
- 签到: `POST /api/v4/estore-campaign/member/sign/do`(无 body,`resultCode=1` 即成功)
- 已签判断: `GET /api/v4/estore-campaign/campaign/pointsMall/assignment/sign?campaignId=113`,看当天 `signStatus`

## 配置(如果你坚持要试)

### Loon

```ini
[MITM]
hostname = mini-app-api.casetify.cn

[Script]
http-response ^https:\/\/mini-app-api\.casetify\.cn\/api\/v4\/estore\/member\/checkWebToken tag=CASETiFY Cookie, requires-body=1, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/casetify/casetify.js

cron "5 0 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/casetify/casetify.js, tag=CASETiFY签到
```

### Surge

```ini
[MITM]
hostname = mini-app-api.casetify.cn

[Script]
CASETiFY Cookie = type=http-response, pattern=^https:\/\/mini-app-api\.casetify\.cn\/api\/v4\/estore\/member\/checkWebToken, requires-body=1, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/casetify/casetify.js
CASETiFY签到 = type=cron, cronexp=5 0 * * *, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/casetify/casetify.js
```

### Quantumult X

```ini
[MITM]
hostname = mini-app-api.casetify.cn

[rewrite_local]
^https:\/\/mini-app-api\.casetify\.cn\/api\/v4\/estore\/member\/checkWebToken url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/casetify/casetify.js

[task_local]
5 0 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/casetify/casetify.js, tag=CASETiFY签到, enabled=true
```

### Stash

```yaml
cron:
  script:
    - name: CASETiFY签到
      cron: '5 0 * * *'
      timeout: 10

http:
  mitm:
    - "mini-app-api.casetify.cn"
  script:
    - match: ^https:\/\/mini-app-api\.casetify\.cn\/api\/v4\/estore\/member\/checkWebToken
      name: CASETiFY Cookie
      type: response
      require-body: true
```

## 使用说明

打开 CASETiFY 小程序"我的"或"积分商城"页面 → 抓到 token 入库 → cron 在 10 小时内跑一次 = 可签。
不在窗口内 → token 失效,通知"请重新打开小程序"。

如果你能接受"打开小程序就当天能签"的弱保证,可以用。如果想 cron 全自动无人值守,**做不到**。
