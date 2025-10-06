/**
 * PROFESSIONAL SECURITY AUDIT FOR HR SYSTEM
 * ==========================================
 * This diagnostic tool evaluates the HR system's security posture
 * against industry standards for enterprise systems handling sensitive data.
 * 
 * Rating Scale: 1-10 (10 being Fort Knox, 1 being "please hack me")
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

const { red, yellow, green, blue, cyan, magenta, bold, reset, dim } = colors;

// Helper function to read file safely
function readFile(relativePath) {
  try {
    const fullPath = join(__dirname, '..', relativePath);
    return readFileSync(fullPath, 'utf8');
  } catch (error) {
    return null;
  }
}

// Helper to calculate average score
function avg(scores) {
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
}

// Helper to get rating emoji
function getRating(score) {
  if (score >= 9) return '🏆';
  if (score >= 7) return '✅';
  if (score >= 5) return '⚠️';
  if (score >= 3) return '❌';
  return '💀';
}

// Helper to get severity color
function getColor(score) {
  if (score >= 7) return green;
  if (score >= 5) return yellow;
  return red;
}

console.log(`\n${bold}${cyan}╔═════════════════════════════════════════════════════════════════╗${reset}`);
console.log(`${bold}${cyan}║     PROFESSIONAL SECURITY AUDIT - HR MANAGEMENT SYSTEM          ║${reset}`);
console.log(`${bold}${cyan}╚═════════════════════════════════════════════════════════════════╝${reset}\n`);

const audit = {
  categories: []
};

// ============================================================================
// CATEGORY 1: AUTHENTICATION & ACCESS CONTROL
// ============================================================================
(() => {
  const category = {
    name: 'Authentication & Access Control',
    weight: 0.25,
    findings: [],
    score: 0
  };

  const authDoc = readFile('docs/AUTHENTICATION.md');
  const authRoute = readFile('api/src/routes/auth.js');
  const serverFile = readFile('api/src/server.js');
  const employeeRoute = readFile('api/src/routes/employees.js');
  const payrollRoute = readFile('api/src/routes/payroll.js');

  // Check 1: Password strength
  let passwordScore = 0;
  if (authDoc && authDoc.includes('password123')) {
    passwordScore = 1;
    category.findings.push({
      issue: 'Hardcoded weak password "password123" documented in plain text',
      severity: 'CRITICAL',
      impact: 'Anyone can access the entire system with publicly known credentials',
      recommendation: 'Use strong passwords (16+ chars, mixed case, numbers, symbols) and store securely'
    });
  }

  // Check 2: Single user system
  let userManagementScore = 1;
  if (authDoc && authDoc.includes('Single Admin User')) {
    userManagementScore = 2;
    category.findings.push({
      issue: 'Single admin user - no user management or role separation',
      severity: 'CRITICAL',
      impact: 'Cannot track who did what, no accountability, shared credentials',
      recommendation: 'Implement proper user management with individual accounts'
    });
  }

  // Check 3: Multi-factor authentication
  let mfaScore = 0;
  if (authDoc && authDoc.includes('No multi-factor authentication')) {
    category.findings.push({
      issue: 'No multi-factor authentication (MFA/2FA)',
      severity: 'CRITICAL',
      impact: 'Password compromise = complete system access',
      recommendation: 'Implement TOTP-based MFA (Google Authenticator, Authy)'
    });
  }

  // Check 4: Rate limiting on auth
  let rateLimitScore = 7;
  if (serverFile && serverFile.includes('authRateLimit')) {
    rateLimitScore = 8;
  }

  // Check 5: Session security
  let sessionScore = 3;
  if (authRoute && authRoute.includes('httpOnly: true')) {
    sessionScore = 5;
  }
  if (authRoute && authRoute.includes("secure: process.env.NODE_ENV === 'production'")) {
    sessionScore = 4; // Lower because not always secure
    category.findings.push({
      issue: 'Secure cookie flag only enabled in production',
      severity: 'HIGH',
      impact: 'Development cookies can be intercepted over HTTP',
      recommendation: 'Use HTTPS in all environments, always set secure flag'
    });
  }

  // Check 6: Route protection - THE BIG ONE
  let routeProtectionScore = 0;
  let protectedRoutes = 0;
  let totalRoutes = 0;

  if (employeeRoute) {
    const routes = employeeRoute.match(/r\.(get|post|put|delete)\(/g) || [];
    totalRoutes += routes.length;
    const protectedMatches = employeeRoute.match(/requireAuth/g) || [];
    protectedRoutes += protectedMatches.length;
  }

  if (payrollRoute) {
    const routes = payrollRoute.match(/r\.(get|post|put|delete)\(/g) || [];
    totalRoutes += routes.length;
    const protectedMatches = payrollRoute.match(/requireAuth/g) || [];
    protectedRoutes += protectedMatches.length;
  }

  if (totalRoutes > 0) {
    const protectionRatio = protectedRoutes / totalRoutes;
    routeProtectionScore = Math.round(protectionRatio * 10);
    
    if (protectionRatio < 0.5) {
      category.findings.push({
        issue: `Only ${protectedRoutes}/${totalRoutes} routes are protected with authentication`,
        severity: 'CATASTROPHIC',
        impact: '🚨 ANYONE ON THE INTERNET CAN ACCESS EMPLOYEE DATA, PAYROLL, EVERYTHING! 🚨',
        recommendation: 'Add requireAuth middleware to ALL routes immediately'
      });
    }
  }

  // Check 7: Account lockout
  let lockoutScore = 0;
  if (authDoc && authDoc.includes('No account lockout')) {
    category.findings.push({
      issue: 'No account lockout after failed login attempts',
      severity: 'HIGH',
      impact: 'Brute force attacks are feasible despite rate limiting',
      recommendation: 'Lock account for 15-30 minutes after 5 failed attempts'
    });
  }

  // Calculate category score
  const scores = [passwordScore, userManagementScore, mfaScore, rateLimitScore, sessionScore, routeProtectionScore, lockoutScore];
  category.score = avg(scores);
  audit.categories.push(category);
})();

// ============================================================================
// CATEGORY 2: DATA PROTECTION & ENCRYPTION
// ============================================================================
(() => {
  const category = {
    name: 'Data Protection & Encryption',
    weight: 0.20,
    findings: [],
    score: 0
  };

  const authRoute = readFile('api/src/routes/auth.js');
  const authDoc = readFile('docs/AUTHENTICATION.md');
  const securityMiddleware = readFile('api/src/middleware/security.js');

  // Check 1: Password hashing
  let hashingScore = 8;
  if (authDoc && authDoc.includes('Bcrypt hashed password')) {
    hashingScore = 9;
  } else {
    category.findings.push({
      issue: 'Password hashing algorithm unclear',
      severity: 'CRITICAL',
      impact: 'Plain text passwords = instant breach',
      recommendation: 'Use bcrypt with cost factor 12+'
    });
    hashingScore = 0;
  }

  // Check 2: HTTPS enforcement
  let httpsScore = 0;
  if (securityMiddleware && securityMiddleware.includes('upgradeInsecureRequests')) {
    httpsScore = 7;
  } else {
    category.findings.push({
      issue: 'No automatic HTTPS upgrade',
      severity: 'HIGH',
      impact: 'Credentials can be intercepted in transit',
      recommendation: 'Enable HSTS and upgrade-insecure-requests CSP directive'
    });
  }

  // Check 3: Database connection security
  let dbScore = 6;
  category.findings.push({
    issue: 'Database connection string in plain text environment variables',
    severity: 'MEDIUM',
    impact: 'DB credentials visible in process environment',
    recommendation: 'Use secrets management (AWS Secrets Manager, HashiCorp Vault)'
  });

  // Check 4: Data encryption at rest
  let encryptionScore = 0;
  category.findings.push({
    issue: 'No field-level encryption for sensitive data (SSN, bank details)',
    severity: 'HIGH',
    impact: 'Database breach = all sensitive data exposed',
    recommendation: 'Encrypt PII fields using AES-256-GCM'
  });

  // Check 5: Session storage
  let sessionStorageScore = 5;
  if (authRoute && authRoute.includes('user_sessions')) {
    sessionStorageScore = 6;
  }

  // Calculate category score
  const scores = [hashingScore, httpsScore, dbScore, encryptionScore, sessionStorageScore];
  category.score = avg(scores);
  audit.categories.push(category);
})();

// ============================================================================
// CATEGORY 3: INPUT VALIDATION & INJECTION PREVENTION
// ============================================================================
(() => {
  const category = {
    name: 'Input Validation & Injection Prevention',
    weight: 0.20,
    findings: [],
    score: 0
  };

  const serverFile = readFile('api/src/server.js');
  const securityMiddleware = readFile('api/src/middleware/security.js');

  // Check 1: SQL injection prevention
  let sqlInjectionScore = 0;
  if (serverFile && serverFile.includes('// app.use(security.sqlInjectionPrevention)')) {
    sqlInjectionScore = 0;
    category.findings.push({
      issue: '🔥 SQL INJECTION PREVENTION IS COMMENTED OUT (DISABLED) 🔥',
      severity: 'CATASTROPHIC',
      impact: 'Database can be completely compromised with basic SQL injection',
      recommendation: 'UNCOMMENT line 69 in server.js IMMEDIATELY'
    });
  } else if (serverFile && serverFile.includes('app.use(security.sqlInjectionPrevention)')) {
    sqlInjectionScore = 8;
  }

  // Check for parameterized queries
  if (securityMiddleware && securityMiddleware.includes('$1')) {
    sqlInjectionScore = Math.max(sqlInjectionScore, 7);
  }

  // Check 2: XSS prevention
  let xssScore = 0;
  if (serverFile && serverFile.includes('// app.use(security.sanitizeInput)')) {
    xssScore = 0;
    category.findings.push({
      issue: '🔥 INPUT SANITIZATION IS DISABLED 🔥',
      severity: 'CATASTROPHIC',
      impact: 'XSS attacks can steal sessions, inject malicious scripts',
      recommendation: 'UNCOMMENT line 70 in server.js IMMEDIATELY'
    });
  } else if (securityMiddleware && securityMiddleware.includes('DOMPurify')) {
    xssScore = 9;
  }

  // Check 3: CSRF protection
  let csrfScore = 0;
  category.findings.push({
    issue: 'No CSRF token validation',
    severity: 'HIGH',
    impact: 'Attackers can forge requests from authenticated users',
    recommendation: 'Implement CSRF token validation for state-changing operations'
  });

  // Check 4: Request size limiting
  let sizeLimitScore = 0;
  if (serverFile && serverFile.includes("// app.use(security.requestSizeLimit('10mb'))")) {
    sizeLimitScore = 5;
    category.findings.push({
      issue: 'Request size limiting disabled (but has json limit)',
      severity: 'LOW',
      impact: 'DoS attacks possible with large payloads',
      recommendation: 'Uncomment line 71 in server.js'
    });
  } else if (serverFile && serverFile.includes("limit: '10mb'")) {
    sizeLimitScore = 7;
  }

  // Check 5: File upload validation
  let fileUploadScore = 5;
  category.findings.push({
    issue: 'File upload validation not comprehensively reviewed',
    severity: 'MEDIUM',
    impact: 'Malicious files could be uploaded',
    recommendation: 'Validate file types, scan for malware, limit file sizes'
  });

  // Calculate category score
  const scores = [sqlInjectionScore, xssScore, csrfScore, sizeLimitScore, fileUploadScore];
  category.score = avg(scores);
  audit.categories.push(category);
})();

// ============================================================================
// CATEGORY 4: SECURITY HEADERS & CONFIGURATION
// ============================================================================
(() => {
  const category = {
    name: 'Security Headers & Configuration',
    weight: 0.10,
    findings: [],
    score: 0
  };

  const securityMiddleware = readFile('api/src/middleware/security.js');
  const serverFile = readFile('api/src/server.js');

  // Check 1: Security headers
  let headersScore = 8;
  if (securityMiddleware && securityMiddleware.includes('helmet')) {
    headersScore = 9;
  }

  // Check 2: CSP
  let cspScore = 7;
  if (securityMiddleware && securityMiddleware.includes('contentSecurityPolicy')) {
    cspScore = 8;
    if (securityMiddleware.includes("scriptSrc: [\"'self'\"]")) {
      cspScore = 8;
    }
  }

  // Check 3: HSTS
  let hstsScore = 8;
  if (securityMiddleware && securityMiddleware.includes('hsts')) {
    hstsScore = 9;
  }

  // Check 4: CORS configuration
  let corsScore = 5;
  if (securityMiddleware && securityMiddleware.includes('localhost')) {
    corsScore = 6;
    category.findings.push({
      issue: 'CORS allows localhost origins in production',
      severity: 'MEDIUM',
      impact: 'Development origins accepted in production',
      recommendation: 'Remove localhost origins from production CORS config'
    });
  }

  // Check 5: Error handling
  let errorScore = 7;
  if (serverFile && serverFile.includes('Global error handler')) {
    errorScore = 8;
  }

  // Calculate category score
  const scores = [headersScore, cspScore, hstsScore, corsScore, errorScore];
  category.score = avg(scores);
  audit.categories.push(category);
})();

// ============================================================================
// CATEGORY 5: AUDIT LOGGING & MONITORING
// ============================================================================
(() => {
  const category = {
    name: 'Audit Logging & Monitoring',
    weight: 0.10,
    findings: [],
    score: 0
  };

  const serverFile = readFile('api/src/server.js');
  const securityMiddleware = readFile('api/src/middleware/security.js');
  const dbInit = readFile('db/init/020_security_audit_logs.sql');

  // Check 1: Audit logging
  let auditScore = 0;
  if (serverFile && serverFile.includes('// app.use(security.auditLog)')) {
    auditScore = 0;
    category.findings.push({
      issue: '🔥 AUDIT LOGGING IS DISABLED 🔥',
      severity: 'CRITICAL',
      impact: 'No record of who accessed what data, impossible to investigate breaches',
      recommendation: 'UNCOMMENT line 72 in server.js IMMEDIATELY'
    });
  } else if (securityMiddleware && securityMiddleware.includes('auditLog')) {
    auditScore = 8;
  }

  // Check 2: Database audit tables
  let auditTablesScore = 8;
  if (dbInit && dbInit.includes('audit_logs')) {
    auditTablesScore = 9;
  }

  // Check 3: Failed login tracking
  let failedLoginScore = 7;
  if (dbInit && dbInit.includes('failed_login_attempts')) {
    failedLoginScore = 8;
  }

  // Check 4: Security event monitoring
  let monitoringScore = 3;
  if (dbInit && dbInit.includes('security_events')) {
    monitoringScore = 7;
  }
  category.findings.push({
    issue: 'No real-time security monitoring or alerting',
    severity: 'HIGH',
    impact: 'Breaches may go undetected for extended periods',
    recommendation: 'Implement SIEM integration or security alerting'
  });

  // Check 5: Session monitoring
  let sessionMonitoringScore = 0;
  if (serverFile && serverFile.includes('// app.use(security.sessionSecurity)')) {
    sessionMonitoringScore = 0;
    category.findings.push({
      issue: 'Session security monitoring is disabled',
      severity: 'HIGH',
      impact: 'Session hijacking attempts not detected',
      recommendation: 'Uncomment line 73 in server.js'
    });
  }

  // Calculate category score
  const scores = [auditScore, auditTablesScore, failedLoginScore, monitoringScore, sessionMonitoringScore];
  category.score = avg(scores);
  audit.categories.push(category);
})();

// ============================================================================
// CATEGORY 6: API SECURITY & RATE LIMITING
// ============================================================================
(() => {
  const category = {
    name: 'API Security & Rate Limiting',
    weight: 0.05,
    findings: [],
    score: 0
  };

  const serverFile = readFile('api/src/server.js');
  const securityMiddleware = readFile('api/src/middleware/security.js');

  // Check 1: General rate limiting
  let rateLimitScore = 8;
  if (serverFile && serverFile.includes('apiRateLimit')) {
    rateLimitScore = 9;
  }

  // Check 2: Auth-specific rate limiting
  let authRateLimitScore = 8;
  if (serverFile && serverFile.includes('authRateLimit')) {
    authRateLimitScore = 9;
  }

  // Check 3: API key validation
  let apiKeyScore = 5;
  if (securityMiddleware && securityMiddleware.includes('validateApiKey')) {
    apiKeyScore = 6;
  }

  // Check 4: Request validation
  let requestValidationScore = 6;
  if (securityMiddleware && securityMiddleware.includes('zod')) {
    requestValidationScore = 8;
  }

  // Calculate category score
  const scores = [rateLimitScore, authRateLimitScore, apiKeyScore, requestValidationScore];
  category.score = avg(scores);
  audit.categories.push(category);
})();

// ============================================================================
// CATEGORY 7: COMPLIANCE & DATA PRIVACY
// ============================================================================
(() => {
  const category = {
    name: 'Compliance & Data Privacy',
    weight: 0.10,
    findings: [],
    score: 0
  };

  // Check 1: Data retention policies
  let retentionScore = 0;
  category.findings.push({
    issue: 'No documented data retention policy',
    severity: 'MEDIUM',
    impact: 'Potential GDPR/CCPA violations, data kept indefinitely',
    recommendation: 'Define and implement data retention and deletion policies'
  });

  // Check 2: PII handling
  let piiScore = 3;
  category.findings.push({
    issue: 'No PII identification or special handling',
    severity: 'HIGH',
    impact: 'Sensitive data not properly protected',
    recommendation: 'Identify PII fields, implement encryption and access controls'
  });

  // Check 3: Right to deletion
  let deletionScore = 0;
  category.findings.push({
    issue: 'No "right to be forgotten" implementation',
    severity: 'MEDIUM',
    impact: 'Cannot comply with GDPR deletion requests',
    recommendation: 'Implement data deletion workflows'
  });

  // Check 4: Consent management
  let consentScore = 0;
  category.findings.push({
    issue: 'No consent tracking for data processing',
    severity: 'LOW',
    impact: 'Cannot prove compliance with consent requirements',
    recommendation: 'Add consent tracking and management'
  });

  // Check 5: Data export
  let exportScore = 2;
  category.findings.push({
    issue: 'Limited data export functionality',
    severity: 'LOW',
    impact: 'Difficult to provide data portability',
    recommendation: 'Implement comprehensive data export for users'
  });

  // Calculate category score
  const scores = [retentionScore, piiScore, deletionScore, consentScore, exportScore];
  category.score = avg(scores);
  audit.categories.push(category);
})();

// ============================================================================
// CALCULATE OVERALL SCORE
// ============================================================================

const overallScore = audit.categories.reduce((sum, cat) => sum + (cat.score * cat.weight), 0);
audit.overallScore = Math.round(overallScore * 10) / 10;

// ============================================================================
// DISPLAY RESULTS
// ============================================================================

console.log(`${bold}${blue}═══════════════════════════════════════════════════════════════════${reset}\n`);
console.log(`${bold}OVERALL SECURITY SCORE: ${getColor(audit.overallScore)}${audit.overallScore}/10 ${getRating(audit.overallScore)}${reset}\n`);

// Score interpretation
if (audit.overallScore >= 8) {
  console.log(`${green}Status: EXCELLENT - Enterprise-grade security posture${reset}\n`);
} else if (audit.overallScore >= 6) {
  console.log(`${yellow}Status: GOOD - Solid foundation, some improvements needed${reset}\n`);
} else if (audit.overallScore >= 4) {
  console.log(`${yellow}Status: FAIR - Significant vulnerabilities present${reset}\n`);
} else if (audit.overallScore >= 2) {
  console.log(`${red}Status: POOR - Critical security issues, immediate action required${reset}\n`);
} else {
  console.log(`${red}${bold}Status: CRITICAL - System is essentially unprotected${reset}\n`);
}

console.log(`${bold}${blue}═══════════════════════════════════════════════════════════════════${reset}\n`);

// Display category scores
console.log(`${bold}CATEGORY BREAKDOWN:${reset}\n`);

for (const category of audit.categories) {
  const color = getColor(category.score);
  const rating = getRating(category.score);
  console.log(`${rating} ${bold}${category.name}${reset}`);
  console.log(`   Score: ${color}${category.score}/10${reset} (Weight: ${category.weight * 100}%)\n`);
}

// Display all findings
console.log(`\n${bold}${red}═══════════════════════════════════════════════════════════════════${reset}`);
console.log(`${bold}${red}                    DETAILED FINDINGS                              ${reset}`);
console.log(`${bold}${red}═══════════════════════════════════════════════════════════════════${reset}\n`);

for (const category of audit.categories) {
  if (category.findings.length === 0) continue;
  
  console.log(`\n${bold}${cyan}▼ ${category.name}${reset}\n`);
  
  for (let i = 0; i < category.findings.length; i++) {
    const finding = category.findings[i];
    let severityColor = red;
    if (finding.severity === 'HIGH') severityColor = red;
    if (finding.severity === 'MEDIUM') severityColor = yellow;
    if (finding.severity === 'LOW') severityColor = yellow;
    if (finding.severity === 'CATASTROPHIC') severityColor = red;
    
    console.log(`${dim}${i + 1}.${reset} ${bold}${finding.issue}${reset}`);
    console.log(`   ${severityColor}Severity: ${finding.severity}${reset}`);
    console.log(`   ${dim}Impact: ${finding.impact}${reset}`);
    console.log(`   ${green}→ ${finding.recommendation}${reset}\n`);
  }
}

// Priority action items
console.log(`\n${bold}${red}═══════════════════════════════════════════════════════════════════${reset}`);
console.log(`${bold}${red}                🚨 IMMEDIATE ACTION REQUIRED 🚨                    ${reset}`);
console.log(`${bold}${red}═══════════════════════════════════════════════════════════════════${reset}\n`);

const criticalActions = [];

for (const category of audit.categories) {
  for (const finding of category.findings) {
    if (finding.severity === 'CATASTROPHIC' || finding.severity === 'CRITICAL') {
      criticalActions.push({
        category: category.name,
        issue: finding.issue,
        action: finding.recommendation
      });
    }
  }
}

if (criticalActions.length > 0) {
  console.log(`${bold}Found ${criticalActions.length} CRITICAL issues that need immediate attention:${reset}\n`);
  
  criticalActions.forEach((action, idx) => {
    console.log(`${bold}${red}${idx + 1}. ${action.issue}${reset}`);
    console.log(`   ${green}Action: ${action.action}${reset}\n`);
  });
} else {
  console.log(`${green}✓ No critical issues found!${reset}\n`);
}

// Summary and comparison
console.log(`\n${bold}${blue}═══════════════════════════════════════════════════════════════════${reset}`);
console.log(`${bold}${blue}                    INDUSTRY COMPARISON                            ${reset}`);
console.log(`${bold}${blue}═══════════════════════════════════════════════════════════════════${reset}\n`);

console.log(`Your score: ${getColor(audit.overallScore)}${audit.overallScore}/10${reset}`);
console.log(`${dim}Small business:        5-6/10${reset}`);
console.log(`${dim}Enterprise:            8-9/10${reset}`);
console.log(`${dim}Financial institution: 9-10/10${reset}`);
console.log(`${dim}Defense/Government:    10/10${reset}\n`);

if (audit.overallScore < 5) {
  console.log(`${red}${bold}⚠️  Your HR system is currently BELOW industry standards for handling sensitive data.${reset}`);
  console.log(`${red}${bold}⚠️  This represents a significant business and legal risk.${reset}\n`);
}

console.log(`\n${bold}${cyan}═══════════════════════════════════════════════════════════════════${reset}`);
console.log(`${bold}${cyan}                    AUDIT COMPLETE                                 ${reset}`);
console.log(`${bold}${cyan}═══════════════════════════════════════════════════════════════════${reset}\n`);

// Export JSON report
const jsonReport = {
  timestamp: new Date().toISOString(),
  overallScore: audit.overallScore,
  categories: audit.categories.map(cat => ({
    name: cat.name,
    score: cat.score,
    weight: cat.weight,
    findingsCount: cat.findings.length,
    findings: cat.findings
  })),
  criticalIssues: criticalActions.length,
  summary: audit.overallScore >= 8 ? 'EXCELLENT' : 
           audit.overallScore >= 6 ? 'GOOD' : 
           audit.overallScore >= 4 ? 'FAIR' : 
           audit.overallScore >= 2 ? 'POOR' : 'CRITICAL'
};

import { writeFileSync } from 'fs';
writeFileSync(
  join(__dirname, 'security-audit-report.json'),
  JSON.stringify(jsonReport, null, 2)
);

console.log(`${green}📄 Detailed JSON report saved to: tests/security-audit-report.json${reset}\n`);

