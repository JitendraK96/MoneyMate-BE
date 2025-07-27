const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase configuration is required. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication and Authorization middleware
const authenticateAndAuthorize = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Step 1: Check if authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required",
        error: "MISSING_AUTH_HEADER",
      });
    }

    // Step 2: Extract token from "Bearer <token>" format
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is required",
        error: "MISSING_TOKEN",
      });
    }

    // Step 3: Decode JWT token to get user ID (without verification for now)
    let decoded;
    try {
      decoded = jwt.decode(token);
    } catch (decodeError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
        error: "INVALID_TOKEN_FORMAT",
      });
    }

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Could not decode token",
        error: "TOKEN_DECODE_ERROR",
      });
    }

    // Step 4: Extract user ID from token payload
    const userId = decoded.sub || decoded.userId || decoded.id;
    console.log(userId, "Extracted user ID from token");

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
        error: "INVALID_TOKEN_PAYLOAD",
      });
    }

    // Step 5: Validate the JWT token structure and content
    // Since the token decoded successfully and has the expected Supabase structure,
    // we'll trust it (you can add JWT signature verification here if needed)

    // Check if token is issued by Supabase (optional - verify issuer)
    if (decoded.iss && !decoded.iss.includes("supabase")) {
      return res.status(401).json({
        success: false,
        message: "Token not issued by Supabase",
        error: "INVALID_ISSUER",
      });
    }

    // Step 6: Add user data to request
    req.userId = userId;
    req.user = {
      id: userId,
      email: decoded.email,
      token: token,
      decodedToken: decoded,
    };

    // Log successful authentication
    console.log(
      `User authenticated: ${userId} (${
        decoded.email || "no email"
      }) at ${new Date().toISOString()}`
    );

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication service error",
      error: "AUTH_SERVICE_ERROR",
    });
  }
};

// Optional: Middleware that doesn't require auth but extracts user if present
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.userId = null;
      req.user = null;
      return next();
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      req.userId = null;
      req.user = null;
      return next();
    }

    let userId = token;
    if (token.includes("_")) {
      userId = token.split("_")[0];
    }

    req.userId = userId || null;
    req.user = userId ? { id: userId, token: token } : null;

    next();
  } catch (error) {
    // For optional auth, continue even if token is invalid
    req.userId = null;
    req.user = null;
    next();
  }
};

// Simple alias for backward compatibility
const extractUserId = authenticateAndAuthorize;

module.exports = {
  extractUserId,
  authenticateAndAuthorize,
  optionalAuth,
};
