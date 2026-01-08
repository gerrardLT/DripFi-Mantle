# 🤖 DripFi-Mantle Telegram Bot

Telegram 机器人，用于监控和管理您在 Mantle L2 上的 DripFi 定投计划。

## 🌟 功能

- **📱 钱包链接** - 链接您的钱包地址以接收通知
- **💼 钱包信息** - 查看您的 MNT 余额
- **📋 计划管理** - 查看所有活跃的定投计划
- **📊 执行历史** - 追踪您的定投执行历史
- **🔔 实时通知** - 计划执行时即时提醒
- **🌐 Mantle Sepolia** - 完全集成 Mantle 测试网

## 🚀 快速开始

### 1. 前置条件

- Node.js 16+ 已安装
- Telegram 账户
- Mantle 钱包地址

### 2. 创建 Telegram Bot

1. 打开 Telegram 搜索 [@BotFather](https://t.me/botfather)
2. 发送 `/newbot` 命令
3. 按提示创建您的 bot
4. 复制 **bot token** (格式如 `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 3. 配置环境

在项目根目录创建 `.env` 文件：

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 4. 安装依赖

```bash
npm install
```

### 5. 运行 Bot

```bash
npm run telegram:mantle
```

您应该看到：
```
🤖 DripFi-Mantle Telegram Bot Started!
Connected to Mantle Sepolia Testnet
DCA Strategy: 0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E
DCA Vault: 0x60b863F96c146f8D33B7dC99040ef93A39C37cA5
Bot is ready to receive commands...
```

## 📱 使用 Bot

### 链接钱包

1. 在 Telegram 中打开您的 bot
2. 发送: `/start YOUR_WALLET_ADDRESS`
   - 示例: `/start 0x1234567890abcdef1234567890abcdef12345678`
3. 您将收到确认消息

### 可用命令

| 命令 | 描述 |
|------|------|
| `/start ADDRESS` | 链接您的钱包地址 |
| `/wallet` | 查看钱包余额 |
| `/plans` | 查看所有 DCA 计划 |
| `/history` | 查看执行历史 |
| `/unlink` | 取消链接钱包 |
| `/help` | 显示帮助信息 |

### 使用示例

**查看钱包:**
```
/wallet
```
响应:
```
💼 您的 Mantle 钱包

📍 地址: 0x1234...5678
💰 MNT: 10.5000
🔗 链接时间: 2025/1/7 10:30:00

在 Mantlescan 查看 →
```

**查看计划:**
```
/plans
```
响应:
```
📋 您的 DCA 计划 (2)

计划 #1
💵 金额: 10.0000
⏱ 间隔: 1 天
📊 执行: 5
✅ 状态: Active

计划 #2
💵 金额: 20.0000
⏱ 间隔: 4 小时
📊 执行: 3/10
⏸ 状态: Paused
```

## 🔔 通知

当 DCA 计划执行时，您将自动收到通知：

```
🎉 计划已执行!

📋 计划 #1
💵 10.0000 → 0.000123

查看交易 →
```

## 🛠️ 技术细节

### Mantle 集成

Bot 使用 viem 库与 Mantle 网络交互：
- 查询用户的 DCA 计划
- 获取执行事件
- 检查钱包余额

### 合约地址 (Mantle Sepolia)

- DCA Strategy: `0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E`
- DCA Vault: `0x60b863F96c146f8D33B7dC99040ef93A39C37cA5`
- Price Oracle: `0xbaEe5FBc1AA66F7B59D185925d4B7F6947041863`
- Swap Helper: `0xb2888D850F6A59fff8d537305DfA51ccEf77c177`

### 数据存储

用户数据存储在 `data/telegram-users-mantle.json`:
```json
{
  "0x1234...5678": {
    "chatId": 123456789,
    "username": "john_doe",
    "linkedAt": "2025-01-07T10:30:00.000Z"
  }
}
```

## 🐛 故障排除

### Bot 无响应

1. 检查 bot 是否运行: `npm run telegram:mantle`
2. 验证 `.env` 中的 bot token
3. 确保已使用 `/start` 启动 bot

### "无效的钱包地址" 错误

钱包地址必须：
- 以 `0x` 开头
- 后跟 40 个十六进制字符
- 示例: `0x1234567890abcdef1234567890abcdef12345678`

## 📚 资源

- **Mantle 测试网浏览器**: https://sepolia.mantlescan.xyz
- **Mantle 文档**: https://docs.mantle.xyz
- **viem 文档**: https://viem.sh

## 🔐 安全

- 不要公开分享您的 bot token
- Bot 只读取区块链数据（不需要私钥）
- 用户数据本地存储，不会共享

---

**Happy Dripping on Mantle! 💧🚀**
