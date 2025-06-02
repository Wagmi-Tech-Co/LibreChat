const express = require('express');
const inviteRoutes = require('./invites');

const router = express.Router();

// Mount invite routes
router.use('/', inviteRoutes);

module.exports = router;
