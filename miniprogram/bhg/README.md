<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bhg.png" width="80" alt="北京华联" />
</p>

# 北京华联

北京华联(BHG Mall)微信小程序会员每日签到送积分(底层芝麻科技 china-smartech SaaS,JWT 长期有效)。

## 文件

- `bhg.js` — 单脚本架构,既是重写抓 token 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「BHG Mall」→ 进入会员「签到」页面,触发 checkInForm 接口
3. 收到 `✅ 北京华联 Cookie 获取成功` 通知即抓取成功(通知里会显示当前门店 mall_id)
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = a.china-smartech.com

[Script]
http-request https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm tag=北京华联 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bhg/bhg.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bhg.png

cron "8 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bhg/bhg.js, tag=北京华联签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bhg.png, enable=true
```

## Surge

```ini
[MITM]
hostname = a.china-smartech.com

[Script]
北京华联 Cookie = type=http-request,pattern=https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bhg/bhg.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bhg.png

北京华联签到 = type=cron,cronexp=8 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bhg/bhg.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bhg.png
```

## Quantumult X

```ini
[MITM]
hostname = a.china-smartech.com

[rewrite_local]
https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bhg/bhg.js

[task_local]
8 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bhg/bhg.js, tag=北京华联签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/bhg.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 北京华联签到
      cron: '8 8 * * *'
      timeout: 60

http:
  mitm:
    - "a.china-smartech.com"
  script:
    - match: https:\/\/a\.china-smartech\.com\/restful\/mall\/\d+\/checkInForm
      name: 北京华联 Cookie
      type: request
      require-body: false

script-providers:
  北京华联签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/bhg/bhg.js
    interval: 86400
```

## 实现细节

- **与龙德广场同套后端** — 底层是芝麻科技(china-smartech)给商场做的 SaaS,域名/接口/签名算法与 `longde` 完全一致(同一份 `utils/signature.js`)
- **签名算法本地复现** — `X-ZHIMA-SIGNATURE = HmacSHA256(url + JSON.stringify(body) + ts + nonce, JWT)`,纯 JS 实现无外部依赖
- **mall_id 从抓取 URL 提取** — 华联是连锁,小程序内置几十家门店各自独立 mall_id;华联 JWT **不含 mall_id**,故抓取时从请求路径 `restful/mall/(\d+)/` 提取用户所选门店并随 token 存(键 `bhg_mallid`)
- **会员体系账户级共享** — 与龙德广场同一会员钱包,签到状态与积分账户级共享,两者只需保留其一即可

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-16 | 初版,复用龙德 china-smartech 通道,mall_id 改从抓取 URL 提取 |

## 已知限制

- 单脚本架构(`$request` 是否存在区分抓 cookie / cron)
- mall_id 跟随抓取时所选门店;换门店签到需重进对应门店签到页重抓(账户级共享,通常无需更换)
