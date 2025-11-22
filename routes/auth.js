import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Initialize admin user in database
const initializeAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@invoice.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    console.log('🔄 Checking/creating admin user...');
    console.log('📧 Admin email:', adminEmail);
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      console.log('📝 Creating new admin user...');
      const adminUser = await User.create({
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        companyName: process.env.COMPANY_NAME || 'Your Company',
        address: process.env.COMPANY_ADDRESS || '123 Business Street',
        city: process.env.COMPANY_CITY || 'City, State 12345',
        phone: process.env.COMPANY_PHONE || '+1 (555) 123-4567'
      });
      console.log('✅ Admin user created successfully:', adminUser.email);
    } else {
      console.log('✅ Admin user already exists:', existingAdmin.email);
    }
  } catch (error) {
    console.error('❌ Error initializing admin user:', error.message);
    console.error('🔧 Error details:', error);
  }
};

// Initialize admin on startup
setTimeout(() => {
  initializeAdmin();
}, 5000);

// GET endpoint to create admin (for browser access)
router.get('/create-admin', async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@invoice.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    console.log('🔄 Manual admin creation triggered');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'Admin user already exists',
        user: {
          email: existingAdmin.email,
          role: existingAdmin.role,
          companyName: existingAdmin.companyName
        }
      });
    }

    // Create admin user
    const adminUser = await User.create({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      companyName: process.env.COMPANY_NAME || 'Your Company',
      address: process.env.COMPANY_ADDRESS || '123 Business Street',
      city: process.env.COMPANY_CITY || 'City, State 12345',
      phone: process.env.COMPANY_PHONE || '+1 (555) 123-4567'
    });

    console.log('✅ Admin user created manually:', adminUser.email);

    res.json({
      success: true,
      message: 'Admin user created successfully!',
      user: {
        email: adminUser.email,
        role: adminUser.role,
        companyName: adminUser.companyName
      },
      credentials: {
        email: adminEmail,
        password: adminPassword
      }
    });
  } catch (error) {
    console.error('❌ Create admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Check MongoDB connection and environment variables'
    });
  }
});

// POST endpoint for create-admin (for programmatic access)
router.post('/create-admin', async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@invoice.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    console.log('🔄 POST: Manual admin creation triggered');
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'Admin user already exists',
        user: {
          email: existingAdmin.email,
          role: existingAdmin.role
        }
      });
    }

    const adminUser = await User.create({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      companyName: process.env.COMPANY_NAME || 'Your Company',
      address: process.env.COMPANY_ADDRESS || '123 Business Street',
      city: process.env.COMPANY_CITY || 'City, State 12345',
      phone: process.env.COMPANY_PHONE || '+1 (555) 123-4567'
    });

    console.log('✅ Admin user created via POST:', adminUser.email);

    res.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        email: adminUser.email,
        role: adminUser.role
      }
    });
  } catch (error) {
    console.error('❌ Create admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`🔐 Login attempt for: ${email}`);

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Find user in database
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    // Check password
    const isPasswordCorrect = await user.correctPassword(password);
    if (!isPasswordCorrect) {
      console.log('❌ Invalid password for user:', email);
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
      process.env.JWT_SECRET || 'invoice-system-super-secret-key-2024',
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    console.log('✅ Login successful for:', email);

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

// Check admin status
router.get('/check-admin', async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@invoice.com';
    const adminUser = await User.findOne({ email: adminEmail });
    
    if (adminUser) {
      res.json({
        success: true,
        exists: true,
        user: {
          email: adminUser.email,
          role: adminUser.role,
          companyName: adminUser.companyName
        }
      });
    } else {
      res.json({
        success: true,
        exists: false,
        message: 'Admin user not found. Use /create-admin to create one.'
      });
    }
  } catch (error) {
    console.error('❌ Check admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;