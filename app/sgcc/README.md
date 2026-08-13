<p align="center">
  <img src="https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/sgcc.png" width="80" alt="网上国网" />
</p>

# 网上国网（测试）

国家电网「网上国网」App 积分每日签到。脚本不保存账号密码，而是复用 App 的鉴权头与签到加密请求。

> 当前仍是测试版：已修复跨平台存储、抓取规则和成功误判，但签到业务结果本身是加密响应，仍需在 App 积分页核对是否实际签到/加分。

## 工作方式

需要本地保存两份数据：

| 数据 | 本地键 | 怎么抓 |
|---|---|---|
| 鉴权头 | `sgcc_data` | 开启抓取后进入 App「我的 / 积分」等页面即可 |
| 签到请求 | `sgcc_signin` | **必须在当天尚未签到时**进入积分签到页，让 App 发出真实签到提交请求 |

签到脚本会刷新 `timestamp`，重算 `SM3(skey + data + timestamp)`，再提交已抓到的加密请求。

## 首次使用

1. 配置对应平台的 MITM、两条抓取规则和定时任务；安装并信任 CA 证书。
2. 开启抓取规则，打开网上国网 App 并登录。
3. 先进入「我的 / 积分」页，收到 `✅ 网上国网鉴权已抓`。
4. 在**尚未签到的一天**进入积分签到页，收到 `✅ 网上国网签到请求已抓`。
5. 抓齐后关闭抓取规则；定时任务继续保留。
6. 定时通知显示“请求已被服务器受理”后，到 App 积分页核对一次实际签到与加分。

如果当天已经手动签到，App 不会再发出签到提交请求；等次日未签到时再抓，不是重复开关 MITM 就能补出来。

## Loon

推荐直接导入 `sgcc.plugin`。插件中：

- `抓取凭据` 默认关闭，首次抓取或失效时再开。
- `定时签到` 默认开启。
- 定时参数默认 `30 8 * * *`。
- 随机延迟默认 `0~300` 秒，可改为 `0` 关闭。

裸配置规则如下（插件已包含这些内容）：

```ini
[MITM]
hostname = csc-service.sgcc.com.cn

[Script]
http-request ^https:\/\/csc-service\.sgcc\.com\.cn(?::28630)?\/.+\/member\/(?!m1\/0103514(?:\?|$)) tag=网上国网鉴权, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.cookie.js, requires-body=false, timeout=10, enable=true
http-request ^https:\/\/csc-service\.sgcc\.com\.cn(?::28630)?\/osg-omgmt1042\/member\/m1\/0103514(?:\?.*)?$ tag=网上国网签到请求, script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.cookie.js, requires-body=true, timeout=10, enable=true
cron "30 8 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.js, tag=网上国网签到, timeout=420, argument=[300], enable=true
```

Loon 的 `http-request` 在 `requires-body=true` 时才能读取 `$request.body`，这是抓取签到请求的必要条件。

## Surge

普通 member 请求和签到提交请求分开抓；不要把所有 member 请求都设为 `requires-body=true`。

```ini
[MITM]
hostname = %APPEND% csc-service.sgcc.com.cn

[Script]
网上国网鉴权 = type=http-request,pattern=^https:\/\/csc-service\.sgcc\.com\.cn(?::28630)?\/.+\/member\/(?!m1\/0103514(?:\?|$)),requires-body=false,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.cookie.js
网上国网签到请求 = type=http-request,pattern=^https:\/\/csc-service\.sgcc\.com\.cn(?::28630)?\/osg-omgmt1042\/member\/m1\/0103514(?:\?.*)?$,requires-body=true,max-size=0,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.cookie.js
网上国网签到 = type=cron,cronexp="30 8 * * *",timeout=420,argument=300,script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.js
```

## Quantumult X

精确的签到 Body 规则放在普通 Header 规则前面。抓取脚本使用 `$prefs` 写入，已修复“通知成功但 BoxJS/定时任务读不到”的问题。

```ini
[mitm]
hostname = csc-service.sgcc.com.cn

[rewrite_local]
^https:\/\/csc-service\.sgcc\.com\.cn(?::28630)?\/osg-omgmt1042\/member\/m1\/0103514(?:\?.*)?$ url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.cookie.js
^https:\/\/csc-service\.sgcc\.com\.cn(?::28630)?\/.+\/member\/(?!m1\/0103514(?:\?|$)) url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.cookie.js

[task_local]
30 8 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.js, tag=网上国网签到, argument=300, enabled=true
```

## Stash

```yaml
cron:
  script:
    - name: 网上国网签到
      cron: '30 8 * * *'
      timeout: 420

http:
  mitm:
    - csc-service.sgcc.com.cn
  script:
    - match: ^https:\/\/csc-service\.sgcc\.com\.cn(?::28630)?\/osg-omgmt1042\/member\/m1\/0103514(?:\?.*)?$
      name: 网上国网签到请求
      type: request
      require-body: true
    - match: ^https:\/\/csc-service\.sgcc\.com\.cn(?::28630)?\/.+\/member\/(?!m1\/0103514(?:\?|$))
      name: 网上国网鉴权
      type: request
      require-body: false

script-providers:
  网上国网签到:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.js
    interval: 86400
  网上国网抓取:
    url: https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/sgcc/sgcc.cookie.js
    interval: 86400
```

## 结果怎么判断

- `✅ 请求已被服务器受理`：HTTP 返回中存在 `encryptData`，说明网关接受并返回了加密业务响应；**不等于已解密确认签到成功**。
- `⚠️ 服务器未受理请求`：鉴权、签到请求或接口状态可能失效；重新抓取后再试。
- `⚠️ 缺少鉴权 / 签到请求`：通知会指出具体缺哪一份，不再笼统显示“没有 Cookie”。

## 2026-08-13 修复

- Quantumult X 抓取改用 `$prefs`，并在通知前写后回读校验。
- 补回签到回放缺失的 `authorization` Header。
- 把普通鉴权与签到 Body 拆成两条规则，兼容无 `:28630` 的 URL 形式。
- 不再把任意 `encryptData` 误报为“今日签到完成”。
- 只对网络错误和 HTTP 5xx 重试，避免业务拒绝连续重放。
- Loon 插件增加抓取开关、定时开关、Cron 与随机延迟参数。

## 已知限制

- Cookie/鉴权会失效，失效后需重新抓取。
- 已签到当天无法首次抓到 `sgcc_signin`。
- 当前不解密业务响应，积分、奖励、连续天数需到 App 查看。
- Loon/QX/Surge 的运行时与规则已做本地模拟测试；真实 App 抓取、跨日回放和实际加分仍需真机验证。
