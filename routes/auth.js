import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Initialize admin user in database
const initializeAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    console.log('🔄 Checking/creating admin user...');
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      console.log('📝 Creating new admin user...');
      const adminUser = await User.create({
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        companyName: process.env.COMPANY_NAME,
        address: process.env.COMPANY_ADDRESS,
        city: process.env.COMPANY_CITY,
        phone: process.env.COMPANY_PHONE
      });
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error initializing admin user:', error.message);
  }
};

// Initialize admin
initializeAdmin();

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Create admin endpoint (GET - for browser)
router.get('/setup', async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    console.log('🔄 Setting up admin user...');
    
    // Check if admin exists
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (adminUser) {
      return res.json({
        success: true,
        message: '✅ Admin user already exists!',
        user: {
          email: adminUser.email,
          role: adminUser.role
        },
        login: {
          email: adminEmail,
          password: adminPassword
        }
      });
    }

    // Create admin
    adminUser = await User.create({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      companyName: process.env.COMPANY_NAME,
      address: process.env.COMPANY_ADDRESS,
      city: process.env.COMPANY_CITY,
      phone: process.env.COMPANY_PHONE
    });

    res.json({
      success: true,
      message: '✅ Admin user created successfully!',
      user: {
        email: adminUser.email,
        role: adminUser.role
      },
      login: {
        email: adminEmail,
        password: adminPassword
      }
    });
    
  } catch (error) {
    console.error('❌ Setup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      help: 'Check MongoDB connection and environment variables'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`🔐 Login attempt for: ${email}`);

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    // Check password
    const isPasswordCorrect = await user.correctPassword(password);
    if (!isPasswordCorrect) {
      console.log('❌ Invalid password');
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    // Create token
    const token = jwt.sign(
      { 
        id: user._id.toString(), 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('✅ Login successful');

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        address: user.address,
        city: user.city,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        address: user.address,
        city: user.city,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(401).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
});

export default router;