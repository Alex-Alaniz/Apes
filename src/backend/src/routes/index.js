const express = require('express');
const router = express.Router();

// Import controllers
const marketController = require('../controllers/marketController');
// const userController = require('../controllers/userController');
const predictionController = require('../controllers/predictionController');
// const tokenController = require('../controllers/tokenController');

// Market routes
router.get('/markets', marketController.getAllMarkets);
router.get('/markets/:id', marketController.getMarketById);
router.post('/markets', marketController.createMarket);
router.put('/markets/:id/resolve', marketController.resolveMarket);
router.get('/markets/categories/:category', marketController.getMarketsByCategory);

// User routes - commented out for now
// router.post('/users', userController.createUser);
// router.get('/users/:address', userController.getUserByAddress);
// router.get('/users/:address/predictions', userController.getUserPredictions);

// Prediction routes
router.post('/predictions', predictionController.createPrediction);
router.get('/predictions/:id', predictionController.getPredictionById);
router.post('/predictions/:id/claim', predictionController.claimReward);

// Token routes - commented out for now
// router.post('/tokens/burn', tokenController.burnTokens);
// router.get('/tokens/stats', tokenController.getTokenStats);

module.exports = router;
