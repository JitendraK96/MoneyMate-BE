const Joi = require('joi');

module.exports = Joi.object()
  .keys({
    name: Joi
      .string()
      .required()
      .label('Name'),
    description: Joi
      .string()
      .label('Description'),
  });
