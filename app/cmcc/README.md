<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png" width="80" alt="中国移动" />
</p>

# 中国移动

中国移动 APP「签到赢好礼」每日签到,顺带查询积分。登录凭证长期有效、自动续期、免短信。


## 文件

- `cmcc.js` — 单文件:抓取(重写)+ cron 续登签到查积分
- `cmcc.data.js` / `cmcc.data.md` — 只读数据模块(给小组件等用,返回积分/话费/流量)
- Loon 插件见 [`loon/cmcc`](../../loon/cmcc/)

## 使用步骤

1. 按下方对应平台添加任务(含 MITM 与重写)
2. 先在后台划掉「中国移动」APP 再重新打开(已登录状态下直接切回来不会触发抓取)→ 进「签到赢好礼」活动页,**手动点一次签到**。脚本会自动抓到登录凭证、积分信封和签到标识,收到「✅ 中国移动 Cookie 获取成功」即完成,可关掉重写
3. 之后 cron 每天自动续登 → 签到 → 查积分;凭证长期有效,免短信
4. 「中国移动」APP 升级后,打开重写按第 2 步重新抓一次即可

## Loon

推荐导入插件:

```
https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/cmcc/cmcc.lpx
```

或手动添加:

```ini
[MITM]
hostname = client.app.coc.10086.cn, clientaccess.10086.cn, h5.bj.10086.cn

[Script]
request if ${url} ~= /^https:\/\/client\.app\.coc\.10086\.cn\/biz-orange\/[LD]N\/uam(onekey|randcode)login\/autoLogin/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js") with tag="中国移动 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png", requires_body=true
request if ${url} ~= /^https:\/\/clientaccess\.10086\.cn\/biz-orange\/BN\/scoreQueryService\/getScoreQuery/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js") with tag="中国移动 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png", requires_body=true
request if ${url} ~= /^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/doPrize/i then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js") with tag="中国移动 Cookie", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png"
cron "20 8 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js") with tag="中国移动签到", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png", timeout=60
```

## Surge

```ini
[MITM]
hostname = %APPEND% client.app.coc.10086.cn, clientaccess.10086.cn, h5.bj.10086.cn

[Script]
中国移动 Cookie = type=http-request,pattern=^https:\/\/client\.app\.coc\.10086\.cn\/biz-orange\/[LD]N\/uam(onekey|randcode)login\/autoLogin,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png
中国移动 Cookie 2 = type=http-request,pattern=^https:\/\/clientaccess\.10086\.cn\/biz-orange\/BN\/scoreQueryService\/getScoreQuery,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png
中国移动 Cookie 3 = type=http-request,pattern=^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/doPrize,requires-body=false,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png
中国移动签到 = type=cron,cronexp=20 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png
```

## Quantumult X

```ini
[rewrite_local]
^https:\/\/client\.app\.coc\.10086\.cn\/biz-orange\/[LD]N\/uam(onekey|randcode)login\/autoLogin url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js
^https:\/\/clientaccess\.10086\.cn\/biz-orange\/BN\/scoreQueryService\/getScoreQuery url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js
^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/doPrize url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js

[task_local]
20 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js, tag=中国移动签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/cmcc.png, enabled=true

[mitm]
hostname = client.app.coc.10086.cn, clientaccess.10086.cn, h5.bj.10086.cn
```

## Stash

```yaml
cron:
  script:
    - name: 中国移动签到
      cron: '20 8 * * *'
      timeout: 60

http:
  mitm:
    - "client.app.coc.10086.cn"
    - "clientaccess.10086.cn"
    - "h5.bj.10086.cn"
  script:
    - match: ^https:\/\/client\.app\.coc\.10086\.cn\/biz-orange\/[LD]N\/uam(onekey|randcode)login\/autoLogin
      name: 中国移动 Cookie
      type: request
      require-body: true
    - match: ^https:\/\/clientaccess\.10086\.cn\/biz-orange\/BN\/scoreQueryService\/getScoreQuery
      name: 中国移动 Cookie 2
      type: request
      require-body: true
    - match: ^https:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/doPrize
      name: 中国移动 Cookie 3
      type: request
      require-body: false

script-providers:
  中国移动签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/cmcc/cmcc.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-10-21 | 🧪 初版:打开 APP 抓凭证,cron 静默续登(免短信)查积分 |
| 2026-10-21 | 🧪 r2:接入「签到赢好礼」签到(续登 → 换令牌 → doPrize),处理「今日已签」;抓一次签到即可 |
| 2026-10-22 | 🧪 r3:兼容一键登录抓取;接入签到合集与 Cookie 抓取合集 |
| 2026-10-22 | 🧪 r4:修复 Loon 抓不到 Cookie;抓取前需先划掉 APP 重开 |
| 2026-10-25 | 🧪 r5:支持多账号(每个账号冷启动抓一次,cron 逐个签到查积分) |
| 2026-10-26 | 🧪 r6:UA 跟随抓取时的 App 版本(App 升级后旧版本号被服务端拒,改成动态) |
| 2026-10-26 | 🧪 r7:抓到签到标识时也弹「Cookie 获取成功」通知 |
| 2026-10-26 | 🧪 r9:修复短时间内重复运行续登失败(x-sign错误) |
| 2026-10-26 | r10:续登时自动刷新登录参数,不再需要隔几天重新抓取 |
