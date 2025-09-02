const pool = require('../config/database');

async function createAppManagementTables() {
  console.log('🏗️  Creating App Management Database Tables...\n');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Create apps table
    console.log('1. Creating apps table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS apps (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        logo_url TEXT,
        primary_color VARCHAR(7) DEFAULT '#6366f1',
        secondary_color VARCHAR(7) DEFAULT '#8b5cf6',
        domain VARCHAR(100),
        subdomain VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        config JSONB DEFAULT '{}',
        dashboard_template VARCHAR(50) DEFAULT 'default',
        owner_wallet VARCHAR(44) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT apps_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
        CONSTRAINT apps_slug_length CHECK (length(slug) >= 3 AND length(slug) <= 50)
      )
    `);
    console.log('   ✅ Success\n');
    
    // 2. Create app_admins table
    console.log('2. Creating app_admins table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_admins (
        id SERIAL PRIMARY KEY,
        app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
        wallet_address VARCHAR(44) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        permissions JSONB DEFAULT '{"read": true, "write": true, "admin": true}',
        invited_by VARCHAR(44),
        invited_at TIMESTAMP,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        
        UNIQUE(app_id, wallet_address)
      )
    `);
    console.log('   ✅ Success\n');
    
    // 3. Create dashboards table
    console.log('3. Creating dashboards table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dashboards (
        id SERIAL PRIMARY KEY,
        app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) NOT NULL,
        description TEXT,
        template VARCHAR(50) NOT NULL,
        config JSONB DEFAULT '{}',
        widgets JSONB DEFAULT '[]',
        layout JSONB DEFAULT '{}',
        is_default BOOLEAN DEFAULT FALSE,
        is_public BOOLEAN DEFAULT TRUE,
        created_by VARCHAR(44),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(app_id, slug),
        CONSTRAINT dashboard_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
      )
    `);
    console.log('   ✅ Success\n');
    
    // 4. Create dashboard_templates table
    console.log('4. Creating dashboard_templates table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dashboard_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        preview_image_url TEXT,
        config JSONB NOT NULL DEFAULT '{}',
        widgets JSONB NOT NULL DEFAULT '[]',
        layout JSONB NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Success\n');
    
    // 5. Create app_activity_log table
    console.log('5. Creating app_activity_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_activity_log (
        id SERIAL PRIMARY KEY,
        app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        performed_by VARCHAR(44),
        target_type VARCHAR(50),
        target_id VARCHAR(100),
        details JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Success\n');
    
    // 6. Create indexes for performance
    console.log('6. Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug)',
      'CREATE INDEX IF NOT EXISTS idx_apps_owner ON apps(owner_wallet)',
      'CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status)',
      'CREATE INDEX IF NOT EXISTS idx_app_admins_app_id ON app_admins(app_id)',
      'CREATE INDEX IF NOT EXISTS idx_app_admins_wallet ON app_admins(wallet_address)',
      'CREATE INDEX IF NOT EXISTS idx_dashboards_app_id ON dashboards(app_id)',
      'CREATE INDEX IF NOT EXISTS idx_dashboards_slug ON dashboards(app_id, slug)',
      'CREATE INDEX IF NOT EXISTS idx_dashboard_templates_name ON dashboard_templates(name)',
      'CREATE INDEX IF NOT EXISTS idx_app_activity_log_app_id ON app_activity_log(app_id)',
      'CREATE INDEX IF NOT EXISTS idx_app_activity_log_created_at ON app_activity_log(created_at DESC)'
    ];
    
    for (const index of indexes) {
      await client.query(index);
    }
    console.log('   ✅ Created all indexes\n');
    
    // 7. Create updated_at triggers
    console.log('7. Creating update triggers...');
    
    // Function already exists from mobile markets migration
    const triggers = [
      'DROP TRIGGER IF EXISTS update_apps_updated_at ON apps',
      'CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON apps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'DROP TRIGGER IF EXISTS update_dashboards_updated_at ON dashboards',
      'CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
    ];
    
    for (const trigger of triggers) {
      await client.query(trigger);
    }
    console.log('   ✅ Created all triggers\n');
    
    // 8. Insert default dashboard templates
    console.log('8. Inserting default dashboard templates...');
    await client.query(`
      INSERT INTO dashboard_templates (name, display_name, description, category, config, widgets, layout) VALUES 
      
      ('prediction_market', 'Prediction Market', 'Full-featured prediction market dashboard with charts, leaderboards, and market management', 'finance', 
        '{"theme": "dark", "primary_color": "#6366f1", "show_navigation": true, "enable_chat": true}',
        '[
          {"id": "market_overview", "type": "market_grid", "title": "Active Markets", "position": {"x": 0, "y": 0, "w": 8, "h": 6}},
          {"id": "top_traders", "type": "leaderboard", "title": "Top Traders", "position": {"x": 8, "y": 0, "w": 4, "h": 6}},
          {"id": "volume_chart", "type": "line_chart", "title": "Trading Volume", "position": {"x": 0, "y": 6, "w": 6, "h": 4}},
          {"id": "recent_trades", "type": "trade_feed", "title": "Recent Trades", "position": {"x": 6, "y": 6, "w": 6, "h": 4}}
        ]',
        '{"cols": 12, "rows": 10, "margin": [16, 16], "containerPadding": [0, 0]}'
      ),
      
      ('sports_betting', 'Sports Betting', 'Sports-focused dashboard with game schedules, odds, and betting analytics', 'sports',
        '{"theme": "sports", "primary_color": "#ef4444", "show_live_scores": true, "enable_notifications": true}',
        '[
          {"id": "live_games", "type": "sports_grid", "title": "Live Games", "position": {"x": 0, "y": 0, "w": 8, "h": 4}},
          {"id": "upcoming_games", "type": "schedule", "title": "Upcoming Games", "position": {"x": 8, "y": 0, "w": 4, "h": 8}},
          {"id": "my_bets", "type": "bet_slip", "title": "My Bets", "position": {"x": 0, "y": 4, "w": 4, "h": 4}},
          {"id": "odds_comparison", "type": "odds_table", "title": "Best Odds", "position": {"x": 4, "y": 4, "w": 4, "h": 4}}
        ]',
        '{"cols": 12, "rows": 8, "margin": [12, 12], "containerPadding": [0, 0]}'
      ),
      
      ('crypto_trading', 'Crypto Trading', 'Cryptocurrency trading dashboard with price charts, portfolio, and market analysis', 'crypto',
        '{"theme": "crypto", "primary_color": "#f59e0b", "show_price_alerts": true, "enable_trading": true}',
        '[
          {"id": "price_charts", "type": "crypto_charts", "title": "Price Charts", "position": {"x": 0, "y": 0, "w": 8, "h": 6}},
          {"id": "portfolio", "type": "portfolio_summary", "title": "Portfolio", "position": {"x": 8, "y": 0, "w": 4, "h": 3}},
          {"id": "market_cap", "type": "market_overview", "title": "Market Overview", "position": {"x": 8, "y": 3, "w": 4, "h": 3}},
          {"id": "order_book", "type": "order_book", "title": "Order Book", "position": {"x": 0, "y": 6, "w": 6, "h": 4}},
          {"id": "trade_history", "type": "trade_history", "title": "Trade History", "position": {"x": 6, "y": 6, "w": 6, "h": 4}}
        ]',
        '{"cols": 12, "rows": 10, "margin": [16, 16], "containerPadding": [0, 0]}'
      ),
      
      ('simple_dashboard', 'Simple Dashboard', 'Clean, minimal dashboard perfect for beginners or simple use cases', 'basic',
        '{"theme": "light", "primary_color": "#10b981", "show_navigation": false, "minimal_ui": true}',
        '[
          {"id": "main_content", "type": "content_area", "title": "Main Content", "position": {"x": 0, "y": 0, "w": 9, "h": 8}},
          {"id": "sidebar", "type": "info_panel", "title": "Quick Info", "position": {"x": 9, "y": 0, "w": 3, "h": 8}}
        ]',
        '{"cols": 12, "rows": 8, "margin": [20, 20], "containerPadding": [16, 16]}'
      )

      ON CONFLICT (name) DO NOTHING
    `);
    console.log('   ✅ Success\n');
    
    await client.query('COMMIT');
    
    console.log('✅ All App Management tables created successfully!\n');
    
    // Show summary
    const templatesResult = await client.query('SELECT name, display_name, category FROM dashboard_templates ORDER BY category, name');
    console.log('📋 Available Dashboard Templates:');
    let currentCategory = '';
    templatesResult.rows.forEach(template => {
      if (template.category !== currentCategory) {
        console.log(`\n  ${template.category.toUpperCase()}:`);
        currentCategory = template.category;
      }
      console.log(`    - ${template.display_name} (${template.name})`);
    });
    
    console.log('\n🎉 Setup complete! Next steps:');
    console.log('1. Create Super Admin backend API routes');
    console.log('2. Create Super Admin frontend interface'); 
    console.log('3. Test the app creation flow');
    console.log('4. Your Super Admin can now create apps with automatic dashboard templates!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating app management tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createAppManagementTables().catch(console.error);