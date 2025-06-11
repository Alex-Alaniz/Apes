#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
  'src/frontend/src/services/marketService.js',
  'src/frontend/src/pages/AdminPage.jsx',
  'src/frontend/src/pages/CreateMarketPage.jsx',
  'src/frontend/src/pages/AdminMarketDeploymentPage.jsx'
];

const productionUrl = 'https://apes-production.up.railway.app';

filesToUpdate.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalLength = content.length;
      
      // Replace all instances of localhost:5001 with production URL
      content = content.replace(/http:\/\/localhost:5001/g, productionUrl);
      
      if (content.length !== originalLength) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${filePath}`);
      } else {
        console.log(`⏩ No changes needed in ${filePath}`);
      }
    } else {
      console.log(`⚠️ File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
  }
});

console.log('🎯 All localhost:5001 URLs replaced with production Railway URL!'); 