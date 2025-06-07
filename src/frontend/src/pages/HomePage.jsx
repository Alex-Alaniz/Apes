import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
// import MarketCard from '../components/MarketCard';

const HomePage = () => {
  const { publicKey } = useWallet();

  // Mock data for featured markets
  const featuredMarkets = [
    {
      id: 1,
      title: "Will BTC reach $100,000 by end of 2025?",
      category: "Crypto",
      endDate: "2025-12-31",
      yesPrice: 0.65,
      noPrice: 0.35,
      volume: 25000,
      liquidity: 15000,
      image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400"
    },
    {
      id: 2,
      title: "Will the Lakers win the NBA Championship in 2026?",
      category: "Sports",
      endDate: "2026-06-30",
      yesPrice: 0.48,
      noPrice: 0.52,
      volume: 15000,
      liquidity: 10000,
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400"
    },
    {
      id: 3,
      title: "Will Apple release a foldable iPhone in 2025?",
      category: "Tech",
      endDate: "2025-12-31",
      yesPrice: 0.32,
      noPrice: 0.68,
      volume: 18000,
      liquidity: 12000,
      image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400"
    }
  ];

  const stats = [
    { label: "Total Markets", value: "10+" },
    { label: "Total Volume", value: "100K+ APES" },
    { label: "Active Traders", value: "50+" },
    { label: "Markets Resolved", value: "5+" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Predict. Stake. Win.
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
              PRIMAPE APP - The ultimate Solana prediction market platform powered by APES tokens
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/markets"
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
              >
                Explore Markets
              </Link>
              {!publicKey && (
                <button className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                  Connect Wallet to Start
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-200 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
                <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Markets */}
      <section className="py-16 bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Featured Markets</h2>
            <Link to="/markets" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
              View All →
            </Link>
          </div>
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900">
            <p className="text-gray-700 dark:text-gray-300 text-lg mb-4">Ready to explore prediction markets?</p>
            <Link 
              to="/markets" 
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Browse All Markets
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-200 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Connect Wallet</h3>
              <p className="text-gray-600 dark:text-gray-400">Connect your Solana wallet to start trading on prediction markets</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Make Predictions</h3>
              <p className="text-gray-600 dark:text-gray-400">Buy shares on any option based on your predictions</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Win Rewards</h3>
              <p className="text-gray-600 dark:text-gray-400">Earn APES tokens when your predictions are correct</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-900 dark:to-pink-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Predicting?</h2>
          <p className="text-xl text-gray-100 dark:text-gray-200 mb-8">Join the decentralized prediction market on Solana</p>
          <Link
            to="/markets"
            className="inline-block px-8 py-3 bg-white dark:bg-gray-100 text-purple-900 dark:text-purple-900 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-white transition-all transform hover:scale-105"
          >
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
