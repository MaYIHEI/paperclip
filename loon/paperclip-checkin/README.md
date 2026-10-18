<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-checkin.png" width="80" alt="Paperclip 签到合集" />
</p>

# Paperclip 签到合集

> 🧪 待验证 · Loon 3.5.1(983)+

一个插件装好 paperclip 全部在用的签到脚本。签到开关默认全开，抓了哪个脚本的 Cookie，哪个就开始签到。

## 文件

- `paperclip-checkin.lpx` — Loon 插件（只含定时签到，不含 MITM）

## 使用步骤

1. 导入本插件和「[Paperclip · Cookie 抓取合集](../paperclip-cookie/)」
2. 在抓取合集里打开要用的脚本，进对应 App / 小程序页面，收到 `✅ <名称> Cookie 获取成功` 后关掉抓取合集
3. 签到开关默认全开，不想签的脚本在插件设置里关掉
4. 每天按各脚本 README 的时间自动签到；12:00「Cookie 体检」汇总哪些需要重新抓取

导入地址：

```
https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/paperclip-checkin/paperclip-checkin.lpx
```

## 插件设置

- 每个脚本一个「签到」开关，默认全开；没抓过 Cookie 或没配账号的脚本记为「未使用」
- 「Cookie 体检」开关默认打开，只统计打开了签到开关的脚本，未使用的只计数
- 账号、任务开关等设置都在 BoxJS 里填（AgentRouter、网上国网账号、WPS 各项任务等）

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-10-16 | 初版：31 个签到脚本 + Cookie 体检，常用设置在插件里填 |
| 2026-10-18 | 签到开关默认全开；账号和任务设置移回 BoxJS，插件只留开关 |

## 已知限制

- 签到时间固定为各脚本 README 里的时间，不在插件里修改
- 龙德广场与北京华联同一会员体系，两个都打开会各签一次，通常只开一个即可
- 「清除 Cookie」仍在 BoxJS 操作
