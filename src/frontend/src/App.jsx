import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MarketsPage from './pages/MarketsPage';
import MarketDetailPage from './pages/MarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import AdminMarketAssetsPage from './pages/AdminMarketAssetsPage';
import AdminMarketDeploymentPage from './pages/AdminMarketDeploymentPage';
import AdminTournamentPage from './pages/AdminTournamentPage';
import AdminCryptoMarketsPage from './pages/AdminCryptoMarketsPage';
import AdminMobileMarketsPage from './pages/AdminMobileMarketsPage';
import AdminMarketApprovalPage from './pages/AdminMarketApprovalPage';
import SuperAdminPage from './pages/SuperAdminPage';
import EngageToEarnPage from './pages/EngageToEarnPage';
import TwitterCallback from './pages/TwitterCallback';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import DebugApiPage from './pages/DebugApiPage';
import CS2ParlayTournamentPage from './pages/CS2ParlayTournamentPage';
import DailyCryptoPredictionsPage from './pages/DailyCryptoPredictionsPage';
import ReferralPage from './pages/ReferralPage';
import PrivyTestPage from './pages/PrivyTestPage';
import { Toaster } from 'react-hot-toast';
import AppWithReferralTracking from './components/AppWithReferralTracking';
import '@solana/wallet-adapter-react-ui/styles.css';

// Set up global polyfills for browser compatibility
if (typeof window !== 'undefined') {
  window.global = window.global || window;
  // Buffer is configured globally via vite.config.js
}

function App() {
  // Clear wallet adapter localStorage on load to prevent stuck states
  React.useEffect(() => {
    try {
      // Force clear all wallet adapter localStorage to fix production issues
      const walletKeys = [
        'walletName',
        'walletAdapter',
        'solana-wallet',
        'wallet',
        'WalletAdapter'
      ];
      
      let cleared = false;
      walletKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`Clearing wallet localStorage: ${key} = ${localStorage.getItem(key)}`);
          localStorage.removeItem(key);
          cleared = true;
        }
      });
      
      if (cleared) {
        console.log('Wallet localStorage cleared to fix stuck loading state');
      }
      
      // Log current state for debugging
      console.log('APES v1.0.1 - Wallet environment:', {
        version: '1.0.1-wallet-fix',
        timestamp: new Date().toISOString(),
        hasPhantom: !!window.phantom?.solana,
        hasSolflare: !!window.solflare,
        localStorage: Object.keys(localStorage).filter(k => k.toLowerCase().includes('wallet'))
      });
    } catch (e) {
      console.error('Could not clear wallet localStorage:', e);
    }
  }, []);

  // Configure network - using mainnet for production
  const network = import.meta.env.VITE_SOLANA_NETWORK === 'mainnet' 
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet;
  const endpoint = React.useMemo(() => {
    const customRpc = import.meta.env.VITE_RPC_URL;
    return customRpc || clusterApiUrl(network);
  }, [network]);

  // Configure wallets
  const wallets = React.useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // Handle wallet connection errors gracefully
  const onError = React.useCallback((error) => {
    console.error('Wallet adapter error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      error
    });
    
    // Check for specific error types
    if (error.message?.includes('User rejected')) {
      console.log('User cancelled wallet connection');
    } else if (error.message?.includes('Wallet not found')) {
      console.log('Wallet extension not installed');
    } else {
      console.error('Unknown wallet error:', error);
    }
  }, []);

  // App content
  const appContent = (
    <ThemeProvider>
      <AppWithReferralTracking>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Navbar />
          <main className="pt-16">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/markets" element={<MarketsPage />} />
            <Route path="/markets/:marketId" element={<MarketDetailPage />} />
            <Route path="/create-market" element={<CreateMarketPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} />
            <Route path="/parlay/:tournamentId" element={<CS2ParlayTournamentPage />} />
            <Route path="/daily-crypto" element={<DailyCryptoPredictionsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:walletAddress" element={<PublicProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/assets" element={<AdminMarketAssetsPage />} />
            <Route path="/admin/deploy-markets" element={<AdminMarketDeploymentPage />} />
            <Route path="/admin/crypto-markets" element={<AdminCryptoMarketsPage />} />
            <Route path="/admin/tournament" element={<AdminTournamentPage />} />
            <Route path="/admin/mobile-markets" element={<AdminMobileMarketsPage />} />
            <Route path="/admin/market-approval" element={<AdminMarketApprovalPage />} />
            <Route path="/super-admin" element={<SuperAdminPage />} />
            <Route path="/engage-to-earn" element={<EngageToEarnPage />} />
            <Route path="/auth/twitter/callback" element={<TwitterCallback />} />
            <Route path="/debug-api" element={<DebugApiPage />} />
            <Route path="/ref/:referralCode" element={<ReferralPage />} />
            <Route path="/privy-test" element={<PrivyTestPage />} />
          </Routes>
          </main>
          <Toaster position="bottom-right" />
        </div>
      </AppWithReferralTracking>
    </ThemeProvider>
  );

  // Always use Solana wallet providers
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false} onError={onError}>
        <WalletModalProvider>
          {appContent}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;