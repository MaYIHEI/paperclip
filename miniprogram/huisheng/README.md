# 惠省红包墙自动领券

每天定时一键领取微信小程序"惠省"(私域福利,appid `wx0b42a347aafbe0d0`)红包墙活动全部 7 个 tab(外卖/美食团购/美团闪购/休闲娱乐/更多福利/生活服务/丽人医疗)的可领券。

抓包实测单次总值在 **¥150~¥260** 不等(60+ 张券),底层是美团 gundam 红包,可在美团 APP / 美团外卖 APP / 微信小程序通用。

## 文件

- `huisheng.cookie.js`:抓 cookie 脚本(http-request 重写),只在首次启用 + 鉴权失效时跑
- `huisheng.js`:主签到脚本(cron),每天 0:05 自动跑

## 配置

### Loon

```ini
[MITM]
hostname = media.meituan.com

[Script]
http-request ^https:\/\/media\.meituan\.com\/fulishemini\/couponActivity\/listActivityCoupon tag=惠省 [Cookie], script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/huisheng/huisheng.cookie.js, requires-body=1

cron "5 0 * * *" script-path=https://raw.githubusercontent.com/MaYIHEI/paperclip/main/miniprogram/huisheng/huisheng.js, tag=惠省红包墙
```

### Surge / QX / Stash:同理替换 raw URL 即可

## 使用步骤

1. 装好两个脚本后,**先开 cookie 抓取脚本**
2. 微信里打开**惠省**小程序,在首页停留 3 秒(自动触发 listActivityCoupon 接口)
3. 收到通知"✅ 鉴权数据已抓取"后,**关闭 cookie 抓取脚本**(避免反复覆盖)
4. cron 会在每天 0:05 自动领券

## 鉴权说明

- 用的是美团 `wmtoken` (`token: AgGg...`) + `openId`(微信 openid)+ `openIdCipher` + `mtgsig` v1.2 签名
- `mtgsig` 的 `a2` 字段是时间戳,主脚本每次会刷成当前时间
- 其他字段(`a3`-`a7` `d1` `csecuuid` 等)实测可复用较长时间(具体时效未知,如果失效会返回非 200 业务码)

## 失效信号

跑 cron 时收到"❌ 拉券列表失败"通知 → 重新跑 cookie 抓取脚本(参考"使用步骤"第 1-3 步)。

## BoxJS 参数

| key | 类型 | 说明 |
|---|---|---|
| `huisheng_delete_cookie` | bool | 设为 true 后下次跑会清空已存鉴权(用于强制重抓) |
| `huisheng_debug` | bool | 打印完整 headers/body 到 console |
| `huisheng_request_time` | int | list → grant 之间的间隔毫秒(默认 500) |

## 致谢

接口分析基于 [@Sliverkiss](https://github.com/Sliverkiss) / @FoKit 等前辈在美团生态相关脚本上的工作思路,本脚本针对"惠省"这一新入口重新分析实现。

## 已知限制

- 美团反爬一直在迭代,`mtgsig` v1.2 算法相对容易绕(仅刷时间戳),如果美团升级到 v3.0(美团 APP 已经在用)则本方案需要重新分析
- 部分券有"特定身份"前置条件(如新人券),领取时会返回 status != 0,会在统计里算作失败
