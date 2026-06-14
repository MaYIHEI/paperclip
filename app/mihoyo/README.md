<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png" width="80" alt="米游社" />
</p>

# 米游社

米游社签到原神/星穹铁道/绝区零/崩坏3。米游币任务官方已下线,本脚本只保留每日签到。

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
hostname = bbs-api.miyoushe.com, api-takumi.mihoyo.com

[Script]
http-response ^https:\/\/bbs-api\.miyoushe\.com\/(apihub|user|misc)\/ tag=米游社 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.cookie.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png

cron "13 6 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js, tag=米游社签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png, enable=true
```

## Surge

```ini
[MITM]
hostname = bbs-api.miyoushe.com, api-takumi.mihoyo.com

[Script]
米游社 Cookie = type=http-response,pattern=^https:\/\/bbs-api\.miyoushe\.com\/(apihub|user|misc)\/,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png

米游社签到 = type=cron,cronexp=13 6 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/mihoyo.png
```

## Quantumult X

```ini
[MITM]
hostname = bbs-api.miyoushe.com, api-takumi.mihoyo.com

[rewrite_local]
^https:\/\/bbs-api\.miyoushe\.com\/(apihub|user|misc)\/ url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.cookie.js

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
    - "bbs-api.miyoushe.com"
    - "api-takumi.mihoyo.com"
  script:
    - match: ^https:\/\/bbs-api\.miyoushe\.com\/(apihub|user|misc)\/
      name: 米游社 Cookie
      type: response
      require-body: true

script-providers:
  米游社签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/mihoyo/mihoyo.js
    interval: 86400
```

## 实现细节

### 两类 cookie

- **stoken cookie**:从米游社 BBS 接口的响应体抠角色列表(http-response + requires-body=1,绕开 DS 校验)
- **web 签到 cookie**:luna 签到接口对 DS 校验宽松,web cookie 自然 30 天有效

### 米游币任务说明

2026-05 米哈游官方下线浏览/点赞/分享卡片,**只保留每日签到**。
打卡接口是 v2 DS 重放检测,无解。本脚本只做签到。

### BoxJS 参数

| key | 说明 |
|---|---|
| `mhy_delete_cookie` | 开启后下次跑会清空已存 cookie |
| `mhy_games` | 签到游戏过滤(留空=全部,可选 `hk4e_cn`/`hkrpg_cn`/`nap_cn`/`bh3_cn`) |
| `mhy_req_interval` | 多游戏签到间隔毫秒(默认 2000) |

## 维护记录

| 日期 | 变更 |
|---|---|
| - | 业务参考 [@kayanouriko](https://github.com/kayanouriko) / [@daye99](https://github.com/daye99) / [@Womsxd](https://github.com/Womsxd) |
| 2026-05 | 米哈游官方下线米游币任务,删除浏览/点赞/分享代码,只保留每日签到 |
| 2026-05-24 | tag 统一为 `米游社 Cookie` / `米游社签到`,加 img-url 图标 |

## 已知限制

- 米游币任务**整体放弃**(打卡 v2 DS 重放检测无解,其他任务官方已下线)
- web cookie 30 天有效,失效需重抓

## 致谢

- 业务参考: [@kayanouriko](https://github.com/kayanouriko) / [@daye99](https://github.com/daye99) / [@Womsxd](https://github.com/Womsxd)
- 实现/维护: [@MaYIHEI](https://github.com/MaYIHEI/paperclip)
