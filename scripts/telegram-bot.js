const TelegramBot = require('node-telegram-bot-api');
const fcl = require('@onflow/fcl');
const t = require('@onflow/types');
const fs = require('fs');
const path = require('path');
require("dotenv").config();

// Configure FCL for Flow Testnet
fcl.config({
    'accessNode.api': 'https://rest-testnet.onflow.org',
    'flow.network': 'testnet',
    '0xDCAContract': '0x78acd984694957cf',
    '0xMockUSD': '0x78acd984694957cf',
    '0xMockBTC': '0x78acd984694957cf',
});

// Database file for storing wallet-to-chatId mappings
const DB_FILE = path.join(__dirname, '../data/telegram-users.json');

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

// Validate Flow address (0x + 16 hex characters)
function isValidFlowAddress(address) {
    return /^0x[a-fA-F0-9]{16}$/.test(address);
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
const DCA_CONTRACT_ADDRESS = '0x78acd984694957cf';

console.log('🤖 Flow DCA Telegram Bot Started!');
console.log('Connected to Flow Testnet');
console.log('DCA Contract:', DCA_CONTRACT_ADDRESS);
console.log('Bot is ready to receive commands...\n');

// /start command - Link wallet to Telegram
bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const walletAddress = match[1].trim();

    if (!walletAddress) {
        bot.sendMessage(chatId,
            '👋 Welcome to Flow DCA Protocol Bot!\n\n' +
            'To link your Flow wallet, use:\n' +
            '`/start YOUR_FLOW_ADDRESS`\n\n' +
            'Example: `/start 0x1234567890abcdef`\n\n' +
            'Or get a linking URL from the DCA Protocol web app.',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    // Validate Flow address
    if (!isValidFlowAddress(walletAddress)) {
        bot.sendMessage(chatId,
            '❌ Invalid Flow address.\n\n' +
            'Flow addresses must be in format: `0x` + 16 hex characters\n' +
            'Example: `0x1234567890abcdef`',
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
        `✅ Flow wallet linked successfully!\n\n` +
        `📍 Address: \`${walletAddress}\`\n\n` +
        `You will now receive notifications when your DCA plans execute on Flow blockchain.\n\n` +
        `Use /help to see available commands.`,
        { parse_mode: 'Markdown' }
    );
});

// /help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        '📚 *Flow DCA Bot - Available Commands:*\n\n' +
        '🔗 *Setup*\n' +
        '/start FLOW\\_ADDRESS - Link your Flow wallet\n' +
        '  Example: `/start 0x1234567890abcdef`\n\n' +
        '💼 *Wallet & Plans*\n' +
        '/wallet - View wallet balances (FLOW, USD, BTC)\n' +
        '/plans - View your active DCA plans\n' +
        '/history - View execution history\n\n' +
        '⚙️ *Settings*\n' +
        '/unlink - Unlink your wallet\n' +
        '/help - Show this help message\n\n' +
        '🔔 *Notifications*\n' +
        'You will receive automatic notifications when your DCA plans execute on Flow blockchain!\n\n' +
        '🌐 *Web App*\n' +
        '[Open DCA Protocol](http://localhost:8080)\n\n' +
        '📖 *About*\n' +
        'This bot monitors your DCA plans on Flow Testnet and sends you real-time execution notifications.',
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
            '❌ No wallet linked.\n\n' +
            'Use /start YOUR_FLOW_ADDRESS to link your wallet.',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    const [walletAddress, userData] = entry;

    try {
        // Get FLOW balance
        const flowBalance = await fcl.query({
            cadence: `
                access(all) fun main(address: Address): UFix64 {
                    let account = getAccount(address)
                    return account.balance
                }
            `,
            args: (arg, t) => [arg(walletAddress, t.Address)]
        });

        // Get USD and BTC balances
        const tokenBalances = await fcl.query({
            cadence: `
                import MockUSD from 0xMockUSD
                import MockBTC from 0xMockBTC
                import FungibleToken from 0x9a0766d93b6608b7

                access(all) fun main(address: Address): {String: UFix64} {
                    let account = getAccount(address)
                    let balances: {String: UFix64} = {}

                    // Get USD balance
                    if let usdVault = account.capabilities
                        .get<&{FungibleToken.Balance}>(MockUSD.VaultPublicPath)
                        .borrow() {
                        balances["USD"] = usdVault.balance
                    } else {
                        balances["USD"] = 0.0
                    }

                    // Get BTC balance
                    if let btcVault = account.capabilities
                        .get<&{FungibleToken.Balance}>(MockBTC.VaultPublicPath)
                        .borrow() {
                        balances["BTC"] = btcVault.balance
                    } else {
                        balances["BTC"] = 0.0
                    }

                    return balances
                }
            `,
            args: (arg, t) => [arg(walletAddress, t.Address)]
        });

        bot.sendMessage(chatId,
            `💼 *Your Flow Wallet*\n\n` +
            `📍 Address: \`${walletAddress}\`\n` +
            `💰 FLOW: ${parseFloat(flowBalance).toFixed(4)}\n` +
            `💵 USD: ${parseFloat(tokenBalances.USD || 0).toFixed(2)}\n` +
            `₿ BTC: ${parseFloat(tokenBalances.BTC || 0).toFixed(8)}\n` +
            `🔗 Linked: ${new Date(userData.linkedAt).toLocaleString()}\n\n` +
            `[View on Flowscan](https://testnet.flowscan.io/account/${walletAddress})`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('Error fetching wallet info:', error);
        bot.sendMessage(chatId, '❌ Error fetching wallet information.');
    }
});

// /plans command
bot.onText(/\/plans/, async (msg) => {
    const chatId = msg.chat.id;
    const db = loadDatabase();

    const entry = Object.entries(db).find(([_, data]) => data.chatId === chatId);

    if (!entry) {
        bot.sendMessage(chatId, '❌ No wallet linked. Use /start YOUR_FLOW_ADDRESS');
        return;
    }

    const [walletAddress] = entry;

    try {
        // Get user's plans using Cadence script
        const plans = await fcl.query({
            cadence: `
                import DCAContract from 0xDCAContract

                access(all) fun main(userAddress: Address): [DCAContract.PlanDetails] {
                    let account = getAccount(userAddress)

                    let planManagerCap = account.capabilities
                        .get<&DCAContract.PlanManager>(DCAContract.PlanManagerPublicPath)

                    if planManagerCap == nil {
                        return []
                    }

                    let planManager = planManagerCap!.borrow()
                    if planManager == nil {
                        return []
                    }

                    let planIds = planManager!.getPlanIds()
                    let plans: [DCAContract.PlanDetails] = []

                    for planId in planIds {
                        let plan = planManager!.borrowPlan(planId: planId)
                        if plan != nil {
                            plans.append(plan!.getPlanDetails())
                        }
                    }

                    return plans
                }
            `,
            args: (arg, t) => [arg(walletAddress, t.Address)]
        });

        if (!plans || plans.length === 0) {
            bot.sendMessage(chatId, '📋 You have no DCA plans yet.\n\nCreate one on the web app!');
            return;
        }

        let message = `📋 *Your DCA Plans* (${plans.length})\n\n`;

        for (const plan of plans) {
            if (plan.isActive) {
                const now = Math.floor(Date.now() / 1000);
                const nextExecution = parseFloat(plan.lastExecutionTime) + parseFloat(plan.timeCycle);
                const canExecute = nextExecution <= now;
                const timeUntil = nextExecution - now;

                message += `*Plan #${plan.planId}*\n`;
                message += `💵 Amount: ${parseFloat(plan.amountPerExecution).toFixed(2)} USD\n`;
                message += `⏱ Cycle: ${parseFloat(plan.timeCycle) / 3600} hours\n`;
                message += `📊 Executions: ${plan.totalExecutions}${plan.maxExecutions > 0 ? '/' + plan.maxExecutions : ''}\n`;
                message += `${canExecute ? '✅' : '⏳'} ${canExecute ? 'Ready to execute' : 'Waiting'}\n`;

                if (!canExecute && timeUntil > 0) {
                    message += `⏰ Next: ${formatTimeUntil(timeUntil)}\n`;
                }
                message += '\n';
            }
        }

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error fetching plans:', error);
        bot.sendMessage(chatId, '❌ Error fetching plans. Make sure your account is set up!');
    }
});

// /history command
bot.onText(/\/history/, async (msg) => {
    const chatId = msg.chat.id;
    const db = loadDatabase();

    const entry = Object.entries(db).find(([_, data]) => data.chatId === chatId);

    if (!entry) {
        bot.sendMessage(chatId, '❌ No wallet linked. Use /start YOUR_FLOW_ADDRESS');
        return;
    }

    const [walletAddress] = entry;

    try {
        // Get latest block
        const latestBlock = await fcl.send([fcl.getBlock(true)]).then(fcl.decode);
        const latestHeight = latestBlock.height;

        // Query events in chunks (Flow API limit is 250 blocks per query)
        const CHUNK_SIZE = 250;
        const TOTAL_BLOCKS = 2500; // Last 2500 blocks
        const startHeight = Math.max(0, latestHeight - TOTAL_BLOCKS);

        let allEvents = [];
        let currentStart = startHeight;

        while (currentStart < latestHeight) {
            const currentEnd = Math.min(currentStart + CHUNK_SIZE, latestHeight);

            try {
                const events = await fcl.send([
                    fcl.getEventsAtBlockHeightRange(
                        'A.78acd984694957cf.DCAContract.PlanExecuted',
                        currentStart,
                        currentEnd
                    )
                ]).then(fcl.decode);

                // Filter for this user's events
                const userEvents = events.filter(e => e.data.owner === walletAddress);
                allEvents.push(...userEvents);
            } catch (err) {
                // Skip errors
            }

            currentStart = currentEnd + 1;
        }

        if (allEvents.length === 0) {
            bot.sendMessage(chatId, '📊 No execution history found in the last 2500 blocks.');
            return;
        }

        // Sort by block height (most recent first)
        allEvents.sort((a, b) => b.blockHeight - a.blockHeight);

        let message = `📊 *Execution History* (${allEvents.length})\n\n`;

        // Show last 5 executions
        const recentEvents = allEvents.slice(0, 5);

        for (const event of recentEvents) {
            const { planId, amountIn, amountOut, executionNumber } = event.data;

            message += `*Execution #${executionNumber}* (Plan #${planId})\n`;
            message += `💵 ${parseFloat(amountIn).toFixed(2)} USD → ${parseFloat(amountOut).toFixed(8)} BTC\n`;
            message += `📦 Block: ${event.blockHeight}\n`;
            message += `[View Tx](https://testnet.flowscan.io/transaction/${event.transactionId})\n\n`;
        }

        if (allEvents.length > 5) {
            message += `_Showing last 5 of ${allEvents.length} executions_\n`;
        }

        // Summary
        const totalUSD = allEvents.reduce((sum, e) => sum + parseFloat(e.data.amountIn), 0);
        const totalBTC = allEvents.reduce((sum, e) => sum + parseFloat(e.data.amountOut), 0);

        message += `\n📈 *Summary*\n`;
        message += `Total: ${totalUSD.toFixed(2)} USD → ${totalBTC.toFixed(8)} BTC\n`;
        if (totalBTC > 0) {
            message += `Avg Price: ${(totalUSD / totalBTC).toFixed(2)} USD/BTC`;
        }

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error fetching history:', error);
        bot.sendMessage(chatId, '❌ Error fetching history.');
    }
});

// /unlink command
bot.onText(/\/unlink/, (msg) => {
    const chatId = msg.chat.id;
    const db = loadDatabase();
    
    const entry = Object.entries(db).find(([_, data]) => data.chatId === chatId);
    
    if (!entry) {
        bot.sendMessage(chatId, '❌ No wallet linked.');
        return;
    }
    
    const [walletAddress] = entry;
    delete db[walletAddress.toLowerCase()];
    saveDatabase(db);
    
    bot.sendMessage(chatId, '✅ Wallet unlinked successfully.');
});

// Helper function
function formatTimeUntil(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

// Export function to send notifications
async function sendExecutionNotification(walletAddress, planId, amountIn, amountOut, txHash) {
    const db = loadDatabase();
    const userData = db[walletAddress.toLowerCase()];

    if (!userData) {
        return; // User not linked
    }

    const usdAmount = parseFloat(amountIn).toFixed(2);
    const btcAmount = parseFloat(amountOut).toFixed(8);
    const price = (parseFloat(amountIn) / parseFloat(amountOut)).toFixed(2);

    const message =
        `🎉 *Plan Executed!*\n\n` +
        `📋 Plan #${planId}\n` +
        `💵 ${usdAmount} USD → ${btcAmount} BTC\n` +
        `💰 Price: ${price} USD/BTC\n\n` +
        `[View Transaction](https://testnet.flowscan.io/transaction/${txHash})`;

    try {
        await bot.sendMessage(userData.chatId, message, { parse_mode: 'Markdown' });
        console.log(`✅ Notification sent to ${userData.username || 'user'}`);
    } catch (error) {
        console.error(`❌ Failed to send notification:`, error.message);
    }
}

module.exports = { sendExecutionNotification };

// Keep bot running
console.log('✅ Flow DCA Bot is running. Press Ctrl+C to stop.\n');

