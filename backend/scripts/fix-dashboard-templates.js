const pool = require('../config/database');

async function fixDashboardTemplates() {
  console.log('🔧 Fixing Dashboard Templates JSON Data...\n');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete existing templates
    await client.query('DELETE FROM dashboard_templates');
    console.log('🗑️  Cleared existing templates');
    
    // Insert corrected templates with properly formatted JSON
    console.log('📋 Inserting corrected dashboard templates...');
    
    const templates = [
      {
        name: 'prediction_market',
        display_name: 'Prediction Market', 
        description: 'Full-featured prediction market dashboard with charts, leaderboards, and market management',
        category: 'finance',
        config: {
          theme: 'dark',
          primary_color: '#6366f1',
          show_navigation: true,
          enable_chat: true
        },
        widgets: [
          {
            id: 'market_overview',
            type: 'market_grid',
            title: 'Active Markets',
            position: { x: 0, y: 0, w: 8, h: 6 }
          },
          {
            id: 'top_traders',
            type: 'leaderboard',
            title: 'Top Traders',
            position: { x: 8, y: 0, w: 4, h: 6 }
          },
          {
            id: 'volume_chart',
            type: 'line_chart',
            title: 'Trading Volume',
            position: { x: 0, y: 6, w: 6, h: 4 }
          },
          {
            id: 'recent_trades',
            type: 'trade_feed',
            title: 'Recent Trades',
            position: { x: 6, y: 6, w: 6, h: 4 }
          }
        ],
        layout: {
          cols: 12,
          rows: 10,
          margin: [16, 16],
          containerPadding: [0, 0]
        }
      },
      
      {
        name: 'sports_betting',
        display_name: 'Sports Betting',
        description: 'Sports-focused dashboard with game schedules, odds, and betting analytics',
        category: 'sports',
        config: {
          theme: 'sports',
          primary_color: '#ef4444',
          show_live_scores: true,
          enable_notifications: true
        },
        widgets: [
          {
            id: 'live_games',
            type: 'sports_grid',
            title: 'Live Games',
            position: { x: 0, y: 0, w: 8, h: 4 }
          },
          {
            id: 'upcoming_games',
            type: 'schedule',
            title: 'Upcoming Games',
            position: { x: 8, y: 0, w: 4, h: 8 }
          },
          {
            id: 'my_bets',
            type: 'bet_slip',
            title: 'My Bets',
            position: { x: 0, y: 4, w: 4, h: 4 }
          },
          {
            id: 'odds_comparison',
            type: 'odds_table',
            title: 'Best Odds',
            position: { x: 4, y: 4, w: 4, h: 4 }
          }
        ],
        layout: {
          cols: 12,
          rows: 8,
          margin: [12, 12],
          containerPadding: [0, 0]
        }
      },
      
      {
        name: 'crypto_trading',
        display_name: 'Crypto Trading',
        description: 'Cryptocurrency trading dashboard with price charts, portfolio, and market analysis',
        category: 'crypto',
        config: {
          theme: 'crypto',
          primary_color: '#f59e0b',
          show_price_alerts: true,
          enable_trading: true
        },
        widgets: [
          {
            id: 'price_charts',
            type: 'crypto_charts',
            title: 'Price Charts',
            position: { x: 0, y: 0, w: 8, h: 6 }
          },
          {
            id: 'portfolio',
            type: 'portfolio_summary',
            title: 'Portfolio',
            position: { x: 8, y: 0, w: 4, h: 3 }
          },
          {
            id: 'market_cap',
            type: 'market_overview',
            title: 'Market Overview',
            position: { x: 8, y: 3, w: 4, h: 3 }
          },
          {
            id: 'order_book',
            type: 'order_book',
            title: 'Order Book',
            position: { x: 0, y: 6, w: 6, h: 4 }
          },
          {
            id: 'trade_history',
            type: 'trade_history',
            title: 'Trade History',
            position: { x: 6, y: 6, w: 6, h: 4 }
          }
        ],
        layout: {
          cols: 12,
          rows: 10,
          margin: [16, 16],
          containerPadding: [0, 0]
        }
      },
      
      {
        name: 'simple_dashboard',
        display_name: 'Simple Dashboard',
        description: 'Clean, minimal dashboard perfect for beginners or simple use cases',
        category: 'basic',
        config: {
          theme: 'light',
          primary_color: '#10b981',
          show_navigation: false,
          minimal_ui: true
        },
        widgets: [
          {
            id: 'main_content',
            type: 'content_area',
            title: 'Main Content',
            position: { x: 0, y: 0, w: 9, h: 8 }
          },
          {
            id: 'sidebar',
            type: 'info_panel',
            title: 'Quick Info',
            position: { x: 9, y: 0, w: 3, h: 8 }
          }
        ],
        layout: {
          cols: 12,
          rows: 8,
          margin: [20, 20],
          containerPadding: [16, 16]
        }
      }
    ];
    
    // Insert each template with properly stringified JSON
    for (const template of templates) {
      await client.query(`
        INSERT INTO dashboard_templates (
          name, display_name, description, category, 
          config, widgets, layout, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        template.name,
        template.display_name,
        template.description,
        template.category,
        JSON.stringify(template.config),
        JSON.stringify(template.widgets),
        JSON.stringify(template.layout),
        true
      ]);
      
      console.log(`   ✅ ${template.display_name} (${template.category})`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Dashboard templates fixed successfully!\n');
    
    // Verify the fix
    const verifyResult = await client.query(`
      SELECT name, display_name, 
        json_array_length(widgets) as widget_count
      FROM dashboard_templates 
      ORDER BY category, display_name
    `);
    
    console.log('📋 Verified Templates:');
    verifyResult.rows.forEach(template => {
      console.log(`   - ${template.display_name}: ${template.widget_count} widgets`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing templates:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDashboardTemplates().catch(console.error);