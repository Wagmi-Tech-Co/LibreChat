const express = require('express');
const { SystemRoles } = require('librechat-data-provider');
const { createInvite } = require('~/models/inviteUser');
const { findUser, createUser, deleteUserById } = require('~/models/userMethods');
const { sendEmail, checkEmailConfig } = require('~/server/utils');
const { 
  requireJwtAuth, 
  checkBan,
  inviteLimiter 
} = require('~/server/middleware');
const { logger } = require('~/config');

const router = express.Router();

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== SystemRoles.ADMIN) {
    return res.status(403).json({ 
      message: 'Admin access required' 
    });
  }
  next();
};

/**
 * POST /api/admin/invite
 * Create an invitation for a new user (pre-register email)
 */
router.post('/invite', 
  requireJwtAuth, 
  requireAdmin,
  checkBan,
  inviteLimiter,
  async (req, res) => {
    try {
      const { email, name } = req.body;

      if (!email) {
        return res.status(400).json({ 
          message: 'Email is required' 
        });
      }

      // Check if email service is configured
      if (!checkEmailConfig()) {
        return res.status(500).json({ 
          message: 'Email service is not configured. Cannot send invitations.' 
        });
      }

      // Check if user already exists
      const existingUser = await findUser({ email }, 'email _id status');
      if (existingUser) {
        return res.status(409).json({ 
          message: 'User with this email already exists' 
        });
      }

      // Create invitation token (24-hour expiry)
      const token = await createInvite(email);
      
      if (token.message) {
        return res.status(500).json({ 
          message: 'Failed to create invitation' 
        });
      }

      // Create pending user record
      const userData = {
        email,
        name: name || email.split('@')[0],
        provider: 'local',
        role: SystemRoles.USER,
        status: 'pending',
        emailVerified: false,
      };

      await createUser(userData, false, false); // No TTL, no auto-verify

      // Send invitation email
      const inviteUrl = `${process.env.DOMAIN_CLIENT}/set-password?token=${token}&email=${encodeURIComponent(email)}`;
      
      const emailData = {
        to: email,
        subject: `You're invited to join ${process.env.APP_TITLE || 'LibreChat'}!`,
        template: 'inviteUser',
        context: {
          appName: process.env.APP_TITLE || 'LibreChat',
          userName: name || email.split('@')[0],
          inviteUrl,
          token, // Fallback token for manual entry
          supportEmail: process.env.EMAIL_FROM,
        },
      };

      await sendEmail(emailData);

      logger.info(`[Admin] Invitation sent to ${email} by ${req.user.email}`);

      res.status(201).json({ 
        message: 'Invitation sent successfully',
        email,
        inviteUrl: inviteUrl // For testing purposes
      });

    } catch (error) {
      logger.error('[Admin] Error creating invitation:', error);
      res.status(500).json({ 
        message: 'Failed to send invitation' 
      });
    }
  }
);

/**
 * GET /api/admin/invites/pending
 * Get list of pending invitations
 */
router.get('/invites/pending', 
  requireJwtAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const pendingUsers = await findUser(
        { status: 'pending' }, 
        'email name createdAt status',
        { sort: { createdAt: -1 } }
      );

      res.json({
        pendingUsers: Array.isArray(pendingUsers) ? pendingUsers : [pendingUsers].filter(Boolean)
      });

    } catch (error) {
      logger.error('[Admin] Error fetching pending invites:', error);
      res.status(500).json({ 
        message: 'Failed to fetch pending invitations' 
      });
    }
  }
);

/**
 * DELETE /api/admin/invite/:email
 * Cancel/revoke an invitation
 */
router.delete('/invite/:email',
  requireJwtAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { email } = req.params;

      // Find and delete the pending user
      const user = await findUser({ email, status: 'pending' });
      
      if (!user) {
        return res.status(404).json({ 
          message: 'Pending invitation not found' 
        });
      }

      // Delete the user record and associated tokens
      await deleteUserById(user._id);
      
      logger.info(`[Admin] Invitation cancelled for ${email} by ${req.user.email}`);

      res.json({ 
        message: 'Invitation cancelled successfully' 
      });

    } catch (error) {
      logger.error('[Admin] Error cancelling invitation:', error);
      res.status(500).json({ 
        message: 'Failed to cancel invitation' 
      });
    }
  }
);

module.exports = router;
