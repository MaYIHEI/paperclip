<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png" width="80" alt="泡泡玛特" />
</p>

# 泡泡玛特

微信小程序「泡泡玛特会员俱乐部」每日签到自动 +5 泡泡值。

## 文件

- `ppmt.js` — 单脚本架构,既是重写抓 token 也是 cron 签到(根据 `$request` 是否存在区分)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron
2. 打开微信小程序「泡泡玛特会员俱乐部」→ 进入「我的」页面或任意会员相关页面,触发接口
3. 收到 `✅ 泡泡玛特 Cookie 获取成功` 通知即抓取成功
4. cron 会按计划自动签到

## Loon

```ini
[MITM]
hostname = popvip.paquapp.com

[Script]
http-response ^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info) tag=泡泡玛特 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png

cron "0 9 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js, tag=泡泡玛特签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png, enable=true
```

## Surge

```ini
[MITM]
hostname = popvip.paquapp.com

[Script]
泡泡玛特 Cookie = type=http-response,pattern=^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info),requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png

泡泡玛特签到 = type=cron,cronexp=0 9 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png
```

## Quantumult X

```ini
[MITM]
hostname = popvip.paquapp.com

[rewrite_local]
^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info) url script-response-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js

[task_local]
0 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js, tag=泡泡玛特签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/popmart.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 泡泡玛特签到
      cron: '0 9 * * *'
      timeout: 60

http:
  mitm:
    - "popvip.paquapp.com"
  script:
    - match: ^https:\/\/popvip\.paquapp\.com\/miniapp\/v2\/(svip_lite\/user_info|wechat_message\/template_info)
      name: 泡泡玛特 Cookie
      type: response
      require-body: true

script-providers:
  泡泡玛特签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/miniprogram/ppmt/ppmt.js
    interval: 86400
```

## 实现细节

- **抓取**:http-response 模式,匹配 `svip_lite/user_info`(进「我的」页自动触发)+ `wechat_message/template_info`,`require-body` 解响应体
- **鉴权**:`PopVip-Auth: Bearer <JWT>`(老版用 `identity_code`,v5.13.8 起改为 JWT)
- **user_id / phone 从 JWT payload 解**:新版接口不再回传这些字段,取 token 第二段 base64url 解码后从 payload 取
- **默认头像**:接口不返回头像时,写死 pin 仓库的 `ppmt.png` 兜底

## 维护记录

| 日期 | 变更 |
|---|---|
| 2024-06-08 | 原作者 [@Sliverkiss](https://github.com/Sliverkiss) 初版 |
| 2026-05-08 | 适配 v5.13.8: 接口路径变更为 `svip_lite/user_info`,鉴权改为 `PopVip-Auth: Bearer JWT`,user_id/phone 从 JWT payload 解析 |
| 2026-05-08 | 修复 getUserInfo 返回为空时 `phone_num.length` 异常 |

## 已知限制

- **等级 / 泡泡值 / 积分 显示为 -**:新版 `svip_lite/user_info` 接口不再返回这些字段,签到本身不受影响
- **JWT 有效期 7 天**:长期不打开小程序后 Token 过期,需要重新进入「我的」页面刷新一次

## 致谢

- 原作者: [@Sliverkiss](https://github.com/Sliverkiss) ([Gist 来源](https://gist.github.com/Sliverkiss/3e1fe82fa18dbcff9b2ae7fdad7596a6))
