const { error, success } = require("../utils");
const { analyzeService } = require("../services");

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

const extractDebitTransactions = async (req, res, next) => {
  try {
    if (!req.file) {
      return error.handler(
        new Error("PDF file is required"),
        req,
        res,
        next
      );
    }

    const pdfBuffer = req.file.buffer;
    const transactions = await analyzeService.extractDebitTransactions(pdfBuffer);

    return success.handler(
      {
        message: "Debit transactions extracted successfully",
        data: transactions,
        count: transactions.length,
        timestamp: new Date().toISOString(),
      },
      req,
      res,
      next
    );
  } catch (err) {
    console.error("Transaction extraction error:", err);
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  healthCheck,
  extractDebitTransactions,
};
