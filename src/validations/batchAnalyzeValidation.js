const Joi = require("joi");

// New batch validation
module.exports = Joi.object({
  requests: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().max(100).optional().messages({
          "string.max": "Request ID cannot exceed 100 characters",
        }),

        imageType: Joi.string()
          .valid(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif"
          )
          .required()
          .messages({
            "any.only": "Image type must be one of: jpeg, jpg, png, webp, gif",
            "any.required": "Image type is required",
          }),

        base64Data: Joi.string()
          .pattern(/^[A-Za-z0-9+/]*={0,2}$/)
          .min(100)
          .required()
          .messages({
            "string.pattern.base": "Base64 data format is invalid",
            "string.min": "Image data is too small (minimum 100 characters)",
            "any.required": "Base64 data is required",
          }),

        prompt: Joi.string().min(10).max(5000).optional().messages({
          "string.min": "Prompt must be at least 10 characters long",
          "string.max": "Prompt cannot exceed 5000 characters",
        }),

        // ADDED: Allow filename field
        filename: Joi.string().max(255).optional().messages({
          "string.max": "Filename cannot exceed 255 characters",
        }),

        // Optional per-request settings
        priority: Joi.string().valid("low", "normal", "high").default("normal"),
        metadata: Joi.object().optional(),
      }).options({ stripUnknown: true })
    )
    .min(1)
    .max(100)
    .required()
    .messages({
      "array.min": "At least 1 request is required",
      "array.max": "Maximum 100 requests allowed in a batch",
      "any.required": "Requests array is required",
    }),

  model: Joi.string().valid("haiku", "sonnet").default("haiku").messages({
    "any.only": 'Model must be either "haiku" or "sonnet"',
  }),

  batchSize: Joi.number().integer().min(1).max(50).default(20).messages({
    "number.min": "Batch size must be at least 1",
    "number.max": "Batch size cannot exceed 50",
    "number.integer": "Batch size must be an integer",
  }),

  // Batch-specific settings
  enableParallelProcessing: Joi.boolean().default(true),
  enableCache: Joi.boolean().default(true),
  enableImageOptimization: Joi.boolean().default(true),

  // Error handling options
  continueOnError: Joi.boolean().default(true),
  maxRetries: Joi.number().integer().min(0).max(5).default(3),

  // Optional batch metadata
  batchName: Joi.string().max(200).optional(),
  userId: Joi.string().max(100).optional(),

  // Timeout settings
  timeoutPerRequest: Joi.number()
    .integer()
    .min(5000)
    .max(120000)
    .default(60000),
  totalTimeout: Joi.number().integer().min(30000).max(600000).default(300000),
}).options({
  stripUnknown: true,
  abortEarly: false,
});
