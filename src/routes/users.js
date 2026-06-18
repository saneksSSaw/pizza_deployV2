const express = require('express');
const userController = require('../controllers/userController');
const { optionalAuth, asyncHandler } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', optionalAuth, asyncHandler(userController.getProfile));
router.get('/balance', asyncHandler(userController.getBalance));

module.exports = router;
