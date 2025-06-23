const Joi = require("joi");

// Cost estimation validation
module.exports = Joi.object({
  imageSize: Joi.number().min(1).required(),
  model: Joi.string().valid("haiku", "sonnet").default("haiku"),
});
