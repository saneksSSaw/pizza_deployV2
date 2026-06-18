const express = require('express');
const orderController = require('../controllers/orderController');
const { optionalAuth, requireStaff, asyncHandler } = require('../middleware/auth');

const router = express.Router();

router.post('/order', optionalAuth, asyncHandler(orderController.create));
router.post('/test-order', asyncHandler(orderController.testOrder));
router.get('/orders/all', requireStaff, asyncHandler(orderController.getAll));
router.post('/orders/:id/status', requireStaff, asyncHandler(orderController.updateStatus));
router.get('/orders/:id/status-check', asyncHandler(orderController.statusCheck));

module.exports = router;
