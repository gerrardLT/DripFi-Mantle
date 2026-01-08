# 🤖 DripFi-Mantle Keeper Bot

自动执行 DripFi 定投计划的 Keeper Bot。

## 背景

由于 Chainlink Automation 目前尚未支持 Mantle 网络，我们使用自建的 Keeper Bot 作为替代方案来自动执行 DCA 计划。

合约已实现 Chainlink Automation 兼容接口 (`checkUpkeep` / `performUpkeep`)，一旦 Chainlink Automation 支持 Mantle，可以无缝切换。

## 🚀 快速开始

### 1. 配置环境变量

在项目根目录的 `.env` 文件中添加：

```bash
# Keeper Bot 私钥 (需要有 MNT 支付 gas)
KEEPER_PRIVATE_KEY=0x...

# 或者使用部署时的私钥
PRIVATE_KEY=0x...
```

### 2. 确保 Keeper 地址有足够的 MNT

Keeper 地址需要 MNT 来支付 gas 费用。建议至少保持 0.1 MNT 余额。

### 3. 运行 Keeper Bot

```bash
npm run keeper:mantle
```

## 📋 工作原理

1. **定期检查**: Bot 每 60 秒调用 `checkUpkeep()` 检查是否有计划需要执行
2. **执行条件**: 当有活跃计划且距离上次执行已超过设定间隔时，返回 `upkeepNeeded = true`
3. **自动执行**: Bot 调用 `performUpkeep()` 执行符合条件的计划
4. **Gas 保护**: 当 gas 价格超过设定阈值时，Bot 会跳过执行

## ⚙️ 配置选项

在 `keeper-bot-mantle.js` 中可以调整：

```javascript
const CHECK_INTERVAL_MS = 60000;  // 检查间隔 (毫秒)
const MAX_GAS_PRICE_GWEI = 50;    // 最大 gas 价格 (gwei)
```

## 📊 输出示例

```
🤖 DripFi-Mantle Keeper Bot
========================
Network: Mantle Sepolia Testnet
DCA Strategy: 0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E
Check interval: 60s
Max gas price: 50 gwei
========================

🔑 Keeper address: 0x2826bD46139dfD95A5132cBf7AbC5a5dD6baBBB7
💰 Keeper balance: 0.7463 MNT

📋 Total plans: 0

🔄 Starting keeper loop...

[10:30:00] Check #1
😴 No upkeep needed

[10:31:00] Check #2
✨ Upkeep needed!
⚡ Executing upkeep...
📤 Transaction sent: 0x...
✅ Upkeep executed successfully!
   Block: 33110500
   Gas used: 150000
   View: https://sepolia.mantlescan.xyz/tx/0x...
```

## 🔒 安全注意事项

1. **私钥安全**: 不要将私钥提交到代码仓库
2. **资金隔离**: 建议使用专门的 Keeper 地址，只存放少量 MNT
3. **监控余额**: 定期检查 Keeper 地址余额，确保有足够 gas

## 🔄 与 Chainlink Automation 的兼容性

合约实现了标准的 Chainlink Automation 接口：

```solidity
function checkUpkeep(bytes calldata checkData) 
    external view returns (bool upkeepNeeded, bytes memory performData);

function performUpkeep(bytes calldata performData) external;
```

一旦 Chainlink Automation 支持 Mantle 网络，可以：
1. 在 Chainlink Automation 注册 Upkeep
2. 停止运行 Keeper Bot
3. 享受去中心化的自动执行服务

## 🛠️ 故障排除

### "KEEPER_PRIVATE_KEY not found"
确保在 `.env` 文件中设置了 `KEEPER_PRIVATE_KEY` 或 `PRIVATE_KEY`

### "Low balance"
向 Keeper 地址转入更多 MNT

### "Gas price too high"
等待 gas 价格下降，或调高 `MAX_GAS_PRICE_GWEI` 阈值

### "Error performing upkeep"
检查合约状态，确保有活跃的 DCA 计划且 Vault 中有足够余额

## 📚 相关资源

- [Chainlink Automation 文档](https://docs.chain.link/chainlink-automation)
- [Mantle 网络文档](https://docs.mantle.xyz)
- [viem 文档](https://viem.sh)

---

**Happy Dripping on Mantle! 💧🚀**
