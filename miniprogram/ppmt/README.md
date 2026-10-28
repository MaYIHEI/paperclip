<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png" width="80" alt="泡泡玛特" />
</p>

# 泡泡玛特

微信小程序「泡泡玛特会员俱乐部」每日签到自动 +5 泡泡值。

## 文件

- `ppmt.js` — 单脚本架构,既是重写抓 token 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「泡泡玛特会员俱乐部」→ 进入「我的」页面或任意会员相关页面,触发接口
3. 收到 `✅ 泡泡玛特 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = popvip.paquapp.com

[Script]
response if ${url} ~= /^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info)/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js") with tag="泡泡玛特 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png", requires_body=true

cron "0 9 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js") with tag="泡泡玛特签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png"
```

## Surge

```ini
[MITM]
hostname = popvip.paquapp.com

[Script]
泡泡玛特 Cookie = type=http-response,pattern=^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png

泡泡玛特签到 = type=cron,cronexp=0 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png
```

## Quantumult X

```ini
[MITM]
hostname = popvip.paquapp.com

[rewrite_local]
^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info) url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js

[task_local]
0 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js, tag=泡泡玛特签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 泡泡玛特签到
      cron: '0 9 * * *'
      timeout: 60

http:
  mitm:
    - "popvip.paquapp.com"
  script:
    - match: ^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info)
      name: 泡泡玛特 Cookie
      type: response
      require-body: true

script-providers:
  泡泡玛特签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2024-06-08 | 原作者 [@Sliverkiss](https://github.com/Sliverkiss) 初版 |
| 2026-05-08 | 适配 v5.13.8 新接口与鉴权 |
| 2026-05-08 | 修复 getUserInfo 返回为空时的异常 |
| 2026-10-15 | 记录每次签到结果,可用「[Cookie 体检](../../app/summary/)」一条通知查看是否需要重新抓取 |
| 2026-10-27 | 签到结果按签到状态协议 v1 记录,并登记到公共索引,供签到汇总和桌面小组件读取 |
| 2026-10-28 | 新增补签入口,配合签到合集插件,桌面小组件可以一键现跑一次签到;签到记录里带上 Cookie 过期时间 |
| 2026-10-28 | 当天重复运行时,保留早上的奖励记录并补上本次查到的资产等信息 |

## 已知限制

- **等级 / 泡泡值 / 积分 显示为 -**:新版 `svip_lite/user_info` 接口不再返回这些字段,签到本身不受影响
- **JWT 有效期 7 天**:长期不打开小程序后 Token 过期,需要重新进入「我的」页面刷新一次

## 致谢

- 原作者: [@Sliverkiss](https://github.com/Sliverkiss) ([Gist 来源](https://gist.github.com/Sliverkiss/3e1fe82fa18dbcff9b2ae7fdad7596a6))
