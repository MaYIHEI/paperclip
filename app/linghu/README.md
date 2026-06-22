<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linghu.png" width="80" alt="灵狐灵购" />
</p>

# 灵狐灵购 🧪

灵狐灵购 APP 每日签到领红包,支持连签奖励。

## 文件

- `linghu.js` — 既是重写抓 cookie 也是 cron 签到,根据 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开灵狐灵购 APP → 进入「商城」或「我的」页面,触发 `my/info`
3. 收到 `✅ 灵狐灵购 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到(Cookie 约 90 天有效,失效后重抓一次)

## Loon

```ini
[MITM]
hostname = cn-yx-wxmall.dreame.tech

[Script]
http-request ^https:\/\/cn-yx-wxmall\.dreame\.tech\/main\/my\/info tag=灵狐灵购 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/linghu/linghu.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linghu.png

cron "33 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/linghu/linghu.js, tag=灵狐灵购签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linghu.png, enable=true
```

## Surge

```ini
[MITM]
hostname = cn-yx-wxmall.dreame.tech

[Script]
灵狐灵购 Cookie = type=http-request,pattern=^https:\/\/cn-yx-wxmall\.dreame\.tech\/main\/my\/info,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/linghu/linghu.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linghu.png

灵狐灵购签到 = type=cron,cronexp=33 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/linghu/linghu.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linghu.png
```

## Quantumult X

```ini
[MITM]
hostname = cn-yx-wxmall.dreame.tech

[rewrite_local]
^https:\/\/cn-yx-wxmall\.dreame\.tech\/main\/my\/info url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/linghu/linghu.js

[task_local]
33 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/linghu/linghu.js, tag=灵狐灵购签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/linghu.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 灵狐灵购签到
      cron: '33 8 * * *'
      timeout: 60

http:
  mitm:
    - "cn-yx-wxmall.dreame.tech"
  script:
    - match: ^https:\/\/cn-yx-wxmall\.dreame\.tech\/main\/my\/info
      name: 灵狐灵购 Cookie
      type: request
      require-body: true

script-providers:
  灵狐灵购签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/linghu/linghu.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-22 | 初版,基于灵狐灵购抓包验证(签名 sign-in 真值逐字节复现) |

## 已知限制

- **未经多日真机验证**:签到逻辑已抓包比对、签名真值复现,完整流程尚未在真机定时任务下长期跑过;首次 cron 跑时留意通知结果
- Cookie(sessid)有效期约 90 天,失效后需重新打开 APP 抓取
- 客户端版本标识为抓包时的固定值,APP 大版本更新后若签到失败,需重新抓包对照更新脚本常量
