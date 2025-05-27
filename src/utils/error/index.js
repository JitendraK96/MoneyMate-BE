const handler = require('./handler');
const { getErrorPayload } = require('../payload');
const {
  throwConflict,
  throwCustomJoiValidationError,
  throwNotFound,
  throwPreconditionFailed,
  throwForbiddenError,
  throwExpired,
  throwReauthentication,
} = require('./custom-error');

module.exports = {
  handler,
  throwConflict,
  throwCustomJoiValidationError,
  throwNotFound,
  throwPreconditionFailed,
  throwForbiddenError,
  throwExpired,
  throwReauthentication,
  getErrorPayload,
};
