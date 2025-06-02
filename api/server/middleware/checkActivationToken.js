const { getInvite } = require('~/models/inviteUser');
const { deleteTokens } = require('~/models/Token');

/**
 * Middleware to check activation token for setting password
 * Used when a user clicks on the invitation link to set their password
 */
async function checkActivationToken(req, res, next) {
  const { token, email } = req.body;

  if (!token || !email) {
    return res.status(400).json({ 
      message: 'Token and email are required for account activation' 
    });
  }

  try {
    const invite = await getInvite(token, email);

    if (!invite || invite.error === true) {
      return res.status(400).json({ 
        message: 'Invalid or expired activation token' 
      });
    }

    // Check if token is expired (24 hours)
    const currentTime = new Date();
    if (invite.expiresAt && currentTime > invite.expiresAt) {
      await deleteTokens({ token: invite.token });
      return res.status(400).json({ 
        message: 'Activation token has expired. Please request a new invitation.' 
      });
    }

    // Store invite info for next middleware
    req.invite = invite;
    next();
  } catch (error) {
    return res.status(500).json({ 
      message: 'Failed to validate activation token' 
    });
  }
}

module.exports = checkActivationToken;
