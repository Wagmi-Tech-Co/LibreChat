const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { ViolationTypes } = require('librechat-data-provider');
const { removePorts, isEnabled } = require('~/server/utils');
const ioredisClient = require('~/cache/ioredisClient');
const { logViolation } = require('~/cache');
const { logger } = require('~/config');

// Environment variables for invitation rate limiting
const {
  INVITE_WINDOW = 10, // 10 minutes
  INVITE_MAX = 3,     // 3 attempts per window
  INVITE_VIOLATION_SCORE: score = 5,
} = process.env;

const windowMs = INVITE_WINDOW * 60 * 1000;
const max = INVITE_MAX;
const windowInMinutes = windowMs / 60000;
const message = `Too many invitation attempts, please try again after ${windowInMinutes} minutes.`;

const handler = async (req, res) => {
  const type = ViolationTypes.REGISTRATION_LIMIT;
  const errorMessage = {
    type,
    max,
    windowInMinutes,
  };

  await logViolation(req, res, type, errorMessage, score);
  return res.status(429).json({ message });
};

const limiterOptions = {
  windowMs,
  max,
  handler,
  keyGenerator: removePorts, // Rate limit by IP
};

if (isEnabled(process.env.USE_REDIS) && ioredisClient) {
  logger.debug('Using Redis for invitation rate limiter.');
  const store = new RedisStore({
    sendCommand: (...args) => ioredisClient.call(...args),
    prefix: 'invite_limiter:',
  });
  limiterOptions.store = store;
}

const inviteLimiter = rateLimit(limiterOptions);

module.exports = inviteLimiter;
