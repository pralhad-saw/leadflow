const express = require('express');
const { login, me, changePassword, logoutAll } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login', loginLimiter, login);
router.get('/me', protect, me);
router.post('/change-password', protect, changePassword);
router.post('/logout-all', protect, logoutAll);

module.exports = router;
