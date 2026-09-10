const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/', protect, reviewController.createReview);
router.get('/pending', protect, reviewController.getMyPendingReviews);
router.get('/user/:userId', reviewController.getReviewsForUser);

module.exports = router;
