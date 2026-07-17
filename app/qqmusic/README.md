<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png" width="80" alt="QQ 音乐" />
</p>

# QQ 音乐

> 🧪 **待验证** · 原绿钻签到稳定;金币签到、每日任务与部分广告链路已完成接口还原,新增部分待跨日真跑。

QQ 音乐绿钻成长值、金币中心签到、App 每日任务、金币抽奖与部分广告奖励。**一次抓取后挂着代理即可,cron 自动续期、签到、做任务并领奖。**

## 文件

- `qqmusic.js` — 单脚本架构,既是抓取也是 cron 签到,按 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开 QQ 音乐 App →「我的 → 会员中心」,再进入「金币中心 → 每日签到」一次
3. 如需广告任务,在金币中心点一次任意广告入口,让广告加载出来;脚本会保存广告请求模板
4. 收到 `✅ QQ 音乐 Cookie 获取成功` 通知即主凭证抓取成功
5. 之后挂着代理即可,一个 cron 会在本次运行中依次等待并处理广告,不需要另加多条 cron;只有手机关机 / 断代理超过 3 天才可能需要重抓

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

QQ音乐签到 = type=cron,cronexp=20 9 * * *,timeout=1200,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
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
      timeout: 1200

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
| `qqmusic_task_favorite` | `true` | 临时收藏歌曲、歌单、有声书并关注歌手,领奖后恢复原状态 |
| `qqmusic_task_activity` | `true` | 金币抽奖签到、使用剩余抽奖次数、红包雨及可直接完成的活动任务 |
| `qqmusic_task_ad` | `true` | 任务奖励 ECPM 广告翻倍和看广告领抽奖次数;首次需加载一次广告 |
| `qqmusic_ad_max` | `20` | 单次运行最多尝试的广告数,范围 1–30 |
| `qqmusic_debug` | `false` | 打印续期/签到/任务请求与响应日志 |

## 已知限制

- **`refresh_key` 长期寿命未知**:实测长期不变、可无限续期,但最终会不会过期需长期观察。一旦失效,续期会失败、签到报错,重进签到页重抓即可。
- **手机关机 / 断代理超过 3 天**:可能需要重抓。日常挂着代理 + 每日 cron 不会触发。
- **每日任务**:会完成可安全恢复的收藏/关注任务并领取所有已完成奖励。“定时领金币”每次脚本运行到点可领一次;听歌时长和分享歌曲仍要求真实 App 行为,脚本不会伪造分享。
- **QQ 音乐内广告**:已接入领奖后返回的 ECPM 翻倍任务和“看广告领金币抽奖次数”,按广告要求等待后领奖,并继续执行服务端返回的下一条广告。固定金额的“看视频领金币”使用原生广告 SDK 播放完成后生成的新票据,不能拿初始票据代替,当前不会误报完成。
- **跳转后返回奖励**:这是广告的二次激励。广告响应明确给出二次金币、奖励类型和停留时间时,脚本会额外等待至少 5 秒并尝试回传落地页奖励字段;脚本环境不能真的打开京东再切回 QQ 音乐,仍需跨日验证哪些广告位只校验服务端回传、哪些必须收到原生返回回调。独立的 `OPEN_AD` 外跳任务当前也不会误报完成。
- **抓包互不干扰**:脚本自己发出的广告请求带内部标记,抓取分支会忽略它,不会覆盖你手工抓到的广告模板。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-07-17 | 扩展每日收藏/关注及附属活动;接入 ECPM 广告翻倍、广告领抽奖次数和二次落地页奖励回传 |
| 2026-07-12 | 新增金币签到、App 动态签名、每日任务领奖与临时收藏歌曲/有声书任务 |
| 2026-06-15 | 初版:绿钻成长值每日签到,musickey 自动续期,后台无需开 App |
| 2026-06-15 | 抓取规则放宽:进会员中心首页即可触发,无需点进签到页 |

## 致谢

- App `zzc` 请求签名算法参考 [L-1124/QQMusicApi](https://github.com/L-1124/QQMusicApi)
