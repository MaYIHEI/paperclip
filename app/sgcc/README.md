<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png" width="80" alt="网上国网" />
</p>

# 网上国网

国家电网「网上国网」(95598)App 积分每日签到。

## 文件

- `sgcc.js` — cron 签到主脚本(复用抓到的签到请求,免账密/登录/验证码)
- `sgcc.cookie.js` — Cookie + 签到请求抓取(http-request 重写)

## 使用步骤

1. 按下方对应平台配置,开启重写脚本 + cron(或直接导入 `sgcc.plugin` 一键配置);需先开启 MITM 并安装信任 CA 证书
2. 打开「网上国网」App → 进入「我的 / 积分签到」页(进页面会自动签到,同时触发抓取)
3. 收到两条通知 `✅ 网上国网 Cookie 获取成功` + `✅ 网上国网 签到请求已抓` 即抓取成功
4. cron 会按计划自动签到:成功推 `✅`,Cookie 失效推 `⚠️`(再开 App 进签到页即自动重抓)

## Loon

```ini
[MITM]
hostname = csc-service.sgcc.com.cn

[Script]
http-request ^https?:\/\/csc-service\.sgcc\.com\.cn:28630\/.+\/member\/ tag=网上国网 Cookie, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.cookie.js, requires-body=true, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png

cron "30 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.js, tag=网上国网签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enable=true
```

## Surge

```ini
[MITM]
hostname = csc-service.sgcc.com.cn

[Script]
网上国网 Cookie = type=http-request,pattern=^https?:\/\/csc-service\.sgcc\.com\.cn:28630\/.+\/member\/,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.cookie.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png

网上国网签到 = type=cron,cronexp=30 8 * * *,timeout=60,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.js,img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png
```

## Quantumult X

```ini
[MITM]
hostname = csc-service.sgcc.com.cn

[rewrite_local]
^https?:\/\/csc-service\.sgcc\.com\.cn:28630\/.+\/member\/ url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.cookie.js

[task_local]
30 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.js, tag=网上国网签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip.png, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 网上国网签到
      cron: '30 8 * * *'
      timeout: 60

http:
  mitm:
    - "csc-service.sgcc.com.cn"
  script:
    - match: ^https?:\/\/csc-service\.sgcc\.com\.cn:28630\/.+\/member\/
      name: 网上国网 Cookie
      type: request
      require-body: true

script-providers:
  网上国网签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/sgcc-wip/app/sgcc/sgcc.js
    interval: 86400
```

## 实现细节

- **鉴权 = 抓取的 Cookie**(进 App 签到页时自动带的 t + 设备头),由 `sgcc.cookie.js` 抓取存本地
- **签到 = 复用抓到的"提交签到"请求**:cron 取出请求体、重算时间戳后提交,**免账号密码、免登录、免图形验证码**
- **数据全在本地**(BoxJS),仓库与脚本不含任何账号数据;脚本可共享,各人抓各自 Cookie
- **响应加密**,脚本只判签到成功/失败,**读不到积分数字**(积分到 App 查看)

## 维护记录

| 日期 | 变更 |
|---|---|
| 2026-06-22 | 初版:复用签到请求 + 本地抓 Cookie,免账密/登录/验证码;实测连续多天可签,Cookie ≥4.5 天 |

## 已知限制

- **Cookie 会失效**:失效时签到脚本推 `⚠️` 提醒,开 App 进积分签到页即自动重抓(实测有效期 ≥4.5 天,无需频繁操作)
- **读不到积分数字**:签到响应加密,脚本只判成功/失败,具体积分与连签天数请到 App 查看
- **目前仅 Loon 实测**:其他平台配置已按规范提供,未逐一验证
