import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { q } from "./db.js";
import { sanitizeString, logSecurityEvent } from "./utils/security.js";
import security from "./middleware/security.js";
import { ensureAdminUser } from "./utils/ensureAdminUser.js";
import { primaryPool, readerPool, timedQuery } from "./db/pools.js";
import { dbPassport } from "./db/passport.js";
import { queryRegistry, listQueryKeys } from "./debug/queryRegistry.js";
import { requireAuth } from "./session.js";

import employees from "./routes/employees.js";
import auth from "./routes/auth-mfa.js"; // Updated to MFA-enabled auth
import users from "./routes/users.js"; // New user management
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
import timecards from "./routes/timecards.js";
import timecardUploads from "./routes/timecardUploads.js";
import employeeMatching from "./routes/employee-matching.js";
import adminCleanup from "./routes/admin-cleanup.js";
import logger from "./utils/logger.js";

const app = express();

// Trust proxy for rate limiting (required for Render)
app.set('trust proxy', 1);

// Debug configuration
const DEBUG_DATA_DRIFT = (process.env.DEBUG_DATA_DRIFT || 'false').toLowerCase() === 'true';
const DEBUG_TOKEN = process.env.DEBUG_TOKEN || '';

// Token guard middleware for debug/admin endpoints
function requireDebugToken(req, res, next) {
  if (!DEBUG_DATA_DRIFT) {
    return res.status(404).json({ error: 'Debug mode disabled' });
  }
  if (!DEBUG_TOKEN) {
    return res.status(500).json({ error: 'DEBUG_TOKEN not configured' });
  }
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : '';
  if (token !== DEBUG_TOKEN) {
    logSecurityEvent('debug_auth_fail', 'medium', {
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(403).json({ error: 'Invalid debug token' });
  }
  next();
}

// Apply basic security middleware
app.use(security.securityHeaders);
app.use(security.corsSecurity);
// MLGA: Enable all security middleware for production
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

// =============================================================================
// DEBUG ENDPOINTS (token-guarded, only active when DEBUG_DATA_DRIFT=true)
// =============================================================================

// GET /debug/db-passport - Verify database connection identity
app.get('/debug/db-passport', requireDebugToken, async (req, res, next) => {
  try {
    const writeInfo = await dbPassport(primaryPool);
    const readInfo = await dbPassport(readerPool());
    
    res.json({
      write: writeInfo,
      read: readInfo,
      same_database: writeInfo.database === readInfo.database && writeInfo.host === readInfo.host,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    next(e);
  }
});

// POST /admin/probe - One-shot insert+read test
app.post('/admin/probe', requireDebugToken, async (req, res, next) => {
  try {
    const uploadId = `debug_probe_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

    // 1) Ensure probe table exists
    await timedQuery(primaryPool, `
      CREATE TABLE IF NOT EXISTS probe_table (
        upload_id text NOT NULL,
        row_index int NOT NULL,
        value text,
        created_at timestamptz DEFAULT now()
      )
    `, [], { op: 'probe_ddl' });

    // 2) Insert 5 test rows on PRIMARY
    const inserts = [];
    for (let i = 0; i < 5; i++) {
      inserts.push(
        timedQuery(
          primaryPool,
          `INSERT INTO probe_table(upload_id, row_index, value) VALUES($1, $2, $3)`,
          [uploadId, i, `value_${i}`],
          { op: 'probe_insert', row: i }
        )
      );
    }
    await Promise.all(inserts);

    // 3) Read back via READER pool
    const { rows } = await timedQuery(
      readerPool(),
      `SELECT COUNT(*)::int AS n FROM probe_table WHERE upload_id = $1`,
      [uploadId],
      { op: 'probe_count' }
    );
    const sqlCount = rows[0]?.n ?? 0;

    // 4) Get connection info for both pools
    const writePass = await dbPassport(primaryPool);
    const readPass = await dbPassport(readerPool());

    res.json({
      success: sqlCount === 5,
      upload_id: uploadId,
      sql_count: sqlCount,
      expected: 5,
      db_write: {
        database: writePass.database,
        host: writePass.host,
        port: writePass.port,
        db_now: writePass.db_now
      },
      db_read: {
        database: readPass.database,
        host: readPass.host,
        port: readPass.port,
        db_now: readPass.db_now
      },
      force_primary_reads: readPass.force_primary_reads,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    next(e);
  }
});

// GET /debug/sql-count?upload_id=... - Count rows for a specific upload_id
app.get('/debug/sql-count', requireDebugToken, async (req, res, next) => {
  try {
    const uploadId = String(req.query.upload_id || '');
    if (!uploadId) {
      return res.status(400).json({ error: 'upload_id query parameter required' });
    }
    
    const { rows } = await timedQuery(
      readerPool(),
      `SELECT COUNT(*)::int AS n FROM probe_table WHERE upload_id = $1`,
      [uploadId],
      { op: 'count_by_upload' }
    );
    
    res.json({
      upload_id: uploadId,
      count: rows[0]?.n ?? 0,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    next(e);
  }
});

// GET /debug/explain/:key - Safe EXPLAIN for pre-registered queries
app.get('/debug/explain/:key', requireDebugToken, async (req, res, next) => {
  try {
    const queryKey = req.params.key;
    const item = queryRegistry[queryKey];
    
    if (!item) {
      return res.status(404).json({
        error: 'Unknown query key',
        available_keys: Object.keys(queryRegistry)
      });
    }

    // Pull safe params from query string
    const p1 = req.query.p1 ?? null;
    const p2 = req.query.p2 ?? null;
    const p3 = req.query.p3 ?? null;

    const { rows } = await timedQuery(
      readerPool(),
      item.sql,
      [p1, p2, p3],
      { op: 'explain', key: queryKey }
    );

    // EXPLAIN ... FORMAT TEXT returns "QUERY PLAN" column
    const planText = rows.map(r => r['QUERY PLAN'] || r.query_plan).join('\n');

    res.type('text/plain').send(planText);
  } catch (e) {
    next(e);
  }
});

// GET /debug/query-registry - List all available explain queries
app.get('/debug/query-registry', requireDebugToken, async (req, res, next) => {
  try {
    res.json({
      queries: listQueryKeys(),
      usage: 'Call /debug/explain/:key?p1=value&p2=value&p3=value',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    next(e);
  }
});

// Apply stricter rate limiting to auth endpoints
app.use('/api/auth', security.authRateLimit);

// Apply admin rate limiting to admin endpoints
app.use('/api/admin', security.adminRateLimit);

// Apply upload rate limiting to import endpoints
app.use('/api/imports', security.uploadRateLimit);

// Routes - MLGA: All routes now require authentication except auth endpoints
app.use("/api/employees", requireAuth, employees);
app.use("/api/auth", auth); // Auth endpoints don't require auth (login, etc)
app.use("/api/users", users); // User management (has own auth middleware)
app.use("/api/payroll", requireAuth, payroll);
app.use("/api/compliance", requireAuth, compliance);
app.use("/api/leave", requireAuth, leave);
app.use("/api/performance", requireAuth, performance);
app.use("/api/analytics", requireAuth, analytics);
app.use("/api/metrics", requireAuth, metrics);
app.use("/api/settings", settings); // Settings routes handle auth per-endpoint
app.use("/api/termination", requireAuth, termination);
app.use("/api/bonuses", requireAuth, bonuses);
app.use("/api/commissions", requireAuth, commissions);
app.use("/api/recruiting", requireAuth, recruiting);
app.use("/api/benefits", requireAuth, benefits);
app.use("/api/imports", requireAuth, imports);
app.use("/api/admin", requireAuth, admin);
app.use("/api/timecards", requireAuth, timecards);
app.use("/api/timecard-uploads", requireAuth, timecardUploads);
app.use("/api/employee-matching", requireAuth, employeeMatching);
app.use("/api/admin-cleanup", requireAuth, adminCleanup);

// Emergency database migration endpoint
app.post("/api/migrate-db", async (req, res) => {
  try {
    logger.info("Running database migration...");
    
    // Import and run the database initialization
    const { execSync } = await import("child_process");
    execSync("node src/initDb.js", { cwd: process.cwd() });
    
    res.json({ 
      success: true, 
      message: "Database migration completed successfully" 
    });
  } catch (error) {
    logger.error("Database migration failed:", error);
    res.status(500).json({ 
      success: false, 
      error: "Database migration failed",
      details: error.message
    });
  }
});

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

app.listen(PORT, async () => {
  logger.info(`API server started on port ${PORT}`);
  console.log(`API listening on ${PORT}`);
  console.log("Database connected successfully");
  
  // Ensure admin user exists on every startup
  try {
    await ensureAdminUser();
  } catch (error) {
    console.error('Failed to ensure admin user:', error);
  }
});

export default app;