# 追觅 🧪

<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png" alt="追觅" width="96" height="96">
</p>

> 追觅商城每日签到,得积分 / 成长值,支持连签奖励

## 功能

- 📅 **自动签到**:每日定时自动完成追觅商城签到,领取积分
- 🍪 **Cookie 抓取**:打开 APP 自动捕获登录态,无需手动操作
- 🔁 **连签识别**:自动判断今日是否已签,已签不重复请求
- 📦 **跨平台**:支持 Loon / Surge / Quantumult X / Stash

## 使用步骤

### 1. 导入脚本

根据你的 App,复制脚本头部对应平台的配置(见脚本文件顶部注释)。

### 2. 抓取 Cookie

1. 确保已开启 MITM 和脚本规则
2. 打开**追觅 APP** →「商城」或「我的」页面,停留 1~2 秒
3. 看到通知 **✅ 追觅 Cookie 获取成功** 即可

> Cookie(sessid)有效期约 90 天,过期后看到「登录失效」提示时,按本步骤重抓一次即可。

### 3. 自动签到

- 脚本每天 **8:33** 自动签到(可在脚本头部 `cron` 修改时间)
- 签到结果通过通知推送(连签天数 / 今日积分 / 总积分)

## 平台配置

> 以下配置已写在脚本文件顶部注释,直接复制对应平台部分即可。

### Loon

```ini
[MITM]
hostname = cn-wxmall.dreame.tech

[Script]
# Cookie 抓取
http-request ^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info tag=追觅 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png
# 每日签到
cron "33 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js, tag=追觅签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png
```

### Surge

```ini
[MITM]
hostname = cn-wxmall.dreame.tech

[Script]
# Cookie 抓取
追觅 Cookie = type=http-request,pattern=^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png
# 每日签到
追觅签到 = type=cron,cronexp="33 8 * * *",wake-system=1,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png
```

### Quantumult X

```ini
[rewrite_local]
# Cookie 抓取
^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js

[task_local]
# 每日签到
33 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/dreame/dreame.js, tag=追觅签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/dreame.png, enabled=true
```

### Stash

```yaml
http:
  mitm:
    - "cn-wxmall.dreame.tech"
  script:
    - match: ^https:\/\/cn-wxmall\.dreame\.tech\/main\/my\/info
      name: 追觅 Cookie
      type: request
      require-body: true

cron:
  script:
    - name: 追觅签到
      cron: "33 8 * * *"
      timeout: 60
```

## 实现细节

（内容已省略，仅保留使用说明。）

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-21 | 初版,基于追觅 2.5.1 抓包验证 |

## 致谢

- 自研,无第三方来源

## 已知限制

- **未经多日真机验证**:签到逻辑已抓包比对,完整流程尚未在真机定时任务下长期跑过;首次 cron 跑时留意通知结果
- Cookie(sessid)有效期约 90 天,失效后需重新打开 APP 抓取
- 客户端版本标识为抓包时的固定值,追觅大版本更新后若签到失败,需重新抓包对照更新脚本常量
