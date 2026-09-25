const woocommerce = require('../config/woocommerce');

/**
 * Service to interact with WooCommerce REST API (v3)
 */
class WooCommerceService {
  /**
   * Fetch list of products with optional query parameters (pagination, filtering)
   */
  async getProducts(params = {}) {
    const query = {
      per_page: params.per_page || 50,
      page: params.page || 1,
      status: params.status || 'publish',
      ...params,
    };

    const response = await woocommerce.get('products', query);
    return {
      data: response.data,
      total: parseInt(response.headers['x-wp-total'] || '0', 10),
      totalPages: parseInt(response.headers['x-wp-totalpages'] || '1', 10),
    };
  }

  /**
   * Fetch list of orders
   */
  async getOrders(params = {}) {
    const query = {
      per_page: params.per_page || 100,
      page: params.page || 1,
      ...params,
    };

    const response = await woocommerce.get('orders', query);
    return {
      data: response.data,
      total: parseInt(response.headers['x-wp-total'] || '0', 10),
      totalPages: parseInt(response.headers['x-wp-totalpages'] || '1', 10),
    };
  }

  /**
   * Fetch products consolidated with their order history analytics.
   * This provides the essential features required by our downstream pricing model:
   * - current price vs regular price
   * - units sold per product from completed orders
   * - total historical revenue
   * - recent order frequency
   */
  async getProductsWithOrderAnalytics(params = {}) {
    // 1. Fetch products & orders concurrently for optimal latency
    const [productsResult, ordersResult] = await Promise.all([
      this.getProducts(params),
      this.getOrders({ per_page: 100 }),
    ]);

    const products = productsResult.data;
    const orders = ordersResult.data;

    // 2. Build order metrics lookup map by product_id
    const productOrderMetrics = new Map();

    for (const order of orders) {
      if (!Array.isArray(order.line_items)) continue;

      for (const item of order.line_items) {
        const productId = item.product_id;
        const quantity = item.quantity || 0;
        const total = parseFloat(item.total || 0);

        if (!productOrderMetrics.has(productId)) {
          productOrderMetrics.set(productId, {
            order_count: 0,
            units_sold: 0,
            revenue: 0,
            order_history: [],
          });
        }

        const metrics = productOrderMetrics.get(productId);
        metrics.order_count += 1;
        metrics.units_sold += quantity;
        metrics.revenue += total;
        metrics.order_history.push({
          order_id: order.id,
          date_created: order.date_created,
          quantity,
          subtotal: parseFloat(item.subtotal || 0),
          total,
          currency: order.currency,
          customer_city: order.billing?.city || null,
          customer_state: order.billing?.state || null,
        });
      }
    }

    // 3. Normalize and enrich each product payload
    const enrichedProducts = products.map((prod) => {
      const regularPrice = parseFloat(prod.regular_price || prod.price || 0);
      const salePrice = prod.sale_price ? parseFloat(prod.sale_price) : null;
      const currentPrice = parseFloat(prod.price || 0);
      const discountPercentage =
        regularPrice > 0 && salePrice && salePrice < regularPrice
          ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
          : 0;

      const orderAnalytics = productOrderMetrics.get(prod.id) || {
        order_count: 0,
        units_sold: prod.total_sales || 0,
        revenue: (prod.total_sales || 0) * currentPrice,
        order_history: [],
      };

      return {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        sku: prod.sku || `SKU-${prod.id}`,
        status: prod.status,
        description: prod.short_description || prod.description,
        categories: prod.categories ? prod.categories.map((c) => c.name) : [],
        stock_status: prod.stock_status,
        stock_quantity: prod.stock_quantity,
        pricing: {
          regular_price: regularPrice,
          sale_price: salePrice,
          current_price: currentPrice,
          discount_percentage: discountPercentage,
        },
        analytics: {
          lifetime_units_sold: prod.total_sales || 0,
          orders_count: orderAnalytics.order_count,
          units_sold_in_orders: orderAnalytics.units_sold,
          total_revenue: orderAnalytics.revenue,
          order_history: orderAnalytics.order_history,
        },
        date_created: prod.date_created,
        date_modified: prod.date_modified,
      };
    });

    return {
      store_url: process.env.WOOCOMMERCE_URL,
      total_products: productsResult.total,
      total_orders_analyzed: ordersResult.total,
      products: enrichedProducts,
    };
  }

  /**
   * Helper to create a single product (used for testing and seeding sample store items)
   */
  async createProduct(productData) {
    const response = await woocommerce.post('products', productData);
    return response.data;
  }
}

module.exports = new WooCommerceService();
