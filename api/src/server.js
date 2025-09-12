import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { q } from "./db.js";
import { sanitizeString, logSecurityEvent } from "./utils/security.js";

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
import logger from "./utils/logger.js";

const app = express();

// Trust proxy for rate limiting (required for Render)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure CORS before other middleware
app.use(cors({
  origin: [
    'https://hr-web.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Session-ID', 'x-session-id', 'X-CSRF-Token']
}));

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/auth', authLimiter);

app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Input sanitization middleware
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }
  
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    }
  }
  
  next();
});

app.use(morgan("combined"));

// Simple test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working" });
});

// CORS test route
app.get("/api/cors-test", (req, res) => {
  res.json({ 
    message: "CORS is working", 
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Test route
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await q("SELECT COUNT(*) FROM leave_requests");
    res.json({ count: result.rows[0].count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test analytics route
app.get("/api/analytics/test", (req, res) => {
  res.json({ message: "Analytics test route is working" });
});

app.use("/api/auth", auth);
app.use("/api/employees", employees);
app.use("/api/payroll", payroll);
app.use("/api/compliance", compliance);
app.use("/api/leave", leave);
app.use("/api/performance", performance);
app.use("/api/analytics", analytics);
app.use("/api/metrics", metrics);
app.use("/api/settings", settings);
app.use("/api/health", health);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  logger.info(`API server started on port ${port}`);
  console.log(`API listening on ${port}`);
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

process.on('uncaughtException', (error) => {
  logger.logError(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});
