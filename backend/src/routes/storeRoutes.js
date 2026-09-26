const express = require('express');
const storeController = require('../controllers/storeController');

const router = express.Router();

router.get('/connection-test', (req, res) => storeController.testConnection(req, res));

router.get('/products', (req, res) => storeController.getProducts(req, res));

router.post('/sync', (req, res) => storeController.syncStores(req, res));

router.get('/db-products', (req, res) => storeController.getDbproducts(req, res));

module.exports = router;
