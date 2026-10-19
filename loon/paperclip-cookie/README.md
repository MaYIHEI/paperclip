<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-cookie.png" width="80" alt="Paperclip Cookie 抓取合集" />
</p>

# Paperclip Cookie 抓取合集

> 🧪 待验证 · Loon 3.5.1(983)+

集中抓取 paperclip 全部在用签到脚本的 Cookie。没有单独开关，整个插件就是开关；签到用「[Paperclip · 签到合集](../paperclip-checkin/)」。

## 文件

- `paperclip-cookie.lpx` — Loon 插件（只含抓取规则和 MITM）

## 使用步骤

1. 在 Loon 中导入插件：

   ```
   https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/paperclip-cookie/paperclip-cookie.lpx
   ```

2. 打开本插件，进要用的 App 或小程序页面（触发页面见各脚本 README），可以一次进好几个
3. 收到 `✅ <名称> Cookie 获取成功` 通知即抓取成功
4. 抓完关掉整个插件，避免一直解密这些域名；Cookie 失效（体检提示）时再打开重抓

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-10-16 | 补齐全部在用脚本(29 个)，去掉已归档脚本；改用 Loon 新语法，换新图标 |
| 2026-10-16 | 去掉单独开关，规则常开；北京华联按小程序区分，与龙德广场可同时抓取 |
| 2026-10-19 | 加入徕芬；松山棉店归档移除 |

## 已知限制

- AgentRouter、网上国网用账号登录，不需要抓 Cookie，不在本插件里
- 每个脚本的触发页面以其目录下 README 为准
