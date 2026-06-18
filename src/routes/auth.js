const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth, asyncHandler } = require('../middleware/auth');

const router = express.Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.post('/address', requireAuth, asyncHandler(authController.saveAddress));

module.exports = router;
