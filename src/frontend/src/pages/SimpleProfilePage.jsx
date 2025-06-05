import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const SimpleProfilePage = () => {
  const { publicKey, connected } = useWallet();

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Profile</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-900 dark:text-white">Wallet Address: {publicKey?.toString()}</p>
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            Profile features coming soon...
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleProfilePage; 