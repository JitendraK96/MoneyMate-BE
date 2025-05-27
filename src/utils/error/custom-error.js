/**
 * Throw not found exception
 * @param item
 */
const throwNotFound = ({ item = 'Item', recovery_options, message_presets }) => {
  const err = new Error(`${item} Not Found`);
  err.name = 'NotFound';
  err.recovery_options = recovery_options;
  err.message_presets = message_presets;
  throw err;
};

/**
 * Throw conflict exception
 * @param message
 */
const throwConflict = ({ message, recovery_options, message_presets }) => {
  const err = new Error(message);
  err.name = 'Conflict';
  err.recovery_options = recovery_options;
  err.message_presets = message_presets;
  throw err;
};

/**
 * Throw precondition failed  exception
 * @param message
 */
const throwPreconditionFailed = ({
  message, recovery_options, message_presets, difference,
}) => {
  const err = new Error(message);
  err.name = 'PreconditionFailed';
  err.recovery_options = recovery_options;
  err.message_presets = message_presets;
  err.difference = difference;
  throw err;
};

/**
 * Throw custom validation error in Joi error format
 * @param message
 * @param field_name
 */
const throwCustomJoiValidationError = ({
  message, field_name, recovery_options, message_presets,
}) => {
  const err = new Error(message);
  err.name = 'ValidationError';
  err.recovery_options = recovery_options;
  err.message_presets = message_presets;
  err.details = [];
  err.details.push({
    context: { key: field_name },
    type: 'custom',
    message,
  });
  throw err;
};

/**
 * Throw forbidden error
 * @param {message} message
 */
const throwForbiddenError = ({ message, recovery_options, message_presets }) => {
  const err = new Error(message);
  err.name = 'Forbidden';
  err.recovery_options = recovery_options;
  err.message_presets = message_presets;
  throw err;
};

/**
 * Throw Token Expired error
 * @param {message} message
 */

const throwExpired = ({ message, recovery_options, message_presets }) => {
  const err = new Error(message);
  err.name = 'Expired';
  err.recovery_options = recovery_options;
  err.message_presets = message_presets;
  throw err;
};

const throwReauthentication = ({ recovery_options, message_presets }) => {
  const err = new Error('Reauthentication');
  err.name = 'Reauthentication';
  err.recovery_options = recovery_options;
  err.message_presets = message_presets;
  throw err;
};

module.exports = {
  throwConflict,
  throwNotFound,
  throwPreconditionFailed,
  throwCustomJoiValidationError,
  throwForbiddenError,
  throwExpired,
  throwReauthentication,
};
