require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('./config/db'); // Initialize DB

// Import Routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const messageRoutes = require('./routes/message.routes');

const app = express();

// Middleware
// Allow dynamic environments (like when Vite shifts to port 5174 automatically)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/messages', messageRoutes);

// Basic health check route
app.get('/', (req, res) => {
  res.send('Welcome to Campus Kart API');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error, please try again later.' });
});

module.exports = app;
