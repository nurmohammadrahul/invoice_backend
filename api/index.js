import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from '../routes/auth.js';
import billingRoutes from '../routes/billing.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://invoice-saiful.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Invoice Management API is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Debug routes
app.get('/api/debug/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API is working',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug/admin-check', async (req, res) => {
  try {
    const { default: User } = await import('../models/User.js');
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      return res.json({
        exists: false,
        message: 'No admin user found'
      });
    }

    res.json({
      exists: true,
      admin: {
        email: admin.email,
        role: admin.role,
        companyName: admin.companyName,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);

// MongoDB connection
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
    
    // Initialize admin user if it doesn't exist
    await initializeAdmin();
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  }
};

// Admin initialization
const initializeAdmin = async () => {
  try {
    const { default: User } = await import('../models/User.js');
    
    console.log('🔄 Checking for existing admin...');
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('👤 Admin Email:', existingAdmin.email);
      return;
    }

    console.log('📝 Creating initial admin user...');
    
    const admin = new User({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      companyName: 'VQS',
      address: '256, Old Police Quarter, Shahid Shahidullah Kayser Sarak',
      city: 'Feni City, Feni-3900, Bangladesh',
      phone: '01842956166'
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    
  } catch (error) {
    console.log('❌ Error creating admin:', error.message);
  }
};

// Connect to database
connectDB();

// Export for Vercel
export default app;