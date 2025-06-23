require("dotenv").config();

const config = {
  // Server Configuration
  APP_HOST: process.env.APP_HOST || "0.0.0.0",
  APP_PORT: process.env.APP_PORT || "8086",

  // Claude API Configuration
  APP_CLAUDE_API_KEY: process.env.APP_CLAUDE_API_KEY,
  APP_CLAUDE_MESSAGE_URL:
    process.env.APP_CLAUDE_MESSAGE_URL ||
    "https://api.anthropic.com/v1/messages",
  APP_CLAUDE_BATCH_URL:
    process.env.APP_CLAUDE_BATCH_URL ||
    "https://api.anthropic.com/v1/messages/batches",

  // Model Configuration
  DEFAULT_MODEL: process.env.DEFAULT_MODEL || "haiku", // haiku or sonnet

  // Image Optimization Settings
  IMAGE_MAX_WIDTH: parseInt(process.env.IMAGE_MAX_WIDTH) || 1024,
  IMAGE_MAX_HEIGHT: parseInt(process.env.IMAGE_MAX_HEIGHT) || 1024,
  IMAGE_COMPRESSION_QUALITY:
    parseInt(process.env.IMAGE_COMPRESSION_QUALITY) || 80,

  // Rate Limiting Configuration
  RATE_LIMIT_PER_MINUTE: parseInt(process.env.RATE_LIMIT_PER_MINUTE) || 45,
  MAX_BATCH_SIZE: parseInt(process.env.MAX_BATCH_SIZE) || 50,
  MAX_CONCURRENT_REQUESTS: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 10,

  // Cost Control Settings (in USD)
  DAILY_COST_LIMIT: parseFloat(process.env.DAILY_COST_LIMIT) || 100,
  MONTHLY_COST_LIMIT: parseFloat(process.env.MONTHLY_COST_LIMIT) || 2000,
  COST_ALERT_THRESHOLD: parseFloat(process.env.COST_ALERT_THRESHOLD) || 0.8, // 80% of limit

  // Cache Configuration
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour in seconds
  CACHE_MAX_KEYS: parseInt(process.env.CACHE_MAX_KEYS) || 1000,
  ENABLE_CACHE: process.env.ENABLE_CACHE !== "false", // default true

  // Request Timeout Settings
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT) || 60000, // 60 seconds
  RETRY_ATTEMPTS: parseInt(process.env.RETRY_ATTEMPTS) || 3,
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY) || 1000, // 1 second

  // Monitoring and Logging
  ENABLE_METRICS: process.env.ENABLE_METRICS === "true",
  LOG_LEVEL: process.env.LOG_LEVEL || "info", // error, warn, info, debug
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== "false",

  // Security Settings
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  FRONTEND_URL: process.env.FRONTEND_URL,

  // Performance Tuning
  REQUEST_SIZE_LIMIT: process.env.REQUEST_SIZE_LIMIT || "50mb",
  COMPRESSION_THRESHOLD: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024,

  // Business Logic
  MAX_STATEMENTS_PER_USER_DAILY:
    parseInt(process.env.MAX_STATEMENTS_PER_USER_DAILY) || 1000,
  MAX_STATEMENTS_PER_BATCH:
    parseInt(process.env.MAX_STATEMENTS_PER_BATCH) || 100,

  // Database Configuration (if you're using a database)
  DATABASE_URL: process.env.DATABASE_URL,
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN) || 2,
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX) || 10,

  // Environment
  NODE_ENV: process.env.NODE_ENV || "development",

  // Feature Flags
  ENABLE_BATCH_PROCESSING: process.env.ENABLE_BATCH_PROCESSING !== "false",
  ENABLE_IMAGE_OPTIMIZATION: process.env.ENABLE_IMAGE_OPTIMIZATION !== "false",
  ENABLE_COST_TRACKING: process.env.ENABLE_COST_TRACKING !== "false",

  // Claude Model Pricing (per million tokens)
  CLAUDE_PRICING: {
    haiku: {
      input: 0.8,
      output: 4.0,
    },
    sonnet: {
      input: 3.0,
      output: 15.0,
    },
  },

  // Currency Exchange Rate (you might want to fetch this dynamically)
  USD_TO_INR_RATE: parseFloat(process.env.USD_TO_INR_RATE) || 86.76,

  // Health Check Configuration
  HEALTH_CHECK_TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,

  // Webhook Configuration (for notifications)
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,

  // Redis Configuration (if using Redis for caching/sessions)
  REDIS_URL: process.env.REDIS_URL,
  REDIS_TTL: parseInt(process.env.REDIS_TTL) || 3600,
};

module.exports = config;
