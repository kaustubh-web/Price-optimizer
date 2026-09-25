const dotenv = require('dotenv');
dotenv.config();

const woocommerce = require('../config/woocommerce');

const sampleProducts = [
  {
    name: 'Handcrafted Kashmiri Pashmina Shawl',
    type: 'simple',
    regular_price: '4999',
    sale_price: '3999',
    description: 'Pure handwoven Kashmiri Cashmere Pashmina shawl with exquisite Sozni needle embroidery.',
    short_description: 'Authentic 100% Cashmere wool shawl from the Kashmir valley.',
    categories: [{ name: 'Ethnic Wear' }, { name: 'Handicrafts' }],
    manage_stock: true,
    stock_quantity: 45,
  },
  {
    name: 'Organic Darjeeling First Flush Green Tea (250g)',
    type: 'simple',
    regular_price: '899',
    sale_price: '749',
    description: 'Single-estate loose leaf Darjeeling green tea rich in antioxidants and delicate muscatel aroma.',
    short_description: 'Pure high-grown Darjeeling organic spring harvest green tea.',
    categories: [{ name: 'Gourmet Foods' }, { name: 'Beverages' }],
    manage_stock: true,
    stock_quantity: 120,
  },
  {
    name: 'Brass Dhokra Tribal Art Table Lamp',
    type: 'simple',
    regular_price: '2499',
    description: 'Traditional bell metal lost-wax cast artifact handmade by tribal artisans in Bastar, Chhattisgarh.',
    short_description: 'Handmade bell-metal lamp reflecting centuries-old Indian metallurgical art.',
    categories: [{ name: 'Home Decor' }, { name: 'Handicrafts' }],
    manage_stock: true,
    stock_quantity: 25,
  },
  {
    name: 'Wireless Bluetooth Neckband Pro with ENC',
    type: 'simple',
    regular_price: '1999',
    sale_price: '1299',
    description: 'Ergonomic neckband headphones with environmental noise cancellation, 40hr playback, and fast charging.',
    short_description: 'Fast-charging bass-boosted wireless neckband earphones.',
    categories: [{ name: 'Consumer Electronics' }, { name: 'Audio' }],
    manage_stock: true,
    stock_quantity: 200,
  },
  {
    name: 'Cold Pressed Virgin Coconut Oil (1 Litre)',
    type: 'simple',
    regular_price: '650',
    description: '100% pure cold-pressed extra virgin coconut oil extracted from fresh Kerala coconuts without heat or chemicals.',
    short_description: 'Kerala artisanal raw cold-pressed edible coconut oil.',
    categories: [{ name: 'Gourmet Foods' }, { name: 'Wellness' }],
    manage_stock: true,
    stock_quantity: 80,
  },
];

async function seed() {
  console.log('🌱 Starting WooCommerce sample catalog seeder...');

  const createdProducts = [];

  for (const prod of sampleProducts) {
    try {
      console.log(`📦 Creating product: "${prod.name}"...`);
      const response = await woocommerce.post('products', prod);
      createdProducts.push(response.data);
      console.log(`   ✅ Created product #${response.data.id} (Price: ₹${response.data.price})`);
    } catch (err) {
      console.error(`   ❌ Failed to create "${prod.name}":`, err.response?.data?.message || err.message);
    }
  }

  // If products were created, create 2 realistic mock orders so order analytics are populated
  if (createdProducts.length >= 2) {
    console.log('\n🧾 Creating sample completed orders to simulate store sales history...');

    const sampleOrders = [
      {
        payment_method: 'bacs',
        payment_method_title: 'UPI / Direct Bank Transfer',
        set_paid: true,
        status: 'completed',
        billing: {
          first_name: 'Aarav',
          last_name: 'Sharma',
          city: 'Bengaluru',
          state: 'KA',
          country: 'IN',
          email: 'aarav.sharma@example.in',
        },
        line_items: [
          {
            product_id: createdProducts[0].id,
            quantity: 2,
          },
          {
            product_id: createdProducts[1].id,
            quantity: 1,
          },
        ],
      },
      {
        payment_method: 'cod',
        payment_method_title: 'Cash on Delivery',
        set_paid: true,
        status: 'completed',
        billing: {
          first_name: 'Priya',
          last_name: 'Patel',
          city: 'Mumbai',
          state: 'MH',
          country: 'IN',
          email: 'priya.patel@example.in',
        },
        line_items: [
          {
            product_id: createdProducts[3].id,
            quantity: 3,
          },
          {
            product_id: createdProducts[1].id,
            quantity: 2,
          },
        ],
      },
    ];

    for (const [index, order] of sampleOrders.entries()) {
      try {
        const orderRes = await woocommerce.post('orders', order);
        console.log(`   ✅ Created Order #${orderRes.data.id} from ${order.billing.city}, Total: ₹${orderRes.data.total}`);
      } catch (err) {
        console.error(`   ❌ Failed to create order ${index + 1}:`, err.response?.data?.message || err.message);
      }
    }
  }

  console.log('\n🎉 Seeding complete! You now have live products and orders in your store.');
  process.exit(0);
}

seed();
