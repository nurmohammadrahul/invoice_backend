import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password'
      });
    }

    // Import User model
    const { default: User } = await import('../models/User.js');

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    console.log('✅ User found, checking password...');

    // Check password
    const isPasswordCorrect = await user.correctPassword(password);
    
    if (!isPasswordCorrect) {
      console.log('❌ Password incorrect');
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    console.log('✅ Login successful');

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'vqs-invoice-secret-2024',
      { expiresIn: '30d' }
    );

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });

  } catch (error) {
    console.log('❌ Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

export default router;