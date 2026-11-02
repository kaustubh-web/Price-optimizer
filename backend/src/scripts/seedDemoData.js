const dotenv = require('dotenv');
dotenv.config();

const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');

/**
 * Fills PostgreSQL with a demo catalog and ~5 months of order history, for running
 * the app without a WooCommerce store. Replaces ALL store data (products, price
 * history, orders, order items, recommendations).
 *
 *   npm run seed:demo          dry run: prints what would be written
 *   npm run seed:demo -- --yes replaces the data
 *
 * Demand follows each product's price elasticity, so price cuts on price-sensitive
 * products visibly lift sales and the ML service has real signal to fit.
 */

const HISTORY_DAYS = 150;
const SHIPPING = 49;
const DAY = 86400000;

// `prices` is [daysAgo the price started, price], oldest first; the last entry is today's price.
const catalog = [
  {
    wooCommerceId: 13,
    name: 'Handcrafted Kashmiri Pashmina Shawl',
    description: 'Authentic 100% Cashmere wool shawl from the Kashmir valley.',
    categories: ['Ethnic Wear', 'Handicrafts'],
    regularPrice: 4999,
    stockQuantity: 45,
    prices: [[150, 4999], [60, 4499], [25, 3999]],
    unitsPerDay: 0.5,
    elasticity: -2.2,
  },
  {
    wooCommerceId: 14,
    name: 'Organic Darjeeling First Flush Green Tea (250g)',
    description: 'Pure high-grown Darjeeling organic spring harvest green tea.',
    categories: ['Gourmet Foods', 'Beverages'],
    regularPrice: 899,
    stockQuantity: 120,
    prices: [[150, 899], [40, 749]],
    unitsPerDay: 1.6,
    elasticity: -0.8,
  },
  {
    wooCommerceId: 15,
    name: 'Brass Dhokra Tribal Art Table Lamp',
    description: 'Handmade bell-metal lamp reflecting centuries-old Indian metallurgical art.',
    categories: ['Home Decor', 'Handicrafts'],
    regularPrice: 2499,
    stockQuantity: 25,
    prices: [[150, 2299], [90, 2699], [35, 2499]],
    unitsPerDay: 0.3,
    elasticity: -1.5,
  },
  {
    wooCommerceId: 16,
    name: 'Wireless Bluetooth Neckband Pro with ENC',
    description: 'Fast-charging bass-boosted wireless neckband earphones.',
    categories: ['Consumer Electronics', 'Audio'],
    regularPrice: 1999,
    stockQuantity: 200,
    prices: [[150, 1999], [70, 1499], [12, 1299]],
    unitsPerDay: 0.9,
    elasticity: -2.4,
  },
  {
    wooCommerceId: 17,
    name: 'Cold Pressed Virgin Coconut Oil (1 Litre)',
    description: 'Kerala artisanal raw cold-pressed edible coconut oil.',
    categories: ['Gourmet Foods', 'Wellness'],
    regularPrice: 650,
    stockQuantity: 80,
    prices: [[150, 599], [80, 699], [30, 650]],
    unitsPerDay: 0.7,
    elasticity: -1.0,
  },
];

const places = [
  ['Bengaluru', 'KA'], ['Mumbai', 'MH'], ['Pune', 'MH'], ['New Delhi', 'DL'], ['Chennai', 'TN'],
  ['Hyderabad', 'TS'], ['Kolkata', 'WB'], ['Jaipur', 'RJ'], ['Kochi', 'KL'], ['Ahmedabad', 'GJ'],
  ['Lucknow', 'UP'], ['Chandigarh', 'CH'],
];

// Mostly completed, with the cancellations and refunds a real store sees.
const statuses = [
  'completed', 'completed', 'completed', 'completed', 'completed', 'completed',
  'completed', 'processing', 'cancelled', 'refunded',
];

// Seeded PRNG so every run produces the same dataset (relative to today).
let rngState = 20261102;
function random() {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
const pick = (items) => items[Math.floor(random() * items.length)];

const priceOn = (product, daysAgo) => product.prices.filter(([since]) => since >= daysAgo).at(-1)[1];

function buildDataset(now) {
  const products = catalog.map((p) => {
    const currentPrice = p.prices.at(-1)[1];
    return {
      row: {
        id: randomUUID(),
        wooCommerceId: p.wooCommerceId,
        name: p.name,
        slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sku: `SKU-${p.wooCommerceId}`,
        status: 'publish',
        description: p.description,
        categories: p.categories,
        regularPrice: p.regularPrice,
        salePrice: currentPrice < p.regularPrice ? currentPrice : null,
        currentPrice,
        stockStatus: 'instock',
        stockQuantity: p.stockQuantity,
      },
      spec: p,
    };
  });

  const priceHistory = products.flatMap(({ row, spec }) =>
    spec.prices.map(([daysAgo, price]) => ({
      id: randomUUID(),
      productId: row.id,
      regularPrice: spec.regularPrice,
      salePrice: price < spec.regularPrice ? price : null,
      effectivePrice: price,
      changedAt: new Date(now - daysAgo * DAY),
      source: 'demo',
    })),
  );

  const orders = [];
  const orderItems = [];
  let orderNumber = 1001;

  for (let daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
    let previousOrderToday = null;

    for (const { row, spec } of products) {
      const price = priceOn(spec, daysAgo);
      const expectedUnits = spec.unitsPerDay * (price / spec.prices[0][1]) ** spec.elasticity;

      // Bernoulli draws per expected unit: an integer number of lines with the right mean.
      let lines = 0;
      for (let remaining = expectedUnits; remaining > 0; remaining -= 1) {
        if (random() < Math.min(1, remaining)) lines++;
      }

      for (let i = 0; i < lines; i++) {
        const quantity = random() < 0.78 ? 1 : random() < 0.7 ? 2 : 3;
        const item = {
          id: randomUUID(),
          productId: row.id,
          wooCommerceProductId: row.wooCommerceId,
          quantity,
          priceAtPurchase: price,
          total: price * quantity,
        };

        // Some baskets contain more than one product.
        const joinBasket =
          previousOrderToday && random() < 0.15 && !previousOrderToday.lines.some((l) => l.productId === row.id);
        if (joinBasket) {
          item.orderId = previousOrderToday.order.id;
          previousOrderToday.lines.push(item);
          previousOrderToday.order.totalAmount += item.total;
          orderItems.push(item);
          continue;
        }

        const [city, state] = pick(places);
        const order = {
          id: randomUUID(),
          wooCommerceId: orderNumber++,
          // Very recent orders are often still being fulfilled.
          status: daysAgo < 3 && random() < 0.5 ? 'processing' : pick(statuses),
          currency: 'INR',
          totalAmount: item.total + SHIPPING,
          customerCity: city,
          customerState: state,
          orderDate: new Date(now - daysAgo * DAY - Math.floor(random() * 14 * 3600000)),
        };
        item.orderId = order.id;
        orders.push(order);
        orderItems.push(item);
        previousOrderToday = { order, lines: [item] };
      }
    }
  }

  return { products: products.map((p) => p.row), priceHistory, orders, orderItems };
}

async function seed() {
  const write = process.argv.includes('--yes');
  const data = buildDataset(Date.now());

  const existing = {
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    priceHistory: await prisma.priceHistory.count(),
    recommendations: await prisma.recommendation.count(),
  };

  console.log('🗑️  Will delete:', existing);
  console.log('🌱 Will insert:', {
    products: data.products.length,
    priceHistory: data.priceHistory.length,
    orders: data.orders.length,
    orderItems: data.orderItems.length,
  });

  if (!write) {
    console.log('\nDry run, nothing written. Re-run with --yes to replace the data:');
    console.log('  npm run seed:demo -- --yes');
    process.exit(0);
  }

  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.priceHistory.deleteMany(),
    prisma.recommendation.deleteMany(),
    prisma.product.deleteMany(),
    prisma.product.createMany({ data: data.products }),
    prisma.priceHistory.createMany({ data: data.priceHistory }),
    prisma.order.createMany({ data: data.orders }),
    prisma.orderItem.createMany({ data: data.orderItems }),
  ]);

  console.log('\n🎉 Demo data written. Open the dashboard and run a pricing analysis on any product.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Demo seed failed, nothing was changed:', err.message);
  process.exit(1);
});
