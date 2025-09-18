#!/usr/bin/env node

/**
 * Script to update all files from useWallet/useSafeWallet to useAppWallet
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  // Pages
  'src/pages/AdminCryptoMarketsPage.jsx',
  'src/pages/AdminMarketApprovalPage.jsx',
  'src/pages/AdminMarketAssetsPage.jsx',
  'src/pages/AdminMarketDeploymentPage.jsx',
  'src/pages/AdminMobileMarketsPage.jsx',
  'src/pages/AdminTournamentPage.jsx',
  'src/pages/BurnStatsPage.jsx',
  'src/pages/CreateMarketPage.jsx',
  'src/pages/CS2ParlayTournamentPage.jsx',
  'src/pages/DailyCryptoPredictionsPage.jsx',
  'src/pages/EngageToEarnPage.jsx',
  'src/pages/EnhancedProfilePage.jsx',
  'src/pages/LeaderboardPage.jsx',
  'src/pages/MarketDetailPage.jsx',
  'src/pages/MarketsPage.jsx',
  'src/pages/SimpleProfilePage.jsx',
  'src/pages/SuperAdminPage.jsx',
  'src/pages/TokenSwapPage.jsx',
  'src/pages/TournamentDetailPage.jsx',
  'src/pages/TournamentsPage.jsx',
  'src/pages/UserProfilePage.jsx',
  // Components
  'src/components/ClaimRewardModal.jsx',
  'src/components/MarketCard.jsx',
  'src/components/ReferralSection.jsx',
  'src/components/TwitterFeed.jsx',
  'src/components/TwitterLink.jsx',
  'src/components/PointsWidget.jsx',
  // Hooks
  'src/hooks/useReferralTracking.js',
  // Utils
  'src/utils/useBelieveApp.js',
  'src/utils/useMeteora.js'
];

// Function to update a single file
function updateFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Replace useWallet import
  if (content.includes("import { useWallet } from '@solana/wallet-adapter-react';")) {
    content = content.replace(
      "import { useWallet } from '@solana/wallet-adapter-react';",
      "import { useAppWallet } from '../hooks/useAppWallet';"
    );
    modified = true;
  }
  
  // Replace useSafeWallet import
  if (content.includes("import { useSafeWallet } from '../hooks/useSafeWallet';")) {
    content = content.replace(
      "import { useSafeWallet } from '../hooks/useSafeWallet';",
      "import { useAppWallet } from '../hooks/useAppWallet';"
    );
    modified = true;
  }
  
  // For utils files, adjust the import path
  if (filePath.startsWith('src/utils/') && content.includes("import { useWallet }")) {
    content = content.replace(
      "import { useWallet } from '@solana/wallet-adapter-react';",
      "import { useAppWallet } from '../hooks/useAppWallet';"
    );
    modified = true;
  }
  
  // Replace hook usage
  if (content.includes('useWallet()')) {
    content = content.replace(/useWallet\(\)/g, 'useAppWallet()');
    modified = true;
  }
  
  if (content.includes('useSafeWallet()')) {
    content = content.replace(/useSafeWallet\(\)/g, 'useAppWallet()');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
}

// Update all files
console.log('Starting wallet hook updates...\n');
filesToUpdate.forEach(updateFile);
console.log('\n✅ Wallet hook updates complete!');

// Show manual updates needed
console.log('\n⚠️  Manual updates may be needed for:');
console.log('- Files using { wallet } destructuring - may need to use getProvider()');
console.log('- Files using signTransaction/signAllTransactions directly');
console.log('- TokenSwapPage.jsx - complex wallet usage');