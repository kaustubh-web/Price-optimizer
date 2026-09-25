const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Price Optimizer Backend running on port ${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🛍️ Store Products: http://localhost:${PORT}/api/store/products`);
  console.log(`🔗 Store Connection Test: http://localhost:${PORT}/api/store/connection-test`);
  console.log(`===============================================`);
});
