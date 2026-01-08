# DripFi-Mantle

[中文文档](./README.md)

Decentralized Automated DCA (Dollar-Cost Averaging) Protocol on Mantle L2.

## Project Overview

DripFi-Mantle is an automated DCA protocol that allows users to set up recurring crypto purchase plans on Mantle L2. Through smart contracts, it handles fund custody and automated execution, enabling users to easily implement "drip investing" strategies.

### Core Features

- Automated DCA: Execute transactions automatically at set intervals
- Non-Custodial: Funds are always controlled by the user
- Low Cost: Leverage Mantle L2's low gas fees
- Flexible Configuration: Support multiple execution intervals (1 Hour / 4 Hours / 1 Day / 1 Week)
- Transparent Tracking: All execution records are verifiable on-chain
- Telegram Notifications: Real-time push notifications for execution status

## Technical Architecture

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
│  │  (Custody)  │◄─│ (Execution) │─►│  (DEX Integration)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│                   ┌─────────────┐                           │
│                   │ PriceOracle │                           │
│                   │   (Oracle)  │                           │
│                   └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Keeper Bot / Automation                   │
│              (Auto execute checkUpkeep/performUpkeep)        │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
dripfi-mantle/
├── mantle-dca/              # Solidity Smart Contracts (Foundry)
│   ├── src/
│   │   ├── DCAVault.sol     # Fund Custody Contract
│   │   ├── DCAStrategy.sol  # DCA Strategy Contract
│   │   ├── SwapHelper.sol   # DEX Swap Helper
│   │   └── PriceOracle.sol  # Price Oracle
│   ├── test/                # Contract Tests
│   └── script/              # Deployment Scripts
├── front-end/               # React Frontend
│   └── src/
│       ├── hooks/useMantle.ts    # Contract Interaction
│       └── lib/mantle-config.ts  # Network Config
├── scripts/                 # Helper Scripts
│   ├── telegram-bot-mantle.js    # Telegram Bot
│   └── keeper-bot-mantle.js      # Keeper Bot
└── docs/                    # Documentation
```

## Quick Start

### Prerequisites

- Node.js 18+
- Foundry (Solidity Development)
- MetaMask or other Web3 Wallet

### 1. Clone Project

```bash
git clone https://github.com/your-repo/dripfi-mantle.git
cd dripfi-mantle
```

### 2. Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd front-end && npm install
```

### 3. Configure Environment Variables

```bash
# Copy example config
cp mantle-dca/.env.example mantle-dca/.env

# Edit .env and fill in your private key
```

### 4. Compile Contracts

```bash
cd mantle-dca
forge build
```

### 5. Run Tests

```bash
forge test
```

### 6. Deploy Contracts

```bash
forge script script/Deploy.s.sol --rpc-url https://rpc.sepolia.mantle.xyz --broadcast
```

### 7. Start Frontend

```bash
cd front-end
npm run dev
```

## Deployed Contracts (Mantle Sepolia)

| Contract | Address |
|------|------|
| PriceOracle | `0xbaEe5FBc1AA66F7B59D185925d4B7F6947041863` |
| DCAVault | `0x60b863F96c146f8D33B7dC99040ef93A39C37cA5` |
| SwapHelper | `0xb2888D850F6A59fff8d537305DfA51ccEf77c177` |
| DCAStrategy | `0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E` |

Block Explorer: https://sepolia.mantlescan.xyz

## Automation

### Keeper Bot

Since Chainlink Automation does not yet fully support Mantle, we provide a custom Keeper Bot:

```bash
# Configure Private Key
echo "KEEPER_PRIVATE_KEY=0x..." >> .env

# Run Keeper
npm run keeper:mantle
```

### Telegram Bot

```bash
# Configure Bot Token
echo "TELEGRAM_BOT_TOKEN=..." >> .env

# Run Bot
npm run telegram:mantle
```

## Security Features

- ReentrancyGuard for reentrancy protection
- SafeERC20 for safe token transfers
- Pausable mechanism for emergency stops
- Ownable for access control
- Slippage protection

## Documentation

- [Smart Contract Docs](./mantle-dca/README.md)
- [Telegram Bot Docs](./scripts/TELEGRAM_BOT_MANTLE_README.md)
- [Keeper Bot Docs](./scripts/KEEPER_BOT_README.md)

## Tech Stack

- Smart Contracts: Solidity, Foundry, OpenZeppelin
- Frontend: React, TypeScript, viem, Tailwind CSS
- Automation: Chainlink Automation compatible interface
- Notifications: Telegram Bot API

## License

MIT

---

Built by DripFi Team
