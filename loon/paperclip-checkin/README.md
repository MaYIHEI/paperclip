<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-checkin.png" width="80" alt="Paperclip 签到合集" />
</p>

# Paperclip 签到合集

> Loon 3.5.1(983)+

一个插件装好 paperclip 全部在用的签到脚本。签到开关默认全开，抓了哪个脚本的 Cookie，哪个就开始签到。

## 文件

- `paperclip-checkin.lpx` — Loon 插件（定时签到 + 补签入口，不含 MITM）

## 使用步骤

1. 导入本插件和「[Paperclip · Cookie 抓取合集](../paperclip-cookie/)」
2. 在抓取合集里打开要用的脚本，进对应 App / 小程序页面，收到 `✅ <名称> Cookie 获取成功` 后关掉抓取合集
3. 签到开关默认全开，不想签的脚本在插件设置里关掉
4. 每天按各脚本 README 的时间自动签到；11:30 收到一条「签到汇总」，列出需要重抓、失败和成功拿到的奖励

导入地址：

```
https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/paperclip-checkin/paperclip-checkin.lpx
```

## 插件设置

- 每个脚本一个「签到」开关，默认全开；没抓过 Cookie 或没配账号的脚本记为「未使用」
- 「统一通知」开关默认打开：各脚本不再单独弹通知，11:30 一条汇总，只统计打开了签到开关的脚本，未使用的只计数；关闭后各脚本各自通知
- 账号、任务开关等设置都在 BoxJS 里填（AgentRouter、网上国网账号、WPS 各项任务等）
- 补签入口：桌面小组件（或浏览器）打开 `http://1.1.1.1/checkin/<脚本>` 会现跑一次该脚本的签到，返回签到结果；地址见 BoxJS 里 `checkin_registry` 各项的 `run`，跟随该脚本的签到开关
- 签到数据：打开 `http://1.1.1.1/checkin/all` 一次拿到全部脚本的登记信息和最近签到结果（JSON），只读不签到，签到开关关掉的脚本也会列出

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-10-16 | 初版：31 个签到脚本 + Cookie 体检，常用设置在插件里填 |
| 2026-10-18 | 签到开关默认全开；账号和任务设置移回 BoxJS，插件只留开关 |
| 2026-10-18 | Cookie 体检并入「统一通知」：各脚本静默，11:30 一条签到汇总（含奖励明细） |
| 2026-10-19 | 加入徕芬；松山棉店归档移除 |
| 2026-10-22 | 加入中国移动 |
| 2026-10-22 | 加入小黑盒 |
| 2026-10-28 | 加入补签入口（25 个脚本），小组件可一键现跑签到 |
| 2026-10-28 | 加入签到数据地址 `http://1.1.1.1/checkin/all` |

## 已知限制

- 签到时间固定为各脚本 README 里的时间，不在插件里修改
- 龙德广场与北京华联同一会员体系，两个都打开会各签一次，通常只开一个即可
- 「清除 Cookie」仍在 BoxJS 操作
- 小米抽奖、QQ 音乐、WPS、AgentRouter、扫描全能王、名创优品、微博超话、龙湖天街 App 跑得久或依赖随机时间，没有补签入口
- 网上国网、AgentRouter 也有各自的单独插件；用签到合集时请关掉单独插件，否则每天会签两次
