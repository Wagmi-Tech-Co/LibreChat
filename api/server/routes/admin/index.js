const express = require('express');
const { SystemRoles } = require('librechat-data-provider');
const { requireJwtAuth, checkBan } = require('~/server/middleware');
const { getAllUsers } = require('~/models');
const invites = require('./invites');
const { logger } = require('~/config');

const router = express.Router();

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== SystemRoles.ADMIN) {
    return res.status(403).json({
      message: 'Admin access required',
    });
  }
  next();
};

/**
 * GET /api/admin/users
 * Get all users for sharing purposes (admin only)
 */
router.get('/users', requireJwtAuth, requireAdmin, checkBan, async (req, res) => {
  try {
    // Only get active users for sharing
    const users = await getAllUsers({ status: { $ne: 'suspended' } });

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error('[GET /admin/users] Error:', error);
    return res.status(500).json({
      message: 'Failed to fetch users',
      success: false,
    });
  }
});

router.use('/invites', invites);

module.exports = router;
