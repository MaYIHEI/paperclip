<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png" width="80" alt="QQ 音乐" />
</p>

# QQ 音乐

> ✅ **维护中** · 绿钻与金币签到、每日任务、定时奖励和红包雨均已接入;正式版不含广告任务。

QQ 音乐绿钻成长值、金币中心签到、App 每日任务与金币抽奖。**一次抓取后挂着代理即可,cron 自动续期、签到、做任务并领奖。**

## 文件

- `qqmusic.js` — 单脚本架构,既是抓取也是 cron 签到,按 `$request` 是否存在区分

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开 QQ 音乐 App →「我的 → 会员中心」,再进入「金币中心 → 每日签到」一次
3. 收到 `✅ QQ 音乐 Cookie 获取成功` 通知即主凭证抓取成功
4. 之后挂着代理即可;主凭证会自动续期

## Loon

```ini
[MITM]
hostname = u6.y.qq.com

[Script]
http-request ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary) tag=QQ音乐 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png

cron "0 30 7 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, tag=QQ音乐每日任务, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enable=true
cron "0 * 9-10 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, tag=QQ音乐定时金币, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enable=true
cron "0 5 0,8,12,16,20,22 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, tag=QQ音乐红包雨, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enable=true
```

最终只保留上面三条 cron,不要再添加旧的 `20 9 * * *`。第一条 07:30 负责续期、两套签到、普通每日任务和免费抽奖;若当时未运行,当天后续 cron 会补跑一次。第二条在 9–10 点每分钟唤醒,普通定时金币与独立宝箱分别按各自返回的 `TargetNum / Progress / TaskMaxTimes / State` 维护下次查询时间;未到任一任务时间时只在本地退出,不发网络请求。某一类任务未下发或达到当天上限后,只关闭该类任务。第三条在红包雨六个时段开始后各运行一次,红包雨按自己的 `timeSegment / restChance` 判断,每个时段只请求一次。每次 cron 的结果最多汇总为一条通知,没有新结果时不通知。

## Surge

```ini
[MITM]
hostname = u6.y.qq.com

[Script]
QQ音乐 Cookie = type=http-request,pattern=^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
QQ音乐每日任务 = type=cron,cronexp=30 7 * * *,timeout=1200,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
QQ音乐定时金币 = type=cron,cronexp=* 9-10 * * *,timeout=1200,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
QQ音乐红包雨 = type=cron,cronexp=5 0,8,12,16,20,22 * * *,timeout=1200,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png
```

## Quantumult X

```ini
[MITM]
hostname = u6.y.qq.com

[rewrite_local]
^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js

[task_local]
30 7 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, tag=QQ音乐每日任务, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enabled=true
* 9-10 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, tag=QQ音乐定时金币, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enabled=true
5 0,8,12,16,20,22 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js, tag=QQ音乐红包雨, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/qqmusic.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: QQ音乐每日任务
      cron: '30 7 * * *'
      timeout: 1200
    - name: QQ音乐定时金币
      cron: '* 9-10 * * *'
      timeout: 1200
    - name: QQ音乐红包雨
      cron: '5 0,8,12,16,20,22 * * *'
      timeout: 1200

http:
  mitm:
    - "u6.y.qq.com"
  script:
    - match: ^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary)
      name: QQ音乐 Cookie
      type: request
      require-body: true

script-providers:
  QQ音乐每日任务:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js
    interval: 86400
  QQ音乐定时金币:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js
    interval: 86400
  QQ音乐红包雨:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js
    interval: 86400
```

## BoxJS 开关

| key | 默认 | 说明 |
|---|---|---|
| `qqmusic_clear` | `false` | 一键清除已抓 Cookie,运行一次后自动复位 |
| `qqmusic_task_favorite` | `true` | 临时收藏歌曲、歌单、有声书并关注歌手,领奖后恢复原状态 |
| `qqmusic_task_activity` | `true` | 金币抽奖签到、红包雨、浮动宝箱及可直接完成的活动任务（含“种摇钱树领免费绿钻”任务卡） |
| `qqmusic_debug` | `false` | 打印续期/签到/任务请求与响应日志 |

## 已知限制

- **`refresh_key` 长期寿命未知**:实测长期不变、可无限续期,但最终会不会过期需长期观察。一旦失效,续期会失败、签到报错,重进签到页重抓即可。
- **手机关机 / 断代理超过 3 天**:可能需要重抓。日常挂着代理 + 每日 cron 不会触发。
- **每日任务**:会完成可安全恢复的收藏/关注任务并领取所有已完成奖励。“定时领金币”和右下角浮动宝箱是两个独立任务,分别以服务端返回的间隔和进度调度,不假定二者间隔相同;听歌时长和分享歌曲仍要求真实 App 行为,脚本不会伪造分享。
- **红包雨时段**:每天 `00:00–08:00`、`08:00–12:00`、`12:00–16:00`、`16:00–20:00`、`20:00–22:00`、`22:00–24:00`,每段 6 次。脚本退出后不能自行唤醒;要覆盖全部时段,需由 Loon 等调度器在每段各运行一次。
- **摇钱树任务卡**:脚本会直接上报并领取“种摇钱树领免费绿钻”每日任务奖励,无需额外凭证;不会进入游戏执行签到、浇水、摇树或阶段领奖。
- **广告任务**:正式脚本不抓广告 ID、不请求广告素材,也不执行看视频、广告翻倍或广告换水。旧实验实现仅在本地测试目录归档,不发布到仓库。

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-08-18 | r21 从 testing 转入 main,正式版保持无广告并使用三条独立 cron |
| 2026-08-05 | r21 每日一次性流程拆为 07:30 独立 cron,错过后由当天后续 cron 补跑;定时金币与红包雨保持独立调度 |
| 2026-08-05 | r20 普通定时金币与独立宝箱按各自服务端间隔独立调度;每分钟仅本地检查到期状态,未到时间不联网,未下发或达到上限后关闭对应来源,无奖励批次保持静默 |
| 2026-08-05 | r19 按每日、定时任务批次和红包雨时段分流,增加本地防重复锁,密集 cron 不再运行整套流程 |
| 2026-08-05 | r18 移除摇钱树游戏凭证与自动玩法,保留每日任务卡直接完成;统一四个平台的两条 cron 配置 |
| 2026-07-28 | r17 正式版移除广告抓取与执行链,实验代码移出仓库并仅作本地归档 |
| 2026-07-28 | r16 调整歌单收藏任务通道并增加活动进度回退;接入独立浮动宝箱、摇钱树浏览奖励及无广告种树流程 |
| 2026-07-12 | 新增金币签到、App 动态签名、每日任务领奖与临时收藏歌曲/有声书任务 |
| 2026-06-15 | 初版:绿钻成长值每日签到,musickey 自动续期,后台无需开 App |
| 2026-06-15 | 抓取规则放宽:进会员中心首页即可触发,无需点进签到页 |

## 致谢

- App `zzc` 请求签名算法参考 [L-1124/QQMusicApi](https://github.com/L-1124/QQMusicApi)
