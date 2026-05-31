<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tuhu.png" width="80" alt="途虎养车" />
</p>

# 途虎养车

微信小程序「途虎养车」每日签到自动获取积分(每日 +5 积分,可抵现)。

## 文件

- `tuhu.js` — 单脚本架构,既是重写抓 token 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「途虎养车」→ 进入「我的」或「积分中心」页面 → 触发 `GetMemberSignInInfoAsync` 或 `GetRightsList` 接口
3. 收到 `✅ Token 获取成功` 或类似抓取成功通知
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = api.tuhu.cn

[Script]
http-request https:\/\/api\.tuhu\.cn\/User\/(GetMemberSignInInfoAsync|GetRightsList) tag=途虎养车 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/tuhu/tuhu.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tuhu.png

cron "17 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/tuhu/tuhu.js, tag=途虎养车签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tuhu.png, enable=true
```

## Surge

```ini
[MITM]
hostname = api.tuhu.cn

[Script]
途虎养车 Cookie = type=http-request,pattern=https:\/\/api\.tuhu\.cn\/User\/(GetMemberSignInInfoAsync|GetRightsList),requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/tuhu/tuhu.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tuhu.png

途虎养车签到 = type=cron,cronexp=17 7 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/tuhu/tuhu.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tuhu.png
```

## Quantumult X

```ini
[MITM]
hostname = api.tuhu.cn

[rewrite_local]
https:\/\/api\.tuhu\.cn\/User\/(GetMemberSignInInfoAsync|GetRightsList) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/tuhu/tuhu.js

[task_local]
17 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/tuhu/tuhu.js, tag=途虎养车签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tuhu.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 途虎养车签到
      cron: '17 7 * * *'
      timeout: 60

http:
  mitm:
    - "api.tuhu.cn"
  script:
    - match: https:\/\/api\.tuhu\.cn\/User\/(GetMemberSignInInfoAsync|GetRightsList)
      name: 途虎养车 Cookie
      type: request
      require-body: false

script-providers:
  途虎养车签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/tuhu/tuhu.js
    interval: 86400
```

## 实现细节

### 可选环境变量

| 变量名 | 说明 |
|---|---|
| `TUHU_TOKEN` | Token 列表(JSON 数组,自动写入,无需手填) |
| `TUHU_BLACKBOX` | blackbox 反爬参数(脚本会自动从 `tuhu.xn--ug8h.eu.org` 获取) |
| `CODESERVER_ADDRESS` | 微信 Code 服务器地址(多账号需要) |
| `CODESERVER_FUN` | 微信 Code 自定义函数 |

## 维护记录

| 日期 | 变更 |
|---|---|
| 2025-09-27 | [@FoKit](https://github.com/FoKit) 原版,[@Sliverkiss](https://github.com/Sliverkiss) 修复 blackBox 参数 |
| 2026-05-08 | 适配途虎小程序 v7.62.3: 原 `/User/GetInternalCenterInfo` 接口已下线,改为从 `/User/GetMemberSignInInfoAsync` 或 `/User/GetRightsList` 抓取 token |

## 已知限制

- **依赖第三方 blackBox 服务**: `tuhu.xn--ug8h.eu.org` 由 [@Sliverkiss](https://github.com/Sliverkiss) 维护,如该服务下线签到会失败
- **token 抓取需手动触发**: 每次 token 失效后需要重新进入小程序「我的」或「积分中心」页面刷新

## 致谢

- 原作者: [@FoKit](https://github.com/FoKit) ([原始仓库](https://github.com/FoKit/Scripts))
- blackBox 修复: [@Sliverkiss](https://github.com/Sliverkiss) ([参考脚本](https://github.com/Sliverkiss/GoodNight))
