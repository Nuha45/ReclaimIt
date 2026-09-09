const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/stats', adminController.getDashboard);
router.get('/items', adminController.getAllItems);
router.delete('/items/:id', adminController.deleteItem);
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/ban', adminController.banUser);
router.put('/users/:id/unban', adminController.unbanUser);
router.put('/users/:id/promote', adminController.promoteToAdmin);
router.get('/violations', adminController.getAllViolations);
router.put('/violations/:id/review', adminController.reviewViolation);
router.get('/reports', adminController.generateReport);

module.exports = router;
