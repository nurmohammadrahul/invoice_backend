import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ==================== DEBUG ROUTES ====================

app.get('/api/debug/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API is working',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

app.get('/api/debug/models', (req, res) => {
  const models = mongoose.modelNames();
  res.json({
    availableModels: models,
    userModelExists: models.includes('User'),
    invoiceModelExists: models.includes('Invoice')
  });
});

// ==================== MAIN ROUTES ====================

app.get('/', (req, res) => {
  res.json({ 
    message: 'Invoice Management API is running!',
    project: 'VQS Invoice System',
    database: 'MongoDB Atlas',
    status: 'Connected',
    timestamp: new Date().toISOString()
  });
});

// ==================== DATABASE CONNECTION ====================

const connectDB = async () => {
  try {
    console.log('🔗 Attempting to connect to MongoDB...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully!');
    console.log('📊 Database:', mongoose.connection.name);
    
    // Import routes AFTER database connection is established
    const authRoutes = await import('./routes/auth.js');
    const billingRoutes = await import('./routes/billing.js');
    
    app.use('/api/auth', authRoutes.default);
    app.use('/api/billing', billingRoutes.default);
    
    console.log('✅ Routes loaded successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

connectDB();

// ==================== SERVER START ====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`🔧 Health check: http://localhost:${PORT}/api/debug/health`);
  console.log(`🔧 Models check: http://localhost:${PORT}/api/debug/models`);
});

export default app;