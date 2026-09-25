const woocommerceService = require('../services/woocommerceService');

/**
 * Controller for WooCommerce Store endpoints
 */
class StoreController {
  /**
   * GET /api/store/connection-test
   * Quickly verifies if credentials and URL are valid
   */
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

  /**
   * GET /api/store/products
   * Fetches products combined with order history analytics
   */
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
}

module.exports = new StoreController();
