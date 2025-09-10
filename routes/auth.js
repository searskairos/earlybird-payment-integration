const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET || 'fallback_secret_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      await user.updateLastLogin();
      
      const token = generateToken(user);
      
      logger.info('User authenticated successfully', {
        userId: user._id,
        email: user.email,
        loginTime: new Date()
      });

      // For demo/testing purposes - uncomment to return JSON instead of redirect
      res.json({
        message: 'Authentication successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          picture: user.picture,
          role: user.role
        },
        token,
        expires_in: process.env.JWT_EXPIRES_IN || '24h'
      });

        // Real application: redirect to frontend with token
        //   const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        //   const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        //     id: user._id,
        //     name: user.name,
        //     email: user.email,
        //     picture: user.picture,
        //     role: user.role
        //   }))}`;      
        //   res.redirect(redirectUrl);

    } catch (error) {
      logger.error('Authentication callback error:', error);
      res.status(500).json({
        error: 'Authentication failed',
        message: 'Unable to complete authentication'
      });
    }
  }
);

// Logout endpoint
router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // We can optionally log the logout event
  if (req.user) {
    logger.info('User logged out', {
      userId: req.user._id,
      email: req.user.email,
      logoutTime: new Date()
    });
  }
  
  res.json({ message: 'Logged out successfully' });
});

// Get current user profile
router.get('/profile', 
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture,
        role: req.user.role,
        last_login: req.user.last_login,
        created_at: req.user.createdAt
      }
    });
  }
);

// Refresh token endpoint
router.post('/refresh',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    try {
      const newToken = generateToken(req.user);
      
      res.json({
        message: 'Token refreshed successfully',
        token: newToken,
        expires_in: process.env.JWT_EXPIRES_IN || '24h'
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Token refresh failed',
        message: 'Unable to refresh token'
      });
    }
  }
);

// Authentication status check
router.get('/status', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    res.json({ 
      authenticated: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      },
      expires_at: new Date(decoded.exp * 1000)
    });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

module.exports = router;
