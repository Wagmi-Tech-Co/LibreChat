const { isEmailWhitelisted } = require('~/server/services/emailWhitelist');
const { logger } = require('~/config');

/**
 * Checks if the user's email is whitelisted for social login
 *
 * @async
 * @function
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Next middleware function.
 *
 * @returns {Promise<function|Object>} - Returns a Promise which when resolved calls next middleware if the email is whitelisted
 */
const checkEmailWhitelisted = async (req, res, next = () => {}) => {
  const email = req?.user?.email;
  if (email && !(await isEmailWhitelisted(email))) {
    logger.error(`[Social Login] [Email not whitelisted] [Email: ${email}]`);
    return res.redirect('/login?error=email_not_whitelisted');
  } else {
    return next();
  }
};

module.exports = checkEmailWhitelisted;
