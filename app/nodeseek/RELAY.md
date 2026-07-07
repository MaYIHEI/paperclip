# NodeSeek 中继服务器部署指南

签到脚本通过 VPS 中继绕过 CF，每个人需自建独立的中继（不可共用，共用同一 IP 会被 NodeSeek 风控）。

## 要求

- 一台 VPS（任意 Linux 发行版）
- Python 3.6+
- curl（通常已预装）
- 放行一个入站端口（默认 3001）

## 部署步骤

### 1. 下载 relay.py

```bash
mkdir -p /opt/ns-relay
wget -O /opt/ns-relay/relay.py \
  https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/nodeseek/relay.py
```

### 2. 生成 API Key

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(24))"
```

记下输出的字符串，后面填到 BoxJS 和 systemd 服务里。

### 3. 创建 systemd 服务

```bash
cat > /etc/systemd/system/ns-relay.service << EOF
[Unit]
Description=NodeSeek Attendance Relay
After=network.target

[Service]
Type=simple
Environment=NS_KEY=你的API_KEY
Environment=NS_PORT=3001
ExecStart=/usr/bin/python3 /opt/ns-relay/relay.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

将 `你的API_KEY` 替换为第 2 步生成的字符串。

### 4. 启动服务

```bash
systemctl daemon-reload
systemctl enable --now ns-relay
systemctl status ns-relay
```

看到 `Active: active (running)` 即部署成功。

### 5. 验证

```bash
curl -s http://localhost:3001/health
# 正常返回：{"ok":true,"service":"ns-relay"}

curl -s -X POST http://localhost:3001/attend \
  -H 'x-api-key: 你的API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"cookie": "pjwt=test"}'
# 正常返回：{"error":"missing pjwt"} 或 NodeSeek 的响应
```

### 6. 配置 BoxJS

在 BoxJS 的 NodeSeek 面板中填写：

| 字段 | 值 |
|---|---|
| 中继地址 | `http://你的VPS_IP:3001/attend` |
| 中继密钥 | 第 2 步生成的 API Key |

配置后，先用手机 Safari 打开 `http://你的VPS_IP:3001/health`。能看到 `{"ok":true,"service":"ns-relay"}` 才说明手机到 VPS 端口可达。

## 防火墙

如果 VPS 有防火墙，需放行 3001 端口：

```bash
# ufw
ufw allow 3001/tcp

# iptables
iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
```

## 更换端口

修改 systemd 服务里的 `NS_PORT=3001` 为其他端口，重启服务即可：

```bash
systemctl restart ns-relay
```

## Loon 超时排查

如果 Loon 日志出现 `Attempt to connect to host timed out`，说明脚本还没连上中继服务器，通常不是 Cookie 问题。按顺序检查：

1. VPS 上执行 `systemctl status ns-relay`，确认服务是 `active (running)`
2. VPS 上执行 `curl -s http://127.0.0.1:3001/health`，确认本机服务正常
3. 检查云厂商安全组 / 防火墙是否放行 `3001/tcp`
4. 用手机 Safari 访问 `http://你的VPS_IP:3001/health`，确认手机网络能直连
5. BoxJS 的中继地址填完整：`http://你的VPS_IP:3001/attend`

Loon cron 发出的请求通常不走代理，所以必须保证手机当前网络能直接访问你的 VPS 中继端口。

## 更新 relay.py

```bash
wget -O /opt/ns-relay/relay.py \
  https://raw.githubusercontent.com/MaYIHEI/paperclip/main/app/nodeseek/relay.py
systemctl restart ns-relay
```
