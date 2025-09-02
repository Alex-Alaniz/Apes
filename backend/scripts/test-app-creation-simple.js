const pool = require('../config/database');

async function testAppCreationSimple() {
  console.log('🧪 Testing Simple App Creation Flow...\n');
  
  const client = await pool.connect();
  
  try {
    // Test data
    const testApp = {
      slug: 'test-simple-app',
      name: 'Test Simple App', 
      description: 'A test app for verification',
      primary_color: '#6366f1',
      secondary_color: '#8b5cf6',
      dashboard_template: 'simple_dashboard',
      owner_wallet: 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z'
    };
    
    console.log('1. Testing app creation...');
    
    await client.query('BEGIN');
    
    // Create app
    const appResult = await client.query(`
      INSERT INTO apps (
        slug, name, description, primary_color, secondary_color,
        dashboard_template, owner_wallet, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [
      testApp.slug, testApp.name, testApp.description,
      testApp.primary_color, testApp.secondary_color,
      testApp.dashboard_template, testApp.owner_wallet
    ]);
    
    const app = appResult.rows[0];
    console.log(`   ✅ App created with ID: ${app.id}`);
    
    // Get dashboard template (just the structure, don't insert yet)
    const templateResult = await client.query(`
      SELECT * FROM dashboard_templates WHERE name = $1
    `, [testApp.dashboard_template]);
    
    if (templateResult.rowCount === 0) {
      throw new Error(`Template '${testApp.dashboard_template}' not found`);
    }
    
    const template = templateResult.rows[0];
    console.log(`   ✅ Template found: ${template.display_name}`);
    console.log(`   📋 Template has config: ${typeof template.config === 'object'}`);
    console.log(`   📋 Template has widgets: ${typeof template.widgets === 'object'}`);
    console.log(`   📋 Template has layout: ${typeof template.layout === 'object'}`);
    
    // Create dashboard with template data (already parsed as objects from JSONB)
    const dashboardResult = await client.query(`
      INSERT INTO dashboards (
        app_id, name, slug, description, template,
        config, widgets, layout,
        is_default, is_public, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `, [
      app.id,
      'Main Dashboard',
      'main',
      `Default dashboard for ${testApp.name}`,
      template.name,
      template.config,      // Already JSONB objects, no need to stringify
      template.widgets,     // Already JSONB objects, no need to stringify
      template.layout,      // Already JSONB objects, no need to stringify
      true,
      true,
      testApp.owner_wallet
    ]);
    
    const dashboard = dashboardResult.rows[0];
    console.log(`   ✅ Dashboard created with ID: ${dashboard.id}`);
    
    // Add admin
    await client.query(`
      INSERT INTO app_admins (app_id, wallet_address, role, joined_at)
      VALUES ($1, $2, 'owner', NOW())
    `, [app.id, testApp.owner_wallet]);
    
    console.log('   ✅ Owner added as admin');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Test passed! App creation works correctly.');
    console.log('\n🎉 Your Super Admin can now create apps!');
    console.log('\n📋 Quick Setup:');
    console.log('1. Add your wallet to ADMIN_WALLETS environment variable');
    console.log('2. Restart backend server');  
    console.log('3. Visit /super-admin to create apps');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testAppCreationSimple().catch(console.error);