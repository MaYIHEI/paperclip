<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-cookie.png" width="80" alt="Paperclip Cookie 抓取合集" />
</p>

# Paperclip Cookie 抓取合集

> 🧪 待验证 · Loon 3.5.1(983)+

集中抓取 paperclip 全部在用签到脚本的 Cookie。每个脚本一个开关，默认关闭；签到用「[Paperclip · 签到合集](../paperclip-checkin/)」。

## 文件

- `paperclip-cookie.lpx` — Loon 插件（只含抓取规则和 MITM）

## 使用步骤

1. 在 Loon 中导入插件：

   ```
   https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/loon/paperclip-cookie/paperclip-cookie.lpx
   ```

2. 只打开需要抓取的脚本开关
3. 打开对应 App 或小程序，进入该脚本 README 所示页面
4. 收到 `✅ <名称> Cookie 获取成功` 通知即抓取成功
5. 抓完关掉整个插件，避免一直解密这些域名；Cookie 失效（体检提示）时再打开重抓

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-10-16 | 补齐全部在用脚本(29 个)，去掉已归档脚本；改用 Loon 新语法，换新图标 |

## 已知限制

- AgentRouter、网上国网用账号登录，不需要抓 Cookie，不在本插件里
- 龙德广场与北京华联抓取地址相同，两个都开只有龙德生效（同一会员体系，开一个即可）
- 每个脚本的触发页面以其目录下 README 为准
