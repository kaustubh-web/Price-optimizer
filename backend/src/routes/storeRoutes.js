const express = require('express');
const storeController = require('../controllers/storeController');

const router = express.Router();

/**
 * Route: GET /api/store/connection-test
 * Verify store connection
 */
router.get('/connection-test', (req, res) => storeController.testConnection(req, res));

/**
 * Route: GET /api/store/products
 * Fetch products enriched with order history analytics
 */
router.get('/products', (req, res) => storeController.getProducts(req, res));

module.exports = router;
