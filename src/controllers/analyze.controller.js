const { error, success } = require("../utils");
const { analyzeService, databaseService } = require("../services");

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
      return error.handler(new Error("PDF file is required"), req, res, next);
    }

    const pdfBuffer = req.file.buffer;
    const transactions = await analyzeService.extractDebitTransactions(
      pdfBuffer
    );

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

// Async version - returns job ID immediately
const extractDebitTransactionsAsync = async (req, res, next) => {
  try {
    if (!req.file) {
      return error.handler(new Error("PDF file is required"), req, res, next);
    }

    const pdfBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    const job = await analyzeService.extractDebitTransactionsAsync(
      pdfBuffer,
      fileName,
      fileSize,
      req.userId
    );

    return success.handler(
      {
        id: job.id,
        jobId: job.id,
        message: "Processing started successfully",
        status: job.status,
        progress: {
          percentage: job.progress_percentage,
          chunksProcessed: job.chunks_processed,
          chunksTotal: job.chunks_total,
        },
        estimatedTime: `${job.chunks_total * 12} seconds`,
        pollUrl: `/api/analyze/status/${job.id}`,
        timestamp: new Date().toISOString(),
      },
      req,
      res,
      next
    );
  } catch (err) {
    console.error("Async transaction extraction error:", err);
    return error.handler(err, req, res, next);
  }
};

// Get job status for polling
const getJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return error.handler(new Error("Job ID is required"), req, res, next);
    }

    const job = await databaseService.getProcessingJob(jobId, req.userId);

    if (!job) {
      return error.handler(new Error("Job not found"), req, res, next);
    }

    const response = {
      id: job.id,
      jobId: job.id,
      status: job.status,
      progress: {
        percentage: job.progress_percentage,
        chunksProcessed: job.chunks_processed,
        chunksTotal: job.chunks_total,
      },
      fileInfo: {
        fileName: job.file_name,
        fileSize: job.file_size,
        totalPages: job.total_pages,
      },
      transactionCounts: {
        total: job.total_transactions,
        validated: job.validated_transactions,
        final: job.final_transactions,
      },
      timestamps: {
        startedAt: job.started_at,
        completedAt: job.completed_at,
        updatedAt: job.updated_at,
      },
    };

    // Include results if completed
    if (job.status === "completed" && job.result) {
      response.data = job.result;
      response.message = "Debit transactions extracted successfully";
    }

    // Include error if failed
    if (job.status === "failed" && job.error_message) {
      response.error = job.error_message;
      response.message = "Processing failed";
    }

    // Add polling instruction if still processing
    if (job.status === "pending" || job.status === "processing") {
      response.message = "Processing in progress";
      response.pollAgainIn = 5; // seconds
    }

    return success.handler(response, req, res, next);
  } catch (err) {
    console.error("Get job status error:", err);
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  healthCheck,
  extractDebitTransactions,
  extractDebitTransactionsAsync,
  getJobStatus,
};
