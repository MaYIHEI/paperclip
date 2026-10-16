<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png" width="80" alt="Cookie 体检" />
</p>

# Cookie 体检

> 🧪 待验证

一条通知列出哪些签到脚本需要重新抓 Cookie,不用再一条条翻签到通知。

## 文件

- `checkup.js` — 体检脚本(cron,也可手动运行)

## 使用步骤

1. 按下方对应平台添加 cron
2. 各签到脚本照常运行,每次运行会自动登记结果
3. 每天 12:00 收到一条体检通知;想马上看,在代理工具里手动运行一次「Cookie 体检」
4. 按通知里「需重新抓取」的名单去抓 Cookie。抓到新 Cookie 后,该脚本会从名单里消失,下次签到再重新登记

通知示例:

```
⚠️ 3 个需要处理,12 个正常
需重新抓取:WPS、味多美(10-13)
签到失败:
小米商城:请求异常
```

- 名字后带日期,表示这条是当天之前的结果(比如那天之后签到脚本没有再运行)
- 「签到失败」是网络异常等其他原因,不一定要重抓,可先手动运行一次该签到脚本
- 从没运行过的签到脚本不会出现在通知里

**目前支持**:本仓库全部在用的签到脚本(已归档的除外)。

## Loon

```ini
[Script]
cron "0 12 * * *" then script("https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/checkup/checkup.js") with tag="Cookie 体检", img_url="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png"
```

## Surge

```ini
[Script]
Cookie 体检 = type=cron,cronexp=0 12 * * *,timeout=30,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/checkup/checkup.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png
```

## Quantumult X

```ini
[task_local]
0 12 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/checkup/checkup.js, tag=Cookie 体检, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: Cookie 体检
      cron: '0 12 * * *'
      timeout: 30
script-providers:
  Cookie 体检:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/testing/app/checkup/checkup.js
    interval: 86400
```

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-10-15 | 初版:覆盖全部在用的签到脚本 |

## 已知限制

- 看的是各脚本最近一次签到的结果,不是实时检测:Cookie 在当天签到之后才失效的,下次签到后才会出现在名单里
- 签到时间晚于 12:00 的脚本,当天体检显示的是前一天的结果(带日期);可把体检时间改晚,或手动运行
