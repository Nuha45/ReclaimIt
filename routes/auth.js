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
router.get('/saved-items', protect, authController.getSavedItems);
router.post('/saved-items/toggle', protect, authController.toggleSavedItem);
router.get('/search-history', protect, authController.getSearchHistory);
router.post('/search-history', protect, authController.saveSearch);
router.post('/reviews', protect, authController.addReview);

// Notification routes
router.get('/notifications', protect, authController.getNotifications);
router.put('/notifications/:id/read', protect, authController.markNotificationRead);
router.put('/notifications/read-all', protect, authController.markAllNotificationsRead);

module.exports = router;