<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png" width="80" alt="扫描全能王" />
</p>

# 扫描全能王 · 幸运大转盘

每日自动完成「看视频抽奖」幸运大转盘(每日最多 3 次),无需真看视频,自动转盘领奖。奖品为云存储 / 优惠券 / VIP。

## 文件

- `camscanner.js` — cron 签到主体:查今日剩余次数 → 逐次获取 lottery_code(原生签名接口)→ 抽奖领奖
- `camscanner.cookie.js` — 重写抓 Cookie:监听 `get_user_attribute`,增量抓取 token / cs_ept_d / client_id

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开「扫描全能王」APP → 任意页面停留几秒(自动触发 `get_user_attribute`)
3. 收到 `✅ 扫描全能王 Cookie 获取成功` 通知即抓取成功(cs_ept_d / client_id 会在后续请求里自动补全)
4. cron 会按计划自动抽奖,并把每次中奖结果汇总推送

## Loon

```ini
[MITM]
hostname = api-cs.intsig.net

[Script]
http-request ^https:\/\/api-cs\.intsig\.net\/user\/cs\/get_user_attribute tag=扫描全能王 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.cookie.js, requires-body=false, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png

cron "15 10 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.js, tag=扫描全能王签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png, enable=true
```

## Surge

```ini
[MITM]
hostname = api-cs.intsig.net

[Script]
扫描全能王 Cookie = type=http-request,pattern=^https:\/\/api-cs\.intsig\.net\/user\/cs\/get_user_attribute,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png

扫描全能王签到 = type=cron,cronexp=15 10 * * *,timeout=120,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png
```

## Quantumult X

```ini
[MITM]
hostname = api-cs.intsig.net

[rewrite_local]
^https:\/\/api-cs\.intsig\.net\/user\/cs\/get_user_attribute url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.cookie.js

[task_local]
15 10 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.js, tag=扫描全能王签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/camscanner.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 扫描全能王签到
      cron: '15 10 * * *'
      timeout: 120

http:
  mitm:
    - "api-cs.intsig.net"
  script:
    - match: ^https:\/\/api-cs\.intsig\.net\/user\/cs\/get_user_attribute
      name: 扫描全能王 Cookie
      type: request
      require-body: false

script-providers:
  扫描全能王签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/camscanner/camscanner.js
    interval: 86400
```

## 实现细节

- **三段式流程**:`reward/big_lottery`(查 `day_count` 今日剩余次数,无需签名)→ `reward/task_handle?method=get_lottery_code`(原生接口,需签名,返回 `lottery_code`)→ `reward/lottery`(H5 接口,用 `lottery_code` 抽奖,返回中奖 `item`)。
- **签名算法**(逆向自 IPA v7.17.5,`cryptid=0` 脱壳 + lief/capstone 反汇编):
  - `sign = md5( key1=urlencode(v1)&key2=urlencode(v2)&…&keyN=urlencode(vN) + appSecret )`,key 按 ASCII 升序,拼接末尾**不带 `&`**。
  - 生产 `appSecret = intsig_v2_84ee85cdaaaf1867`。
- **`client_app` 双编码坑**:签名串里 `@` 编码为 `%40` 参与计算;实际 URL 里要写 `%2540`(双编码),服务端 URL-decode 一次得回 `%40`,才能与客户端 sign 串对上。
- **接口返回 `ret` 类型不统一**:成功有时是数字 `0`(task_handle),有时是字符串 `"200"`(big_lottery / lottery),判错时统一转字符串比对。
- **错误处理**:`ret 105/116` 或 `err` 含 token 判为 Cookie 失效,推送「请重新抓取」;`ret 109` 限频时等 5s 重试一次,避免静默丢失一次抽奖机会。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-20 | 初版:逆向签名算法,实现三段式自动抽奖 |
| 2026-06-20 | 接入 BoxJS;补清除 Cookie + 调试模式开关 |

## 已知限制

- token 有效期未实测,失效后需重新打开 APP 触发 `get_user_attribute` 重新抓取。
- `cs_ept_d` / `client_id` 可能分散在不同请求,首次抓取后需在 APP 内多停留几秒等其自动补全。
- 抽奖为概率制,中奖 `item` 由服务端决定,脚本只负责把机会用满。
