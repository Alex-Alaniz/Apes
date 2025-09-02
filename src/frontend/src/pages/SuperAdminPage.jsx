import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { isWalletAuthorized } from '../config/access';
import Toast from '../components/Toast';
import { 
  Plus, Users, Layout, Settings, Activity, Eye, Edit3, Trash2, 
  RefreshCw, Globe, Palette, Monitor, BarChart3, Calendar,
  AlertCircle, CheckCircle, XCircle, Clock, ExternalLink
} from 'lucide-react';

const SuperAdminPage = () => {
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate();
  
  // State
  const [apps, setApps] = useState([]);
  const [dashboardTemplates, setDashboardTemplates] = useState([]);
  const [stats, setStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('apps'); // apps, templates, activity, stats
  
  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    slug: '',
    name: '',
    description: '',
    logo_url: '',
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
    domain: '',
    subdomain: '',
    dashboard_template: 'prediction_market'
  });

  // Check authorization
  useEffect(() => {
    if (publicKey) {
      const checkAuth = async () => {
        const authorized = await isWalletAuthorized(publicKey.toString());
        setIsAuthorized(authorized);
        
        if (authorized) {
          loadData();
        }
      };
      checkAuth();
    }
  }, [publicKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      
      // Load apps, templates, and stats in parallel
      const [appsRes, templatesRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/api/super-admin/apps`, {
          headers: { 'X-Wallet-Address': publicKey.toString() }
        }),
        fetch(`${apiUrl}/api/super-admin/dashboard-templates`, {
          headers: { 'X-Wallet-Address': publicKey.toString() }
        }),
        fetch(`${apiUrl}/api/super-admin/stats`, {
          headers: { 'X-Wallet-Address': publicKey.toString() }
        })
      ]);
      
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApps(appsData.apps);
      }
      
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setDashboardTemplates(templatesData.templates);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
        setRecentActivity(statsData.recent_activity);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      setToast({
        message: 'Failed to load Super Admin data',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e) => {
    e.preventDefault();
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/super-admin/apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': publicKey.toString()
        },
        body: JSON.stringify(createFormData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create app');
      }
      
      const result = await response.json();
      
      setToast({
        message: result.message || 'App created successfully!',
        type: 'success'
      });
      
      setShowCreateForm(false);
      setCreateFormData({
        slug: '',
        name: '',
        description: '',
        logo_url: '',
        primary_color: '#6366f1',
        secondary_color: '#8b5cf6',
        domain: '',
        subdomain: '',
        dashboard_template: 'prediction_market'
      });
      
      loadData(); // Reload to show new app
      
    } catch (error) {
      console.error('Error creating app:', error);
      setToast({
        message: error.message || 'Failed to create app',
        type: 'error'
      });
    }
  };

  const handleDeleteApp = async (slug, appName) => {
    if (!confirm(`Are you sure you want to delete the app "${appName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://apes-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/super-admin/apps/${slug}`, {
        method: 'DELETE',
        headers: {
          'X-Wallet-Address': publicKey.toString()
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete app');
      }
      
      const result = await response.json();
      
      setToast({
        message: result.message || 'App deleted successfully',
        type: 'success'
      });
      
      loadData(); // Reload to remove deleted app
      
    } catch (error) {
      console.error('Error deleting app:', error);
      setToast({
        message: 'Failed to delete app',
        type: 'error'
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const generateSlugFromName = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  };

  // Authorization check
  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Super Admin Access Required</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to access Super Admin panel</p>
        </div>
      </div>
    );
  }

  if (publicKey && !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Unauthorized Access</h2>
          <p className="text-gray-600 dark:text-gray-300">Your wallet is not authorized for Super Admin access</p>
          <button
            onClick={() => navigate('/admin')}
            className="mt-4 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Super Admin Panel</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage apps, dashboards, and platform settings
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Regular Admin
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {Object.keys(stats).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{stats.active_apps}</div>
                <div className="text-sm text-gray-400">Active Apps</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-400">{stats.inactive_apps}</div>
                <div className="text-sm text-gray-400">Inactive Apps</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{stats.apps_created_last_30_days}</div>
                <div className="text-sm text-gray-400">Created (30d)</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">{stats.total_app_admins}</div>
                <div className="text-sm text-gray-400">App Admins</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-400">{stats.total_dashboards}</div>
                <div className="text-sm text-gray-400">Dashboards</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-400">{stats.activity_last_24h}</div>
                <div className="text-sm text-gray-400">Activity (24h)</div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('apps')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'apps' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Layout className="w-4 h-4 mr-2 inline" />
              Apps ({apps.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'templates' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Monitor className="w-4 h-4 mr-2 inline" />
              Templates ({dashboardTemplates.length})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'activity' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Activity className="w-4 h-4 mr-2 inline" />
              Activity ({recentActivity.length})
            </button>
          </div>
        </div>

        {/* Apps Tab */}
        {activeTab === 'apps' && (
          <>
            {/* Create App Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2 inline" />
                Create New App
              </button>
            </div>

            {/* Create Form Modal */}
            {showCreateForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <h2 className="text-2xl font-bold text-white mb-6">Create New App</h2>
                  
                  <form onSubmit={handleCreateApp} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          App Name *
                        </label>
                        <input
                          type="text"
                          value={createFormData.name}
                          onChange={(e) => {
                            setCreateFormData({
                              ...createFormData,
                              name: e.target.value,
                              slug: generateSlugFromName(e.target.value)
                            });
                          }}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          URL Slug *
                        </label>
                        <input
                          type="text"
                          value={createFormData.slug}
                          onChange={(e) => setCreateFormData({
                            ...createFormData,
                            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          })}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500"
                          pattern="^[a-z0-9-]+$"
                          required
                        />
                        <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={createFormData.description}
                        onChange={(e) => setCreateFormData({...createFormData, description: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Primary Color
                        </label>
                        <input
                          type="color"
                          value={createFormData.primary_color}
                          onChange={(e) => setCreateFormData({...createFormData, primary_color: e.target.value})}
                          className="w-full h-10 bg-gray-700 rounded-lg border border-gray-600"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Secondary Color
                        </label>
                        <input
                          type="color"
                          value={createFormData.secondary_color}
                          onChange={(e) => setCreateFormData({...createFormData, secondary_color: e.target.value})}
                          className="w-full h-10 bg-gray-700 rounded-lg border border-gray-600"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Dashboard Template
                      </label>
                      <select
                        value={createFormData.dashboard_template}
                        onChange={(e) => setCreateFormData({...createFormData, dashboard_template: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500"
                      >
                        {dashboardTemplates.map(template => (
                          <option key={template.name} value={template.name}>
                            {template.display_name} - {template.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Create App
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Apps Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : apps.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <Layout className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No apps created yet</p>
                <p className="text-sm text-gray-500 mt-2">Create your first app to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map((app) => (
                  <div key={app.id} className="bg-gray-800 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-white">{app.name}</h3>
                          {getStatusIcon(app.status)}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{app.description}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Globe className="w-3 h-3" />
                          <code>/{app.slug}</code>
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/admin/app/${app.slug}`)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                          title="View App"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteApp(app.slug, app.name)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                          title="Delete App"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {app.admin_count} admins
                      </span>
                      <span className="flex items-center gap-1">
                        <Layout className="w-3 h-3" />
                        {app.dashboard_count} dashboards
                      </span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created {formatDate(app.created_at)}</span>
                        <div 
                          className="w-4 h-4 rounded border-2 border-gray-600"
                          style={{ backgroundColor: app.primary_color }}
                          title={`Primary: ${app.primary_color}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardTemplates.map((template) => (
              <div key={template.id} className="bg-gray-800 rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">{template.display_name}</h3>
                  <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                  <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                    {template.category}
                  </span>
                </div>
                
                <div className="text-sm text-gray-500">
                  {template.widgets ? JSON.parse(template.widgets).length : 0} widgets configured
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="bg-gray-800 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
            </div>
            <div className="divide-y divide-gray-700">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-6 flex items-center gap-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-white">
                      <span className="font-medium">{activity.action.replace(/_/g, ' ')}</span>
                      {activity.app_name && (
                        <>
                          <span className="text-gray-400"> in </span>
                          <span className="font-medium">{activity.app_name}</span>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatDate(activity.created_at)}
                      {activity.performed_by && (
                        <span> by {activity.performed_by.slice(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="p-6 text-center text-gray-400">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default SuperAdminPage;