const { STATUS } = require('../consts');

/**
 * Return success payload
 * @param data
 * @returns {{data: *, meta: {version: number, timestamp: Date}}}
 */
const successSchema = (data) => ({
  data,
  meta: {
    version: 1.0,
    timestamp: new Date(),
  },
});

/**
 * Return Error Payload
 * @param error
 * @param code
 * @returns {{meta: {version: number, timestamp: Date}, error: {code: *, message: *}}}
 */
const commonErrorSchema = ({
  error, code, name, recovery_options = [], message_presets = {}, difference,
}) => {
  const key = name || '';
  const response = {
    error: {
      code,
      key,
      message: error.message || error,
      message_presets,
      recovery: {
        message: error.message || error,
        message_presets,
        options: recovery_options,
      },
      difference,
    },
    meta: {
      version: 1.0,
      timestamp: new Date(),
    },
  };
  return response;
};

/**
 * Return Joi error payload
 * @param error
 * @param code
 * @returns {{meta: {version: number, timestamp: Date}, error: {code: number, message: string, fields: Array}}}
 */
const joiValidationErrorSchema = ({
  error, code = STATUS.BAD_REQUEST, name, recovery_options = [], message_presets = {},
}) => {
  const key = name || '';
  const response = {
    error: {
      code,
      key,
      message: 'ValidationError',
      fields: [],
      message_presets,
      recovery: {
        message: 'ValidationError',
        message_presets,
        options: recovery_options,
      },
    },
    meta: {
      version: 1.0,
      timestamp: new Date(),
    },
  };

  error.details.map((e) => {
    response.error.fields.push({
      key: e.context.key,
      type: e.type,
      message: e.message,
    });

    return e;
  });

  return response;
};

module.exports = {
  commonErrorSchema,
  joiValidationErrorSchema,
  successSchema,
};
