const express = require('express');
const promoController = require('../controllers/promoController');
const { requireStaff, asyncHandler } = require('../middleware/auth');

const router = express.Router();

router.post('/check', asyncHandler(promoController.check));
router.get('/list', requireStaff, asyncHandler(promoController.list));
router.post('/create', requireStaff, asyncHandler(promoController.create));
router.post('/toggle', requireStaff, asyncHandler(promoController.toggle));

module.exports = router;
