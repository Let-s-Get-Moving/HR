import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { q } from "./db.js";
import { sanitizeString, logSecurityEvent } from "./utils/security.js";
import security from "./middleware/security.js";

import employees from "./routes/employees.js";
import auth from "./routes/auth.js";
import payroll from "./routes/payroll.js";
import compliance from "./routes/compliance.js";
import leave from "./routes/leave.js";
import performance from "./routes/performance.js";
import analytics from "./routes/analytics.js";
import metrics from "./routes/metrics.js";
import settings from "./routes/settings.js";
import health from "./routes/health.js";
import termination from "./routes/termination.js";
import bonuses from "./routes/bonuses.js";
import commissions from "./routes/commissions.js";
import recruiting from "./routes/recruiting.js";
import benefits from "./routes/benefits.js";
import imports from "./routes/imports.js";
import admin from "./routes/admin.js";
import logger from "./utils/logger.js";

const app = express();

// Trust proxy for rate limiting (required for Render)
app.set('trust proxy', 1);

// Apply corporate-grade security middleware
app.use(security.securityHeaders);
app.use(security.corsSecurity);
app.use(security.sqlInjectionPrevention);
app.use(security.sanitizeInput);
app.use(security.requestSizeLimit('10mb'));
app.use(security.auditLog);
app.use(security.sessionSecurity);

// Apply rate limiting
app.use(security.apiRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Health check endpoint (no rate limiting)
app.use('/health', health);

// Apply stricter rate limiting to auth endpoints
app.use('/api/auth', security.authRateLimit);

// Apply admin rate limiting to admin endpoints
app.use('/api/admin', security.adminRateLimit);

// Apply upload rate limiting to import endpoints
app.use('/api/imports', security.uploadRateLimit);

// Routes
app.use("/api/employees", employees);
app.use("/api/auth", auth);
app.use("/api/payroll", payroll);
app.use("/api/compliance", compliance);
app.use("/api/leave", leave);
app.use("/api/performance", performance);
app.use("/api/analytics", analytics);
app.use("/api/metrics", metrics);
app.use("/api/settings", settings);
app.use("/api/termination", termination);
app.use("/api/bonuses", bonuses);
app.use("/api/commissions", commissions);
app.use("/api/recruiting", recruiting);
app.use("/api/benefits", benefits);
app.use("/api/imports", imports);
app.use("/api/admin", admin);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "HR Management System API",
    version: "1.0.0",
    status: "operational",
    timestamp: new Date().toISOString(),
    security: "corporate-grade"
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error("Unhandled error:", error);
  
  // Log security event for suspicious errors
  if (error.status === 400 || error.status === 401 || error.status === 403) {
    logSecurityEvent('suspicious_request', 'medium', {
      error: error.message,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  
  res.status(error.status || 500).json({
    error: error.message || "Internal server error",
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  logger.info(`API server started on port ${PORT}`);
  console.log(`API listening on ${PORT}`);
  console.log("Database connected successfully");
});

export default app;