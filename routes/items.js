const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.post('/', protect, upload.array('images', 5), itemController.createItem);
router.get('/my', protect, itemController.getMyItems);
router.get('/', itemController.getItems);
router.post('/:id/photos', protect, upload.array('images', 5), itemController.addItemPhotos);
router.get('/:id/matches', itemController.getMatches);
router.get('/:id/qr', itemController.getItemQr);
router.get('/:id/flyer', itemController.getItemFlyer);
router.get('/:id', optionalAuth, itemController.getItem);
router.put('/:id', protect, upload.array('images', 5), itemController.updateItem);
router.delete('/:id', protect, itemController.deleteItem);
router.post('/:id/claim', protect, itemController.claimItem);
router.post('/:id/resolve', protect, itemController.resolveItem);

module.exports = router;
