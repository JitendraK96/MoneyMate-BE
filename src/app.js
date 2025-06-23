const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const { error } = require("./utils");
const config = require("./config");
const apiRoutes = require("./routes");

const app = express();

// Enhanced CORS for development
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : true,
    credentials: true,
  })
);

app.use(helmet());
app.use(compression());

// Increased limits for large images and batch processing
app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      // Track request size for monitoring
      req.rawBody = buf;
      req.requestSize = buf.length;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request metrics middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - req.startTime;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      requestSize: req.requestSize || 0,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };

    // Log requests (consider using a proper logger in production)
    if (process.env.LOG_LEVEL !== "silent") {
      console.log("Request:", JSON.stringify(logData));
    }

    // Track expensive requests
    if (duration > 5000) {
      console.warn("Slow request detected:", logData);
    }
  });
  next();
});

// Health check endpoint (before other routes)
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

app.get("/", (req, res) => {
  res.send({
    message: "pong",
    service: "Bank Statement Analyzer API",
    version: "2.0-optimized",
    documentation: "/health",
  });
});

// Use API routes
app.use("/api", apiRoutes);

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error("Error occurred:", err);

  // Claude API specific errors
  if (err.message.includes("Claude API returned")) {
    return res.status(502).json({
      success: false,
      message: "External API error",
      code: "CLAUDE_API_ERROR",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Service temporarily unavailable",
    });
  }

  // Rate limit errors
  if (
    err.message.includes("rate limit") ||
    err.message.includes("too many requests")
  ) {
    return res.status(429).json({
      success: false,
      message: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: 60,
      error: "Please wait before making more requests",
    });
  }

  // Cost limit errors
  if (
    err.message.includes("cost limit") ||
    err.message.includes("budget exceeded")
  ) {
    return res.status(402).json({
      success: false,
      message: "Cost limit exceeded",
      code: "COST_LIMIT_EXCEEDED",
      error: "Daily or monthly cost limit reached",
    });
  }

  // Image processing errors
  if (err.message.includes("image") || err.message.includes("sharp")) {
    return res.status(400).json({
      success: false,
      message: "Image processing error",
      code: "IMAGE_PROCESSING_ERROR",
      error: "Unable to process the provided image",
    });
  }

  // Use your existing error handler as fallback
  return error.handler(err, req, res, next);
});

const server = app.listen(config.APP_PORT, config.APP_HOST, (err) => {
  if (err) {
    console.error(err);
  }
  console.info(
    `🚀 Optimized Server running on http://${config.APP_HOST}:${config.APP_PORT}`
  );
  console.info(`💰 Using Claude 3.5 Haiku for 84% cost savings`);
  console.info(
    `📊 Health check: http://${config.APP_HOST}:${config.APP_PORT}/health`
  );
});

// Enhanced shutdown with cleanup
const shutdown = () => {
  console.info("Starting graceful shutdown...");

  // Stop accepting new requests
  server.close((err) => {
    if (err) {
      console.error("Error during shutdown:", err);
      process.exitCode = 1;
    } else {
      console.info("✅ Server shutdown complete");
    }

    // Force exit after 30 seconds
    setTimeout(() => {
      console.error("Force exit after timeout");
      process.exit(1);
    }, 30000);

    process.exit();
  });
};

process.on("SIGINT", () => {
  console.info(
    "Got SIGINT (aka ctrl-c). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

process.on("SIGTERM", () => {
  console.info(
    "Got SIGTERM (docker container stop). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  shutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  shutdown();
});

module.exports = app;
