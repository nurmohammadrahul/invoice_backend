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
    console.log('📧 Admin email:', adminEmail);
    
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
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN}
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

// Create admin endpoint (manual creation if needed)
router.post('/create-admin', async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    // Check if admin already exists
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

    // Create admin user
    const adminUser = await User.create({
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

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided' 
      });
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET
    );

    // Find user in database
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
    console.error('❌ Token verification error:', error);
    res.status(401).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
});

export default router;