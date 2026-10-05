const express = require('express');
const cors = require('cors');
const storeRoutes = require('./routes/storeRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'price-optimizer-backend',
    health: '/api/health',
    store: '/api/store',
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'price-optimizer-backend',
    timestamp: new Date().toISOString(),
  });
});


app.use('/api/store', storeRoutes);


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
