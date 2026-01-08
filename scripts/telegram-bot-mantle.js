const TelegramBot = require('node-telegram-bot-api');
const { createPublicClient, http, formatUnits, parseAbi } = require('viem');
const fs = require('fs');
const path = require('path');
require("dotenv").config();

// Mantle Sepolia Testnet Configuration
const MANTLE_SEPOLIA = {
    id: 5003,
    name: 'Mantle Sepolia Testnet',
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorerUrl: 'https://sepolia.mantlescan.xyz',
};

// Contract Addresses (Mantle Sepolia Testnet)
const CONTRACTS = {
    PRICE_ORACLE: '0xbaEe5FBc1AA66F7B59D185925d4B7F6947041863',
    DCA_VAULT: '0x60b863F96c146f8D33B7dC99040ef93A39C37cA5',
    SWAP_HELPER: '0xb2888D850F6A59fff8d537305DfA51ccEf77c177',
    DCA_STRATEGY: '0x167Be96F03aBd2Ab7476bB4e38d5b17bCA1E2b7E',
};

// ABIs
const DCAStrategyABI = parseAbi([
    'function getPlan(uint256 planId) view returns (tuple(address owner, address sourceToken, address targetToken, uint256 amountPerExecution, uint256 interval, uint256 lastExecutionTime, uint256 executionCount, uint256 maxExecutions, uint256 minPrice, uint256 maxPrice, uint8 status, uint256 createdAt))',
    'function getUserPlans(address user) view returns (uint256[])',
    'function planCount() view returns (uint256)',
    'event ExecutionCompleted(uint256 indexed planId, uint256 amountIn, uint256 amountOut, uint256 executionNumber)',
    'event PlanCreated(uint256 indexed planId, address indexed owner, address sourceToken, address targetToken, uint256 amountPerExecution, uint256 interval)',
]);

const DCAVaultABI = parseAbi([
    'function getBalance(address user, address token) view returns (uint256)',
]);

// Plan Status enum
const PlanStatus = {
    0: 'Active',
    1: 'Paused',
    2: 'Stopped',
    3: 'Completed',
};

// Create viem public client
const publicClient = createPublicClient({
    transport: http(MANTLE_SEPOLIA.rpcUrl),
});

// Database file for storing wallet-to-chatId mappings
const DB_FILE = path.join(__dirname, '../data/telegram-users-mantle.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load or initialize database
function loadDatabase() {
    if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

function saveDatabase(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Validate Ethereum address
function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Initialize bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env file');
    console.log('Please add your Telegram bot token to .env:');
    console.log('TELEGRAM_BOT_TOKEN=your_bot_token_here');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('🤖 DripFi-Mantle Telegram Bot Started!');
console.log('Connected to Mantle Sepolia Testnet');
console.log('DCA Strategy:', CONTRACTS.DCA_STRATEGY);
console.log('DCA Vault:', CONTRACTS.DCA_VAULT);
console.log('Bot is ready to receive commands...\n');

// /start command - Link wallet to Telegram
bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const walletAddress = match[1].trim();

    if (!walletAddress) {
        bot.sendMessage(chatId,
            '👋 欢迎使用 DripFi-Mantle Bot!\n\n' +
            '链接您的钱包，使用:\n' +
            '`/start YOUR_WALLET_ADDRESS`\n\n' +
            '示例: `/start 0x1234...abcd`\n\n' +
            '或从 DCA Protocol 网页应用获取链接。',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    // Validate address
    if (!isValidAddress(walletAddress)) {
        bot.sendMessage(chatId,
            '❌ 无效的钱包地址。\n\n' +
            '地址格式: `0x` + 40 个十六进制字符\n' +
            '示例: `0x1234567890abcdef1234567890abcdef12345678`',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    // Store mapping
    const db = loadDatabase();
    db[walletAddress.toLowerCase()] = {
        chatId: chatId,
        username: msg.from.username || msg.from.first_name,
        linkedAt: new Date().toISOString()
    };
    saveDatabase(db);

    bot.sendMessage(chatId,
        `✅ 钱包链接成功!\n\n` +
        `📍 地址: \`${walletAddress}\`\n` +
        `🌐 网络: Mantle Sepolia Testnet\n\n` +
        `您将在 DCA 计划执行时收到通知。\n\n` +
        `使用 /help 查看可用命令。`,
        { parse_mode: 'Markdown' }
    );
});

// /help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        '📚 *DripFi-Mantle Bot - 可用命令:*\n\n' +
        '🔗 *设置*\n' +
        '/start WALLET\\_ADDRESS - 链接您的钱包\n' +
        '  示例: `/start 0x1234...abcd`\n\n' +
        '💼 *钱包 & 计划*\n' +
        '/wallet - 查看钱包余额\n' +
        '/plans - 查看您的 DCA 计划\n' +
        '/history - 查看执行历史\n\n' +
        '⚙️ *设置*\n' +
        '/unlink - 取消链接钱包\n' +
        '/help - 显示帮助信息\n\n' +
        '🔔 *通知*\n' +
        '当您的 DCA 计划执行时，您将自动收到通知!\n\n' +
        '🌐 *网络*\n' +
        'Mantle Sepolia Testnet\n\n' +
        '📖 *关于*\n' +
        '此 Bot 监控您在 Mantle 上的 DCA 计划，并发送实时执行通知。',
        { parse_mode: 'Markdown' }
    );
});


// /wallet command
bot.onText(/\/wallet/, async (msg) => {
    const chatId = msg.chat.id;
    const db = loadDatabase();

    // Find wallet for this chatId
    const entry = Object.entries(db).find(([_, data]) => data.chatId === chatId);

    if (!entry) {
        bot.sendMessage(chatId,
            '❌ 未链接钱包。\n\n' +
            '使用 /start YOUR_WALLET_ADDRESS 链接您的钱包。',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    const [walletAddress, userData] = entry;

    try {
        // Get MNT balance
        const mntBalance = await publicClient.getBalance({
            address: walletAddress,
        });

        bot.sendMessage(chatId,
            `💼 *您的 Mantle 钱包*\n\n` +
            `📍 地址: \`${walletAddress}\`\n` +
            `💰 MNT: ${parseFloat(formatUnits(mntBalance, 18)).toFixed(4)}\n` +
            `🔗 链接时间: ${new Date(userData.linkedAt).toLocaleString('zh-CN')}\n\n` +
            `[在 Mantlescan 查看](${MANTLE_SEPOLIA.explorerUrl}/address/${walletAddress})`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('Error fetching wallet info:', error);
        bot.sendMessage(chatId, '❌ 获取钱包信息时出错。');
    }
});

// /plans command
bot.onText(/\/plans/, async (msg) => {
    const chatId = msg.chat.id;
    const db = loadDatabase();

    const entry = Object.entries(db).find(([_, data]) => data.chatId === chatId);

    if (!entry) {
        bot.sendMessage(chatId, '❌ 未链接钱包。使用 /start YOUR_WALLET_ADDRESS');
        return;
    }

    const [walletAddress] = entry;

    try {
        // Get user's plan IDs
        const planIds = await publicClient.readContract({
            address: CONTRACTS.DCA_STRATEGY,
            abi: DCAStrategyABI,
            functionName: 'getUserPlans',
            args: [walletAddress],
        });

        if (!planIds || planIds.length === 0) {
            bot.sendMessage(chatId, '📋 您还没有 DCA 计划。\n\n在网页应用上创建一个!');
            return;
        }

        let message = `📋 *您的 DCA 计划* (${planIds.length})\n\n`;

        for (const planId of planIds) {
            try {
                const plan = await publicClient.readContract({
                    address: CONTRACTS.DCA_STRATEGY,
                    abi: DCAStrategyABI,
                    functionName: 'getPlan',
                    args: [planId],
                });

                const status = PlanStatus[plan.status] || 'Unknown';
                const amount = formatUnits(plan.amountPerExecution, 18);
                const interval = formatInterval(plan.interval);

                message += `*计划 #${planId}*\n`;
                message += `💵 金额: ${parseFloat(amount).toFixed(4)}\n`;
                message += `⏱ 间隔: ${interval}\n`;
                message += `📊 执行: ${plan.executionCount.toString()}`;
                if (plan.maxExecutions > 0n) {
                    message += `/${plan.maxExecutions.toString()}`;
                }
                message += '\n';
                message += `${plan.status === 0 ? '✅' : '⏸'} 状态: ${status}\n\n`;
            } catch (err) {
                console.error(`Error fetching plan ${planId}:`, err);
            }
        }

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error fetching plans:', error);
        bot.sendMessage(chatId, '❌ 获取计划时出错。');
    }
});

// /history command
bot.onText(/\/history/, async (msg) => {
    const chatId = msg.chat.id;
    const db = loadDatabase();

    const entry = Object.entries(db).find(([_, data]) => data.chatId === chatId);

    if (!entry) {
        bot.sendMessage(chatId, '❌ 未链接钱包。使用 /start YOUR_WALLET_ADDRESS');
        return;
    }

    const [walletAddress] = entry;

    try {
        // Get user's plan IDs first
        const planIds = await publicClient.readContract({
            address: CONTRACTS.DCA_STRATEGY,
            abi: DCAStrategyABI,
            functionName: 'getUserPlans',
            args: [walletAddress],
        });

        if (!planIds || planIds.length === 0) {
            bot.sendMessage(chatId, '📊 没有执行历史。您还没有 DCA 计划。');
            return;
        }

        // Get execution events
        const logs = await publicClient.getLogs({
            address: CONTRACTS.DCA_STRATEGY,
            event: {
                type: 'event',
                name: 'ExecutionCompleted',
                inputs: [
                    { name: 'planId', type: 'uint256', indexed: true },
                    { name: 'amountIn', type: 'uint256', indexed: false },
                    { name: 'amountOut', type: 'uint256', indexed: false },
                    { name: 'executionNumber', type: 'uint256', indexed: false },
                ],
            },
            fromBlock: 'earliest',
            toBlock: 'latest',
        });

        // Filter by user's plans
        const planIdSet = new Set(planIds.map(id => id.toString()));
        const userLogs = logs.filter(log => planIdSet.has(log.args.planId?.toString()));

        if (userLogs.length === 0) {
            bot.sendMessage(chatId, '📊 暂无执行历史。');
            return;
        }

        // Sort by block number (most recent first)
        userLogs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        let message = `📊 *执行历史* (${userLogs.length})\n\n`;

        // Show last 5 executions
        const recentLogs = userLogs.slice(0, 5);

        for (const log of recentLogs) {
            const { planId, amountIn, amountOut, executionNumber } = log.args;

            message += `*第 ${executionNumber} 次执行* (计划 #${planId})\n`;
            message += `💵 ${parseFloat(formatUnits(amountIn, 18)).toFixed(4)} → ${parseFloat(formatUnits(amountOut, 18)).toFixed(6)}\n`;
            message += `📦 区块: ${log.blockNumber}\n`;
            message += `[查看交易](${MANTLE_SEPOLIA.explorerUrl}/tx/${log.transactionHash})\n\n`;
        }

        if (userLogs.length > 5) {
            message += `_显示最近 5 条，共 ${userLogs.length} 条_\n`;
        }

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error fetching history:', error);
        bot.sendMessage(chatId, '❌ 获取历史时出错。');
    }
});

// /unlink command
bot.onText(/\/unlink/, (msg) => {
    const chatId = msg.chat.id;
    const db = loadDatabase();
    
    const entry = Object.entries(db).find(([_, data]) => data.chatId === chatId);
    
    if (!entry) {
        bot.sendMessage(chatId, '❌ 未链接钱包。');
        return;
    }
    
    const [walletAddress] = entry;
    delete db[walletAddress.toLowerCase()];
    saveDatabase(db);
    
    bot.sendMessage(chatId, '✅ 钱包已取消链接。');
});

// Helper function
function formatInterval(seconds) {
    const s = Number(seconds);
    if (s === 3600) return '1 小时';
    if (s === 14400) return '4 小时';
    if (s === 86400) return '1 天';
    if (s === 604800) return '1 周';
    if (s < 60) return `${s} 秒`;
    if (s < 3600) return `${Math.floor(s / 60)} 分钟`;
    if (s < 86400) return `${Math.floor(s / 3600)} 小时`;
    return `${Math.floor(s / 86400)} 天`;
}

// Export function to send notifications
async function sendExecutionNotification(walletAddress, planId, amountIn, amountOut, txHash) {
    const db = loadDatabase();
    const userData = db[walletAddress.toLowerCase()];

    if (!userData) {
        return; // User not linked
    }

    const inAmount = parseFloat(formatUnits(amountIn, 18)).toFixed(4);
    const outAmount = parseFloat(formatUnits(amountOut, 18)).toFixed(6);

    const message =
        `🎉 *计划已执行!*\n\n` +
        `📋 计划 #${planId}\n` +
        `💵 ${inAmount} → ${outAmount}\n\n` +
        `[查看交易](${MANTLE_SEPOLIA.explorerUrl}/tx/${txHash})`;

    try {
        await bot.sendMessage(userData.chatId, message, { parse_mode: 'Markdown' });
        console.log(`✅ Notification sent to ${userData.username || 'user'}`);
    } catch (error) {
        console.error(`❌ Failed to send notification:`, error.message);
    }
}

module.exports = { sendExecutionNotification };

// Keep bot running
console.log('✅ DripFi-Mantle Bot is running. Press Ctrl+C to stop.\n');
