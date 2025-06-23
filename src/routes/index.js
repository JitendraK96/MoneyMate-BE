const express = require("express");
const { error } = require("../utils");

const apiRoutes = express.Router();

const analyzeRoutes = require("./analyze.route");

// Mount analyze routes
apiRoutes.use("/analyze", analyzeRoutes);

// API documentation endpoint
apiRoutes.get("/", (req, res) => {
  res.json({
    message: "Bank Statement Analyzer API v2.0",
    optimization: "84% cost reduction with Claude 3.5 Haiku",
    endpoints: {
      "POST /analyze/statement": "Analyze single bank statement",
      "POST /analyze/batch": "Batch analyze multiple statements",
      "GET /analyze/health": "Service health and metrics",
      "GET /health": "Basic health check",
    },
    models: {
      haiku: "Claude 3.5 Haiku (default, fastest, cheapest)",
      sonnet: "Claude 3.5 Sonnet (more powerful, higher cost)",
    },
  });
});

// Catch-all route
apiRoutes.use("*", (req, res, next) => {
  error.throwNotFound({ item: "Route", path: req.originalUrl });
});

module.exports = apiRoutes;
