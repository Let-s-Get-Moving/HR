// Logging utility for the API

import fs from 'fs';
import path from 'path';

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFileName(level) {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${level}-${date}.log`);
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
    };
    return JSON.stringify(logEntry) + '\n';
  }

  writeToFile(level, message, meta = {}) {
    const logFile = this.getLogFileName(level);
    const formattedMessage = this.formatMessage(level, message, meta);
    
    fs.appendFileSync(logFile, formattedMessage, 'utf8');
  }

  log(level, message, meta = {}) {
    // Console output
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, meta);
        break;
      case 'warn':
        console.warn(logMessage, meta);
        break;
      case 'info':
        console.info(logMessage, meta);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(logMessage, meta);
        }
        break;
      default:
        console.log(logMessage, meta);
    }

    // File output
    this.writeToFile(level, message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // HTTP request logging
  logRequest(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.session?.userId || 'anonymous',
    };

    if (res.statusCode >= 400) {
      this.error(`${req.method} ${req.url} - ${res.statusCode}`, meta);
    } else {
      this.info(`${req.method} ${req.url} - ${res.statusCode}`, meta);
    }
  }

  // Error logging with stack trace
  logError(error, req = null) {
    const meta = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    if (req) {
      meta.request = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      };
    }

    this.error('Unhandled error', meta);
  }

  // Performance logging
  logPerformance(operation, duration, meta = {}) {
    const level = duration > 1000 ? 'warn' : 'info';
    this.log(level, `Performance: ${operation} took ${duration}ms`, meta);
  }

  // Security logging
  logSecurity(event, meta = {}) {
    this.warn(`Security event: ${event}`, meta);
  }

  // Audit logging
  logAudit(action, userId, resource, meta = {}) {
    this.info(`Audit: ${action}`, {
      userId,
      resource,
      ...meta,
    });
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
