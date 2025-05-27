const payloadSchema = require('./schema');
const { STATUS } = require('../consts');

/**
 * Returns a error payload based on the err object passed
 * @param {*} err Error object
 */
const getErrorPayload = (err) => {
  console.error(err);
  let { name } = err;
  if (err.key) {
    name = err.key;
  }

  if (err.name === 'MongoError') {
    name = err.code;
  }

  let difference;
  if (err.difference) {
    difference = err.difference;
  }

  let recovery_options;
  if (err.recovery_options) {
    recovery_options = err.recovery_options;
  }

  let message_presets;
  if (err.message_presets) {
    message_presets = err.message_presets;
  }

  let payload = {};
  switch (name) {
    case 'MulterError':
      payload = payloadSchema.commonErrorSchema({ error: err, code: STATUS.BAD_REQUEST, name });
      break;
    case 'TokenExpiredError':
    case 'JsonWebTokenError':
      payload = payloadSchema.commonErrorSchema({ error: err, code: STATUS.FORBIDDEN, name });
      break;
    case 'SyntaxError':
      payload = payloadSchema.commonErrorSchema({
        error: 'Bad Request',
        code: STATUS.BAD_REQUEST,
        name,
        recovery_options,
        message_presets,
      });
      break;
    case 'MissingRequiredParameter':
    case 'ValidationError':
      payload = payloadSchema.joiValidationErrorSchema({
        error: err,
        code: STATUS.BAD_REQUEST,
        name,
        recovery_options,
        message_presets,
      });
      break;
    case 'SequelizeValidationError':
    case 'SequelizeDatabaseError':
      payload = payloadSchema.commonErrorSchema({
        error: err,
        code: STATUS.BAD_REQUEST,
        name,
        recovery_options,
        message_presets,
      });
      break;
    case 'SequelizeUniqueConstraintError':
    case 'Conflict':
      payload = payloadSchema.commonErrorSchema({
        error: 'Duplicate',
        code: STATUS.CONFLICT,
        name,
        recovery_options,
        message_presets,
      });
      break;
    case 11000:
      // MONGODB ERROR FOR DUPLICATE DATA
      payload = payloadSchema.commonErrorSchema({
        error: err,
        code: STATUS.CONFLICT,
        name: 'Duplicate',
        recovery_options,
        message_presets,
      });
      break;
    case 'SequelizeForeignKeyConstraintError':
    case 'ForeignKeyConstraintError':
      payload = payloadSchema.commonErrorSchema({
        error: err,
        code: STATUS.CONFLICT,
        name,
        recovery_options,
        message_presets,
      });
      break;
    case 'ResourceNotFoundException':
    case 'NotFound':
      payload = payloadSchema.commonErrorSchema({
        error: err,
        code: STATUS.NOT_FOUND,
        name,
        recovery_options,
        message_presets,
      });
      break;
    case 'PreconditionFailed':
      payload = payloadSchema.commonErrorSchema({
        error: err,
        code: STATUS.PRECONDITION_FAILED,
        name,
        recovery_options,
        message_presets,
        difference,
      });
      break;
    case 'Forbidden':
      payload = payloadSchema.commonErrorSchema({
        error: err,
        code: STATUS.FORBIDDEN,
        name,
        recovery_options,
        message_presets,
      });
      break;
    case 'Expired':
      payload = payloadSchema.commonErrorSchema({
        error: err,
        code: STATUS.GONE,
        name,
        recovery_options,
        message_presets,
      });
      break;
    case 'Reauthentication':
      payload = payloadSchema.commonErrorSchema({
        error: err,
        code: STATUS.UNAUTHORIZED,
        name,
        recovery_options,
        message_presets,
      });
      break;
    default:
      payload = payloadSchema.commonErrorSchema({ error: 'Internal Server Error', code: STATUS.INTERNAL_SERVER_ERROR, name });
  }
  return payload;
};

/**
 * Handler success and send appropriate response
 * @param data
 * @param req
 * @param res
 * @returns {*}
 */
// eslint-disable-next-line no-unused-vars
const getSuccessPayload = (data) => payloadSchema.successSchema(data);

module.exports = {
  getErrorPayload,
  getSuccessPayload,
};
