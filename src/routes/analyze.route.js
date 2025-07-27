const express = require("express");
const { analyzeController } = require("../controllers");
const { extractUserId } = require("../middleware/auth.middleware");

const multer = require("multer");

const analyzeRoutes = express.Router({});

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

analyzeRoutes.get("/health", analyzeController.healthCheck);
analyzeRoutes.post("/statement", upload.single("pdf"), analyzeController.extractDebitTransactions);
analyzeRoutes.post("/statement/async", extractUserId, upload.single("pdf"), analyzeController.extractDebitTransactionsAsync);
analyzeRoutes.get("/status/:jobId", extractUserId, analyzeController.getJobStatus);

module.exports = analyzeRoutes;
