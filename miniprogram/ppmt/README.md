# 📎 ppmt · 泡泡玛特

微信小程序「泡泡玛特会员俱乐部」每日签到自动 +5 泡泡值。

---

## 📍 Raw URL

```
https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/ppmt/ppmt.js
```

---

## ⚙️ 重写规则

### Surge / Loon

```ini
[Script]
http-response ^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info) script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/ppmt/ppmt.js, requires-body=true, timeout=60, tag=泡泡玛特获取token

[MITM]
hostname = popvip.paquapp.com
```

### Quantumult X

```ini
[rewrite_local]
^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info) url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/ppmt/ppmt.js

[mitm]
hostname = popvip.paquapp.com
```

---

## 🚀 使用步骤

1. 在代理工具中配置上述重写规则与 MITM 主机名
2. 打开微信小程序 **泡泡玛特会员俱乐部 (popmart)**
3. 进入"我的"页面或任意会员相关页面,触发 `svip_lite/user_info` 或 `wechat_message/template_info` 接口
4. 通知栏出现 "🎉账号[xxx]更新token成功!" 即抓取成功
5. 配置定时任务每日执行(推荐 9:00)

---

## ⏰ Cron 配置

### Surge / Loon / Stash

```ini
[Script]
cron "0 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/ppmt/ppmt.js, tag=泡泡玛特签到
```

### Quantumult X

```ini
[task_local]
0 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/ppmt/ppmt.js, tag=泡泡玛特签到, enabled=true
```

---

## 📝 维护记录

| 日期 | 变更 |
|---|---|
| 2024-06-08 | 原作者 [@Sliverkiss](https://github.com/Sliverkiss) 初版 |
| 2026-05-08 | 适配 v5.13.8: 接口路径变更为 `svip_lite/user_info`,鉴权改为 PopVip-Auth Bearer JWT,user_id/phone 从 JWT payload 解析 |
| 2026-05-08 | 修复 getUserInfo 返回为空时 `phone_num.length` 异常 |

---

## ⚠️ 已知限制

- **等级 / 泡泡值 / 积分 显示为 -**:新版 `svip_lite/user_info` 接口不再返回这些字段,签到本身不受影响。如需恢复显示,需要找到返回完整用户信息的接口
- **JWT 有效期 7 天**:长期不打开小程序后 Token 过期,需要重新进入"我的"页面刷新一次

---

## 🙏 致谢

- 原作者: [@Sliverkiss](https://github.com/Sliverkiss) ([Gist 来源](https://gist.github.com/Sliverkiss/3e1fe82fa18dbcff9b2ae7fdad7596a6))
