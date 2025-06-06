import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Upload, 
  Eye,
  Clock,
  Tag,
  Users,
  AlertCircle,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  Edit3,
  Save,
  X,
  RefreshCw
} from 'lucide-react';
import { isWalletAuthorized } from '../config/access';
import marketService from '../services/marketService';
import Toast from '../components/Toast';

const AdminMarketDeploymentPage = () => {
  const navigate = useNavigate();
  const { publicKey, connected, wallet } = useWallet();
  const walletAdapter = wallet?.adapter;
  const [pendingMarkets, setPendingMarkets] = useState([]);
  const [deployedMarkets, setDeployedMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [showAllMarkets, setShowAllMarkets] = useState(false);
  const [serviceInitialized, setServiceInitialized] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'deployed'
  
  // Edit functionality state
  const [editingMarket, setEditingMarket] = useState(null);
  const [editedValues, setEditedValues] = useState({});
  
  // Platform initialization state
  const [platformInitialized, setPlatformInitialized] = useState(null); // null = unknown, true/false = status
  const [accessControlInitialized, setAccessControlInitialized] = useState(null);
  const [initializing, setInitializing] = useState({});

  // Initialize market service when wallet connects
  useEffect(() => {
    const initService = async () => {
      console.log('🔧 Wallet connection debug:', {
        wallet: !!wallet,
        walletAdapter: !!walletAdapter,
        publicKey: !!publicKey,
        connected: connected,
        walletName: wallet?.adapter?.name,
        walletReady: wallet?.readyState
      });

      if (wallet && publicKey && connected) {
        try {
          console.log('🚀 Attempting to initialize MarketService with wallet:', wallet.adapter?.name);
          await marketService.initialize(wallet);
          setServiceInitialized(true);
          console.log('✅ MarketService initialized successfully');
        } catch (error) {
          console.error('❌ Failed to initialize market service:', error);
          setServiceInitialized(false);
        }
      } else {
        console.log('⏳ Wallet not ready for MarketService initialization');
        setServiceInitialized(false);
      }
    };

    initService();
  }, [wallet, walletAdapter, publicKey, connected]);

  const fetchPendingMarkets = useCallback(async (showAll = showAllMarkets) => {
    if (!publicKey) return;
    
    try {
      const walletAddress = publicKey.toString();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const endpoint = showAll 
        ? `${apiUrl}/api/admin/all-polymarket-markets`
        : `${apiUrl}/api/admin/pending-markets`;
        
      console.log(`Fetching markets from: ${endpoint}`);
        
      const response = await fetch(endpoint, {
        headers: {
          'X-Wallet-Address': walletAddress
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch markets');
      }

      const data = await response.json();
      console.log('Fetched markets data:', data);
      
      if (showAll) {
        // Show debug info when in all markets mode
        console.log('Debug info:', data.debug_info);
        setPendingMarkets(data.all_markets || []);
      } else {
        setPendingMarkets(data.markets || []);
      }
    } catch (err) {
      setError(`Failed to load markets: ${err.message}`);
      console.error('Error fetching markets:', err);
    }
  }, [publicKey, showAllMarkets]);

  const fetchDeployedMarkets = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const walletAddress = publicKey.toString();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/admin/deployed-markets`, {
        headers: {
          'X-Wallet-Address': walletAddress
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch deployed markets');
      }

      const data = await response.json();
      console.log('Fetched deployed markets:', data);
      setDeployedMarkets(data.markets || []);
    } catch (err) {
      console.error('Error fetching deployed markets:', err);
      setError(`Failed to load deployed markets: ${err.message}`);
    }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) {
      const walletAddress = publicKey.toString();
      const authorized = isWalletAuthorized(walletAddress);
      setIsAuthorized(authorized);
      
      if (authorized) {
        if (activeTab === 'pending') {
          fetchPendingMarkets();
        } else if (activeTab === 'deployed') {
          fetchDeployedMarkets();
        }
      } else {
        setLoading(false);
      }
    } else {
      setIsAuthorized(false);
      setLoading(false);
    }
  }, [publicKey, fetchPendingMarkets, fetchDeployedMarkets, activeTab]);

  useEffect(() => {
    setLoading(false);
  }, [pendingMarkets, deployedMarkets]);

  // Edit functionality
  const startEditing = (market) => {
    setEditingMarket(market.poly_id);
    setEditedValues({
      [market.poly_id]: {
        question: market.question,
        options: [...market.options]
      }
    });
  };

  const cancelEditing = () => {
    setEditingMarket(null);
    setEditedValues({});
  };

  const saveEdits = (polyId) => {
    setEditingMarket(null);
    setToast({
      message: 'Market edits saved! Changes will be applied when you deploy.',
      type: 'success'
    });
  };

  const updateEditedValue = (polyId, field, value) => {
    setEditedValues({
      ...editedValues,
      [polyId]: {
        ...editedValues[polyId],
        [field]: value
      }
    });
  };

  const updateEditedOption = (polyId, index, value) => {
    const currentOptions = editedValues[polyId]?.options || [];
    const newOptions = [...currentOptions];
    newOptions[index] = { ...newOptions[index], label: value };
    updateEditedValue(polyId, 'options', newOptions);
  };

  const getDisplayValues = (market) => {
    const edited = editedValues[market.poly_id];
    return {
      question: edited?.question || market.question,
      options: edited?.options || market.options
    };
  };

  const deployMarket = async (polyId, isRedeployment = false) => {
    if (!serviceInitialized) {
      setToast({
        message: 'Market service not initialized. Please try reconnecting your wallet.',
        type: 'error'
      });
      return;
    }

    setDeploying(prev => ({ ...prev, [polyId]: true }));
    setError('');
    setSuccess('');
    
    try {
      const walletAddress = publicKey.toString();
      
      // First, get the market data from backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/admin/deploy-market/${polyId}`, {
        method: 'POST',
        headers: {
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const { marketData } = data;

      // Apply edits if they exist
      const edited = editedValues[polyId];
      if (edited) {
        if (edited.question) {
          marketData.question = edited.question;
        }
        if (edited.options) {
          marketData.options = edited.options.map(opt => opt.label);
          marketData.options_metadata = edited.options;
        }
      }
      
      console.log('Market data with edits:', marketData);
      
      // Ensure options is an array
      if (!marketData.options || !Array.isArray(marketData.options)) {
        console.error('Invalid options data from backend:', marketData.options);
        throw new Error('Market options data is invalid or missing');
      }
      
      // Validate selected options (for markets with >4 options)
      if (marketData.options && marketData.options.length > 4) {
        const marketSelections = selectedOptions[polyId] || [];
        if (marketSelections.length > 0 && marketSelections.length <= 4) {
          // Validation: all non-empty, unique, <= 50 chars
          const labels = marketSelections.map(opt => (typeof opt === 'string' ? opt : opt.label || ''));
          const hasEmpty = labels.some(l => !l.trim());
          const hasLong = labels.some(l => l.length > 50);
          const hasDupes = new Set(labels).size !== labels.length;
          if (hasEmpty) {
            setToast({ message: 'All options must be non-empty.', type: 'error' });
            setDeploying(prev => ({ ...prev, [polyId]: false }));
            return;
          }
          if (hasLong) {
            setToast({ message: 'Option labels must be 50 characters or less.', type: 'error' });
            setDeploying(prev => ({ ...prev, [polyId]: false }));
            return;
          }
          if (hasDupes) {
            setToast({ message: 'All options must be unique.', type: 'error' });
            setDeploying(prev => ({ ...prev, [polyId]: false }));
            return;
          }
        }
      }
      
      // Handle markets with more than 4 options
      if (marketData.options && marketData.options.length > 4) {
        // Use selected options if available, otherwise take first 4
        const marketSelections = selectedOptions[polyId] || [];
        if (marketSelections.length > 0 && marketSelections.length <= 4) {
          // Create a mapping of selected indices
          const selectedIndices = marketSelections.map(opt => {
            // Handle both string and object options
            const optLabel = typeof opt === 'string' ? opt : (opt.label || '');
            return marketData.options.findIndex(o => {
              // Handle both string and object options in the marketData
              const marketOptLabel = typeof o === 'string' ? o : (o.label || '');
              return marketOptLabel === optLabel;
            });
          }).filter(idx => idx !== -1);
          
          console.log('Selected indices:', selectedIndices);
          console.log('Market selections:', marketSelections);
          
          // Reorder options based on selection
          const reorderedOptions = selectedIndices.map(idx => marketData.options[idx]);
          const reorderedMetadata = selectedIndices.map(idx => 
            marketData.options_metadata ? marketData.options_metadata[idx] : null
          ).filter(Boolean);
          
          console.log('Reordered options:', reorderedOptions);
          console.log('Reordered metadata:', reorderedMetadata);
          
          marketData.options = reorderedOptions;
          if (marketData.options_metadata) {
            marketData.options_metadata = reorderedMetadata;
          }
          
          // Update icon to match first selected option
          if (reorderedMetadata.length > 0 && reorderedMetadata[0] && reorderedMetadata[0].icon) {
            if (!marketData.assets) marketData.assets = {};
            marketData.assets.icon = reorderedMetadata[0].icon;
            console.log('Updated icon to match first selected option:', reorderedMetadata[0].icon);
          }
          
          setToast({
            message: `${isRedeployment ? 'Re-deploying' : 'Deploying'} with your selected ${marketSelections.length} option${marketSelections.length > 1 ? 's' : ''} out of ${data.marketData.options.length} total options.`,
            type: 'info'
          });
        } else {
          setToast({
            message: `This market has ${marketData.options.length} options, but only the first 4 will be deployed due to contract limitations.`,
            type: 'warning'
          });
          
          // Limit to first 4 options
          marketData.options = marketData.options.slice(0, 4);
          if (marketData.options_metadata) {
            marketData.options_metadata = marketData.options_metadata.slice(0, 4);
            
            // Update icon to match first option when limiting to 4
            if (marketData.options_metadata.length > 0 && marketData.options_metadata[0] && marketData.options_metadata[0].icon) {
              if (!marketData.assets) marketData.assets = {};
              marketData.assets.icon = marketData.options_metadata[0].icon;
              console.log('Updated icon to match first option (limited to 4):', marketData.options_metadata[0].icon);
            }
          }
        }
      }
      
      // Keep track of actual option count before padding
      const actualOptionCount = marketData.options.length;
      
      // Don't pad options - let the contract handle the actual number
      // Just ensure we don't exceed 4
      marketData.options = marketData.options.slice(0, 4);
      if (marketData.options_metadata) {
        marketData.options_metadata = marketData.options_metadata.slice(0, 4);
      }
      
      // Add actual option count to market data
      marketData.actualOptionCount = actualOptionCount;
      
      // Validate marketData
      if (!marketData || !marketData.question) {
        throw new Error('Invalid market data received from backend');
      }
      
      // Log the final market data being sent
      console.log('Final market data to deploy:', {
        question: marketData.question,
        options: marketData.options,
        optionCount: marketData.options.length,
        category: marketData.category,
        end_time: marketData.end_time
      });
      
      // Create market on blockchain using marketService
      const createResult = await marketService.createMarket({
        question: marketData.question,
        options: marketData.options || [],
        actualOptionCount: marketData.actualOptionCount || marketData.options.length,
        category: marketData.category,
        resolutionDate: new Date(marketData.end_time),
        creatorFeeRate: 200, // 2% default
        minBetAmount: 10,
        creatorStakeAmount: 10 // Reduced from 100 to 10 APES for admin deployment
      });
      
      // Save deployment to backend
      if (createResult.success && createResult.marketPubkey) {
        const saveResponse = await fetch(`${apiUrl}/api/admin/save-deployed-market`, {
          method: 'POST',
          headers: {
            'X-Wallet-Address': walletAddress,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            market_address: createResult.marketPubkey,
            poly_id: marketData.poly_id,
            apechain_market_id: marketData.apechain_market_id,
            question: marketData.question,
            category: marketData.category,
            options: marketData.options,
            assets: marketData.assets,
            options_metadata: marketData.options_metadata,
            end_time: marketData.end_time,
            transaction_hash: createResult.transaction
          })
        });
        
        if (!saveResponse.ok) {
          console.error('Failed to save market deployment to database');
          // Still continue since the on-chain deployment succeeded
        } else {
          console.log('Market deployment saved to database');
        }
      }
      
      // Check if there's a warning about confirmation timeout
      if (createResult.warning) {
        setToast({
          message: `Market ${isRedeployment ? 're-deployment' : 'deployment'} submitted! ${createResult.warning}`,
          type: 'warning'
        });
      } else {
        setToast({
          message: `Market ${isRedeployment ? 're-deployed' : 'deployed'} successfully! Address: ${createResult.marketPubkey}`,
          type: 'success'
        });
      }
      
      // Clear edits after successful deployment
      if (editedValues[polyId]) {
        const newEditedValues = { ...editedValues };
        delete newEditedValues[polyId];
        setEditedValues(newEditedValues);
      }
      
      // Refresh the markets list
      setTimeout(() => {
        if (activeTab === 'pending') {
          fetchPendingMarkets();
        } else if (activeTab === 'deployed') {
          fetchDeployedMarkets();
        }
      }, 2000);
      
      // Close preview modal
      setSelectedMarket(null);
    } catch (err) {
      console.error('Error deploying market:', err);
      setToast({
        message: err.message || `Failed to ${isRedeployment ? 're-deploy' : 'deploy'} market`,
        type: 'error'
      });
    } finally {
      setDeploying(prev => ({ ...prev, [polyId]: false }));
    }
  };

  // Platform initialization functions
  const checkPlatformStatus = async () => {
    if (!serviceInitialized) return;
    
    try {
      // Check platform state
      try {
        const [platformState] = PublicKey.findProgramAddressSync(
          [Buffer.from("platform_state")],
          marketService.program.programId
        );
        await marketService.program.account.platformState.fetch(platformState);
        setPlatformInitialized(true);
      } catch (error) {
        setPlatformInitialized(false);
      }
      
      // Check access control
      try {
        const [accessControl] = PublicKey.findProgramAddressSync(
          [Buffer.from("access_control")],
          marketService.program.programId
        );
        await marketService.program.account.accessControl.fetch(accessControl);
        setAccessControlInitialized(true);
      } catch (error) {
        setAccessControlInitialized(false);
      }
    } catch (error) {
      console.error('Error checking platform status:', error);
    }
  };

  const initializePlatform = async () => {
    setInitializing(prev => ({ ...prev, platform: true }));
    
    try {
      const result = await marketService.initializePlatform();
      if (result.success) {
        setPlatformInitialized(true);
        setToast({
          message: result.message || 'Platform initialized successfully!',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Platform initialization failed:', error);
      setToast({
        message: error.message || 'Platform initialization failed',
        type: 'error'
      });
    } finally {
      setInitializing(prev => ({ ...prev, platform: false }));
    }
  };

  const initializeAccessControl = async () => {
    setInitializing(prev => ({ ...prev, accessControl: true }));
    
    try {
      const result = await marketService.initializeAccessControl();
      if (result.success) {
        setAccessControlInitialized(true);
        setToast({
          message: result.message || 'Access control initialized successfully!',
          type: 'success'
        });
        
        // Also add the current wallet as a market creator
        try {
          await marketService.addMarketCreator(publicKey);
          setToast({
            message: 'Access control initialized and admin added as market creator!',
            type: 'success'
          });
        } catch (addError) {
          console.warn('Failed to add admin as market creator:', addError);
        }
      }
    } catch (error) {
      console.error('Access control initialization failed:', error);
      setToast({
        message: error.message || 'Access control initialization failed',
        type: 'error'
      });
    } finally {
      setInitializing(prev => ({ ...prev, accessControl: false }));
    }
  };

  // Check platform status when service is initialized
  useEffect(() => {
    if (serviceInitialized && isAuthorized) {
      checkPlatformStatus();
    }
  }, [serviceInitialized, isAuthorized]);

  const declineMarket = async (polyId, reason = '') => {
    setDeploying(prev => ({ ...prev, [`decline_${polyId}`]: true }));
    setError('');
    setSuccess('');
    
    try {
      const walletAddress = publicKey.toString();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/admin/decline-market/${polyId}`, {
        method: 'POST',
        headers: {
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline market');
      }

      setToast({
        message: 'Market declined successfully',
        type: 'success'
      });
      
      // Refresh the markets list to ensure declined market is removed
      setTimeout(() => {
        if (activeTab === 'pending') {
          fetchPendingMarkets();
        } else if (activeTab === 'deployed') {
          fetchDeployedMarkets();
        }
      }, 1000);
      
      // Close preview modal
      setSelectedMarket(null);
    } catch (err) {
      setToast({
        message: err.message || 'Failed to decline market',
        type: 'error'
      });
    } finally {
      setDeploying(prev => ({ ...prev, [`decline_${polyId}`]: false }));
    }
  };

  const formatTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff < 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const getCategoryColor = (category) => {
    const colors = {
      sports: 'bg-blue-500',
      crypto: 'bg-purple-500',
      politics: 'bg-red-500',
      culture: 'bg-pink-500',
      business: 'bg-green-500',
      news: 'bg-yellow-500',
      tech: 'bg-indigo-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  // Show loading state while checking authorization
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F14] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Show unauthorized message if wallet is connected but not authorized
  if (publicKey && !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F14] flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Unauthorized Access</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your wallet <span className="font-mono text-sm">{publicKey.toString()}</span> is not authorized to access admin features.
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Only deployer and treasury wallets can manage markets.
              </p>
              <button
                onClick={() => navigate('/markets')}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Back to Markets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F14] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin Access Required</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to access admin features</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F14]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Market Deployment</h1>
          <p className="text-gray-400">Review and deploy markets from Polymarket to Solana</p>
          <p className="text-sm text-gray-500 mt-2">Connected as: {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}</p>
          
          {/* Platform Initialization Status */}
          {!serviceInitialized ? (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
              <h3 className="text-lg font-semibold text-red-300 mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Wallet Connection Issue
              </h3>
              <p className="text-red-200 text-sm mb-2">
                MarketService failed to initialize. This prevents platform initialization.
              </p>
              <p className="text-red-200 text-xs mb-3">
                Please check browser console for detailed debugging information.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                Reload Page
              </button>
            </div>
          ) : (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Platform Status
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Platform State Status */}
                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Platform State</p>
                    <p className="text-sm text-gray-400">Core platform configuration</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {platformInitialized === null ? (
                      <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                    ) : platformInitialized ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        <button
                          onClick={initializePlatform}
                          disabled={initializing.platform}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded transition-colors flex items-center gap-1"
                        >
                          {initializing.platform ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Initialize'
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Access Control Status */}
                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Access Control</p>
                    <p className="text-sm text-gray-400">Market creator permissions</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {accessControlInitialized === null ? (
                      <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                    ) : accessControlInitialized ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        <button
                          onClick={initializeAccessControl}
                          disabled={initializing.accessControl}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded transition-colors flex items-center gap-1"
                        >
                          {initializing.accessControl ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Initialize'
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Warning message if not initialized */}
              {(platformInitialized === false || accessControlInitialized === false) && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                  <p className="text-red-300 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Platform must be fully initialized before you can deploy markets. Click the Initialize buttons above.
                  </p>
                </div>
              )}
              
              {/* Success message when fully initialized */}
              {platformInitialized === true && accessControlInitialized === true && (
                <div className="mt-3 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                  <p className="text-green-300 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Platform is fully initialized! You can now deploy markets.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Tab Navigation */}
          <div className="mt-6">
            <div className="flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('pending');
                  setLoading(true);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'pending' 
                    ? 'border-purple-500 text-purple-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Pending Markets ({pendingMarkets.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('deployed');
                  setLoading(true);
                  fetchDeployedMarkets();
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'deployed' 
                    ? 'border-purple-500 text-purple-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Already Deployed ({deployedMarkets.length})
              </button>
            </div>
          </div>
          
          {/* Controls for Pending Markets Tab */}
          {activeTab === 'pending' && (
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => {
                  const newShowAll = !showAllMarkets;
                  setShowAllMarkets(newShowAll);
                  setLoading(true);
                  setPendingMarkets([]);
                  fetchPendingMarkets(newShowAll);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showAllMarkets 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                {showAllMarkets ? 'Showing All Markets' : 'Show All Markets (Debug)'}
              </button>
              <span className="text-sm text-gray-500">
                {showAllMarkets 
                  ? 'Showing all markets from Polymarket DB (including deployed ones)'
                  : 'Showing only deployable markets'}
              </span>
            </div>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-center gap-3"
          >
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-200">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-900/20 border border-green-800 rounded-lg p-4 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-200">{success}</span>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Pending Markets Tab */}
            {activeTab === 'pending' && (
              pendingMarkets.length === 0 ? (
                <div className="bg-[#1A1D24] rounded-lg p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Pending Markets</h3>
                  <p className="text-gray-400">All available markets have been deployed to Solana.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingMarkets.map((market) => {
                    const displayValues = getDisplayValues(market);
                    const isEditing = editingMarket === market.poly_id;
                    
                    return (
                      <motion.div
                        key={market.poly_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1A1D24] rounded-lg p-6 border border-gray-800 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(market.category)}`}>
                                {market.category}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTimeRemaining(market.end_time)}
                              </span>
                              {market.is_deployed_to_solana && (
                                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                  Already Deployed
                                </span>
                              )}
                              {!market.is_active && !market.is_deployed_to_solana && (
                                <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                                  Expired
                                </span>
                              )}
                              {editedValues[market.poly_id] && (
                                <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded">
                                  Edited
                                </span>
                              )}
                            </div>
                            
                            {/* Editable Title */}
                            {isEditing ? (
                              <div className="mb-3">
                                <label className="block text-sm text-gray-400 mb-1">Market Question</label>
                                <textarea
                                  value={editedValues[market.poly_id]?.question || market.question}
                                  onChange={(e) => updateEditedValue(market.poly_id, 'question', e.target.value)}
                                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                                  rows="2"
                                  placeholder="Enter market question..."
                                />
                              </div>
                            ) : (
                              <h3 className="text-xl font-semibold text-white mb-3">{displayValues.question}</h3>
                            )}
                            
                            {/* Warning for markets with more than 4 options */}
                            {displayValues.options.length > 4 && (
                              <div className="mb-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                  <span className="text-sm text-yellow-300">
                                    This market has {displayValues.options.length} options. Select up to 4 to deploy:
                                  </span>
                                </div>
                                
                                {/* Option Selection */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                  {displayValues.options.map((option, idx) => {
                                    const marketSelections = selectedOptions[market.poly_id] || [];
                                    const isSelected = marketSelections.some(opt => opt.label === option.label);
                                    const canSelect = marketSelections.length < 4 || isSelected;
                                    
                                    return (
                                      <label 
                                        key={idx} 
                                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs transition-colors ${
                                          isSelected ? 'bg-yellow-900/40 border border-yellow-600/50' : 'bg-gray-800 hover:bg-gray-700'
                                        } ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          disabled={!canSelect && !isSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              if (!marketSelections.find(opt => opt.label === option.label) && marketSelections.length < 4) {
                                                setSelectedOptions({
                                                  ...selectedOptions,
                                                  [market.poly_id]: [...marketSelections, option]
                                                });
                                              }
                                            } else {
                                              setSelectedOptions({
                                                ...selectedOptions,
                                                [market.poly_id]: marketSelections.filter(opt => opt.label !== option.label)
                                              });
                                            }
                                          }}
                                          className="w-3 h-3 text-yellow-600 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500"
                                        />
                                        <span className="text-gray-300 truncate">{option.label}</span>
                                        {isSelected && (
                                          <span className="text-xs text-yellow-400 ml-auto">
                                            #{marketSelections.findIndex(opt => opt.label === option.label) + 1}
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                  Selected: {(selectedOptions[market.poly_id] || []).length}/4
                                </p>
                              </div>
                            )}
                            
                            {/* Editable Options (for markets with <= 4 options) */}
                            {displayValues.options.length <= 4 && (
                              <div className="mb-4">
                                {isEditing ? (
                                  <div>
                                    <label className="block text-sm text-gray-400 mb-2">Market Options</label>
                                    <div className="space-y-2">
                                      {(editedValues[market.poly_id]?.options || market.options).map((option, idx) => (
                                        <input
                                          key={idx}
                                          type="text"
                                          value={option.label}
                                          onChange={(e) => updateEditedOption(market.poly_id, idx, e.target.value)}
                                          className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                                          placeholder={`Option ${idx + 1}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {displayValues.options.map((option, idx) => (
                                      <div key={idx} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                                        <span className="text-sm text-gray-300">{option.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Poly: {market.poly_id}</span>
                              <span>•</span>
                              <span>ApeChain: {market.apechain_market_id}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdits(market.poly_id)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                                >
                                  <Save className="w-4 h-4" />
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEditing(market)}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedMarket(market);
                              }}
                              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => deployMarket(market.poly_id)}
                              disabled={
                                deploying[market.poly_id] || 
                                market.is_deployed_to_solana || 
                                (!market.is_active && showAllMarkets) ||
                                (displayValues.options.length > 4 && (!selectedOptions[market.poly_id] || selectedOptions[market.poly_id].length === 0)) ||
                                isEditing
                              }
                              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {deploying[market.poly_id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : market.is_deployed_to_solana ? (
                                'Deployed'
                              ) : !market.is_active && showAllMarkets ? (
                                'Expired'
                              ) : displayValues.options.length > 4 && (!selectedOptions[market.poly_id] || selectedOptions[market.poly_id].length === 0) ? (
                                'Select Options'
                              ) : isEditing ? (
                                'Finish Editing'
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  Deploy
                                </>
                              )}
                            </button>
                            {!isEditing && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to decline this market? This action cannot be undone.')) {
                                    declineMarket(market.poly_id, 'Admin decision');
                                  }
                                }}
                                disabled={deploying[`decline_${market.poly_id}`] || market.is_deployed_to_solana}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {deploying[`decline_${market.poly_id}`] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4" />
                                    Decline
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )
            )}

            {/* Already Deployed Markets Tab */}
            {activeTab === 'deployed' && (
              deployedMarkets.length === 0 ? (
                <div className="bg-[#1A1D24] rounded-lg p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Deployed Markets</h3>
                  <p className="text-gray-400">No markets have been deployed to Solana yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {deployedMarkets.map((market) => {
                    // Convert deployed market to format compatible with edit functions
                    // Use original_options if available, otherwise use deployed options
                    const allOptions = market.original_options && market.original_options.length > 0 
                      ? market.original_options 
                      : (market.deployed_options ? market.deployed_options.map(opt => ({ label: opt })) : []);
                    
                    const marketForEdit = {
                      ...market,
                      poly_id: market.poly_id,
                      question: market.original_question || market.question,
                      options: allOptions,
                      category: market.category
                    };
                    const displayValues = getDisplayValues(marketForEdit);
                    const isEditing = editingMarket === market.poly_id;
                    
                    return (
                      <motion.div
                        key={market.market_address}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1A1D24] rounded-lg p-6 border border-green-800/50 hover:border-green-600/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(market.category)}`}>
                                {market.category}
                              </span>
                              <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                                ✓ Deployed ({market.deployed_option_count || 0}/{market.total_option_count || 0} options)
                              </span>
                              {market.assets_available && (
                                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                  Has Assets
                                </span>
                              )}
                              {market.has_more_options && (
                                <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                                  +{market.total_option_count - market.deployed_option_count} More Options
                                </span>
                              )}
                              {editedValues[market.poly_id] && (
                                <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded">
                                  Edited for Re-deploy
                                </span>
                              )}
                            </div>
                            
                            {/* Editable Title for Deployed Markets */}
                            {isEditing ? (
                              <div className="mb-3">
                                <label className="block text-sm text-gray-400 mb-1">Market Question</label>
                                <textarea
                                  value={editedValues[market.poly_id]?.question || marketForEdit.question}
                                  onChange={(e) => updateEditedValue(market.poly_id, 'question', e.target.value)}
                                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                                  rows="2"
                                  placeholder="Enter market question..."
                                />
                              </div>
                            ) : (
                              <h3 className="text-xl font-semibold text-white mb-3">{displayValues.question}</h3>
                            )}
                            
                            {/* Show all original options with deployment indicators */}
                            {allOptions.length > 4 && (
                              <div className="mb-3 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Layers className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                  <span className="text-sm text-blue-300">
                                    This market has {allOptions.length} original options. Select up to 4 for re-deployment:
                                  </span>
                                </div>
                                
                                {/* Option Selection with deployment indicators */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                  {allOptions.map((option, idx) => {
                                    const marketSelections = selectedOptions[market.poly_id] || [];
                                    const isSelected = marketSelections.some(opt => opt.label === option.label);
                                    const canSelect = marketSelections.length < 4 || isSelected;
                                    const wasDeployed = market.deployed_options && market.deployed_options.includes(option.label);
                                    
                                    return (
                                      <label 
                                        key={idx} 
                                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs transition-colors ${
                                          isSelected 
                                            ? 'bg-blue-900/40 border border-blue-600/50' 
                                            : wasDeployed
                                              ? 'bg-green-900/30 border border-green-600/40 hover:bg-green-900/40'
                                              : 'bg-gray-800 hover:bg-gray-700'
                                        } ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          disabled={!canSelect && !isSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              if (!marketSelections.find(opt => opt.label === option.label) && marketSelections.length < 4) {
                                                setSelectedOptions({
                                                  ...selectedOptions,
                                                  [market.poly_id]: [...marketSelections, option]
                                                });
                                              }
                                            } else {
                                              setSelectedOptions({
                                                ...selectedOptions,
                                                [market.poly_id]: marketSelections.filter(opt => opt.label !== option.label)
                                              });
                                            }
                                          }}
                                          className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-gray-300 truncate flex-1">{option.label}</span>
                                        {wasDeployed && (
                                          <span className="text-xs text-green-400 ml-1" title="Previously deployed">
                                            ✓
                                          </span>
                                        )}
                                        {isSelected && (
                                          <span className="text-xs text-blue-400 ml-1">
                                            #{marketSelections.findIndex(opt => opt.label === option.label) + 1}
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                                <div className="flex justify-between items-center mt-2 text-xs">
                                  <span className="text-gray-400">
                                    Selected: {(selectedOptions[market.poly_id] || []).length}/4
                                  </span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-green-400 flex items-center gap-1">
                                      <span className="w-2 h-2 bg-green-400 rounded"></span>
                                      Previously deployed
                                    </span>
                                    <span className="text-gray-400 flex items-center gap-1">
                                      <span className="w-2 h-2 bg-gray-400 rounded"></span>
                                      Available
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Editable Options for Deployed Markets (≤4 options) */}
                            {allOptions.length <= 4 && (
                              <div className="mb-4">
                                {isEditing ? (
                                  <div>
                                    <label className="block text-sm text-gray-400 mb-2">Market Options</label>
                                    <div className="space-y-2">
                                      {(editedValues[market.poly_id]?.options || allOptions).map((option, idx) => (
                                        <div key={idx} className="relative">
                                          <input
                                            type="text"
                                            value={option.label}
                                            onChange={(e) => updateEditedOption(market.poly_id, idx, e.target.value)}
                                            className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none pr-8"
                                            placeholder={`Option ${idx + 1}`}
                                          />
                                          {market.deployed_options && market.deployed_options.includes(option.label) && (
                                            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-400 text-xs" title="Previously deployed">
                                              ✓
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {displayValues.options.map((option, idx) => {
                                      const wasDeployed = market.deployed_options && market.deployed_options.includes(option.label);
                                      return (
                                        <div key={idx} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
                                          wasDeployed ? 'bg-green-800/50 border border-green-600/30' : 'bg-gray-800'
                                        }`}>
                                          <span className="text-sm text-gray-300">{option.label}</span>
                                          {wasDeployed && (
                                            <span className="text-xs text-green-400" title="Previously deployed">✓</span>
                                          )}
                                          {editedValues[market.poly_id] && (
                                            <span className="text-xs text-orange-400">✏️</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Market: {market.market_address.slice(0, 8)}...{market.market_address.slice(-8)}</span>
                              <span>•</span>
                              <span>Poly: {market.poly_id}</span>
                              {market.apechain_market_id && (
                                <>
                                  <span>•</span>
                                  <span>ApeChain: {market.apechain_market_id}</span>
                                </>
                              )}
                            </div>
                            
                            <div className="mt-2 text-xs text-gray-400">
                              Deployed: {new Date(market.created_at).toLocaleDateString()} {new Date(market.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdits(market.poly_id)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                                >
                                  <Save className="w-4 h-4" />
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEditing(marketForEdit)}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => {
                                // Use the market with all original options for preview
                                const previewMarket = {
                                  ...market,
                                  poly_id: market.poly_id,
                                  question: market.original_question || market.question,
                                  options: allOptions,
                                  assets: market.assets || {},
                                  end_time: market.created_at, // Use a reasonable end time
                                  category: market.category,
                                  market_address: market.market_address,
                                  // Add deployed context for preview
                                  deployed_options: market.deployed_options,
                                  has_more_options: market.has_more_options
                                };
                                setSelectedMarket(previewMarket);
                              }}
                              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to re-deploy this market? This will create a new market on the blockchain.')) {
                                  deployMarket(market.poly_id, true);
                                }
                              }}
                              disabled={
                                deploying[market.poly_id] || 
                                isEditing ||
                                (allOptions.length > 4 && (!selectedOptions[market.poly_id] || selectedOptions[market.poly_id].length === 0))
                              }
                              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {deploying[market.poly_id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isEditing ? (
                                'Finish Editing'
                              ) : allOptions.length > 4 && (!selectedOptions[market.poly_id] || selectedOptions[market.poly_id].length === 0) ? (
                                'Select Options'
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4" />
                                  Re-deploy
                                </>
                              )}
                            </button>
                            {!isEditing && (
                              <a
                                href={`http://localhost:3000/markets`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors text-center"
                              >
                                View Live
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedMarket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedMarket(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1D24] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Market Preview Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-xl">
                <h2 className="text-2xl font-bold text-white mb-2">Market Preview</h2>
                <p className="text-white/80">This is how the market will appear on your platform</p>
              </div>

              {/* Market Card Preview */}
              <div className="p-6">
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                  {/* Banner */}
                  {selectedMarket.assets && selectedMarket.assets.banner && (
                    <div className="h-48 relative mb-4 -mx-6 -mt-6">
                      <img 
                        src={selectedMarket.assets.banner} 
                        alt="Market banner" 
                        className="w-full h-full object-cover rounded-t-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent rounded-t-lg" />
                    </div>
                  )}
                  
                  {/* Market Info */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(selectedMarket.category)}`}>
                        {selectedMarket.category}
                      </span>
                      <span className="text-sm text-gray-400">
                        {selectedMarket.end_time ? `Ends ${new Date(selectedMarket.end_time).toLocaleDateString()}` : 'No end date'}
                      </span>
                      {editedValues[selectedMarket.poly_id] && (
                        <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded">
                          ✏️ Edited Preview
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                      {(() => {
                        const displayValues = getDisplayValues(selectedMarket);
                        return displayValues.question;
                      })()}
                    </h3>
                  </div>

                  {/* Warning for markets with more than 4 options */}
                  {(() => {
                    const displayValues = getDisplayValues(selectedMarket);
                    return displayValues.options.length > 4 && (
                      <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-yellow-300 font-medium">Option Limit Notice</p>
                            <p className="text-xs text-yellow-300/80">
                              {selectedMarket.market_address && selectedMarket.deployed_options
                                ? selectedOptions[selectedMarket.poly_id]?.length > 0
                                  ? `You have selected ${selectedOptions[selectedMarket.poly_id].length} option${selectedOptions[selectedMarket.poly_id].length > 1 ? 's' : ''} for re-deployment out of ${displayValues.options.length} total options.`
                                  : `This deployed market originally had ${displayValues.options.length} options but only ${selectedMarket.deployed_option_count || 4} were deployed. Select up to 4 options for re-deployment.`
                                : selectedOptions[selectedMarket.poly_id]?.length > 0
                                  ? `You have selected ${selectedOptions[selectedMarket.poly_id].length} option${selectedOptions[selectedMarket.poly_id].length > 1 ? 's' : ''} to deploy out of ${displayValues.options.length} total options.`
                                  : `This market has ${displayValues.options.length} options. Only the first 4 will be deployed.`
                              }
                            </p>
                            {selectedMarket.market_address && selectedMarket.deployed_options && (
                              <p className="text-xs text-green-300/80 mt-1">
                                Previously deployed: {selectedMarket.deployed_options.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Options Preview */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Options to Deploy</h4>
                    {(() => {
                      const displayValues = getDisplayValues(selectedMarket);
                      // Determine which options to show
                      const optionsToShow = displayValues.options.length > 4 && selectedOptions[selectedMarket.poly_id]?.length > 0
                        ? selectedOptions[selectedMarket.poly_id]
                        : displayValues.options.slice(0, 4);
                      
                      return optionsToShow.map((option, idx) => {
                        const wasDeployed = selectedMarket.deployed_options && selectedMarket.deployed_options.includes(option.label);
                        
                        return (
                          <div key={idx} className={`rounded-lg p-4 flex items-center justify-between hover:bg-gray-600 transition-colors cursor-pointer ${
                            wasDeployed ? 'bg-green-700/30 border border-green-600/40' : 'bg-gray-700'
                          }`}>
                            <div className="flex items-center gap-3">
                              {option.icon && (
                                <img 
                                  src={option.icon} 
                                  alt={option.label} 
                                  className="w-8 h-8 rounded"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{option.label}</span>
                                {wasDeployed && (
                                  <span className="text-xs text-green-400 bg-green-900/40 px-2 py-0.5 rounded" title="Previously deployed">
                                    ✓ Deployed
                                  </span>
                                )}
                                {editedValues[selectedMarket.poly_id] && (
                                  <span className="text-xs text-orange-400">✏️</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-white">50%</div>
                              <div className="text-xs text-gray-400">Initial odds</div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Market Stats Preview */}
                  <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
                    <div>
                      <p className="text-sm text-gray-400">Total Volume</p>
                      <p className="text-xl font-bold text-white">0 APES</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Participants</p>
                      <p className="text-xl font-bold text-white">0</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Time Remaining</p>
                      <p className="text-xl font-bold text-white">
                        {selectedMarket.end_time ? formatTimeRemaining(selectedMarket.end_time) : 'No end date'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Edit Notice */}
                {editedValues[selectedMarket.poly_id] && (
                  <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Edit3 className="w-5 h-5 text-orange-500" />
                      <span className="text-sm text-orange-300 font-medium">Preview with Edits</span>
                    </div>
                    <p className="text-xs text-orange-300/80">
                      This preview shows your edited version. The changes will be applied when you deploy the market.
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Technical Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Polymarket ID</p>
                      <p className="text-white font-mono">{selectedMarket.poly_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">ApeChain ID</p>
                      <p className="text-white font-mono">{selectedMarket.apechain_market_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Market Type</p>
                      <p className="text-white capitalize">{selectedMarket.market_type || 'binary'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="text-green-400 capitalize">{selectedMarket.status || 'active'}</p>
                    </div>
                    {selectedMarket.market_address && (
                      <>
                        <div className="col-span-2">
                          <p className="text-gray-500">Deployed Market Address</p>
                          <p className="text-white font-mono break-all">{selectedMarket.market_address}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setSelectedMarket(null)}
                    className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-3">
                    {selectedMarket.market_address && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to re-deploy this market? This will create a new market on the blockchain.')) {
                            deployMarket(selectedMarket.poly_id, true);
                          }
                        }}
                        disabled={deploying[selectedMarket.poly_id]}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {deploying[selectedMarket.poly_id] ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Re-deploying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-5 h-5" />
                            Re-deploy Market
                          </>
                        )}
                      </button>
                    )}
                    {!selectedMarket.market_address && (
                      <button
                        onClick={() => deployMarket(selectedMarket.poly_id)}
                        disabled={deploying[selectedMarket.poly_id]}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                      >
                        {deploying[selectedMarket.poly_id] ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Deploying to Solana...
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            Deploy Market
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Toast notifications */}
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

export default AdminMarketDeploymentPage; 