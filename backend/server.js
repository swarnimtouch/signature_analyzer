import express from 'express';
import sequelize from './config/database.js';
import cors from 'cors';
import dotenv from 'dotenv';
import imageRoutes from './routes/imageRoutes.js';
import adminRoutes from './routes/adminRoutes.js'; 
import './models/SuccessRecord.js';
import './models/FailureRecord.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

// Image handling ke liye limit badhayi hai (50mb)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes Registration
app.use('/api/images', imageRoutes);
app.use('/api/admin', adminRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Food Nutrition AI Server is running!',
    timestamp: new Date().toISOString()
  });
});

// MySQL Connection & Sync
// force: false rakhna taaki data delete na ho restart par
sequelize.sync({ force: false }) 
  .then(() => {
    console.log('✅ Connected to MySQL & Tables Synced');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((error) => {
    console.error('❌ MySQL Connection Error:', error);
    process.exit(1);
  });

// Global Error Handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});