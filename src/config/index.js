require("dotenv").config();

const config = {
  APP_HOST: process.env.APP_HOST || "0.0.0.0",
  APP_PORT: process.env.APP_PORT || "8086",
  APP_CLAUDE_API_KEY: process.env.APP_CLAUDE_API_KEY,
  APP_CLAUDE_MESSAGE_URL: process.env.APP_CLAUDE_MESSAGE_URL,
};

module.exports = config;
