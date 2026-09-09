const express = require('express');
const router = express.Router();
const violationController = require('../controllers/violationController');
const { protect } = require('../middleware/auth');

router.post('/', protect, violationController.reportViolation);
router.get('/my-reports', protect, violationController.getMyReports);
router.get('/against-me', protect, violationController.getViolationsAgainstMe);

module.exports = router;
