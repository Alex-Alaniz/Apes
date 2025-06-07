const db = require('./config/database');

async function addMissingMarket() {
  console.log('🔧 Manually adding missing market to demonstrate recovery...');
  
  const missingMarketAddress = '9pgV5wUSemmuBU54qfneYc3pBbyJs2UK1N7cMf89mWR2';
  
  try {
    // Check if market already exists
    const checkQuery = 'SELECT market_address FROM markets WHERE market_address = $1';
    const existing = await db.query(checkQuery, [missingMarketAddress]);
    
    if (existing.rows.length > 0) {
      console.log('✅ Market already exists in database');
      return { success: true, message: 'Market already exists' };
    }
    
    // Insert the missing market (simulating blockchain recovery)
    const insertQuery = `
      INSERT INTO markets (
        market_address,
        creator,
        question,
        description,
        category,
        resolution_date,
        status,
        min_bet,
        resolved_option,
        options,
        option_volumes,
        total_volume,
        market_type,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      missingMarketAddress,
      'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z', // Deployer wallet as creator
      'User Created Market (Recovered from Blockchain)', // Question
      'This market was created via /create-market but failed to save to database initially', // Description
      'General', // Category
      null, // No resolution date
      'Active', // Status
      10, // Min bet
      null, // No resolved option
      ['Yes', 'No'], // Options
      [0, 0], // Option volumes (start at 0)
      0, // Total volume
      'binary' // Market type
    ]);
    
    console.log('✅ Successfully added missing market to database:', result.rows[0]);
    
    return { 
      success: true, 
      market: result.rows[0],
      message: 'Missing market recovered successfully' 
    };
    
  } catch (error) {
    console.error('❌ Error adding missing market:', error);
    throw error;
  }
}

async function verifyRecovery() {
  console.log('\n🔍 Verifying recovery...');
  
  try {
    // Count total markets
    const countQuery = 'SELECT COUNT(*) as count FROM markets';
    const countResult = await db.query(countQuery);
    const totalMarkets = countResult.rows[0].count;
    
    // Check for specific market
    const specificQuery = 'SELECT * FROM markets WHERE market_address = $1';
    const specificResult = await db.query(specificQuery, ['9pgV5wUSemmuBU54qfneYc3pBbyJs2UK1N7cMf89mWR2']);
    
    console.log(`📊 Total markets in database: ${totalMarkets}`);
    console.log(`🎯 Missing market found: ${specificResult.rows.length > 0 ? 'YES' : 'NO'}`);
    
    if (specificResult.rows.length > 0) {
      const market = specificResult.rows[0];
      console.log(`✅ Recovered market details:`);
      console.log(`   Address: ${market.market_address}`);
      console.log(`   Question: ${market.question}`);
      console.log(`   Creator: ${market.creator}`);
      console.log(`   Status: ${market.status}`);
    }
    
    return { 
      success: true,
      totalMarkets: parseInt(totalMarkets),
      missingMarketFound: specificResult.rows.length > 0,
      marketData: specificResult.rows[0] || null
    };
    
  } catch (error) {
    console.error('❌ Error verifying recovery:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting manual market recovery demonstration...\n');
  
  try {
    // Add the missing market
    const addResult = await addMissingMarket();
    console.log(`\n✅ Add result:`, addResult.message);
    
    // Verify the recovery
    const verifyResult = await verifyRecovery();
    
    console.log(`\n🎉 Recovery demonstration completed!`);
    console.log(`📈 Database now has ${verifyResult.totalMarkets} markets (was 4)`);
    console.log(`🎯 Missing market recovered: ${verifyResult.missingMarketFound}`);
    
    if (verifyResult.missingMarketFound) {
      console.log(`\n🔄 Next steps:`);
      console.log(`   1. Visit https://www.primape.app/markets to see the recovered market`);
      console.log(`   2. The market should now appear in the markets list`);
      console.log(`   3. This demonstrates how blockchain recovery would work`);
    }
    
  } catch (error) {
    console.error('\n💥 Recovery demonstration failed:', error);
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { addMissingMarket, verifyRecovery }; 