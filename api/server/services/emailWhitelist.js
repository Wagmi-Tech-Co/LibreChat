const EmailWhitelist = require('~/models/EmailWhitelist');
const { logger } = require('~/config');
const { sendEmail, checkEmailConfig } = require('~/server/utils');
const { createInvite } = require('~/models/inviteUser');

/**
 * Check if an email is whitelisted and approved
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function isEmailWhitelisted(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const whitelistEntry = await EmailWhitelist.findOne({ 
      email: normalizedEmail, 
      status: 'approved' 
    });
    
    return !!whitelistEntry;
  } catch (error) {
    logger.error('[isEmailWhitelisted] Error checking email whitelist:', error);
    return false;
  }
}

/**
 * Request email to be added to whitelist
 * @param {string} email
 * @param {string} reason - Optional reason for the request
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
async function requestEmailWhitelist(email, reason = '') {
  if (!email || typeof email !== 'string') {
    return { success: false, message: 'Invalid email address' };
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email already exists in whitelist
    const existingEntry = await EmailWhitelist.findOne({ email: normalizedEmail });
    
    if (existingEntry) {
      if (existingEntry.status === 'approved') {
        return { success: false, message: 'Email is already approved for registration' };
      } else if (existingEntry.status === 'pending') {
        return { success: false, message: 'Email request is already pending approval' };
      } else if (existingEntry.status === 'rejected') {
        // Allow re-requesting rejected emails
        existingEntry.status = 'pending';
        existingEntry.requestedAt = new Date();
        existingEntry.reason = reason;
        existingEntry.reviewedAt = null;
        existingEntry.reviewedBy = null;
        existingEntry.notes = '';
        
        await existingEntry.save();
        return { 
          success: true, 
          message: 'Email whitelist request has been resubmitted for review',
          data: existingEntry 
        };
      }
    }

    // Create new whitelist request
    const whitelistRequest = new EmailWhitelist({
      email: normalizedEmail,
      reason: reason,
      status: 'pending',
    });

    await whitelistRequest.save();
    
    logger.info(`[requestEmailWhitelist] New email whitelist request: ${normalizedEmail}`);
    
    return { 
      success: true, 
      message: 'Email whitelist request submitted successfully. You will be notified when approved.',
      data: whitelistRequest 
    };
  } catch (error) {
    logger.error('[requestEmailWhitelist] Error creating email whitelist request:', error);
    return { success: false, message: 'Failed to submit whitelist request' };
  }
}

/**
 * Get all email whitelist requests (admin function)
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Filter by status
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Items per page
 * @returns {Promise<{requests: Array, total: number, page: number, limit: number}>}
 */
async function getEmailWhitelistRequests(filters = {}) {
  try {
    const { status, page = 1, limit = 20 } = filters;
    const query = {};
    
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    
    const [requests, total] = await Promise.all([
      EmailWhitelist.find(query)
        .populate('reviewedBy', 'name email')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailWhitelist.countDocuments(query)
    ]);

    return { requests, total, page, limit };
  } catch (error) {
    logger.error('[getEmailWhitelistRequests] Error fetching email whitelist requests:', error);
    throw error;
  }
}

/**
 * Approve or reject email whitelist request (admin function)
 * @param {string} requestId - The whitelist request ID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} adminUserId - ID of the admin user
 * @param {string} notes - Optional admin notes
 * @param {boolean} sendInvitation - Whether to send invitation email on approval
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
async function reviewEmailWhitelistRequest(requestId, action, adminUserId, notes = '', sendInvitation = true) {
  try {
    if (!['approve', 'reject'].includes(action)) {
      return { success: false, message: 'Invalid action. Must be approve or reject' };
    }

    const whitelistRequest = await EmailWhitelist.findById(requestId);
    
    if (!whitelistRequest) {
      return { success: false, message: 'Whitelist request not found' };
    }

    if (whitelistRequest.status !== 'pending') {
      return { success: false, message: 'Request has already been reviewed' };
    }

    whitelistRequest.status = action === 'approve' ? 'approved' : 'rejected';
    whitelistRequest.reviewedAt = new Date();
    whitelistRequest.reviewedBy = adminUserId;
    whitelistRequest.notes = notes;

    await whitelistRequest.save();

    const statusText = action === 'approve' ? 'approved' : 'rejected';
    logger.info(`[reviewEmailWhitelistRequest] Email ${whitelistRequest.email} ${statusText} by admin ${adminUserId}`);

    // Send invitation email if approved and email is configured
    if (action === 'approve' && sendInvitation && checkEmailConfig()) {
      try {
        await sendInvitationEmail(whitelistRequest.email);
        logger.info(`[reviewEmailWhitelistRequest] Invitation email sent to ${whitelistRequest.email}`);
      } catch (emailError) {
        logger.error(`[reviewEmailWhitelistRequest] Failed to send invitation email to ${whitelistRequest.email}:`, emailError);
        // Don't fail the approval if email sending fails
      }
    }

    return { 
      success: true, 
      message: `Email whitelist request ${statusText} successfully${action === 'approve' && sendInvitation ? '. Invitation email sent.' : ''}`,
      data: whitelistRequest 
    };
  } catch (error) {
    logger.error('[reviewEmailWhitelistRequest] Error reviewing email whitelist request:', error);
    return { success: false, message: 'Failed to review whitelist request' };
  }
}

/**
 * Delete email whitelist request (admin function)
 * @param {string} requestId - The whitelist request ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function deleteEmailWhitelistRequest(requestId) {
  try {
    const result = await EmailWhitelist.findByIdAndDelete(requestId);
    
    if (!result) {
      return { success: false, message: 'Whitelist request not found' };
    }

    logger.info(`[deleteEmailWhitelistRequest] Email whitelist request deleted: ${result.email}`);
    
    return { success: true, message: 'Email whitelist request deleted successfully' };
  } catch (error) {
    logger.error('[deleteEmailWhitelistRequest] Error deleting email whitelist request:', error);
    return { success: false, message: 'Failed to delete whitelist request' };
  }
}

/**
 * Send invitation email to approved user
 * @param {string} email - The email address to send invitation to
 * @returns {Promise<void>}
 */
async function sendInvitationEmail(email) {
  try {
    // Create invitation token
    const inviteToken = await createInvite(email);
    
    // Construct invitation link
    // const baseUrl = process.env.DOMAIN || process.env.HOST || 'https://chat.wagmi.tech';
    const baseUrl ='https://chat.wagmi.tech';
    const inviteLink = `${baseUrl}/register?token=${inviteToken}`;
    
    // Prepare email data
    const appName = process.env.APP_TITLE || 'WagmiChat';
    const emailData = {
      email: email,
      subject: `You're invited to join ${appName}!`,
      payload: {
        appName: appName,
        inviteLink: inviteLink,
        name: email, // Use email as name since we don't have user's name yet
      },
      template: 'inviteUser.handlebars'
    };

    // Send invitation email
    await sendEmail(emailData);
    logger.info(`[sendInvitationEmail] Invitation email sent successfully to ${email}`);
  } catch (error) {
    logger.error(`[sendInvitationEmail] Error sending invitation email to ${email}:`, error);
    throw error;
  }
}

module.exports = {
  isEmailWhitelisted,
  requestEmailWhitelist,
  getEmailWhitelistRequests,
  reviewEmailWhitelistRequest,
  deleteEmailWhitelistRequest,
  sendInvitationEmail,
};
