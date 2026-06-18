const express = require('express');
const menuController = require('../controllers/menuController');
const { asyncHandler } = require('../middleware/auth');

const router = express.Router();

router.get('/', asyncHandler(menuController.list));
router.get('/:slug', asyncHandler(menuController.getOne));

module.exports = router;
