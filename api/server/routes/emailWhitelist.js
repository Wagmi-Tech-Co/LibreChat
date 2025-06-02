const express = require('express');
const { SystemRoles } = require('librechat-data-provider');
const { requireJwtAuth, checkBan } = require('~/server/middleware');
const { registerLimiter } = require('~/server/middleware/limiters');
const {
  requestEmailWhitelist,
  getEmailWhitelistRequests,
  reviewEmailWhitelistRequest,
  deleteEmailWhitelistRequest,
} = require('~/server/services/emailWhitelist');
const { logger } = require('~/config');

const router = express.Router();

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== SystemRoles.ADMIN) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/**
 * POST /api/auth/request-whitelist
 * Request email to be added to whitelist (public endpoint)
 */
router.post('/request-whitelist', 
  registerLimiter,
  async (req, res) => {
    try {
      const { email, reason } = req.body;

      if (!email) {
        return res.status(400).json({ 
          message: 'Email address is required' 
        });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: 'Please enter a valid email address' 
        });
      }

      const result = await requestEmailWhitelist(email, reason);
      
      if (result.success) {
        return res.status(200).json({
          message: result.message,
          success: true,
        });
      } else {
        return res.status(400).json({
          message: result.message,
          success: false,
        });
      }
    } catch (error) {
      logger.error('[POST /request-whitelist] Error:', error);
      return res.status(500).json({ 
        message: 'Internal server error',
        success: false,
      });
    }
  }
);

/**
 * GET /api/auth/whitelist-requests
 * Get all email whitelist requests (admin only)
 */
router.get('/whitelist-requests', 
  requireJwtAuth, 
  requireAdmin,
  checkBan,
  async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      const filters = {
        status,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100), // Cap at 100 items per page
      };

      const result = await getEmailWhitelistRequests(filters);
      
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('[GET /whitelist-requests] Error:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch whitelist requests',
        success: false,
      });
    }
  }
);

/**
 * PUT /api/auth/whitelist-requests/:requestId
 * Approve or reject email whitelist request (admin only)
 */
router.put('/whitelist-requests/:requestId', 
  requireJwtAuth, 
  requireAdmin,
  checkBan,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { action, notes, sendInvitation = true } = req.body;

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ 
          message: 'Invalid action. Must be approve or reject',
          success: false,
        });
      }

      const result = await reviewEmailWhitelistRequest(
        requestId, 
        action, 
        req.user._id, 
        notes,
        sendInvitation
      );
      
      if (result.success) {
        return res.status(200).json({
          message: result.message,
          success: true,
          data: result.data,
        });
      } else {
        return res.status(400).json({
          message: result.message,
          success: false,
        });
      }
    } catch (error) {
      logger.error('[PUT /whitelist-requests/:requestId] Error:', error);
      return res.status(500).json({ 
        message: 'Failed to review whitelist request',
        success: false,
      });
    }
  }
);

/**
 * DELETE /api/auth/whitelist-requests/:requestId
 * Delete email whitelist request (admin only)
 */
router.delete('/whitelist-requests/:requestId', 
  requireJwtAuth, 
  requireAdmin,
  checkBan,
  async (req, res) => {
    try {
      const { requestId } = req.params;

      const result = await deleteEmailWhitelistRequest(requestId);
      
      if (result.success) {
        return res.status(200).json({
          message: result.message,
          success: true,
        });
      } else {
        return res.status(404).json({
          message: result.message,
          success: false,
        });
      }
    } catch (error) {
      logger.error('[DELETE /whitelist-requests/:requestId] Error:', error);
      return res.status(500).json({ 
        message: 'Failed to delete whitelist request',
        success: false,
      });
    }
  }
);

module.exports = router;
