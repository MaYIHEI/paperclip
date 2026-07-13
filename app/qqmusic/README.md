<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png" width="80" alt="QQ 音乐" />
</p>

# QQ 音乐

> 🧪 **待验证** · 原绿钻签到稳定;金币签到与 App 每日任务已完成接口验证,待跨日真跑。

QQ 音乐绿钻成长值、金币中心每日签到与 App 每日任务。**一次抓取后挂着代理即可,cron 自动续期、签到并领取已完成的任务奖励。**

## 文件

- `qqmusic.js` — 单脚本架构,既是抓取也是 cron 签到,按 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开 QQ 音乐 App →「我的 → 会员中心」,再进入「金币中心 → 每日签到」一次
3. 收到 `✅ QQ 音乐 Cookie 获取成功` 通知即抓取成功
4. 之后挂着代理就行,cron 每天自动续期 + 签到,**无需再开 App**;只有手机关机 / 断代理超过 3 天才需重抓

## Loon

```ini
[MITM]
hostname = u6.y.qq.com, music.y.qq.com

[Script]
http-request ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary) tag=QQ音乐 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
http-request ^https:\/\/music\.y\.qq\.com\/maproxy\/getInfo tag=QQ音乐广告模板, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png

cron "20 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js, tag=QQ音乐签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enable=true
```

## Surge

```ini
[MITM]
hostname = u6.y.qq.com, music.y.qq.com

[Script]
QQ音乐 Cookie = type=http-request,pattern=^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
QQ音乐广告模板 = type=http-request,pattern=^https:\/\/music\.y\.qq\.com\/maproxy\/getInfo,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png

QQ音乐签到 = type=cron,cronexp=20 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
```

## Quantumult X

```ini
[MITM]
hostname = u6.y.qq.com, music.y.qq.com

[rewrite_local]
^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js
^https:\/\/music\.y\.qq\.com\/maproxy\/getInfo url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js

[task_local]
20 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js, tag=QQ音乐签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: QQ音乐签到
      cron: '20 9 * * *'
      timeout: 60

http:
  mitm:
    - "u6.y.qq.com"
    - "music.y.qq.com"
  script:
    - match: ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary)
      name: QQ音乐 Cookie
      type: request
      require-body: true
    - match: ^https:\/\/music\.y\.qq\.com\/maproxy\/getInfo
      name: QQ音乐广告模板
      type: request
      require-body: true

script-providers:
  QQ音乐签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js
    interval: 86400
```

## BoxJS 开关

| key | 默认 | 说明 |
|---|---|---|
| `qqmusic_clear` | `false` | 一键清除已抓 Cookie,运行一次后自动复位 |
| `qqmusic_task_favorite` | `true` | 自动完成收藏歌曲和收藏有声书,领奖后恢复收藏状态 |
| `qqmusic_task_ad` | `false` | 实验性完成定时金币广告翻倍;需配置广告请求抓取并进一次金币中心 |
| `qqmusic_debug` | `false` | 打印续期/签到/任务请求与响应日志 |

## 已知限制

- **`refresh_key` 长期寿命未知**:实测长期不变、可无限续期,但最终会不会过期需长期观察。一旦失效,续期会失败、签到报错,重进签到页重抓即可。
- **手机关机 / 断代理超过 3 天**:可能需要重抓。日常挂着代理 + 每日 cron 不会触发。
- **每日任务**:自动领取所有已经完成的奖励;“定时领金币”在每次脚本运行时到点即可领;收藏歌曲和收藏有声书会临时操作,领奖后恢复。听歌满 5 分钟和分享歌曲仍需真实 App 行为。
- **广告任务**:“定时领金币”的广告翻倍已有实验开关,默认关闭且仍待跨日实测;其他看视频任务暂不自动执行。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-07-12 | 新增金币签到、App 动态签名、每日任务领奖与临时收藏歌曲/有声书任务 |
| 2026-06-15 | 初版:绿钻成长值每日签到,musickey 自动续期,后台无需开 App |
| 2026-06-15 | 抓取规则放宽:进会员中心首页即可触发,无需点进签到页 |

## 致谢

- App `zzc` 请求签名算法参考 [L-1124/QQMusicApi](https://github.com/L-1124/QQMusicApi)
