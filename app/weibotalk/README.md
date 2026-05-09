# 📎 weibotalk · 微博超话

微博 APP「超话社区」每日自动签到,支持所有已关注超话。

> 本脚本基于 [@toulanboy/scripts](https://github.com/toulanboy/scripts) 重构,适配 2026-05 之后的微博 APP 版本。

---

## 📍 Raw URL

| 文件 | 用途 |
|---|---|
| `weibotalk.js` | 主签到脚本(cron 定时) |
| `weibotalk.cookie.js` | Cookie 抓取脚本(http-request 重写) |

```
https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/weibotalk/weibotalk.js
https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/weibotalk/weibotalk.cookie.js
```

---

## ⚙️ 重写规则

> ⚠️ 必须同时匹配两个接口:
> - `container_timeline_topicsub` (关注列表)
> - `page/button` (签到接口)

### Surge

```ini
[MITM]
hostname = api.weibo.cn

[Script]
微博超话cookie获取 = type=http-request,pattern=^https?:\/\/api\.weibo\.cn\/2\/(statuses\/container_timeline_topicsub|page\/button),script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/weibotalk/weibotalk.cookie.js
微博超话 = type=cron,cronexp="5 0 * * *",script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/weibotalk/weibotalk.js,wake-system=true,timeout=600
```

### Loon

```ini
[MITM]
hostname = api.weibo.cn

[Script]
http-request ^https?:\/\/api\.weibo\.cn\/2\/(statuses\/container_timeline_topicsub|page\/button) script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/weibotalk/weibotalk.cookie.js, requires-body=false, tag=微博超话cookie获取
cron "5 0 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/weibotalk/weibotalk.js, timeout=600, tag=微博超话
```

### Quantumult X

```ini
[MITM]
hostname = api.weibo.cn

[rewrite_local]
^https?:\/\/api\.weibo\.cn\/2\/(statuses\/container_timeline_topicsub|page\/button) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/weibotalk/weibotalk.cookie.js

[task_local]
5 0 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/weibotalk/weibotalk.js, tag=微博超话, enabled=true
```

---

## 🚀 使用步骤

### 第一步: 抓取 Cookie(两次)

1. 在代理工具中开启 cookie 抓取脚本与 MITM
2. 打开微博 APP

#### 抓取 1: 关注列表

3. 底部 **"我的"** → 中间 **"超话社区"** → 底部 **"我的"** → **"关注"**
4. 通知栏出现 **"✅ 已获取关注列表 Cookie"**

#### 抓取 2: 签到接口

5. 在关注列表里**点进任意一个超话**
6. **手动点签到按钮**(已经签到过的超话也可以,只要点签到按钮触发请求即可)
7. 通知栏出现 **"🎉 已获取签到 Cookie"**

#### 完成

8. 通知里看到 "✨ 列表 + 签到 cookie 都已就绪" 即可
9. **关闭 cookie 抓取脚本**(避免后续被反复覆盖)

> 💡 为什么需要两次抓取?
> 微博新版接口加了 `X-Validator` 风控签名,该签名与请求路径强绑定。
> 列表接口和签到接口路径不同,validator 不能跨路径复用,所以必须分别抓取。

### 第二步: 自动签到

cron 默认每天 00:05 执行。
首次配置后建议立即手动跑一次任务验证,代理工具脚本管理界面找到"微博超话"点"运行"。

---

## 🔧 BoxJS 配置项

| KEY | 默认值 | 说明 |
|---|---|---|
| `wb_delete_cookie` | `false` | 设 `true` 清空 cookie 后自动复位 |
| `wb_msg_max_num` | `30` | 单条通知显示的超话数量 |
| `wb_request_time` | `700` | 签到间隔(毫秒),关注超话多时建议调到 `1000+` |

---

## 📝 维护记录

| 日期 | 变更 |
|---|---|
| ~2021 | [@Evilbutcher](https://github.com/evilbutcher) 初版 |
| ~2022 | [@toulanboy](https://github.com/toulanboy/scripts) 重构维护 |
| 2026-05-08 | 适配新版微博 APP: 关注列表接口由 `cardlist` 迁移到 `container_timeline_topicsub`(POST),翻页参数由 `page` 改为 `since_id`,卡片解析由 `cards[0].card_group` 改为递归提取 `card_type:8` |
| 2026-05-09 | **修复跨路径签到失败**: 恢复双 cookie 抓取(分别抓列表和签到接口),因为新版加了 `X-Validator` 风控签名,绑定请求路径,不能跨路径复用 |

---

## ⚠️ 已知限制 & 风险提示

- **风控签名时效性**: 抓到的请求头里包含 `X-Validator` / `x-shanhai-pass` 等风控签名,这些会随时间过期(可能数小时到数天)。如果 cron 定时执行失败,**重新进微博 APP 抓两次 cookie** 即可
- **风控签名 fid 敏感性未知**: 老脚本能跑十几年说明 validator 不绑定 `fid` 参数。但如果某天微博加严校验,签到一个超话之后其他超话全失败,就是 fid 也被纳入校验了(目前没有发现这种情况)
- **微博 APP 升级风险**: 微博更新版本可能再次更改接口或加签
- **账号风险**: 自动签到属于灰色地带,极端情况下可能被反作弊检测
- **不支持双账号**: 本重构版仅支持单账号

---

## 🙏 致谢

- 原作者: [@Evilbutcher](https://github.com/evilbutcher)
- 重构维护: [@toulanboy](https://github.com/toulanboy/scripts)
- Env 工具函数: [@chavyleung](https://github.com/chavyleung/scripts)
