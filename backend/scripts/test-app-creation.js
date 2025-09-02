const pool = require('../config/database');

async function testAppCreation() {
  console.log('🧪 Testing App Creation Flow...\n');
  
  const client = await pool.connect();
  
  try {
    // Test data
    const testApp = {
      slug: 'test-prediction-app',
      name: 'Test Prediction App',
      description: 'A test prediction market app for verification',
      primary_color: '#6366f1',
      secondary_color: '#8b5cf6',
      dashboard_template: 'prediction_market',
      owner_wallet: 'APEShoBNNvnM4JV6pW51vb8X4Cq6ZeZy6DqfjmTu6j4z' // Example wallet
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
    
    // Add creator as admin
    await client.query(`
      INSERT INTO app_admins (app_id, wallet_address, role, joined_at)
      VALUES ($1, $2, 'owner', NOW())
    `, [app.id, testApp.owner_wallet]);
    
    console.log('   ✅ Owner added as admin');
    
    // Get dashboard template
    const templateResult = await client.query(`
      SELECT * FROM dashboard_templates WHERE name = $1
    `, [testApp.dashboard_template]);
    
    if (templateResult.rowCount === 0) {
      throw new Error(`Dashboard template '${testApp.dashboard_template}' not found`);
    }
    
    const template = templateResult.rows[0];
    console.log(`   ✅ Template found: ${template.display_name}`);
    
    // Create default dashboard from template
    const dashboardResult = await client.query(`
      INSERT INTO dashboards (
        app_id, name, slug, description, template, config, widgets, layout,
        is_default, is_public, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `, [
      app.id,
      'Main Dashboard',
      'main',
      `Default dashboard for ${testApp.name}`,
      template.name,
      template.config,
      template.widgets,
      template.layout,
      true, // is_default
      true, // is_public
      testApp.owner_wallet
    ]);
    
    const dashboard = dashboardResult.rows[0];
    console.log(`   ✅ Dashboard created with ID: ${dashboard.id}`);
    
    // Log activity
    await client.query(`
      INSERT INTO app_activity_log (app_id, action, performed_by, details, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      app.id, 
      'APP_CREATED', 
      testApp.owner_wallet, 
      JSON.stringify({ template: testApp.dashboard_template, dashboard_id: dashboard.id })
    ]);
    
    console.log('   ✅ Activity logged\n');
    
    // 2. Test retrieval
    console.log('2. Testing data retrieval...');
    
    const retrievalResult = await client.query(`
      SELECT 
        a.*,
        COUNT(aa.wallet_address) as admin_count,
        COUNT(d.id) as dashboard_count
      FROM apps a
      LEFT JOIN app_admins aa ON a.id = aa.app_id AND aa.status = 'active'
      LEFT JOIN dashboards d ON a.id = d.app_id
      WHERE a.slug = $1
      GROUP BY a.id
    `, [testApp.slug]);
    
    if (retrievalResult.rowCount > 0) {
      const retrieved = retrievalResult.rows[0];
      console.log(`   ✅ App retrieved successfully:`);
      console.log(`      Name: ${retrieved.name}`);
      console.log(`      Slug: ${retrieved.slug}`);
      console.log(`      Admins: ${retrieved.admin_count}`);
      console.log(`      Dashboards: ${retrieved.dashboard_count}`);
      console.log(`      Template: ${retrieved.dashboard_template}`);
    }
    
    // 3. Test dashboard template content
    console.log('\n3. Verifying dashboard template content...');
    
    const dashboardContent = await client.query(`
      SELECT d.*, dt.display_name as template_display_name
      FROM dashboards d
      LEFT JOIN dashboard_templates dt ON d.template = dt.name
      WHERE d.app_id = $1
    `, [app.id]);
    
    if (dashboardContent.rowCount > 0) {
      const dbContent = dashboardContent.rows[0];
      console.log(`   ✅ Dashboard template applied:`);
      console.log(`      Template: ${dbContent.template_display_name}`);
      console.log(`      Widgets: ${JSON.parse(dbContent.widgets).length} configured`);
      console.log(`      Layout: ${Object.keys(JSON.parse(dbContent.layout)).length} properties`);
    }
    
    await client.query('ROLLBACK'); // Don't actually save test data
    
    console.log('\n✅ All tests passed! App creation flow works correctly.\n');
    
    console.log('🎉 Summary:');
    console.log('- ✅ Apps table working');
    console.log('- ✅ App admins table working');  
    console.log('- ✅ Dashboards table working');
    console.log('- ✅ Dashboard templates working');
    console.log('- ✅ Activity logging working');
    console.log('- ✅ Automatic dashboard creation working');
    
    console.log('\n📋 Next steps:');
    console.log('1. Set ADMIN_WALLETS environment variable');
    console.log('2. Restart backend server');
    console.log('3. Visit /super-admin to create your first app!');
    console.log('4. Your Super Admin can now create apps with automatic dashboard templates\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testAppCreation().catch(console.error);