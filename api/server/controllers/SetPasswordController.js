const bcrypt = require('bcryptjs');
const { updateUser, findUser } = require('~/models/userMethods');
const { deleteTokens } = require('~/models/Token');
const { checkActivationToken, checkBan, inviteLimiter } = require('~/server/middleware');
const { setAuthTokens } = require('~/server/services/AuthService');
const { logger } = require('~/config');

/**
 * Controller to handle password setting for invited users
 * This activates a pending user account
 */
const setPasswordController = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const { invite } = req; // From checkActivationToken middleware

    if (!password || password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    // Find the pending user
    const user = await findUser({ email, status: 'pending' }, 'email _id status name');
    
    if (!user) {
      return res.status(404).json({
        message: 'Pending user account not found'
      });
    }

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Update user: set password, activate account, verify email
    const updateData = {
      password: hashedPassword,
      status: 'active',
      emailVerified: true,
    };

    // Update name if provided
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    await updateUser(user._id, updateData);

    // Delete the invitation token
    await deleteTokens({ token: invite.token });

    // Get the updated user
    const updatedUser = await findUser({ _id: user._id }, '-password -__v -totpSecret');

    // Set authentication tokens
    const token = await setAuthTokens(user._id, res);

    logger.info(`[SetPassword] User activated: ${email}`);

    res.status(200).json({
      message: 'Account activated successfully',
      token,
      user: updatedUser
    });

  } catch (error) {
    logger.error('[SetPassword] Error activating account:', error);
    res.status(500).json({
      message: 'Failed to activate account'
    });
  }
};

module.exports = {
  setPasswordController,
};
