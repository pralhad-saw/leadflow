const express = require('express');
const { uploadDocument, listMyDocuments, listClientDocuments } = require('../controllers/documentController');
const { protect, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(protect);

router.post('/', requireRole('client'), upload.single('file'), uploadDocument);
router.get('/my', requireRole('client'), listMyDocuments);
router.get('/client/:clientId', requireRole('platform_admin', 'brokerage_admin', 'advisor'), listClientDocuments);

module.exports = router;
