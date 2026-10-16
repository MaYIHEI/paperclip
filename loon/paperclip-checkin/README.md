<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-checkin.png" width="80" alt="Paperclip 签到合集" />
</p>

# Paperclip 签到合集

> 🧪 待验证 · Loon 3.5.1(983)+

一个插件装好 paperclip 全部在用的签到脚本，每个脚本一个开关，常用设置直接在插件里填，不用 BoxJS。

## 文件

- `paperclip-checkin.lpx` — Loon 插件（只含定时签到，不含 MITM）

## 使用步骤

1. 导入本插件和「[Paperclip · Cookie 抓取合集](../paperclip-cookie/)」
2. 在抓取合集里打开要用的脚本，进对应 App / 小程序页面，收到 `✅ <名称> Cookie 获取成功` 后关掉抓取合集
3. 在本插件的设置里打开同名脚本的开关，按需调整它下面的选项
4. 每天按各脚本 README 的时间自动签到；12:00「Cookie 体检」汇总哪些需要重新抓取

导入地址：

```
https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/paperclip-checkin/paperclip-checkin.lpx
```

## 插件设置

- 每个脚本一个「签到」开关，默认关闭；体检默认打开，只统计已打开的脚本
- 必填项：NodeSeek 中继地址和密钥、AgentRouter 账号密码、网上国网手机号和密码
- 任务开关：WPS 各项任务、QQ 音乐收藏和活动任务、林里兑换、龙湖天街 App 随机时段和抽奖
- 输入框留空时读 BoxJS 里的同名设置；插件里填了就以插件为准
- 请求间隔、通知条数、米游社游戏筛选等少用设置仍在 BoxJS

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-10-16 | 初版：31 个签到脚本 + Cookie 体检，常用设置在插件里填 |

## 已知限制

- 签到时间固定为各脚本 README 里的时间，不在插件里修改
- 龙德广场与北京华联同一会员体系，两个都打开会各签一次，通常只开一个即可
- 「清除 Cookie」仍在 BoxJS 操作
