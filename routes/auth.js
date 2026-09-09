const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// User routes (require authentication)
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);

// Notification routes
router.get('/notifications', protect, authController.getNotifications);
router.put('/notifications/:id/read', protect, authController.markNotificationRead);
router.put('/notifications/read-all', protect, authController.markAllNotificationsRead);

module.exports = router;