const pool = require('../database/db');

// Sync service for blockchain synchronization  
const syncService = {
  startSync: () => {
    console.log('Sync service started - syncing every 5 minutes');
    
    // Initial sync
    console.log('Starting market sync...');
    setTimeout(() => {
      console.log('Market sync completed (simulated)');
    }, 1000);
    
    // Set up periodic sync
    setInterval(() => {
      console.log('Starting market sync...');
      setTimeout(() => {
        console.log('Market sync completed (simulated)');
      }, 1000);
    }, 5 * 60 * 1000); // Every 5 minutes
  }
};

module.exports = syncService; 