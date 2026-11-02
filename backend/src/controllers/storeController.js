const woocommerceService = require('../services/woocommerceService');
const syncServices = require('../services/syncServices');

const recommendationService = require('../services/recommendationService');

/**
 * Describes a failed WooCommerce API call in plain terms, or returns null if the
 * error didn't come from the store (e.g. a database error).
 */
function describeStoreError(error) {
  const storeUrl = process.env.WOOCOMMERCE_URL;
  const isStoreCall = Boolean(storeUrl) && Boolean(error.config?.url?.includes(storeUrl));
  if (!isStoreCall) return null;

  if (error.response) {
    const body = typeof error.response.data === 'string' ? error.response.data : '';
    const title = body.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    const detail = error.response.data?.message || title || error.message;
    return `WooCommerce store responded with HTTP ${error.response.status}: ${detail}`;
  }
  return `Could not reach the WooCommerce store (${error.code || error.message})`;
}

class StoreController {

  async testConnection(req, res) {
    try {
      const result = await woocommerceService.getProducts({ per_page: 1 });
      return res.status(200).json({
        success: true,
        message: 'Successfully connected to WooCommerce REST API',
        store_url: process.env.WOOCOMMERCE_URL,
        total_products: result.total,
      });
    } catch (error) {
      console.error('WooCommerce Connection Test Failed:', error.response?.data || error.message);
      return res.status(error.response?.status || 500).json({
        success: false,
        message: 'Failed to connect to WooCommerce REST API',
        error: error.response?.data || error.message,
      });
    }
  }


  async getProducts(req, res) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const per_page = parseInt(req.query.per_page || '20', 10);
      const category = req.query.category;

      const params = { page, per_page };
      if (category) params.category = category;

      const data = await woocommerceService.getProductsWithOrderAnalytics(params);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error fetching store products:', error.response?.data || error.message);
      return res.status(error.response?.status || 500).json({
        success: false,
        message: 'Error fetching products from WooCommerce store',
        error: error.response?.data || error.message,
      });
    }
  }

  async syncStores(req, res) {
    try {
      const result = await syncServices.syncStoreData();
      return res.status(200).json(result);
    } catch (error) {
      const storeError = describeStoreError(error);
      console.error('Store Sync Failed:', storeError || error);
      if (storeError) {
        // The store, not this server or the database, is the problem: 502 Bad Gateway.
        return res.status(502).json({ success: false, message: storeError });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to save WooCommerce data to PostgreSQL',
        error: error.message,
      });
    }
  }

  async getDbproducts(req, res) {
    try {
      const products = await syncServices.getDbProducts();
      return res.status(200).json({
        success: true,
        source: 'postgresql',
        total: products.length,
        data: products,
      });
    } catch (error) {
      console.error('Error fetching PostgreSQL products:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching products from PostgreSQL',
        error: error.message,
      });
    }
  }

  async getDbOrders(req, res) {
    try {
      const orders = await syncServices.getDbOrders();
      return res.status(200).json({
        success: true,
        source: 'postgresql',
        total: orders.length,
        data: orders,
      });
    } catch (error) {
      console.error('Error fetching PostgreSQL orders:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching orders from PostgreSQL',
        error: error.message,
      });
    }
  }

  async getRecommendation(req, res) {
    try {
      const { id } = req.params;
      const result = await recommendationService.generateRecommendation(id);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('Recommendation failed:', error.response?.data || error.message);
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      const mlUnreachable = error.config?.url?.includes('/predict-demand') && !error.response;
      return res.status(mlUnreachable ? 503 : 500).json({
        success: false,
        message: 'Failed to generate recommendation',
        error: error.response?.data || error.message,
      });
    }
  }
}

module.exports = new StoreController();
