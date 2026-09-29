const express = require('express');
const {
  listLeads,
  getLead,
  createLead,
  updateLead,
  updateStage,
  assignLead,
  deleteLead,
} = require('../controllers/leadController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', requireRole('platform_admin', 'brokerage_admin', 'advisor'), listLeads);
router.get('/:id', requireRole('platform_admin', 'brokerage_admin', 'advisor'), getLead);
router.post('/', requireRole('brokerage_admin', 'advisor'), createLead);
router.patch('/:id', requireRole('brokerage_admin', 'advisor'), updateLead);
router.patch('/:id/stage', requireRole('brokerage_admin', 'advisor'), updateStage);
router.patch('/:id/assign', requireRole('brokerage_admin'), assignLead);
router.delete('/:id', requireRole('brokerage_admin'), deleteLead);

module.exports = router;
