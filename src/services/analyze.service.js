const {
  APP_CLAUDE_API_KEY,
  APP_CLAUDE_MESSAGE_URL,
  APP_CLAUDE_BATCH_URL,
  DEFAULT_MODEL,
  IMAGE_MAX_WIDTH,
  IMAGE_MAX_HEIGHT,
  IMAGE_COMPRESSION_QUALITY,
  RATE_LIMIT_PER_MINUTE,
  DAILY_COST_LIMIT,
  MONTHLY_COST_LIMIT,
  CACHE_TTL,
  CACHE_MAX_KEYS,
  ENABLE_CACHE,
  ENABLE_IMAGE_OPTIMIZATION,
  ENABLE_COST_TRACKING,
  API_TIMEOUT,
  RETRY_ATTEMPTS,
  RETRY_DELAY,
  CLAUDE_PRICING,
  USD_TO_INR_RATE,
} = require("../config");

const sharp = require("sharp");
const NodeCache = require("node-cache");
const crypto = require("crypto");

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

// Image optimization
const optimizeImage = async (base64Data, imageType) => {
  console.log("🔍 Optimizing image...", !ENABLE_IMAGE_OPTIMIZATION);
  if (!ENABLE_IMAGE_OPTIMIZATION) {
    return {
      data: base64Data,
      type: imageType,
      compressed: false,
      message: "Image optimization disabled",
    };
  }

  try {
    const buffer = Buffer.from(base64Data, "base64");
    const originalSize = buffer.length;

    const optimized = await sharp(buffer)
      .resize(IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: IMAGE_COMPRESSION_QUALITY })
      .toBuffer();

    const compressionRatio =
      ((originalSize - optimized.length) / originalSize) * 100;

    console.log(
      `📸 Image optimized: ${originalSize} → ${
        optimized.length
      } bytes (${compressionRatio.toFixed(1)}% reduction)`
    );

    return {
      data: optimized.toString("base64"),
      type: "image/jpeg",
      compressed: true,
      originalSize,
      optimizedSize: optimized.length,
      compressionRatio,
      tokensSaved: Math.floor((originalSize - optimized.length) / 4), // Rough estimate
    };
  } catch (error) {
    console.error("Image optimization failed:", error);
    // Fallback to original if optimization fails
    return {
      data: base64Data,
      type: imageType,
      compressed: false,
      error: error.message,
      fallback: true,
    };
  }
};

// Optimized prompt generator
const getOptimizedPrompt = (customPrompt) => {
  if (customPrompt && customPrompt.trim()) {
    return customPrompt;
  }

  return `Extract debit transactions from this bank statement. Return JSON:
{
  "transactions": [
    {
      "date": "DD-MM-YYYY",
      "amount": number,
      "payee": "string"
    }
  ]
}

Rules:
- Only debits (outgoing money)
- Date format: DD-MM-YYYY  
- Amount as number only
- Include payee name
- Valid JSON only`;
};

// Retry logic with exponential backoff
const retryWithBackoff = async (fn, maxRetries = RETRY_ATTEMPTS) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Don't retry on certain errors
      if (
        error.message.includes("401") ||
        error.message.includes("403") ||
        error.message.includes("cost limit")
      ) {
        throw error;
      }

      const delay = Math.min(RETRY_DELAY * Math.pow(2, i), 10000); // Max 10s delay
      console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Main analyze function (updated from your original)
const analyzeStatement = async ({
  prompt,
  imageType,
  base64Data,
  model = DEFAULT_MODEL,
}) => {
  const startTime = Date.now();

  try {
    // Generate cache key
    const cacheKey = crypto
      .createHash("md5")
      .update(base64Data + (prompt || "") + model)
      .digest("hex");

    // Check cache first
    if (cache && ENABLE_CACHE) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log("💾 Cache hit for image analysis");
        return {
          ...cached,
          cached: true,
          processingTime: Date.now() - startTime,
        };
      }
    }

    // Rate limiting
    await rateLimiter.throttle();

    // Optimize image
    const optimizedImage = await optimizeImage(base64Data, imageType);

    // Get optimized prompt
    const finalPrompt = getOptimizedPrompt(prompt);

    // Prepare API request
    const makeRequest = async () => {
      const modelName = "claude-3-5-sonnet-20241022";
      const maxTokens = 4000;

      console.log(`🤖 Using ${modelName} with max_tokens: ${maxTokens}`);

      const requestBody = {
        model: modelName,
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: finalPrompt },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: optimizedImage.type,
                  data: optimizedImage.data,
                },
              },
            ],
          },
        ],
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      try {
        const anthropicResponse = await fetch(APP_CLAUDE_MESSAGE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": APP_CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!anthropicResponse.ok) {
          const err = await anthropicResponse.text();
          throw new Error(
            `Claude API returned ${anthropicResponse.status}: ${err}`
          );
        }

        return anthropicResponse.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    // Make request with retry logic
    const data = await retryWithBackoff(makeRequest);
    const content = data.content[0].text;

    // Track usage and cost
    const usage = data.usage || {};
    const costInfo = costTracker.trackUsage(
      usage.input_tokens || 0,
      usage.output_tokens || 0,
      model
    );

    const result = {
      content,
      usage,
      cost: costInfo,
      optimization: optimizedImage,
      model: model === "haiku" ? "claude-3-5-haiku" : "claude-3-5-sonnet",
      cached: false,
      processingTime: Date.now() - startTime,
      prompt: finalPrompt,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    if (cache && ENABLE_CACHE) {
      cache.set(cacheKey, result);
      console.log("💾 Result cached for future requests");
    }

    console.log(
      `✅ Analysis complete: ${
        result.processingTime
      }ms, $${costInfo.cost.toFixed(6)}`
    );

    return result;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(
      `❌ Analysis failed after ${processingTime}ms:`,
      error.message
    );
    throw error;
  }
};

// Batch processing
const analyzeStatementsBatch = async ({
  requests,
  model = DEFAULT_MODEL,
  batchSize = 20,
}) => {
  const results = [];
  const totalBatches = Math.ceil(requests.length / batchSize);

  console.log(
    `📦 Processing ${requests.length} requests in ${totalBatches} batches`
  );
  console.log(
    `🤖 Using model: ${
      model === "haiku" ? "claude-3-5-haiku" : "claude-3-5-sonnet"
    }`
  );

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(
      `⚡ Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`
    );

    // Process batch in parallel with concurrency control
    const batchPromises = batch.map(async (request, index) => {
      try {
        // Add small delay to prevent overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, index * 100));

        return await analyzeStatement({
          prompt: request.prompt || getOptimizedPrompt(),
          imageType: request.imageType,
          base64Data: request.base64Data,
          model,
        });
      } catch (error) {
        console.error(
          `❌ Batch item ${request.id || index} failed:`,
          error.message
        );
        return {
          error: error.message,
          requestId: request.id || `batch_${batchNumber}_${index}`,
          success: false,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Progress update
    const successful = batchResults.filter((r) => !r.error).length;
    const failed = batchResults.filter((r) => r.error).length;
    console.log(
      `✅ Batch ${batchNumber} complete: ${successful} success, ${failed} failed`
    );

    // Delay between batches to respect rate limits
    if (i + batchSize < requests.length) {
      console.log("⏳ Waiting before next batch...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  const totalSuccessful = results.filter((r) => !r.error).length;
  const totalFailed = results.filter((r) => r.error).length;
  const totalCost = results.reduce((sum, r) => sum + (r.cost?.cost || 0), 0);

  console.log(
    `🎉 Batch processing complete: ${totalSuccessful}/${results.length} successful`
  );
  console.log(
    `💰 Total cost: $${totalCost.toFixed(4)} (₹${(
      totalCost * USD_TO_INR_RATE
    ).toFixed(2)})`
  );

  return results;
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

// Batch status placeholder (for future Claude Batch API)
const getBatchStatus = async (batchId) => {
  return {
    batchId,
    status: "completed",
    message: "Batch processing completed successfully",
    note: "This is a placeholder for future Claude Batch API integration",
  };
};

// Utility functions
const clearCache = () => {
  if (cache) {
    cache.flushAll();
    console.log("🗑️  Cache cleared");
  }
};

const resetCostTracker = () => {
  costTracker.reset();
  console.log("💰 Cost tracker reset");
};

module.exports = {
  analyzeStatement,
  analyzeStatementsBatch,
  getHealthMetrics,
  getBatchStatus,
  clearCache,
  resetCostTracker,
  costTracker,
  rateLimiter,
};
