# 🔍 Complete Hardcoded Values Audit

**Generated:** October 6, 2025  
**Purpose:** Comprehensive audit of all hardcoded values in the HR application

---

## 📋 **Table of Contents**

1. [Security & Authentication](#security--authentication)
2. [Session Management](#session-management)
3. [Rate Limiting](#rate-limiting)
4. [Password & MFA](#password--mfa)
5. [Time & Date Values](#time--date-values)
6. [File Upload Limits](#file-upload-limits)
7. [Database Queries](#database-queries)
8. [Frontend Configuration](#frontend-configuration)
9. [API Endpoints](#api-endpoints)
10. [Settings & Preferences](#settings--preferences)
11. [Recommendations](#recommendations)

---

## 🔐 **Security & Authentication**

### Account Lockout (`api/src/middleware/account-lockout.js`)
```javascript
❌ const MAX_FAILED_ATTEMPTS = 5;                    // Should be in DB settings
❌ const LOCKOUT_DURATION = 30 * 60 * 1000;          // 30 minutes - hardcoded
❌ const ATTEMPT_WINDOW = 15 * 60 * 1000;            // 15 minutes - hardcoded
```

### CSRF Protection (`api/src/middleware/csrf.js`)
```javascript
❌ const TOKEN_EXPIRATION = 60 * 60 * 1000;          // 1 hour - hardcoded
```

### Password Rules (`api/src/routes/auth-mfa.js`)
```javascript
❌ if (newPassword.length < 8) {                     // Minimum 8 characters - hardcoded
❌ Keep only last 5 passwords in history             // Password history limit - hardcoded
```

---

## ⏱️ **Session Management**

### Session Timeouts (`api/src/session.js`, `api/src/routes/auth-mfa.js`)
```javascript
❌ const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;       // 2 hours - hardcoded (OLD)
❌ const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);  // 8 hours - hardcoded
❌ maxAge: 8 * 60 * 60 * 1000                        // Cookie expiry - hardcoded
```

### Temporary Tokens
```javascript
❌ Date.now() + 30 * 60 * 1000                       // 30 min password change token - hardcoded
❌ Date.now() + 10 * 60 * 1000                       // 10 min MFA token - hardcoded
```

### Trusted Devices (`api/src/services/mfa.js`)
```javascript
❌ const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);  // 30 days - hardcoded
```

---

## 🚦 **Rate Limiting**

### Authentication Rate Limits (`api/src/middleware/security.js`)
```javascript
❌ authRateLimit: 15 * 60 * 1000 window, 30 max      // 15 min, 30 attempts - hardcoded
❌ apiRateLimit: 15 * 60 * 1000 window, 200 max      // 15 min, 200 requests - hardcoded
❌ uploadRateLimit: 60 * 60 * 1000 window, 10 max    // 1 hour, 10 uploads - hardcoded
❌ adminRateLimit: 5 * 60 * 1000 window, 20 max      // 5 min, 20 requests - hardcoded
```

### Default Rate Limit (`api/src/middleware/security.js`)
```javascript
❌ createRateLimit(windowMs = 15 * 60 * 1000, max = 100)  // Default: 15 min, 100 requests
```

---

## 🔑 **Password & MFA**

### Password Expiry Warning (`api/src/routes/auth-mfa.js`)
```javascript
❌ WHEN password_expires_at < NOW() + INTERVAL '10 days' THEN 'EXPIRING_SOON'
   // 10-day warning period - hardcoded in SQL
```

### Password Validation
```javascript
❌ Minimum length: 8 characters
❌ Password history: 5 passwords
❌ No complexity requirements (uppercase, numbers, symbols)
❌ No maximum length
```

---

## ⏰ **Time & Date Values**

### Compliance Alerts (`api/src/routes/compliance.js`)
```javascript
❌ INTERVAL '30 days'    // Probation end warning - hardcoded
❌ INTERVAL '60 days'    // Contract renewal warning - hardcoded
❌ INTERVAL '90 days'    // Immigration docs warning - hardcoded
❌ INTERVAL '7 days'     // Expiring soon threshold - hardcoded
❌ INTERVAL '1 year'     // Contract duration - hardcoded
```

### Analytics & Reporting (`api/src/routes/analytics.js`, `api/src/routes/performance.js`)
```javascript
❌ INTERVAL '30 days'    // Recent hires period - hardcoded
❌ INTERVAL '7 days'     // Average hours calculation - hardcoded
❌ INTERVAL '12 months'  // Performance review period - hardcoded
```

### Leave Management (`api/src/routes/leave.js`)
```javascript
❌ INTERVAL '30 days'    // Upcoming leave period - hardcoded
```

---

## 📁 **File Upload Limits**

### Commission Imports (`api/src/routes/commissions.js`)
```javascript
❌ limits: { fileSize: 10 * 1024 * 1024 }            // 10MB - hardcoded
❌ fileFilter: .xlsx, .xls only                      // File types - hardcoded
```

---

## 💾 **Database Queries - Hardcoded Values**

### Settings (Currently Being Fixed)
All settings were returned from hardcoded UNION queries:
```javascript
❌ 'C&C Logistics'                                   // Company name
❌ '30'                                              // Session timeout
❌ '90'                                              // Password expiry
❌ '5'                                               // Max login attempts
❌ 'dark'                                            // Default theme
❌ ... (many more)
```
**Status:** ✅ Being migrated to `application_settings` table

---

## 🌐 **Frontend Configuration**

### API Base URL (`web/src/config/api.js`)
```javascript
❌ const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hr-api-wbzs.onrender.com'
   // Fallback URL hardcoded
```

### Duplicated API URL (`web/src/pages/BonusesCommissions.jsx`, `web/src/pages/TimeTracking.jsx`)
```javascript
❌ const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';  // Duplicated!
   // Should use centralized config
```

### Session Storage Keys
```javascript
❌ 'sessionId'                                       // Key name - hardcoded
❌ 'user'                                            // Key name - hardcoded
❌ 'sessionExtensionInterval'                        // Key name - hardcoded
❌ 'preferences_theme'                               // Key name - hardcoded
❌ 'user_timezone'                                   // Key name - hardcoded
❌ `${category}_${setting.key}`                      // Dynamic key pattern - hardcoded
```

---

## 🎨 **UI & Display Values**

### Form Inputs
```javascript
❌ maxLength="6"                                     // MFA code length - hardcoded
❌ min="0"                                           // Numeric input min - hardcoded
```

### Default Tab States
```javascript
❌ useState("system")                                // Settings default tab
❌ useState("requests")                              // Leave management default tab
❌ useState("overview")                              // Employee profile default tab
❌ useState("overview")                              // Payroll default tab
❌ useState("postings")                              // Recruiting default tab
❌ useState("analytics")                             // Bonuses default tab
❌ useState("uploads")                               // Time tracking default tab
```

### Date Formats & Localization
```javascript
❌ 'MM/DD/YYYY'                                      // Date format - hardcoded
❌ ['January', 'February', ... ]                     // Month names - hardcoded
❌ ['Jan', 'Feb', ... ]                              // Short month names - hardcoded
```

### Status Values (`web/src/pages/Recruiting.jsx`)
```javascript
❌ 'Resume Review'                                   // Status string - hardcoded
❌ 'Interview Scheduled'                             // Status string - hardcoded
❌ 'Second Round'                                    // Status string - hardcoded
❌ 'Offer Extended'                                  // Status string - hardcoded
❌ 'Completed'                                       // Status string - hardcoded
```

---

## 🔧 **Configuration Files**

### Time Calculations
```javascript
❌ (outTime - inTime) / (1000 * 60 * 60)            // Hours calculation - hardcoded divisor
❌ Math.round(diff * 100) / 100                      // Round to 2 decimals - hardcoded
```

---

## 📊 **Critical Issues Summary**

| Category | Count | Priority | Status |
|----------|-------|----------|--------|
| Session Timeouts | 5 | 🔴 HIGH | Needs DB migration |
| Rate Limits | 6 | 🟡 MEDIUM | Should be configurable |
| Password Rules | 4 | 🟡 MEDIUM | Should be in settings |
| Time Intervals | 12+ | 🟢 LOW | Business logic |
| Settings Values | 20+ | 🔴 HIGH | ✅ In progress |
| API URLs | 3 | 🔴 HIGH | Needs consolidation |
| UI Strings | 50+ | 🟢 LOW | OK for now |
| LocalStorage Keys | 7 | 🟡 MEDIUM | Should be constants |

---

## 🎯 **Recommendations**

### **Priority 1: CRITICAL** 🔴

1. **✅ IN PROGRESS: Settings Migration**
   - Migrate all settings to `application_settings` table
   - Already created migration `029_persistent_settings.sql`

2. **Session Configuration**
   - Move session timeout to DB settings
   - Make it dynamically configurable
   - Allow per-role session timeouts

3. **API URL Consolidation**
   - Remove duplicate `API_BASE_URL` declarations
   - Use centralized `api.js` config everywhere
   - Validate `.env` configuration

### **Priority 2: HIGH** 🟡

4. **Rate Limiting Configuration**
   - Move to `application_settings` table
   - Add admin UI to adjust rate limits
   - Per-endpoint rate limit configuration

5. **Password Policy**
   - Move to `application_settings`:
     - Minimum length
     - Require uppercase/lowercase/numbers/symbols
     - Password history limit
     - Expiry warning days

6. **Account Lockout Configuration**
   - Move `MAX_FAILED_ATTEMPTS` to settings
   - Move `LOCKOUT_DURATION` to settings
   - Move `ATTEMPT_WINDOW` to settings

### **Priority 3: MEDIUM** 🟠

7. **LocalStorage Keys**
   - Create constants file for all localStorage keys
   - Prevents typos and makes refactoring easier

8. **File Upload Limits**
   - Move to settings table
   - Per-file-type limits
   - Configurable allowed file types

9. **Time Intervals**
   - Compliance alert windows (30/60/90 days)
   - Should be configurable per alert type

### **Priority 4: LOW** 🟢

10. **UI Defaults**
    - Default tabs (mostly user preference)
    - Date formats (already in settings, just needs migration)
    - Month names (localization - future enhancement)

11. **Status Strings**
    - OK as hardcoded for now
    - Future: Move to DB for multi-language support

---

## 🚀 **Implementation Plan**

### **Phase 1: Settings Persistence** (Current)
- ✅ Create `application_settings` table
- ✅ Migrate all settings from hardcoded queries
- 🔄 Update API to read/write from DB
- 🔄 Remove localStorage caching for server settings
- 🔄 Test settings persistence

### **Phase 2: Security Configuration**
- Add security settings to DB:
  - Session timeouts
  - Rate limits
  - Account lockout parameters
  - Password policy
- Update middleware to read from DB
- Add caching layer for performance

### **Phase 3: API Consolidation**
- Remove duplicate API URL declarations
- Create environment config validator
- Ensure all API calls use centralized config

### **Phase 4: Constants File**
- Create `constants.js` for:
  - LocalStorage keys
  - Status values
  - Default values
  - Magic numbers

### **Phase 5: Advanced Features**
- Per-role configurations
- Multi-language support
- Tenant-specific settings (if multi-tenant)
- Settings versioning/audit trail

---

## 💡 **Quick Wins**

### Can be done immediately:

1. **Create constants file:**
```javascript
// constants.js
export const STORAGE_KEYS = {
  SESSION_ID: 'sessionId',
  USER: 'user',
  THEME: 'preferences_theme',
  TIMEZONE: 'user_timezone'
};

export const MFA_CODE_LENGTH = 6;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HISTORY_LIMIT = 5;
```

2. **Consolidate API URL:**
```javascript
// Remove from BonusesCommissions.jsx and TimeTracking.jsx
// Use only web/src/config/api.js
```

3. **Add comments to hardcoded business logic:**
```javascript
// Business requirement: Contract renewal warning at 60 days
INTERVAL '60 days'
```

---

## 📝 **Notes**

- **Not everything needs to be configurable!** Business logic values (like "contract duration = 1 year") can stay hardcoded if they're business rules, not configuration.
- **Performance matters:** Don't query DB for every constant. Use caching for frequently accessed settings.
- **Backwards compatibility:** When migrating settings, ensure default values match current behavior.
- **Testing:** Each migration needs comprehensive testing to ensure no breaking changes.

---

**Next Steps:** Continue with settings migration, then tackle session configuration and API consolidation.

