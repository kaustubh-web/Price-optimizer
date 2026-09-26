const prisma = require('../config/prisma');
const woocommerceService = require('./woocommerceService');

class SyncService {
    /**
     * Syncs products and completed orders from WooCommerce into PostgreSQL
     */
    async syncStoreData() {
        console.log('🔄 Starting full sync from WooCommerce to PostgreSQL...');

        // 1. Fetch fresh store data using our existing woocommerceService
        const storeData = await woocommerceService.getProductsWithOrderAnalytics({ per_page: 100 });
        const { products } = storeData;

        let syncedProducts = 0;
        let priceHistoryEntries = 0;

        // 2. Upsert each product and track price changes
        for (const prod of products) {
            const wooId = prod.id;
            const currentPrice = prod.pricing.current_price;
            const regularPrice = prod.pricing.regular_price;
            const salePrice = prod.pricing.sale_price;

            // Check if product already exists in Postgres
            const existingProduct = await prisma.product.findUnique({
                where: { wooCommerceId: wooId },
                include: {
                    priceHistory: {
                        orderBy: { changedAt: 'desc' },
                        take: 1,
                    },
                },
            });

            // Upsert product
            const savedProduct = await prisma.product.upsert({
                where: { wooCommerceId: wooId },
                update: {
                    name: prod.name,
                    slug: prod.slug,
                    sku: prod.sku,
                    status: prod.status,
                    description: prod.description,
                    categories: prod.categories,
                    regularPrice,
                    salePrice,
                    currentPrice,
                    stockStatus: prod.stock_status,
                    stockQuantity: prod.stock_quantity,
                },
                create: {
                    wooCommerceId: wooId,
                    name: prod.name,
                    slug: prod.slug,
                    sku: prod.sku,
                    status: prod.status,
                    description: prod.description,
                    categories: prod.categories,
                    regularPrice,
                    salePrice,
                    currentPrice,
                    stockStatus: prod.stock_status,
                    stockQuantity: prod.stock_quantity,
                },
            });

            syncedProducts++;

            // Check if price history needs to be recorded:
            // If new product OR latest recorded effective price != current price
            const latestHistory = existingProduct?.priceHistory?.[0];
            const hasPriceChanged = !latestHistory || latestHistory.effectivePrice !== currentPrice;

            if (hasPriceChanged) {
                await prisma.priceHistory.create({
                    data: {
                        productId: savedProduct.id,
                        regularPrice,
                        salePrice,
                        effectivePrice: currentPrice,
                        source: 'sync',
                    },
                });
                priceHistoryEntries++;
            }
        }

        // 3. Fetch and sync orders
        const ordersResult = await woocommerceService.getOrders({ per_page: 100 });
        let syncedOrders = 0;

        for (const order of ordersResult.data) {
            const orderDate = new Date(order.date_created || Date.now());

            const savedOrder = await prisma.order.upsert({
                where: { wooCommerceId: order.id },
                update: {
                    status: order.status,
                    currency: order.currency,
                    totalAmount: parseFloat(order.total || 0),
                    customerCity: order.billing?.city || null,
                    customerState: order.billing?.state || null,
                    orderDate,
                },
                create: {
                    wooCommerceId: order.id,
                    status: order.status,
                    currency: order.currency,
                    totalAmount: parseFloat(order.total || 0),
                    customerCity: order.billing?.city || null,
                    customerState: order.billing?.state || null,
                    orderDate,
                },
            });

            syncedOrders++;

            // Upsert order line items
            if (Array.isArray(order.line_items)) {
                for (const item of order.line_items) {
                    const matchingProduct = await prisma.product.findUnique({
                        where: { wooCommerceId: item.product_id },
                    });

                    // Check if item already exists for this order
                    const existingItem = await prisma.orderItem.findFirst({
                        where: {
                            orderId: savedOrder.id,
                            wooCommerceProductId: item.product_id,
                        },
                    });

                    if (!existingItem) {
                        await prisma.orderItem.create({
                            data: {
                                orderId: savedOrder.id,
                                productId: matchingProduct ? matchingProduct.id : null,
                                wooCommerceProductId: item.product_id,
                                quantity: item.quantity || 1,
                                priceAtPurchase: parseFloat(item.price || item.total || 0) / (item.quantity || 1),
                                total: parseFloat(item.total || 0),
                            },
                        });
                    }
                }
            }
        }

        console.log(`✅ Sync complete: ${syncedProducts} products, ${syncedOrders} orders, ${priceHistoryEntries} price snapshots.`);

        return {
            success: true,
            synced_products: syncedProducts,
            synced_orders: syncedOrders,
            price_history_recorded: priceHistoryEntries,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Fetch all synced products from local PostgreSQL database
     */
    async getDbProducts() {
        return prisma.product.findMany({
            include: {
                priceHistory: {
                    orderBy: { changedAt: 'desc' },
                },
                orderItems: true,
                recommendations: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
}

module.exports = new SyncService();
