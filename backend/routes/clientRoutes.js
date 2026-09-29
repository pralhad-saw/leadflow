const express = require('express');
const { getMyApplication } = require('../controllers/clientController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(protect, requireRole('client'));
router.get('/application', getMyApplication);

module.exports = router;
