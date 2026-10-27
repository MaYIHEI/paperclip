<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-checkin.png" width="80" alt="签到汇总" />
</p>

# 签到汇总

一条通知看完所有签到脚本今天的结果：哪些需要重新抓 Cookie、哪些失败、成功的拿到了什么奖励。

## 文件

- `summary.js` — 汇总脚本(cron,也可手动运行)

## 使用步骤

1. 用「[Paperclip · 签到合集](../../loon/paperclip-checkin/)」插件的，打开插件里的「统一通知」即可，不用另外添加
2. 单独配置签到脚本的，按下方对应平台添加 cron
3. 各签到脚本照常运行，每次运行会自动登记结果；其他作者的脚本按「[签到状态协议](../../docs/checkin-protocol.md)」写结果的，也会自动出现在汇总里
4. 每天 11:30 收到一条汇总；想马上看，手动运行一次「签到汇总」

通知示例:

```
✅ 4 成功 · ⚠️ 2 需重抓 · ❌ 1 失败
需重新抓取:微博超话、WPS
失败:万达电影(签名校验失败)
腾讯视频 +10 V力值
小米商城 +5 米金 · 连签 3 天
味多美 +2 积分 · 积分 120
未使用 2 个
```

- 名字后带日期，表示这条是当天之前的结果(比如那天之后签到脚本没有再运行)
- 「失败」多是网络异常等原因，不一定要重抓，可先手动运行一次该签到脚本
- 没抓过 Cookie 或没配账号的脚本只计入「未使用」

## Loon

```ini
[Script]
cron "30 11 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/summary/summary.js") with tag="签到汇总", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-checkin.png"
```

## Surge

```ini
[Script]
签到汇总 = type=cron,cronexp=30 11 * * *,timeout=30,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/summary/summary.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-checkin.png
```

## Quantumult X

```ini
[task_local]
30 11 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/summary/summary.js, tag=签到汇总, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-checkin.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 签到汇总
      cron: '30 11 * * *'
      timeout: 30
script-providers:
  签到汇总:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/summary/summary.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-10-15 | 初版「Cookie 体检」:列出需要重新抓取和签到失败的脚本 |
| 2026-10-18 | 改为「签到汇总」:加入成功明细和奖励，未使用只计数；11:30 发送 |
| 2026-10-19 | 加入徕芬；松山棉店归档移除 |
| 2026-10-27 | 按签到状态协议从公共索引发现脚本，支持其他作者的签到脚本；成功明细带上积分等资产数值 |

## 已知限制

- 签到时间晚于 11:30 的脚本，当天汇总显示的是前一天的结果(带日期)；可把汇总时间改晚，或手动运行
