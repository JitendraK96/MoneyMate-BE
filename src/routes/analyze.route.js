const express = require("express");
const { analyzeController } = require("../controllers");

const analyzeRoutes = express.Router({});

// Existing single statement analysis (backward compatible)
analyzeRoutes.post("/statement", analyzeController.analyzeStatement);

// New optimized endpoints
analyzeRoutes.post("/batch", analyzeController.analyzeStatementsBatch);
analyzeRoutes.get("/batch/:batchId/status", analyzeController.getBatchStatus);
analyzeRoutes.get("/health", analyzeController.healthCheck);

// Convenience endpoint for quick testing
analyzeRoutes.post("/", analyzeController.analyzeStatement);

// Cost estimation endpoint
analyzeRoutes.post("/estimate", (req, res) => {
  const { imageSize, model = "haiku" } = req.body;

  // Rough cost estimation
  const estimatedTokens = Math.ceil(imageSize / 4) + 500; // image + output
  const rates =
    model === "haiku"
      ? { input: 0.0008, output: 0.004 }
      : { input: 0.003, output: 0.015 };

  const estimatedCost = estimatedTokens * rates.input + 500 * rates.output;

  res.json({
    estimatedCost: estimatedCost,
    model,
    estimatedTokens,
    currency: "USD",
  });
});

module.exports = analyzeRoutes;
