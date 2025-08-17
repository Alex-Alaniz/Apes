const { Connection, PublicKey } = require('@solana/web3.js');
const db = require('../backend/config/database');

// Market to check
const MARKET_ADDRESS = '4Wv18rXf3Dks5fXvBJakNWpGXsLVYknA8KkTj3nnuEEr';

async function checkMarketParticipants() {
  try {
    console.log(`\n🔍 Checking participants for market: ${MARKET_ADDRESS}\n`);
    
    // First check if market exists and get its details
    const marketQuery = `
      SELECT 
        market_address, 
        question, 
        status, 
        resolved_option, 
        options,
        resolution_date,
        total_volume,
        participant_count
      FROM markets 
      WHERE market_address = $1
    `;
    
    const marketResult = await db.query(marketQuery, [MARKET_ADDRESS]);
    
    if (marketResult.rows.length === 0) {
      console.log('❌ Market not found in database');
      return;
    }
    
    const market = marketResult.rows[0];
    console.log('📊 Market Details:');
    console.log(`   Question: ${market.question}`);
    console.log(`   Status: ${market.status}`);
    console.log(`   Total Volume: ${market.total_volume} APES`);
    console.log(`   Participant Count (stored): ${market.participant_count || 0}`);
    
    if (market.status === 'Resolved') {
      console.log(`   Winning Option: ${market.resolved_option} - ${market.options[market.resolved_option]}`);
    }
    console.log('');
    
    // Get all participants from prediction_history
    const participantsQuery = `
      SELECT DISTINCT 
        ph.wallet_address,
        ph.option_index,
        ph.option_text,
        ph.amount,
        ph.predicted_at,
        ph.is_winner,
        ph.payout_amount,
        ph.claimed,
        ph.claimed_at,
        ph.transaction_signature
      FROM prediction_history ph
      WHERE ph.market_pubkey = $1
      ORDER BY ph.amount DESC
    `;
    
    const participantsResult = await db.query(participantsQuery, [MARKET_ADDRESS]);
    console.log(`📊 Found ${participantsResult.rows.length} predictions in prediction_history\n`);
    
    // Also check predictions table
    let predictionsData = [];
    try {
      const predictionsQuery = `
        SELECT 
          user_address as wallet_address,
          option_index,
          amount,
          timestamp as predicted_at,
          claimed,
          claim_timestamp as claimed_at,
          payout,
          transaction_signature
        FROM predictions
        WHERE market_address = $1
      `;
      const predictionsResult = await db.query(predictionsQuery, [MARKET_ADDRESS]);
      predictionsData = predictionsResult.rows;
      console.log(`📊 Found ${predictionsData.length} predictions in predictions table\n`);
    } catch (predError) {
      console.log('Note: predictions table not available\n');
    }
    
    // Merge and analyze data
    const uniqueWallets = new Set();
    const pendingClaims = [];
    const claimedRewards = [];
    let totalPendingValue = 0;
    let totalClaimedValue = 0;
    
    // Process prediction_history data
    participantsResult.rows.forEach(row => {
      uniqueWallets.add(row.wallet_address);
      
      if (market.status === 'Resolved' && row.is_winner && !row.claimed) {
        pendingClaims.push(row);
        totalPendingValue += parseFloat(row.payout_amount || row.amount || 0);
      } else if (row.claimed) {
        claimedRewards.push(row);
        totalClaimedValue += parseFloat(row.payout_amount || row.amount || 0);
      }
    });
    
    // Process predictions table data
    predictionsData.forEach(row => {
      uniqueWallets.add(row.wallet_address);
      
      const isWinner = market.status === 'Resolved' && market.resolved_option === row.option_index;
      if (isWinner && !row.claimed) {
        // Check if not already in pending from prediction_history
        const alreadyPending = pendingClaims.some(p => 
          p.wallet_address === row.wallet_address && p.option_index === row.option_index
        );
        if (!alreadyPending) {
          pendingClaims.push({
            ...row,
            is_winner: true,
            option_text: market.options[row.option_index] || `Option ${row.option_index}`
          });
          totalPendingValue += parseFloat(row.payout || row.amount || 0);
        }
      }
    });
    
    console.log('📊 Summary:');
    console.log(`   Total Unique Participants: ${uniqueWallets.size}`);
    console.log(`   Pending Claims: ${pendingClaims.length}`);
    console.log(`   Claimed Rewards: ${claimedRewards.length}`);
    console.log(`   Total Pending Value: ${totalPendingValue.toFixed(2)} APES`);
    console.log(`   Total Claimed Value: ${totalClaimedValue.toFixed(2)} APES\n`);
    
    if (pendingClaims.length > 0) {
      console.log('⚠️  Users with Pending Claims:');
      console.log('━'.repeat(100));
      pendingClaims.forEach((claim, index) => {
        console.log(`${index + 1}. Wallet: ${claim.wallet_address}`);
        console.log(`   Option: ${claim.option_text} (index: ${claim.option_index})`);
        console.log(`   Amount Bet: ${parseFloat(claim.amount).toFixed(2)} APES`);
        console.log(`   Estimated Payout: ${parseFloat(claim.payout_amount || claim.amount).toFixed(2)} APES`);
        console.log(`   Predicted At: ${new Date(claim.predicted_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('✅ No pending claims found - all winners have claimed their rewards!\n');
    }
    
    // Show participant breakdown by option
    console.log('📊 Participants by Option:');
    console.log('━'.repeat(60));
    const optionStats = {};
    
    participantsResult.rows.forEach(row => {
      const optionKey = row.option_index;
      if (!optionStats[optionKey]) {
        optionStats[optionKey] = {
          text: row.option_text,
          count: 0,
          totalAmount: 0,
          wallets: new Set()
        };
      }
      optionStats[optionKey].count++;
      optionStats[optionKey].totalAmount += parseFloat(row.amount || 0);
      optionStats[optionKey].wallets.add(row.wallet_address);
    });
    
    Object.entries(optionStats).forEach(([index, stats]) => {
      const isWinner = market.status === 'Resolved' && market.resolved_option == index;
      console.log(`Option ${index}: ${stats.text} ${isWinner ? '🏆 (WINNER)' : ''}`);
      console.log(`  - Unique Participants: ${stats.wallets.size}`);
      console.log(`  - Total Predictions: ${stats.count}`);
      console.log(`  - Total Volume: ${stats.totalAmount.toFixed(2)} APES`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error checking market participants:', error);
  } finally {
    await db.end();
  }
}

// Run the check
checkMarketParticipants(); 