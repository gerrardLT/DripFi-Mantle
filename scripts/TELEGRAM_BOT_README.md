# 🤖 Flow DCA Telegram Bot

A Telegram bot for monitoring and managing your DCA (Dollar Cost Averaging) plans on Flow blockchain.

## 🌟 Features

- **📱 Wallet Linking** - Link your Flow wallet address to receive notifications
- **💼 Wallet Info** - Check your FLOW, USD, and BTC balances
- **📋 Plan Management** - View all your active DCA plans
- **📊 Execution History** - Track your DCA execution history
- **🔔 Real-time Notifications** - Get instant alerts when plans execute
- **🌐 Flow Testnet** - Fully integrated with Flow blockchain testnet

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 16+ installed
- A Telegram account
- A Flow wallet address (from the DCA web app)

### 2. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Copy the **bot token** (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 3. Setup Environment

Create a `.env` file in the project root:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 4. Install Dependencies

```bash
npm install
```

This will install:
- `@onflow/fcl` - Flow Client Library
- `@onflow/types` - Flow type definitions
- `node-telegram-bot-api` - Telegram bot framework

### 5. Run the Bot

```bash
npm run telegram
```

You should see:
```
🤖 Flow DCA Telegram Bot Started!
Connected to Flow Testnet
DCA Contract: 0x78acd984694957cf
Bot is ready to receive commands...
```

## 📱 Using the Bot

### Link Your Wallet

1. Open your bot in Telegram
2. Send: `/start YOUR_FLOW_ADDRESS`
   - Example: `/start 0x1234567890abcdef`
3. You'll receive a confirmation message

### Available Commands

| Command | Description |
|---------|-------------|
| `/start ADDRESS` | Link your Flow wallet address |
| `/wallet` | View your wallet balances (FLOW, USD, BTC) |
| `/plans` | View all your active DCA plans |
| `/history` | View your execution history (last 2500 blocks) |
| `/unlink` | Unlink your wallet from the bot |
| `/help` | Show help message with all commands |

### Example Usage

**Check Your Wallet:**
```
/wallet
```
Response:
```
💼 Your Flow Wallet

📍 Address: 0x1234567890abcdef
💰 FLOW: 10.5000
💵 USD: 1000.00
₿ BTC: 0.00123456
🔗 Linked: 1/15/2025, 10:30:00 AM

View on Flowscan →
```

**View Your Plans:**
```
/plans
```
Response:
```
📋 Your DCA Plans (2)

Plan #1
💵 Amount: 10.00 USD
⏱ Cycle: 24 hours
📊 Executions: 5
✅ Ready to execute

Plan #2
💵 Amount: 20.00 USD
⏱ Cycle: 12 hours
📊 Executions: 3/10
⏳ Waiting
⏰ Next: 8h
```

**Check Execution History:**
```
/history
```
Response:
```
📊 Execution History (5)

Execution #5 (Plan #1)
💵 10.00 USD → 0.00012345 BTC
📦 Block: 287470157
View Tx →

Execution #4 (Plan #1)
💵 10.00 USD → 0.00012340 BTC
📦 Block: 287469157
View Tx →

...

📈 Summary
Total: 50.00 USD → 0.00061725 BTC
Avg Price: 81,000.00 USD/BTC
```

## 🔔 Notifications

When a DCA plan executes, you'll automatically receive a notification:

```
🎉 Plan Executed!

📋 Plan #1
💵 10.00 USD → 0.00012345 BTC
💰 Price: 81,000.00 USD/BTC

View Transaction →
```

## 🛠️ Technical Details

### Flow Integration

The bot uses Flow Client Library (FCL) to:
- Query user's DCA plans using Cadence scripts
- Fetch execution events from the blockchain
- Check wallet balances (FLOW, USD, BTC tokens)

### Event Monitoring

- Queries `PlanExecuted` events from the DCAContract
- Scans the last 2,500 blocks (in chunks of 250)
- Filters events by user's wallet address
- Sends notifications to linked Telegram users

### Data Storage

User data is stored in `data/telegram-users.json`:
```json
{
  "0x1234567890abcdef": {
    "chatId": 123456789,
    "username": "john_doe",
    "linkedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

## 🔧 Configuration

### Flow Network

The bot is configured for Flow Testnet:
```javascript
fcl.config({
    'accessNode.api': 'https://rest-testnet.onflow.org',
    'flow.network': 'testnet',
    '0xDCAContract': '0x78acd984694957cf',
});
```

### Contract Address

DCA Contract: `0x78acd984694957cf` (Flow Testnet)

## 🐛 Troubleshooting

### Bot Not Responding

1. Check if the bot is running: `npm run telegram`
2. Verify your bot token in `.env`
3. Make sure you've started the bot with `/start`

### "Invalid Flow address" Error

Flow addresses must be:
- Start with `0x`
- Followed by exactly 16 hexadecimal characters
- Example: `0x1234567890abcdef`

### "No wallet linked" Error

You need to link your wallet first:
```
/start YOUR_FLOW_ADDRESS
```

### "Error fetching plans" Error

Make sure:
1. Your Flow account is set up (run Setup Account in web app)
2. You've created at least one DCA plan
3. Your wallet address is correct

## 📚 Resources

- **Flow Testnet Explorer**: https://testnet.flowscan.io
- **DCA Contract**: https://testnet.flowscan.io/contract/A.78acd984694957cf.DCAContract
- **Flow Documentation**: https://developers.flow.com
- **FCL Documentation**: https://developers.flow.com/tools/clients/fcl-js

## 🤝 Integration with Keeper Bot

The Telegram bot works alongside the keeper bot:
1. **Keeper bot** - Monitors and executes DCA plans
2. **Telegram bot** - Sends notifications when executions happen

Both bots can run simultaneously for a complete DCA experience!

## 📝 Notes

- The bot queries the last 2,500 blocks for execution history (~40-45 minutes on testnet)
- Notifications are sent in real-time when plans execute
- All data is stored locally in `data/telegram-users.json`
- The bot supports multiple users simultaneously

## 🔐 Security

- Never share your bot token publicly
- The bot only reads blockchain data (no private keys needed)
- User data is stored locally and not shared
- All blockchain interactions are read-only

## 🚀 Next Steps

1. **Link your wallet** - `/start YOUR_ADDRESS`
2. **Create DCA plans** - Use the web app
3. **Monitor executions** - Get notifications automatically
4. **Track history** - Use `/history` command

---

**Happy DCA-ing on Flow! 🌊💰**

