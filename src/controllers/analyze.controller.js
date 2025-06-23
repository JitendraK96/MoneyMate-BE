const { error, success } = require("../utils");
const {
  analyzeStatementValidation,
  batchAnalyzeValidation,
  costEstimationValidation,
} = require("../validations");
const { analyzeService } = require("../services");

// Single statement analysis (your existing endpoint, enhanced)
const analyzeStatement = async (req, res, next) => {
  const reqBody = req.body;
  try {
    const validatedReqData = await analyzeStatementValidation.validateAsync(
      reqBody
    );
    const { prompt, imageType, base64Data, model = "haiku" } = validatedReqData;

    const startTime = Date.now();

    // Use the optimized analyze service
    const result = await analyzeService.analyzeStatement({
      prompt,
      imageType,
      base64Data,
      model,
    });

    const processingTime = Date.now() - startTime;

    // Format response to match your existing structure but with optimization data
    const response = {
      analyzedStatment: result.content, // Keep typo for backward compatibility
      analyzedStatement: result.content, // Correct spelling also available
      optimization: {
        model: result.model,
        processingTime,
        cached: result.cached,
        cost: result.cost,
        imageOptimization: result.optimization,
        tokenUsage: result.usage,
      },
    };

    return success.handler(response, req, res, next);
  } catch (err) {
    console.error("Analyze statement error:", err);
    return error.handler(err, req, res, next);
  }
};

// New batch analysis endpoint
const analyzeStatementsBatch = async (req, res, next) => {
  const reqBody = req.body;
  console.log(reqBody, "---> reqBody");
  try {
    const validatedReqData = await batchAnalyzeValidation.validateAsync(
      reqBody
    );
    const { requests, model = "haiku", batchSize = 20 } = validatedReqData;

    const startTime = Date.now();

    // Process batch
    const results = await analyzeService.analyzeStatementsBatch({
      requests,
      model,
      batchSize,
    });

    const processingTime = Date.now() - startTime;

    // Calculate summary statistics
    const successful = results.filter((r) => !r.error).length;
    const failed = results.filter((r) => r.error).length;
    const totalCost = results.reduce((sum, r) => sum + (r.cost?.cost || 0), 0);

    const response = {
      results: results.map((result) => ({
        analyzedStatement: result.content,
        success: !result.error,
        error: result.error,
        cost: result.cost,
        optimization: result.optimization,
        model: result.model,
      })),
      summary: {
        totalProcessed: results.length,
        successful,
        failed,
        processingTime,
        totalCost,
        averageCostPerItem: totalCost / results.length,
        model: model === "haiku" ? "claude-3-5-haiku" : "claude-3-5-sonnet",
      },
    };

    return success.handler(response, req, res, next);
  } catch (err) {
    console.error("Batch analyze error:", err);
    return error.handler(err, req, res, next);
  }
};

// Health check and metrics endpoint
const healthCheck = async (req, res, next) => {
  try {
    const health = await analyzeService.getHealthMetrics();

    return success.handler(
      {
        status: "healthy",
        service: "Bank Statement Analyzer",
        optimization: "Claude 3.5 Haiku - 84% cost reduction",
        metrics: health,
        timestamp: new Date().toISOString(),
      },
      req,
      res,
      next
    );
  } catch (err) {
    console.error("Health check error:", err);
    return error.handler(err, req, res, next);
  }
};

// Cost estimation endpoint
const estimateCost = async (req, res, next) => {
  try {
    const validatedReqData = await costEstimationValidation.validateAsync(
      req.body
    );
    const { imageSize, model = "haiku" } = validatedReqData;

    // Estimate tokens and cost
    const estimatedImageTokens = Math.ceil(imageSize / 4);
    const estimatedPromptTokens = 100; // Average prompt size
    const estimatedOutputTokens = 500; // Average output size

    const totalInputTokens = estimatedImageTokens + estimatedPromptTokens;

    const rates =
      model === "haiku"
        ? { input: 0.8, output: 4.0 } // per million tokens
        : { input: 3.0, output: 15.0 };

    const inputCost = (totalInputTokens / 1000000) * rates.input;
    const outputCost = (estimatedOutputTokens / 1000000) * rates.output;
    const totalCost = inputCost + outputCost;

    // Convert to INR (approximate)
    const usdToInr = 86.76;
    const costInINR = totalCost * usdToInr;

    const response = {
      estimation: {
        model,
        tokens: {
          input: totalInputTokens,
          output: estimatedOutputTokens,
          total: totalInputTokens + estimatedOutputTokens,
        },
        cost: {
          usd: {
            input: inputCost,
            output: outputCost,
            total: totalCost,
          },
          inr: {
            input: inputCost * usdToInr,
            output: outputCost * usdToInr,
            total: costInINR,
          },
        },
        rates: {
          inputPerMillion: rates.input,
          outputPerMillion: rates.output,
          exchangeRate: usdToInr,
        },
      },
    };

    return success.handler(response, req, res, next);
  } catch (err) {
    console.error("Cost estimation error:", err);
    return error.handler(err, req, res, next);
  }
};

// Batch status check (placeholder for future Claude Batch API)
const getBatchStatus = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    // For now, this is a placeholder
    const status = await analyzeService.getBatchStatus(batchId);

    return success.handler(
      {
        batchId,
        status,
        message: "Batch processing status retrieved",
      },
      req,
      res,
      next
    );
  } catch (err) {
    console.error("Batch status error:", err);
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  analyzeStatement,
  analyzeStatementsBatch,
  healthCheck,
  estimateCost,
  getBatchStatus,
};
