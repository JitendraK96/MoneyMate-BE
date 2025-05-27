const Joi = require("joi");

module.exports = Joi.object().keys({
  imageType: Joi.string().required().label("Image Type"),
  prompt: Joi.string().label("Prompt"),
  base64Data: Joi.string().label("Base64 Data"),
});
