const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.post('/', protect, upload.array('images', 5), itemController.createItem);
router.get('/my', protect, itemController.getMyItems);
router.get('/', itemController.getItems);
router.get('/:id/matches', itemController.getMatches);
router.get('/:id', itemController.getItem);
router.put('/:id', protect, upload.array('images', 5), itemController.updateItem);
router.delete('/:id', protect, itemController.deleteItem);
router.post('/:id/claim', protect, itemController.claimItem);
router.post('/:id/resolve', protect, itemController.resolveItem);

module.exports = router;
