const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const dotenv = require('dotenv');

dotenv.config();

const {
  WOOCOMMERCE_URL,
  WOOCOMMERCE_CONSUMER_KEY,
  WOOCOMMERCE_CONSUMER_SECRET,
} = process.env;

if (!WOOCOMMERCE_URL || !WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
  console.warn(
    '⚠️ WooCommerce credentials are not fully set in .env. Ensure WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET are configured.'
  );
}

const woocommerce = new WooCommerceRestApi({
  url: WOOCOMMERCE_URL || '',
  consumerKey: WOOCOMMERCE_CONSUMER_KEY || '',
  consumerSecret: WOOCOMMERCE_CONSUMER_SECRET || '',
  version: 'wc/v3',
  queryStringAuth: true, 
});

module.exports = woocommerce;
