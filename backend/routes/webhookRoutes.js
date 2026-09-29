// const express = require('express');
// const { receiveLeadWebhook } = require('../controllers/webhookController');

// const router = express.Router();

// router.post('/leads/:brokerageSlug', receiveLeadWebhook);

// module.exports = router;
const express = require('express');
const { receiveLeadWebhook } = require('../controllers/webhookController');

const router = express.Router();

router.post('/leads/:brokerageSlug', receiveLeadWebhook);

module.exports = router;
