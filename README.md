# DripFi-Mantle

基于 Mantle L2 的去中心化自动定投协议，参加 Mantle Global Hackathon 2025。

## 项目概述

DripFi-Mantle 是一个自动化定投协议，允许用户在 Mantle L2 上设置定期自动购买加密资产的计划。通过智能合约实现资金托管和自动执行，用户可以轻松实现"滴水式投资"策略。

### 核心特性

- **自动定投**: 按设定间隔自动执行交易
- **非托管**: 资金始终由用户控制
- **低成本**: 利用 Mantle L2 的低 gas 费用
- **灵活配置**: 支持多种执行间隔 (1小时/4小时/1天/1周)
- **透明追踪**: 所有执行记录链上可查
- **Telegram 通知**: 实时推送执行状态

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│                   viem + WalletConnect                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Mantle L2 Network                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  DCAVault   │  │ DCAStrategy │  │    SwapHelper       │  │
│  │  (资金托管)  │◄─│  (策略执行)  │─►│  (DEX 集成)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│                   ┌─────────────┐                           │
│                   │ PriceOracle │                           │
│                   │ (价格预言机) │                           │
│                   └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Keeper Bot / Automation                   │
│              (自动执行 checkUpkeep/performUpkeep)            │
└─────────────────────────────────────────────────────────────┘
```

## 项目结构

```
dripfi-mantle/
├── mantle-dca/              # Solidity 智能合约 (Foundry)
│   ├── src/
│   │   ├── DCAVault.sol     # 资金保管合约
│   │   ├── DCAStrategy.sol  # DCA 策略合约
│   │   ├── SwapHelper.sol   # DEX 交换助手
│   │   └── PriceOracle.sol  # 价格预言机
│   ├── test/                # 合约测试
│   └── script/              # 部署脚本
├── front-end/               # React 前端
│   └── src/
│       ├── hooks/useMantle.ts    # 合约交互
│       └── lib/mantle-config.ts  # 网络配置
├── scripts/                 # 辅助脚本
│   ├── telegram-bot-mantle.js    # Telegram Bot
│   └── keeper-bot-mantle.js      # Keeper Bot
└── docs/                    # 文档
```

## 快速开始

### 前置条件

- Node.js 18+
- Foundry (Solidity 开发)
- MetaMask 或其他 Web3 钱包

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/dripfi-mantle.git
cd dripfi-mantle
```

### 2. 安装依赖

```bash
# 根目录依赖
npm install

# 前端依赖
cd front-end && npm install
```

### 3. 配置环境变量

```bash
# 复制示例配置
cp mantle-dca/.env.example mantle-dca/.env

# 编辑 .env 填入私钥
```

### 4. 编译合约

```bash
cd mantle-dca
forge build
```

### 5. 运行测试

```bash
forge test
```

### 6. 部署合约

```bash
forge script script/Deploy.s.sol --rpc-url https://rpc.sepolia.mantle.xyz --broadcast
```

### 7. 启动前端

```bash
cd front-end
npm run dev
```

## 已部署合约 (Mantle Sepolia)

| 合约 | 地址 |
|------|------|
| PriceOracle | `0xbaEe5FBc1AA66F7B59D185925d4B7F6947041863` |
| DCAVault | `0x60b863F96c146f8D33B7dC99040ef93A39C37cA5` |
| SwapHelper | `0xb2888D850F6A59fff8d537305DfA51ccEf77c177` |
| DCAStrategy | `0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E` |

区块浏览器: https://sepolia.mantlescan.xyz

## 自动化执行

### Keeper Bot

由于 Chainlink Automation 尚未支持 Mantle，我们提供了 Keeper Bot：

```bash
# 配置私钥
echo "KEEPER_PRIVATE_KEY=0x..." >> .env

# 运行 Keeper
npm run keeper:mantle
```

### Telegram Bot

```bash
# 配置 Bot Token
echo "TELEGRAM_BOT_TOKEN=..." >> .env

# 运行 Bot
npm run telegram:mantle
```

## 黑客松赛道

本项目参加 **Mantle Global Hackathon 2025** 的以下赛道：

1. **DeFi & Composability**
   - 创新的 DCA 自动化协议
   - 可组合的 DeFi 基础设施

2. **RWA/RealFi**
   - 连接传统金融定投策略与 DeFi
   - 降低普通用户参与门槛

## 安全特性

- ReentrancyGuard 防重入攻击
- SafeERC20 安全代币转账
- Pausable 紧急暂停机制
- Ownable 权限控制
- 滑点保护

## 文档

- [智能合约文档](./mantle-dca/README.md)
- [Telegram Bot 文档](./scripts/TELEGRAM_BOT_MANTLE_README.md)
- [Keeper Bot 文档](./scripts/KEEPER_BOT_README.md)

## 技术栈

- **智能合约**: Solidity, Foundry, OpenZeppelin
- **前端**: React, TypeScript, viem, Tailwind CSS
- **自动化**: Chainlink Automation 兼容接口
- **通知**: Telegram Bot API

## License

MIT

---

**Built by DripFi Team for Mantle Global Hackathon 2025**
