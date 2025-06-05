import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const router = express.Router();

// Import the CommonJS admin routes from src/backend
const adminRoutes = require('../../src/backend/routes/admin.js');

// Use all routes from the CommonJS module
router.use('/', adminRoutes);

export default router; 