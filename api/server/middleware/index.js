const validatePasswordReset = require('./validatePasswordReset');
const validateRegistration = require('./validateRegistration');
const validateImageRequest = require('./validateImageRequest');
const buildEndpointOption = require('./buildEndpointOption');
const validateMessageReq = require('./validateMessageReq');
const checkEmailWhitelisted = require('./checkEmailWhitelisted');
const concurrentLimiter = require('./concurrentLimiter');
const validateEndpoint = require('./validateEndpoint');
const requireLocalAuth = require('./requireLocalAuth');
const canDeleteAccount = require('./canDeleteAccount');
const setBalanceConfig = require('./setBalanceConfig');
const requireLdapAuth = require('./requireLdapAuth');
const abortMiddleware = require('./abortMiddleware');
const checkInviteUser = require('./checkInviteUser');
const checkActivationToken = require('./checkActivationToken');
const requireJwtAuth = require('./requireJwtAuth');
const validateModel = require('./validateModel');
const moderateText = require('./moderateText');
const logHeaders = require('./logHeaders');
const setHeaders = require('./setHeaders');
const validate = require('./validate');
const limiters = require('./limiters');
const uaParser = require('./uaParser');
const checkBan = require('./checkBan');
const noIndex = require('./noIndex');
const roles = require('./roles');

module.exports = {
  ...abortMiddleware,
  ...validate,
  ...limiters,
  ...roles,
  noIndex,
  checkBan,
  uaParser,
  setHeaders,
  logHeaders,
  moderateText,
  validateModel,
  requireJwtAuth,
  checkInviteUser,
  checkActivationToken,
  requireLdapAuth,
  requireLocalAuth,
  canDeleteAccount,
  validateEndpoint,
  setBalanceConfig,
  concurrentLimiter,
  checkEmailWhitelisted,
  validateMessageReq,
  buildEndpointOption,
  validateRegistration,
  validateImageRequest,
  validatePasswordReset,
};
