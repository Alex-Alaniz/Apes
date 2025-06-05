import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MarketsPage from './pages/MarketsPage';
import MarketDetailPage from './pages/MarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import AdminMarketAssetsPage from './pages/AdminMarketAssetsPage';
import AdminMarketDeploymentPage from './pages/AdminMarketDeploymentPage';
import EngageToEarnPage from './pages/EngageToEarnPage';
import TwitterCallback from './pages/TwitterCallback';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import { Toaster } from 'react-hot-toast';
import '@solana/wallet-adapter-react-ui/styles.css';

// Import Buffer polyfill for Webpack 5
import { Buffer } from 'buffer';
window.Buffer = Buffer;

function App() {
  // Configure network - using devnet for testing
  const network = WalletAdapterNetwork.Devnet;
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

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ThemeProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
              <Navbar />
              <main className="pt-16">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/markets" element={<MarketsPage />} />
                  <Route path="/markets/:marketId" element={<MarketDetailPage />} />
                  <Route path="/create-market" element={<CreateMarketPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/profile/:walletAddress" element={<PublicProfilePage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/assets" element={<AdminMarketAssetsPage />} />
                  <Route path="/admin/deploy-markets" element={<AdminMarketDeploymentPage />} />
                  <Route path="/engage-to-earn" element={<EngageToEarnPage />} />
                  <Route path="/auth/twitter/callback" element={<TwitterCallback />} />
                </Routes>
              </main>
              <Toaster position="bottom-right" />
            </div>
          </ThemeProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
