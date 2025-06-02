const { isEnabled } = require('~/server/utils');

function validateRegistration(req, res, next) {
  // If user has a valid invite token, allow registration
  if (req.invite) {
    return next();
  }

  // Check if private beta mode is enabled
  const privateBetaMode = isEnabled(process.env.PRIVATE_BETA_MODE);
  
  if (privateBetaMode) {
    return res.status(403).json({
      message: 'Registration is currently by invitation only. Please contact an administrator for access.',
    });
  }

  // Check if open registration is allowed (fallback for non-private-beta mode)
  if (isEnabled(process.env.ALLOW_REGISTRATION)) {
    next();
  } else {
    return res.status(403).json({
      message: 'Registration is currently disabled. Please contact an administrator for access.',
    });
  }
}

module.exports = validateRegistration;
