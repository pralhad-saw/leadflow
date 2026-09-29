const express = require('express');
const {
  listBrokerages,
  createBrokerage,
  getMyBrokerage,
  getWebhookSecret,
} = require('../controllers/brokerageController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/me', getMyBrokerage);
router.get('/', requireRole('platform_admin'), listBrokerages);
router.post('/', requireRole('platform_admin'), createBrokerage);
router.get('/:id/webhook-secret', requireRole('platform_admin', 'brokerage_admin'), getWebhookSecret);

module.exports = router;
