/**
 * DripFi-Mantle Keeper Bot
 * 
 * 自动执行 DCA 计划的 Keeper Bot
 * 由于 Chainlink Automation 尚未支持 Mantle，使用此 Bot 作为替代方案
 * 
 * 运行方式: npm run keeper:mantle
 */

const { createPublicClient, createWalletClient, http, parseAbi, formatUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
require('dotenv').config();

// Mantle Sepolia Testnet Configuration
const MANTLE_SEPOLIA = {
    id: 5003,
    name: 'Mantle Sepolia Testnet',
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorerUrl: 'https://sepolia.mantlescan.xyz',
};

// Contract Addresses
const CONTRACTS = {
    DCA_STRATEGY: '0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E',
};

// ABI for DCAStrategy
const DCAStrategyABI = parseAbi([
    'function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData)',
    'function performUpkeep(bytes calldata performData) external',
    'function planCount() external view returns (uint256)',
]);

// Configuration
const CHECK_INTERVAL_MS = 60000; // Check every 60 seconds
const MAX_GAS_PRICE_GWEI = 50; // Max gas price willing to pay

// Create clients
const publicClient = createPublicClient({
    transport: http(MANTLE_SEPOLIA.rpcUrl),
});

let walletClient = null;
let account = null;

// Initialize wallet
function initWallet() {
    const privateKey = process.env.KEEPER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    
    if (!privateKey) {
        console.error('❌ KEEPER_PRIVATE_KEY or PRIVATE_KEY not found in .env');
        console.log('Please add your private key to .env:');
        console.log('KEEPER_PRIVATE_KEY=0x...');
        process.exit(1);
    }

    account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
    
    walletClient = createWalletClient({
        account,
        transport: http(MANTLE_SEPOLIA.rpcUrl),
    });

    console.log(`🔑 Keeper address: ${account.address}`);
}

// Check if any plans need execution
async function checkUpkeep() {
    try {
        const result = await publicClient.readContract({
            address: CONTRACTS.DCA_STRATEGY,
            abi: DCAStrategyABI,
            functionName: 'checkUpkeep',
            args: ['0x'],
        });

        return {
            upkeepNeeded: result[0],
            performData: result[1],
        };
    } catch (error) {
        console.error('Error checking upkeep:', error.message);
        return { upkeepNeeded: false, performData: '0x' };
    }
}

// Execute upkeep
async function performUpkeep(performData) {
    try {
        console.log('⚡ Executing upkeep...');
        
        // Estimate gas
        const gasEstimate = await publicClient.estimateContractGas({
            address: CONTRACTS.DCA_STRATEGY,
            abi: DCAStrategyABI,
            functionName: 'performUpkeep',
            args: [performData],
            account: account.address,
        });

        // Get current gas price
        const gasPrice = await publicClient.getGasPrice();
        const gasPriceGwei = Number(gasPrice) / 1e9;

        if (gasPriceGwei > MAX_GAS_PRICE_GWEI) {
            console.log(`⚠️ Gas price too high: ${gasPriceGwei.toFixed(2)} gwei (max: ${MAX_GAS_PRICE_GWEI})`);
            return false;
        }

        // Send transaction
        const hash = await walletClient.writeContract({
            address: CONTRACTS.DCA_STRATEGY,
            abi: DCAStrategyABI,
            functionName: 'performUpkeep',
            args: [performData],
            gas: gasEstimate * 120n / 100n, // Add 20% buffer
        });

        console.log(`📤 Transaction sent: ${hash}`);

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
            console.log(`✅ Upkeep executed successfully!`);
            console.log(`   Block: ${receipt.blockNumber}`);
            console.log(`   Gas used: ${receipt.gasUsed}`);
            console.log(`   View: ${MANTLE_SEPOLIA.explorerUrl}/tx/${hash}`);
            return true;
        } else {
            console.log(`❌ Transaction failed`);
            return false;
        }
    } catch (error) {
        console.error('Error performing upkeep:', error.message);
        return false;
    }
}

// Get keeper balance
async function getKeeperBalance() {
    const balance = await publicClient.getBalance({
        address: account.address,
    });
    return formatUnits(balance, 18);
}

// Main loop
async function runKeeper() {
    console.log('\n🤖 DripFi-Mantle Keeper Bot');
    console.log('========================');
    console.log(`Network: ${MANTLE_SEPOLIA.name}`);
    console.log(`DCA Strategy: ${CONTRACTS.DCA_STRATEGY}`);
    console.log(`Check interval: ${CHECK_INTERVAL_MS / 1000}s`);
    console.log(`Max gas price: ${MAX_GAS_PRICE_GWEI} gwei`);
    console.log('========================\n');

    initWallet();

    // Check balance
    const balance = await getKeeperBalance();
    console.log(`💰 Keeper balance: ${parseFloat(balance).toFixed(4)} MNT\n`);

    if (parseFloat(balance) < 0.01) {
        console.warn('⚠️ Low balance! Please fund the keeper address.');
    }

    // Get plan count
    try {
        const planCount = await publicClient.readContract({
            address: CONTRACTS.DCA_STRATEGY,
            abi: DCAStrategyABI,
            functionName: 'planCount',
        });
        console.log(`📋 Total plans: ${planCount}\n`);
    } catch (error) {
        console.log('📋 Could not fetch plan count\n');
    }

    console.log('🔄 Starting keeper loop...\n');

    let iteration = 0;

    while (true) {
        iteration++;
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        
        console.log(`[${timestamp}] Check #${iteration}`);

        try {
            const { upkeepNeeded, performData } = await checkUpkeep();

            if (upkeepNeeded) {
                console.log('✨ Upkeep needed!');
                await performUpkeep(performData);
            } else {
                console.log('😴 No upkeep needed');
            }
        } catch (error) {
            console.error(`Error in iteration ${iteration}:`, error.message);
        }

        // Wait for next check
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Keeper bot stopped');
    process.exit(0);
});

// Run
runKeeper().catch(console.error);
