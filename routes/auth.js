import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Initialize admin user in database
const initializeAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    // Check if environment variables are set
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.log('⚠️  Admin credentials not set in environment variables, using defaults');
    }
    
    console.log('🔄 Checking/creating admin user...');
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const adminUser = await User.create({
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        companyName: process.env.COMPANY_NAME,
        address: process.env.COMPANY_ADDRESS,
        city: process.env.COMPANY_CITY,
        phone: process.env.COMPANY_PHONE
      });
      console.log('✅ Admin user created in database:', adminUser.email);
    } else {
      console.log('✅ Admin user already exists in database:', existingAdmin.email);
      
      // Update admin password if it's the default and environment variable is set
      if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD !== 'admin123') {
        const isCurrentPassword = await existingAdmin.correctPassword('admin123');
        if (isCurrentPassword) {
          existingAdmin.password = process.env.ADMIN_PASSWORD;
          await existingAdmin.save();
          console.log('✅ Admin password updated from environment variable');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error initializing admin user:', error.message);
    
    // More detailed error logging
    if (error.errors) {
      Object.keys(error.errors).forEach(field => {
        console.error(`   - ${field}: ${error.errors[field].message}`);
      });
    }
  }
};

// Initialize admin on startup with delay to ensure DB connection
setTimeout(() => {
  initializeAdmin();
}, 2000);

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
      process.env.JWT_SECRET || 'invoice-system-super-secret-key-2024'
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

// Update admin profile
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'invoice-system-super-secret-key-2024'
    );

    // Update user in database
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { 
        companyName: req.body.companyName,
        address: req.body.address,
        city: req.body.city,
        phone: req.body.phone
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
    console.error('❌ Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current admin profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'invoice-system-super-secret-key-2024'
    );

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Change admin password
router.put('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'invoice-system-super-secret-key-2024'
    );

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Find user and verify current password
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentPasswordCorrect = await user.correctPassword(currentPassword);
    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('❌ Password change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

export default router;