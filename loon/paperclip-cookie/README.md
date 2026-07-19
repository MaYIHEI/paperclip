# Paperclip Cookie 抓取合集

> 🧪 待验证

集中管理 paperclip 全部签到脚本的 Cookie 抓取规则。每个脚本可独立开关，默认关闭；插件仅负责抓取，签到 cron 仍按各脚本 README 单独配置。

## 文件

- `paperclip-cookie.lpx` — 一键导入插件

## 使用步骤

1. 在 Loon 中导入插件：

   `https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/loon/paperclip-cookie/paperclip-cookie.lpx`

2. 仅开启需要抓取的脚本开关
3. 打开对应 App 或小程序并进入该脚本 README 所示页面
4. 收到 `✅ <名称> Cookie 获取成功` 通知即抓取成功

## 已知限制

- 仅包含 Cookie 抓取规则，不包含 cron 签到任务
- 每个脚本的触发页面和后续 cron 配置，以其目录下 README 为准
