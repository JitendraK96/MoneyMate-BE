const {
  DEFAULT_MODEL,
  RATE_LIMIT_PER_MINUTE,
  DAILY_COST_LIMIT,
  MONTHLY_COST_LIMIT,
  CACHE_TTL,
  CACHE_MAX_KEYS,
  ENABLE_CACHE,
  ENABLE_IMAGE_OPTIMIZATION,
  ENABLE_COST_TRACKING,
  CLAUDE_PRICING,
  USD_TO_INR_RATE,
  APP_CLAUDE_API_KEY,
  APP_CLAUDE_MESSAGE_URL,
  API_TIMEOUT,
} = require("../config");

const sharp = require("sharp");
const NodeCache = require("node-cache");
const crypto = require("crypto");
const https = require("https");
const { PDFDocument } = require("pdf-lib");
const {
  createProcessingJob,
  updateProcessingJob,
  JOB_STATUS,
} = require("./database.service");

// Initialize cache
const cache = ENABLE_CACHE
  ? new NodeCache({
      stdTTL: CACHE_TTL,
      maxKeys: CACHE_MAX_KEYS,
      useClones: false,
    })
  : null;

// Cost tracking class
class CostTracker {
  constructor() {
    this.dailyCost = 0;
    this.monthlyCost = 0;
    this.totalRequests = 0;
    this.lastReset = new Date().toDateString();
    this.requestHistory = [];
  }

  trackUsage(inputTokens, outputTokens, model = DEFAULT_MODEL) {
    if (!ENABLE_COST_TRACKING) return { cost: 0 };

    // Reset daily cost if new day
    const today = new Date().toDateString();
    if (today !== this.lastReset) {
      this.dailyCost = 0;
      this.lastReset = today;
    }

    // Get pricing rates
    const rates = CLAUDE_PRICING[model] || CLAUDE_PRICING.haiku;

    // Calculate cost (rates are per million tokens)
    const inputCost = (inputTokens / 1000000) * rates.input;
    const outputCost = (outputTokens / 1000000) * rates.output;
    const totalCost = inputCost + outputCost;

    // Update tracking
    this.dailyCost += totalCost;
    this.monthlyCost += totalCost;
    this.totalRequests++;

    // Add to history
    this.requestHistory.push({
      timestamp: new Date(),
      cost: totalCost,
      inputTokens,
      outputTokens,
      model,
    });

    // Keep only last 1000 requests in history
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }

    // Check cost limits
    if (this.dailyCost > DAILY_COST_LIMIT) {
      throw new Error(
        `Daily cost limit of $${DAILY_COST_LIMIT} exceeded. Current: $${this.dailyCost.toFixed(
          4
        )}`
      );
    }

    if (this.monthlyCost > MONTHLY_COST_LIMIT) {
      throw new Error(
        `Monthly cost limit of $${MONTHLY_COST_LIMIT} exceeded. Current: $${this.monthlyCost.toFixed(
          4
        )}`
      );
    }

    // Warning at 80% of daily limit
    if (this.dailyCost > DAILY_COST_LIMIT * 0.8) {
      console.warn(
        `⚠️  Daily cost approaching limit: $${this.dailyCost.toFixed(
          4
        )}/$${DAILY_COST_LIMIT}`
      );
    }

    return {
      cost: totalCost,
      dailyCost: this.dailyCost,
      monthlyCost: this.monthlyCost,
      totalRequests: this.totalRequests,
      inputCost,
      outputCost,
      costInINR: totalCost * USD_TO_INR_RATE,
      dailyCostInINR: this.dailyCost * USD_TO_INR_RATE,
    };
  }

  getStats() {
    return {
      dailyCost: this.dailyCost,
      monthlyCost: this.monthlyCost,
      totalRequests: this.totalRequests,
      dailyCostInINR: this.dailyCost * USD_TO_INR_RATE,
      monthlyCostInINR: this.monthlyCost * USD_TO_INR_RATE,
      averageCostPerRequest:
        this.totalRequests > 0 ? this.monthlyCost / this.totalRequests : 0,
      recentRequests: this.requestHistory.slice(-10),
    };
  }

  reset() {
    this.dailyCost = 0;
    this.monthlyCost = 0;
    this.totalRequests = 0;
    this.requestHistory = [];
    this.lastReset = new Date().toDateString();
  }
}

const costTracker = new CostTracker();

// Rate limiter class
class RateLimiter {
  constructor(requestsPerMinute = RATE_LIMIT_PER_MINUTE) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }

  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < 60000);

    if (this.requests.length >= this.requestsPerMinute) {
      const waitTime = 60000 - (now - this.requests[0]);
      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.throttle();
    }

    this.requests.push(now);
  }

  getStats() {
    const now = Date.now();
    const recentRequests = this.requests.filter((time) => now - time < 60000);
    return {
      requestsPerMinute: this.requestsPerMinute,
      currentRequests: recentRequests.length,
      availableRequests: this.requestsPerMinute - recentRequests.length,
      nextReset:
        recentRequests.length > 0
          ? new Date(recentRequests[0] + 60000)
          : new Date(),
    };
  }
}

const rateLimiter = new RateLimiter();

// PDF splitting helper function
const splitPDFIntoChunks = async (pdfBuffer, pagesPerChunk = 2) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();
    const chunks = [];

    console.log(
      `Splitting PDF: ${totalPages} pages into chunks of ${pagesPerChunk} pages`
    );

    for (let i = 0; i < totalPages; i += pagesPerChunk) {
      const newPdf = await PDFDocument.create();
      const endPage = Math.min(i + pagesPerChunk, totalPages);

      // Copy pages to new document
      const pageIndices = Array.from(
        { length: endPage - i },
        (_, idx) => i + idx
      );
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);

      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      chunks.push({
        buffer: Buffer.from(pdfBytes),
        pageRange: `${i + 1}-${endPage}`,
        chunkIndex: Math.floor(i / pagesPerChunk),
      });
    }

    return chunks;
  } catch (error) {
    console.error("Error splitting PDF:", error);
    throw new Error(`Failed to split PDF: ${error.message}`);
  }
};

// Claude API helper function
const callClaudeAPI = async (messages, model = DEFAULT_MODEL) => {
  if (!APP_CLAUDE_API_KEY) {
    throw new Error("Claude API key not configured");
  }

  await rateLimiter.throttle();

  const modelName =
    model === "haiku"
      ? "claude-3-5-haiku-20241022"
      : "claude-3-5-sonnet-20241022";

  const payload = {
    model: modelName,
    max_tokens: 8192,
    messages,
    temperature: 0,
  };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);

    const options = {
      hostname: "api.anthropic.com",
      port: 443,
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "x-api-key": APP_CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      timeout: API_TIMEOUT,
    };

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(responseData);

          if (res.statusCode !== 200) {
            reject(
              new Error(
                `Claude API returned ${res.statusCode}: ${
                  response.error?.message || responseData
                }`
              )
            );
            return;
          }

          // Track usage
          if (response.usage) {
            const usage = costTracker.trackUsage(
              response.usage.input_tokens,
              response.usage.output_tokens,
              model
            );
            response.costTracking = usage;
          }

          resolve(response);
        } catch (error) {
          reject(
            new Error(`Failed to parse Claude API response: ${error.message}`)
          );
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Claude API request failed: ${error.message}`));
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Claude API request timed out"));
    });

    req.write(data);
    req.end();
  });
};

// Process single PDF chunk
const processChunk = async (chunkBuffer, chunkInfo) => {
  const base64Pdf = chunkBuffer.toString("base64");

  const prompt = `Please analyze this bank statement PDF and extract ONLY the debited transactions (money going out of the account). I need you to identify all transactions where money was deducted/withdrawn from the account.

For each debited transaction, extract the following information:
1. Transaction date
2. Debited amount (the money that went out)
3. Recipient/payee details (who the payment was made to)

Please format your response as a JSON array of objects with exactly these 3 keys:
- "date": transaction date in DD/MM/YYYY format
- "amount": debited amount as a number (without currency symbols)
- "recipient": recipient/payee name or description exactly as it appears in the statement

IMPORTANT: Return ONLY a valid JSON array with no explanatory text, no markdown formatting, no code blocks, and no additional commentary. Your entire response should be parseable JSON.

Instructions:
- IGNORE all credit transactions, deposits, interest payments, or money coming INTO the account
- ONLY include transactions where money went OUT of the account
- For recipient details, extract the EXACT text from the transaction description without any modifications or cleaning
- Keep all UPI IDs, reference numbers, and technical details exactly as shown
- If the amount is in a "Withdrawal" or "Debit" column, include it
- If there are reversals or refunds, exclude them unless specifically debited

Example format:
[
  {
    "date": "01/04/2025",
    "amount": 40.00,
    "recipient": "UPI-AKANSHA NARAYAN SHRI-7558422945-2@AX L-IPOS0000001-496106031655-PAYMENT FROM PHONE"
  },
  {
    "date": "04/04/2025", 
    "amount": 28265.00,
    "recipient": "UPI-CRED CLUB-CRED.CLUB@AXISB-UTIB000011 4-546051192328-PAYMENT ON CRED"
  }
]

Please analyze the entire statement and provide the complete list of debited transactions in this format.`;

  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: prompt,
        },
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Pdf,
          },
        },
      ],
    },
  ];

  const response = await callClaudeAPI(messages, "sonnet");

  if (!response.content || !response.content[0] || !response.content[0].text) {
    throw new Error("Invalid response from Claude API");
  }

  const responseText = response.content[0].text.trim();

  console.log(
    `Chunk ${chunkInfo.pageRange} response length: ${responseText.length} characters`
  );

  // Try to parse JSON from the response
  let transactions;
  try {
    let jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      let jsonString = jsonMatch[0];

      if (!jsonString.endsWith("]")) {
        const lastCommaIndex = jsonString.lastIndexOf(",");
        if (lastCommaIndex > 0) {
          jsonString = jsonString.substring(0, lastCommaIndex) + "]";
        } else {
          jsonString += "]";
        }
      }

      transactions = JSON.parse(jsonString);
    } else {
      transactions = JSON.parse(responseText);
    }
  } catch (parseError) {
    try {
      const objectMatches = responseText.match(/\{[^{}]*"date"[^{}]*\}/g);
      if (objectMatches && objectMatches.length > 0) {
        transactions = objectMatches.map((obj) => JSON.parse(obj));
      } else {
        console.warn(`No transactions found in chunk ${chunkInfo.pageRange}`);
        return [];
      }
    } catch (secondaryError) {
      console.error(
        `Failed to parse chunk ${chunkInfo.pageRange}:`,
        parseError.message
      );
      return [];
    }
  }

  if (!Array.isArray(transactions)) {
    console.warn(`Invalid response format for chunk ${chunkInfo.pageRange}`);
    return [];
  }

  return transactions;
};

// Extract debit transactions from PDF with batch processing
const extractDebitTransactions = async (pdfBuffer) => {
  try {
    // Create cache key based on PDF content
    const pdfHash = crypto.createHash("md5").update(pdfBuffer).digest("hex");
    const cacheKey = `debit_transactions_${pdfHash}`;

    // Check cache first
    if (cache && cache.has(cacheKey)) {
      console.log("Returning cached result for PDF analysis");
      return cache.get(cacheKey);
    }

    // Split PDF into smaller chunks for processing
    const chunks = await splitPDFIntoChunks(pdfBuffer, 2); // 2 pages per chunk
    console.log(`Processing ${chunks.length} chunks`);

    // Process all chunks
    const allTransactions = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(
        `Processing chunk ${i + 1}/${chunks.length} (pages ${
          chunks[i].pageRange
        })`
      );

      try {
        const chunkTransactions = await processChunk(
          chunks[i].buffer,
          chunks[i]
        );

        if (chunkTransactions.length > 0) {
          allTransactions.push(...chunkTransactions);
          console.log(
            `Found ${chunkTransactions.length} transactions in chunk ${chunks[i].pageRange}`
          );
        }
      } catch (chunkError) {
        console.error(
          `Error processing chunk ${chunks[i].pageRange}:`,
          chunkError.message
        );
        // Continue with other chunks
      }
    }

    // Validate and deduplicate transactions
    const validatedTransactions = allTransactions.filter((transaction) => {
      return (
        transaction &&
        typeof transaction === "object" &&
        transaction.date &&
        (transaction.recipient || transaction.payee) &&
        typeof transaction.amount === "number" &&
        transaction.amount > 0
      );
    });

    // Simple deduplication based on date, amount, and recipient
    const uniqueTransactions = validatedTransactions.filter(
      (transaction, index, array) => {
        return (
          index ===
          array.findIndex(
            (t) =>
              t.date === transaction.date &&
              t.amount === transaction.amount &&
              (t.recipient === transaction.recipient ||
                t.payee === transaction.payee)
          )
        );
      }
    );

    console.log(`Total transactions found: ${allTransactions.length}`);
    console.log(`After validation: ${validatedTransactions.length}`);
    console.log(`After deduplication: ${uniqueTransactions.length}`);

    // Cache the result
    if (cache && uniqueTransactions.length > 0) {
      cache.set(cacheKey, uniqueTransactions);
    }

    return uniqueTransactions;
  } catch (error) {
    console.error("Error extracting debit transactions:", error);
    throw error;
  }
};

// Health metrics
const getHealthMetrics = async () => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  return {
    status: "healthy",
    service: "Bank Statement Analyzer",
    optimization: {
      model: DEFAULT_MODEL,
      imageOptimization: ENABLE_IMAGE_OPTIMIZATION,
      caching: ENABLE_CACHE,
      costTracking: ENABLE_COST_TRACKING,
    },
    performance: {
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor(
        (uptime % 3600) / 60
      )}m`,
      memoryUsage: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
    },
    costTracking: costTracker.getStats(),
    rateLimiter: rateLimiter.getStats(),
    cache: cache
      ? {
          keys: cache.keys().length,
          hits: cache.getStats().hits || 0,
          misses: cache.getStats().misses || 0,
          ttl: CACHE_TTL,
        }
      : { enabled: false },
    timestamp: new Date().toISOString(),
    version: "2.0-optimized",
  };
};
// Async version of extractDebitTransactions with database tracking
const extractDebitTransactionsAsync = async (
  pdfBuffer,
  fileName,
  fileSize,
  userId
) => {
  let job = null;

  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Get PDF info first
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();
    const chunksTotal = Math.ceil(totalPages / 2); // 2 pages per chunk

    // Create job in database
    job = await createProcessingJob({
      userId,
      fileName,
      fileSize,
      totalPages,
      chunksTotal,
    });

    // Start processing in background
    processJobAsync(job.id, pdfBuffer);

    return job;
  } catch (error) {
    if (job) {
      await updateProcessingJob(job.id, {
        status: JOB_STATUS.FAILED,
        error_message: error.message,
      });
    }
    throw error;
  }
};

// Background processing function
const processJobAsync = async (jobId, pdfBuffer) => {
  try {
    // Update status to processing
    await updateProcessingJob(jobId, {
      status: JOB_STATUS.PROCESSING,
    });

    // Split PDF into chunks
    const chunks = await splitPDFIntoChunks(pdfBuffer, 2);

    await updateProcessingJob(jobId, {
      chunks_total: chunks.length,
    });

    console.log(`Job ${jobId}: Processing ${chunks.length} chunks`);

    // Process all chunks
    const allTransactions = [];
    let chunksProcessed = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        console.log(
          `Job ${jobId}: Processing chunk ${i + 1}/${chunks.length} (pages ${
            chunks[i].pageRange
          })`
        );

        const chunkTransactions = await processChunk(
          chunks[i].buffer,
          chunks[i]
        );

        if (chunkTransactions.length > 0) {
          allTransactions.push(...chunkTransactions);
          console.log(
            `Job ${jobId}: Found ${chunkTransactions.length} transactions in chunk ${chunks[i].pageRange}`
          );
        }

        chunksProcessed++;

        // Update progress
        await updateProcessingJob(jobId, {
          chunks_processed: chunksProcessed,
          total_transactions: allTransactions.length,
        });
      } catch (chunkError) {
        console.error(
          `Job ${jobId}: Error processing chunk ${chunks[i].pageRange}:`,
          chunkError.message
        );
        chunksProcessed++;

        await updateProcessingJob(jobId, {
          chunks_processed: chunksProcessed,
        });
      }
    }

    // Validate and deduplicate transactions
    const validatedTransactions = allTransactions.filter((transaction) => {
      return (
        transaction &&
        typeof transaction === "object" &&
        transaction.date &&
        (transaction.recipient || transaction.payee) &&
        typeof transaction.amount === "number" &&
        transaction.amount > 0
      );
    });

    // Simple deduplication
    const uniqueTransactions = validatedTransactions.filter(
      (transaction, index, array) => {
        return (
          index ===
          array.findIndex(
            (t) =>
              t.date === transaction.date &&
              t.amount === transaction.amount &&
              (t.recipient === transaction.recipient ||
                t.payee === transaction.payee)
          )
        );
      }
    );

    console.log(
      `Job ${jobId}: Total: ${allTransactions.length}, Validated: ${validatedTransactions.length}, Final: ${uniqueTransactions.length}`
    );

    // Update job as completed
    await updateProcessingJob(jobId, {
      status: JOB_STATUS.COMPLETED,
      total_transactions: allTransactions.length,
      validated_transactions: validatedTransactions.length,
      final_transactions: uniqueTransactions.length,
      result: uniqueTransactions,
      progress_percentage: 100.0,
    });
  } catch (error) {
    console.error(`Job ${jobId}: Processing failed:`, error);

    await updateProcessingJob(jobId, {
      status: JOB_STATUS.FAILED,
      error_message: error.message,
    });
  }
};

module.exports = {
  getHealthMetrics,
  extractDebitTransactions,
  extractDebitTransactionsAsync,
};
