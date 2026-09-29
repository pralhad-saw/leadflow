const express = require('express');
const { listUsers, createUser, setUserStatus } = require('../controllers/userController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // everything below needs a valid session

router.get('/', requireRole('platform_admin', 'brokerage_admin', 'advisor'), listUsers);
router.post('/', requireRole('platform_admin', 'brokerage_admin'), createUser);
router.patch('/:id/status', requireRole('platform_admin', 'brokerage_admin'), setUserStatus);

module.exports = router;
