const express = require('express');
const staffController = require('../controllers/staffController');
const { requireStaff, requireOwner, asyncHandler } = require('../middleware/auth');

const router = express.Router();

router.get('/health', asyncHandler(staffController.health));
router.post('/staff/login', asyncHandler(staffController.login));
router.get('/staff/check', requireStaff, staffController.check);
router.get('/analytics', requireOwner, asyncHandler(staffController.analytics));

module.exports = router;
