# 微信支付笔笔省

每日自动领取微信支付小程序"笔笔省 - 天天领"的提现免费券。

## 原作者

首版,无外部来源。接口逆向自抓包。

## 配置步骤

### 1. 添加重写 + 定时任务

按脚本头部注释里的配置块,选对应的工具(Loon/Surge/QX/Stash)添加 4 段配置:

- **MITM hostname**: `discount.wxpapp.wechatpay.cn`
- **重写**: 监听 `querydailygiftcoupons` 和 `claimdailygiftcoupon` 两个接口,触发 cookie 抓取
- **定时任务**: 每天早上 7:30 跑领券

### 2. 抓取 session-token

打开 `微信 → 我 → 服务 → 钱包 → 提现笔笔省` 小程序,进入"天天领"页面。

页面加载完会自动触发抓取,看到通知"✅ Token 已更新"即成功。

### 3. 测试

手动触发"笔笔省签到"任务跑一次,如果当天还没领,会自动领;如果已领,会提示"今日已领"。

## 接口说明

| 接口 | 方法 | 用途 |
|---|---|---|
| `/txbbs-user/user/login` | GET | 用 jscode 换 session-token(脚本不调,仅说明) |
| `/txbbs-mall/coupon/querydailygiftcoupons` | GET | 查询今日可领券列表 |
| `/txbbs-mall/coupon/claimdailygiftcoupon` | POST | 领取指定券 |

请求体格式:

```json
{
  "daily_gift_type": "DGCT_PLATFORM",
  "coupon_id": 2,
  "expected_send_amount": 3000
}
```

## 已知限制

- **session-token 会过期**: 由小程序 `wx.login()` 产生的 jscode 一次性换得,jscode 5 分钟过期且无法重用。token 过期后必须重新进小程序"天天领"页面触发抓取。
- **不同账号每日额度不同**: 微信会根据用户活跃度发不同档位的券(从 30 元到 300 元不等),脚本只负责"有什么领什么",不挑挑拣拣。
- **`expected_send_amount` 字段值待验证**: 抓包仅见过一组数据 `face_value=3000, expected_send_amount=3000`,脚本按 face_value 直传。如果某天领取失败,优先怀疑此处。

## 存储 key

| key | 说明 |
|---|---|
| `bbs_session_token` | 鉴权 token |
| `bbs_appid` | 小程序 appid,默认 `wxdb3c0e388702f785` |
| `bbs_module` | X-Module-Name,默认 `mmpaytxbbsmp` |
| `bbs_page` | X-Page,默认 `pages/gift/index` |
