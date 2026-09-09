const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', claimController.getClaims);
router.get('/item/:itemId', claimController.getItemClaims);
router.put('/:id/review', claimController.reviewClaim);

module.exports = router;
