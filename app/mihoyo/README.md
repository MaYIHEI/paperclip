<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png" width="80" alt="米游社" />
</p>

# 米游社

米游社签到原神/星穹铁道/绝区零/崩坏3/崩坏学园2/未定事件簿。米游币任务官方已下线,本脚本只保留每日签到。

## 文件

- `mihoyo.cookie.js` — Cookie 抓取脚本(http-request/response 重写)
- `mihoyo.js` — 签到主脚本(cron)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开「米游社」APP → 进入「米游社首页」+「任意游戏每日签到页」(分别抓 stoken + web cookie)
3. 两处都抓到后,「米游社 Cookie」通知显示 `✅角色 ✅签到` 即就绪
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = api-takumi.miyoushe.com, api-takumi.mihoyo.com

[Script]
http-response ^https:\/\/api-takumi\.(miyoushe|mihoyo)\.com\/(binding\/api\/getUserGameRolesByStoken|event\/luna\/) tag=米游社 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.cookie.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png

cron "13 6 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js, tag=米游社签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png, enable=true
```

## Surge

```ini
[MITM]
hostname = api-takumi.miyoushe.com, api-takumi.mihoyo.com

[Script]
米游社 Cookie = type=http-response,pattern=^https:\/\/api-takumi\.(miyoushe|mihoyo)\.com\/(binding\/api\/getUserGameRolesByStoken|event\/luna\/),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png

米游社签到 = type=cron,cronexp=13 6 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png
```

## Quantumult X

```ini
[MITM]
hostname = api-takumi.miyoushe.com, api-takumi.mihoyo.com

[rewrite_local]
^https:\/\/api-takumi\.(miyoushe|mihoyo)\.com\/(binding\/api\/getUserGameRolesByStoken|event\/luna\/) url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.cookie.js

[task_local]
13 6 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js, tag=米游社签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 米游社签到
      cron: '13 6 * * *'
      timeout: 60

http:
  mitm:
    - "api-takumi.miyoushe.com"
    - "api-takumi.mihoyo.com"
  script:
    - match: ^https:\/\/api-takumi\.(miyoushe|mihoyo)\.com\/(binding\/api\/getUserGameRolesByStoken|event\/luna\/)
      name: 米游社 Cookie
      type: response
      require-body: true

script-providers:
  米游社签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js
    interval: 86400
```

## BoxJS 参数

| key | 说明 |
|---|---|
| `mhy_delete_cookie` | 开启后下次跑会清空已存 cookie |
| `mhy_games` | 签到游戏过滤(留空=全部,可选 `hk4e_cn`/`hkrpg_cn`/`nap_cn`/`bh3_cn`/`bh2_cn`/`nxx_cn`) |
| `mhy_req_interval` | 多游戏签到间隔毫秒(默认 2000) |

## 维护记录

| 日期 | 变更 |
|---|---|
| - | 业务参考 [@kayanouriko](https://github.com/kayanouriko) / [@daye99](https://github.com/daye99) / [@Womsxd](https://github.com/Womsxd) |
| 2026-05 | 米哈游官方下线米游币任务,删除浏览/点赞/分享代码,只保留每日签到 |
| 2026-05-24 | tag 统一为 `米游社 Cookie` / `米游社签到`,加 img-url 图标 |
| 2026-06-27 | 修复米游社改版后 Cookie 抓不到的问题;更新重写规则,请删掉旧规则换成本页新配置,再按抓取步骤重抓一次 |
| 2026-07-27 | 补全崩坏学园2(`bh2_cn`)和未定事件簿(`nxx_cn`)签到配置 |

## 已知限制

- 米游币任务**整体放弃**(打卡 v2 DS 重放检测无解,其他任务官方已下线)
- web cookie 30 天有效,失效需重抓

## 致谢

- 业务参考: [@kayanouriko](https://github.com/kayanouriko) / [@daye99](https://github.com/daye99) / [@Womsxd](https://github.com/Womsxd)
- 实现/维护: [@MaYIHEI](https://github.com/MaYIHEI/paperclip)
