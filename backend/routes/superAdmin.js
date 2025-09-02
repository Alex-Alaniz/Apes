const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Super Admin authentication middleware (more restrictive than regular admin)
const authenticateSuperAdmin = async (req, res, next) => {
  try {
    const walletAddress = req.headers['x-wallet-address'];
    
    if (!walletAddress) {
      return res.status(401).json({ 
        error: 'No wallet address provided',
        code: 'NO_WALLET'
      });
    }
    
    // Get super admin wallets from environment (subset of ADMIN_WALLETS)
    const superAdminWallets = process.env.SUPER_ADMIN_WALLETS;
    
    if (!superAdminWallets) {
      // Fall back to ADMIN_WALLETS if SUPER_ADMIN_WALLETS not set
      const adminWallets = process.env.ADMIN_WALLETS;
      if (!adminWallets) {
        return res.status(503).json({ 
          error: 'Super admin system not configured',
          code: 'SUPER_ADMIN_NOT_CONFIGURED'
        });
      }
      
      const authorizedWallets = adminWallets.split(',').map(w => w.trim()).filter(Boolean);
      if (!authorizedWallets.includes(walletAddress)) {
        return res.status(403).json({ 
          error: 'Super admin access required',
          code: 'UNAUTHORIZED'
        });
      }
    } else {
      const authorizedWallets = superAdminWallets.split(',').map(w => w.trim()).filter(Boolean);
      if (!authorizedWallets.includes(walletAddress)) {
        return res.status(403).json({ 
          error: 'Super admin access required',
          code: 'UNAUTHORIZED'
        });
      }
    }
    
    console.log(`✅ Super Admin authenticated: ${walletAddress}`);
    req.superAdminWallet = walletAddress;
    next();
  } catch (error) {
    console.error('Super admin auth error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Log activity helper
const logActivity = async (appId, action, performedBy, details = {}) => {
  try {
    await db.query(`
      INSERT INTO app_activity_log (app_id, action, performed_by, details, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [appId, action, performedBy, JSON.stringify(details)]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// GET /api/super-admin/apps - Get all apps
router.get('/apps', authenticateSuperAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        a.*,
        COUNT(aa.wallet_address) as admin_count,
        COUNT(d.id) as dashboard_count
      FROM apps a
      LEFT JOIN app_admins aa ON a.id = aa.app_id AND aa.status = 'active'
      LEFT JOIN dashboards d ON a.id = d.app_id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);
    
    res.json({
      apps: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

// GET /api/super-admin/apps/:slug - Get specific app
router.get('/apps/:slug', authenticateSuperAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const appResult = await db.query(`
      SELECT * FROM apps WHERE slug = $1
    `, [slug]);
    
    if (appResult.rowCount === 0) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const app = appResult.rows[0];
    
    // Get admins
    const adminsResult = await db.query(`
      SELECT aa.*, u.username, u.avatar_url
      FROM app_admins aa
      LEFT JOIN users u ON aa.wallet_address = u.wallet_address
      WHERE aa.app_id = $1 AND aa.status = 'active'
      ORDER BY aa.joined_at ASC
    `, [app.id]);
    
    // Get dashboards
    const dashboardsResult = await db.query(`
      SELECT d.*, dt.display_name as template_display_name
      FROM dashboards d
      LEFT JOIN dashboard_templates dt ON d.template = dt.name
      WHERE d.app_id = $1
      ORDER BY d.is_default DESC, d.created_at ASC
    `, [app.id]);
    
    res.json({
      app,
      admins: adminsResult.rows,
      dashboards: dashboardsResult.rows
    });
  } catch (error) {
    console.error('Error fetching app:', error);
    res.status(500).json({ error: 'Failed to fetch app details' });
  }
});

// POST /api/super-admin/apps - Create new app
router.post('/apps', authenticateSuperAdmin, async (req, res) => {
  const client = await db.getClient();
  
  try {
    const {
      slug,
      name,
      description,
      logo_url,
      primary_color = '#6366f1',
      secondary_color = '#8b5cf6',
      domain,
      subdomain,
      dashboard_template = 'prediction_market'
    } = req.body;
    
    // Validation
    if (!slug || !name) {
      return res.status(400).json({ 
        error: 'Slug and name are required' 
      });
    }
    
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 3 || slug.length > 50) {
      return res.status(400).json({ 
        error: 'Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only' 
      });
    }
    
    await client.query('BEGIN');
    
    // Create app
    const appResult = await client.query(`
      INSERT INTO apps (
        slug, name, description, logo_url, primary_color, secondary_color,
        domain, subdomain, dashboard_template, owner_wallet, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `, [
      slug, name, description, logo_url, primary_color, secondary_color,
      domain, subdomain, dashboard_template, req.superAdminWallet
    ]);
    
    const app = appResult.rows[0];
    
    // Add creator as admin
    await client.query(`
      INSERT INTO app_admins (app_id, wallet_address, role, joined_at)
      VALUES ($1, $2, 'owner', NOW())
    `, [app.id, req.superAdminWallet]);
    
    // Get dashboard template
    const templateResult = await client.query(`
      SELECT * FROM dashboard_templates WHERE name = $1
    `, [dashboard_template]);
    
    if (templateResult.rowCount === 0) {
      throw new Error(`Dashboard template '${dashboard_template}' not found`);
    }
    
    const template = templateResult.rows[0];
    
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
      `Default dashboard for ${name}`,
      template.name,
      JSON.stringify(template.config),   // Stringify JSONB data for insertion
      JSON.stringify(template.widgets),  // Stringify JSONB data for insertion
      JSON.stringify(template.layout),   // Stringify JSONB data for insertion
      true, // is_default
      true, // is_public
      req.superAdminWallet
    ]);
    
    const dashboard = dashboardResult.rows[0];
    
    // Log activity
    await logActivity(app.id, 'APP_CREATED', req.superAdminWallet, {
      template: dashboard_template,
      dashboard_id: dashboard.id
    });
    
    await client.query('COMMIT');
    
    console.log(`✅ Created app: ${slug} with dashboard template: ${dashboard_template}`);
    
    res.status(201).json({
      success: true,
      app,
      dashboard,
      message: `App '${name}' created successfully with ${template.display_name} dashboard`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ 
        error: 'App with this slug already exists' 
      });
    }
    
    console.error('Error creating app:', error);
    res.status(500).json({ 
      error: 'Failed to create app',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// PUT /api/super-admin/apps/:slug - Update app
router.put('/apps/:slug', authenticateSuperAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      name,
      description,
      logo_url,
      primary_color,
      secondary_color,
      domain,
      subdomain,
      status,
      config
    } = req.body;
    
    const updates = [];
    const values = [];
    let valueIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${valueIndex++}`);
      values.push(name);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${valueIndex++}`);
      values.push(description);
    }
    
    if (logo_url !== undefined) {
      updates.push(`logo_url = $${valueIndex++}`);
      values.push(logo_url);
    }
    
    if (primary_color !== undefined) {
      updates.push(`primary_color = $${valueIndex++}`);
      values.push(primary_color);
    }
    
    if (secondary_color !== undefined) {
      updates.push(`secondary_color = $${valueIndex++}`);
      values.push(secondary_color);
    }
    
    if (domain !== undefined) {
      updates.push(`domain = $${valueIndex++}`);
      values.push(domain);
    }
    
    if (subdomain !== undefined) {
      updates.push(`subdomain = $${valueIndex++}`);
      values.push(subdomain);
    }
    
    if (status !== undefined) {
      updates.push(`status = $${valueIndex++}`);
      values.push(status);
    }
    
    if (config !== undefined) {
      updates.push(`config = $${valueIndex++}`);
      values.push(JSON.stringify(config));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(slug);
    
    const result = await db.query(`
      UPDATE apps 
      SET ${updates.join(', ')}
      WHERE slug = $${valueIndex}
      RETURNING *
    `, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const app = result.rows[0];
    
    // Log activity
    await logActivity(app.id, 'APP_UPDATED', req.superAdminWallet, { updates: req.body });
    
    res.json({
      success: true,
      app
    });
    
  } catch (error) {
    console.error('Error updating app:', error);
    res.status(500).json({ error: 'Failed to update app' });
  }
});

// DELETE /api/super-admin/apps/:slug - Delete app
router.delete('/apps/:slug', authenticateSuperAdmin, async (req, res) => {
  const client = await db.getClient();
  
  try {
    const { slug } = req.params;
    
    await client.query('BEGIN');
    
    // Get app details first
    const appResult = await client.query(`
      SELECT * FROM apps WHERE slug = $1
    `, [slug]);
    
    if (appResult.rowCount === 0) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    const app = appResult.rows[0];
    
    // Log activity before deletion
    await logActivity(app.id, 'APP_DELETED', req.superAdminWallet, { 
      app_name: app.name,
      deletion_timestamp: new Date().toISOString()
    });
    
    // Delete app (cascades to related tables)
    await client.query(`DELETE FROM apps WHERE id = $1`, [app.id]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Deleted app: ${slug}`);
    
    res.json({
      success: true,
      message: `App '${app.name}' deleted successfully`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting app:', error);
    res.status(500).json({ error: 'Failed to delete app' });
  } finally {
    client.release();
  }
});

// GET /api/super-admin/dashboard-templates - Get available templates
router.get('/dashboard-templates', authenticateSuperAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM dashboard_templates 
      WHERE is_active = true
      ORDER BY category, display_name
    `);
    
    res.json({
      templates: result.rows
    });
  } catch (error) {
    console.error('Error fetching dashboard templates:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard templates' });
  }
});

// GET /api/super-admin/stats - Get platform statistics
router.get('/stats', authenticateSuperAdmin, async (req, res) => {
  try {
    const statsResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM apps WHERE status = 'active') as active_apps,
        (SELECT COUNT(*) FROM apps WHERE status = 'inactive') as inactive_apps,
        (SELECT COUNT(*) FROM apps WHERE created_at > NOW() - INTERVAL '30 days') as apps_created_last_30_days,
        (SELECT COUNT(*) FROM app_admins WHERE status = 'active') as total_app_admins,
        (SELECT COUNT(*) FROM dashboards) as total_dashboards,
        (SELECT COUNT(*) FROM app_activity_log WHERE created_at > NOW() - INTERVAL '24 hours') as activity_last_24h
    `);
    
    const recentActivityResult = await db.query(`
      SELECT 
        aal.*,
        a.name as app_name,
        a.slug as app_slug
      FROM app_activity_log aal
      JOIN apps a ON aal.app_id = a.id
      ORDER BY aal.created_at DESC
      LIMIT 20
    `);
    
    res.json({
      stats: statsResult.rows[0],
      recent_activity: recentActivityResult.rows
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;