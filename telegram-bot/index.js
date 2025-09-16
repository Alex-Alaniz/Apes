const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const db = require('../backend/config/database');

// Bot configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = process.env.API_URL || 'https://apes-production.up.railway.app';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// User sessions
const userSessions = new Map();

// Command handlers
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  const welcomeMessage = `
🦍 Welcome to APES Market Access Bot!

Trade on Polymarket with reduced fees based on your APES holdings:
• 🥉 Bronze (1k+ APES): 0.75% fee
• 🥈 Silver (10k+ APES): 0.5% fee  
• 🥇 Gold (50k+ APES): 0.3% fee
• 💎 Platinum (100k+ APES): 0.2% fee

Commands:
/connect - Connect your Solana wallet
/markets - Browse trending markets
/search [query] - Search markets
/bet - Place a bet
/positions - View your positions
/stats - Your trading statistics
/leaderboard - Top traders
/help - Show all commands

Start by connecting your wallet with /connect`;

  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '🔗 Connect Wallet', callback_data: 'connect_wallet' }
      ]]
    }
  });
});

bot.onText(/\/connect/, async (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, 
    `🔗 Connect your Solana wallet to check APES balance and unlock benefits.
    
Please send your Solana wallet address:`, {
    reply_markup: {
      force_reply: true
    }
  });
});

bot.onText(/\/markets/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Fetch trending markets from Polymarket
    const markets = await fetchTrendingMarkets();
    
    if (markets.length === 0) {
      bot.sendMessage(chatId, '📊 No markets available at the moment.');
      return;
    }
    
    const marketButtons = markets.slice(0, 10).map(market => [{
      text: `📈 ${market.question.substring(0, 50)}...`,
      callback_data: `market_${market.id}`
    }]);
    
    bot.sendMessage(chatId, 
      `📊 *Trending Markets*\n\nSelect a market to view details:`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: marketButtons
      }
    });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Error fetching markets. Please try again.');
  }
});

bot.onText(/\/bet/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = userSessions.get(userId);
  
  if (!session || !session.wallet) {
    bot.sendMessage(chatId, '❌ Please connect your wallet first with /connect');
    return;
  }
  
  bot.sendMessage(chatId, 
    `🎯 Place a bet\n\nPlease provide the market URL or ID:`, {
    reply_markup: {
      force_reply: true
    }
  });
  
  // Set betting state
  userSessions.set(userId, { ...session, state: 'betting_market' });
});

bot.onText(/\/positions/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = userSessions.get(userId);
  
  if (!session || !session.wallet) {
    bot.sendMessage(chatId, '❌ Please connect your wallet first with /connect');
    return;
  }
  
  try {
    const positions = await getUserPositions(userId);
    
    if (positions.length === 0) {
      bot.sendMessage(chatId, '📊 You have no open positions.');
      return;
    }
    
    let message = '*Your Open Positions*\n\n';
    positions.forEach((pos, idx) => {
      message += `${idx + 1}. *${pos.market_title}*\n`;
      message += `   💰 Size: $${pos.position_size.toFixed(2)}\n`;
      message += `   📈 Avg Price: ${pos.avg_price.toFixed(2)}\n`;
      message += `   📊 P&L: ${pos.pnl > 0 ? '+' : ''}$${pos.pnl.toFixed(2)}\n\n`;
    });
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Error fetching positions. Please try again.');
  }
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = userSessions.get(userId);
  
  if (!session || !session.wallet) {
    bot.sendMessage(chatId, '❌ Please connect your wallet first with /connect');
    return;
  }
  
  try {
    const stats = await getUserStats(userId);
    
    const message = `
*Your Trading Statistics*

🦍 APES Balance: ${formatNumber(stats.apesBalance)} APES
🎖️ Tier: ${stats.tierName}
💸 Fee Rate: ${(stats.feeRate * 100).toFixed(2)}%

📊 *Performance*
Total Volume: $${formatNumber(stats.totalVolume)}
Total Trades: ${stats.totalTrades}
Win Rate: ${stats.winRate.toFixed(1)}%
Total P&L: ${stats.totalPnl > 0 ? '+' : ''}$${formatNumber(stats.totalPnl)}

💰 *Fee Savings*
Total Fees Paid: $${formatNumber(stats.totalFees)}
Total Saved: $${formatNumber(stats.totalSaved)}
Lifetime Savings: ${stats.savingsPercentage.toFixed(1)}%`;
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Error fetching statistics. Please try again.');
  }
});

bot.onText(/\/leaderboard/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const leaderboard = await getLeaderboard('weekly');
    
    let message = '*Weekly Leaderboard* 🏆\n\n';
    
    leaderboard.forEach((trader, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      message += `${medal} @${trader.username || 'Anonymous'}\n`;
      message += `   Volume: $${formatNumber(trader.volume)}\n`;
      message += `   P&L: ${trader.pnl > 0 ? '+' : ''}$${formatNumber(trader.pnl)}\n`;
      message += `   Trades: ${trader.trades}\n\n`;
    });
    
    bot.sendMessage(chatId, message, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📅 Daily', callback_data: 'leaderboard_daily' },
            { text: '📅 Weekly', callback_data: 'leaderboard_weekly' },
            { text: '📅 Monthly', callback_data: 'leaderboard_monthly' }
          ]
        ]
      }
    });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Error fetching leaderboard. Please try again.');
  }
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  // Answer callback to remove loading state
  bot.answerCallbackQuery(callbackQuery.id);
  
  if (data === 'connect_wallet') {
    bot.sendMessage(chatId, 
      `🔗 Please send your Solana wallet address:`, {
      reply_markup: {
        force_reply: true
      }
    });
  } else if (data.startsWith('market_')) {
    const marketId = data.replace('market_', '');
    await showMarketDetails(chatId, marketId);
  } else if (data.startsWith('bet_')) {
    const [_, marketId, side] = data.split('_');
    await startBettingFlow(chatId, userId, marketId, side);
  } else if (data.startsWith('confirm_bet_')) {
    const betId = data.replace('confirm_bet_', '');
    await confirmBet(chatId, userId, betId);
  } else if (data.startsWith('leaderboard_')) {
    const period = data.replace('leaderboard_', '');
    await showLeaderboard(chatId, period);
  }
});

// Handle text messages
bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return; // Skip commands
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = userSessions.get(userId) || {};
  
  // Handle wallet connection
  if (msg.reply_to_message && msg.reply_to_message.text.includes('Solana wallet address')) {
    await handleWalletConnect(chatId, userId, msg.text);
  }
  
  // Handle betting flow
  else if (session.state === 'betting_market') {
    await handleBettingMarket(chatId, userId, msg.text);
  }
  else if (session.state === 'betting_amount') {
    await handleBettingAmount(chatId, userId, msg.text);
  }
});

// Helper functions
async function handleWalletConnect(chatId, userId, walletAddress) {
  try {
    // Validate Solana address
    if (!isValidSolanaAddress(walletAddress)) {
      bot.sendMessage(chatId, '❌ Invalid Solana address. Please try again.');
      return;
    }
    
    // Check APES balance
    const balance = await checkApesBalance(walletAddress);
    const tier = calculateTier(balance);
    
    // Save user session
    userSessions.set(userId, {
      wallet: walletAddress,
      apesBalance: balance,
      tier: tier.name,
      feeRate: tier.feeRate
    });
    
    // Save to database
    await saveUserWallet(userId, chatId, walletAddress);
    
    bot.sendMessage(chatId, `
✅ Wallet connected successfully!

🦍 APES Balance: ${formatNumber(balance)} APES
🎖️ Tier: ${tier.name}
💸 Your Fee: ${(tier.feeRate * 100).toFixed(2)}%
💰 You Save: ${((0.01 - tier.feeRate) * 100).toFixed(2)}%

You're ready to start trading! Use /markets to browse available markets.`, {
      reply_markup: {
        keyboard: [
          ['📊 Markets', '💼 Positions'],
          ['📈 Stats', '🏆 Leaderboard'],
          ['❓ Help', '⚙️ Settings']
        ],
        resize_keyboard: true
      }
    });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Error connecting wallet. Please try again.');
  }
}

async function showMarketDetails(chatId, marketId) {
  try {
    const market = await fetchMarketDetails(marketId);
    
    const message = `
*${market.question}*

💰 Volume: $${formatNumber(market.volume)}
📊 Liquidity: $${formatNumber(market.liquidity)}
📅 Ends: ${new Date(market.endDate).toLocaleDateString()}

*Current Odds:*
${market.outcomes.map((o, i) => `${o.name}: ${(o.price * 100).toFixed(1)}%`).join('\n')}

Select an outcome to bet on:`;
    
    const buttons = market.outcomes.map(outcome => [{
      text: `${outcome.name} @ ${(outcome.price * 100).toFixed(1)}%`,
      callback_data: `bet_${marketId}_${outcome.index}`
    }]);
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Error loading market details.');
  }
}

async function startBettingFlow(chatId, userId, marketId, outcomeIndex) {
  const session = userSessions.get(userId);
  
  if (!session || !session.wallet) {
    bot.sendMessage(chatId, '❌ Please connect your wallet first with /connect');
    return;
  }
  
  // Save betting details in session
  userSessions.set(userId, {
    ...session,
    state: 'betting_amount',
    currentBet: {
      marketId,
      outcomeIndex
    }
  });
  
  bot.sendMessage(chatId, 
    `💰 How much would you like to bet? (in USD)\n\nYour fee rate: ${(session.feeRate * 100).toFixed(2)}%`, {
    reply_markup: {
      force_reply: true
    }
  });
}

async function handleBettingAmount(chatId, userId, amount) {
  const session = userSessions.get(userId);
  
  if (!session || !session.currentBet) {
    bot.sendMessage(chatId, '❌ Betting session expired. Please start again.');
    return;
  }
  
  const betAmount = parseFloat(amount);
  if (isNaN(betAmount) || betAmount <= 0) {
    bot.sendMessage(chatId, '❌ Please enter a valid amount greater than 0.');
    return;
  }
  
  try {
    const market = await fetchMarketDetails(session.currentBet.marketId);
    const outcome = market.outcomes[session.currentBet.outcomeIndex];
    const platformFee = betAmount * session.feeRate;
    const totalCost = betAmount + platformFee;
    
    const message = `
📋 *Order Summary*

Market: ${market.question}
Outcome: ${outcome.name}
Price: ${(outcome.price * 100).toFixed(1)}%
Size: $${betAmount.toFixed(2)}

💸 Platform Fee (${(session.feeRate * 100).toFixed(2)}%): $${platformFee.toFixed(2)}
💰 Total Cost: $${totalCost.toFixed(2)}

Confirm this bet?`;
    
    // Store bet details for confirmation
    userSessions.set(userId, {
      ...session,
      state: 'confirming_bet',
      pendingBet: {
        marketId: session.currentBet.marketId,
        outcomeIndex: session.currentBet.outcomeIndex,
        amount: betAmount,
        fee: platformFee,
        total: totalCost
      }
    });
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Confirm', callback_data: `confirm_bet_${userId}` },
            { text: '❌ Cancel', callback_data: 'cancel_bet' }
          ]
        ]
      }
    });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Error processing bet. Please try again.');
  }
}

async function confirmBet(chatId, userId, betId) {
  const session = userSessions.get(userId);
  
  if (!session || !session.pendingBet) {
    bot.sendMessage(chatId, '❌ No pending bet found.');
    return;
  }
  
  try {
    // Place order through API
    const response = await axios.post(
      `${API_URL}/api/polymarket/place-order`,
      {
        marketId: session.pendingBet.marketId,
        outcomeId: session.pendingBet.outcomeIndex,
        size: session.pendingBet.amount,
        side: 'BUY'
      },
      {
        headers: { 'x-wallet-address': session.wallet }
      }
    );
    
    const order = response.data;
    
    bot.sendMessage(chatId, `
✅ *Order Placed Successfully!*

Order ID: \`${order.orderId}\`
Status: ${order.status}
Fee Paid: $${order.fee.toFixed(2)}
You Saved: $${order.feeSavings.toFixed(2)}

${order.message}

Track your position with /positions`, {
      parse_mode: 'Markdown'
    });
    
    // Clear betting session
    userSessions.set(userId, {
      wallet: session.wallet,
      apesBalance: session.apesBalance,
      tier: session.tier,
      feeRate: session.feeRate
    });
  } catch (error) {
    console.error('Error placing bet:', error);
    bot.sendMessage(chatId, '❌ Failed to place bet. Please try again later.');
  }
}

async function showLeaderboard(chatId, period) {
  try {
    const leaderboard = await getLeaderboard(period);
    
    if (leaderboard.length === 0) {
      bot.sendMessage(chatId, '📊 No leaderboard data available yet.');
      return;
    }
    
    const title = `🏆 *Top Traders - ${period.charAt(0).toUpperCase() + period.slice(1)}*\n\n`;
    const entries = leaderboard.map((trader, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      return `${medal} ${trader.address}\n💰 P&L: $${formatNumber(trader.pnl)}\n📊 Win Rate: ${trader.winRate}%\n`;
    }).join('\n');
    
    bot.sendMessage(chatId, title + entries, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Error loading leaderboard.');
  }
}

// Utility functions
function isValidSolanaAddress(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

async function checkApesBalance(walletAddress) {
  try {
    const response = await axios.get(`${API_URL}/api/wallet/apes-balance/${walletAddress}`);
    return response.data.balance || 0;
  } catch (error) {
    console.error('Error checking APES balance:', error);
    return 0;
  }
}

function calculateTier(apesBalance) {
  if (apesBalance >= 100000) return { name: '💎 Platinum', feeRate: 0.002 };
  if (apesBalance >= 50000) return { name: '🥇 Gold', feeRate: 0.003 };
  if (apesBalance >= 10000) return { name: '🥈 Silver', feeRate: 0.005 };
  if (apesBalance >= 1000) return { name: '🥉 Bronze', feeRate: 0.0075 };
  return { name: 'No Tier', feeRate: 0.01 };
}

function formatNumber(num) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}

async function fetchTrendingMarkets() {
  try {
    const response = await axios.get(`${API_URL}/api/polymarket/markets`, {
      params: { limit: 20 }
    });
    return response.data.markets || [];
  } catch (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
}

async function fetchMarketDetails(marketId) {
  try {
    const response = await axios.get(`${API_URL}/api/polymarket/markets`);
    const markets = response.data.markets || [];
    return markets.find(m => m.id === marketId) || null;
  } catch (error) {
    console.error('Error fetching market details:', error);
    return null;
  }
}

async function getUserPositions(walletAddress) {
  try {
    const response = await axios.get(`${API_URL}/api/polymarket/positions`, {
      headers: { 'x-wallet-address': walletAddress }
    });
    return response.data.positions || [];
  } catch (error) {
    console.error('Error fetching positions:', error);
    return [];
  }
}

async function getUserStats(walletAddress) {
  try {
    const response = await axios.get(`${API_URL}/api/polymarket/stats/user/${walletAddress}`);
    return response.data || {
      totalVolume: 0,
      totalPnl: 0,
      winRate: 0,
      totalTrades: 0
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      totalVolume: 0,
      totalPnl: 0,
      winRate: 0,
      totalTrades: 0
    };
  }
}

async function getLeaderboard(period = 'weekly') {
  try {
    const response = await axios.get(`${API_URL}/api/polymarket/leaderboard`, {
      params: { period, limit: 10 }
    });
    return response.data.leaderboard || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

async function saveUserWallet(userId, chatId, walletAddress) {
  // Save to database
  await db.query(`
    INSERT INTO telegram_users (user_id, chat_id, wallet_address, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET wallet_address = $3, updated_at = NOW()
  `, [userId, chatId, walletAddress]);
}

// Start bot
console.log('🤖 APES Telegram Bot is running...');

// Graceful shutdown
process.once('SIGINT', () => bot.stopPolling());
process.once('SIGTERM', () => bot.stopPolling());