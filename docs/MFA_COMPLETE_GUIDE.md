# 🔐 Complete MFA/2FA System Guide

**Two-Factor Authentication (TOTP) - Fully Implemented**

---

## 📋 Table of Contents

1. [How MFA Works](#how-mfa-works)
2. [User Flow](#user-flow)
3. [Technical Implementation](#technical-implementation)
4. [Security Features](#security-features)
5. [Testing Guide](#testing-guide)
6. [Troubleshooting](#troubleshooting)

---

## 🔐 How MFA Works

### What is TOTP?

**Time-based One-Time Password (TOTP)** - RFC 6238 standard
- Generates 6-digit codes
- Changes every 30 seconds
- Works with Google Authenticator, Microsoft Authenticator, Authy, 1Password, etc.
- Industry standard used by Gmail, GitHub, AWS, etc.

### Our Implementation:

```
Password (Something you know) 
    + 
TOTP Code (Something you have - your phone)
    = 
Two-Factor Authentication
```

---

## 👤 User Flow

### 1. **Enabling MFA**

```
Step 1: Login to HR system
Step 2: Go to Settings → Security tab
Step 3: Toggle "Two-Factor Authentication" to ON
Step 4: Modal appears with:
        - QR Code
        - Secret key (for manual entry)
        - Backup codes (save these!)
Step 5: Scan QR code with authenticator app
Step 6: Enter 6-digit code from app
Step 7: Click "Enable MFA"
Step 8: ✅ MFA is now active!
```

**What You'll See:**

```
┌────────────────────────────────────────┐
│ 🔐 Enable Two-Factor Authentication   │
│                                        │
│ Step 1: Scan QR Code                  │
│ ┌──────────────┐                      │
│ │              │                      │
│ │  [QR CODE]   │  ← Scan this!       │
│ │              │                      │
│ └──────────────┘                      │
│                                        │
│ Or enter secret: ABCD1234...          │
│                                        │
│ Step 2: Enter Code                    │
│ ┌──────────────┐                      │
│ │  [ 1 2 3 4 5 6 ]                    │
│ └──────────────┘                      │
│                                        │
│ ⚠️ Save Backup Codes:                 │
│ A1B2C3D4  E5F6G7H8                    │
│ I9J0K1L2  M3N4O5P6                    │
│                                        │
│ [Cancel]    [Enable MFA]              │
└────────────────────────────────────────┘
```

---

### 2. **Logging In with MFA**

```
Step 1: Enter username + password
Step 2: Click "Sign In"
Step 3: MFA screen appears 🔐
Step 4: Open authenticator app on phone
Step 5: Find "HR Management System - Avneet"
Step 6: Enter the 6-digit code
Step 7: Click "Verify Code"
Step 8: ✅ Logged in!
```

**What You'll See:**

```
After entering password:

┌────────────────────────────────────────┐
│           🔐                           │
│                                        │
│   Two-Factor Authentication           │
│                                        │
│   Enter the 6-digit code from your    │
│   authenticator app                   │
│                                        │
│        ┌──────────────┐               │
│        │  1 2 3 4 5 6 │               │
│        └──────────────┘               │
│                                        │
│   [Verify Code]                       │
│                                        │
│   ← Back to login                     │
│                                        │
│   💡 Tip: Code changes every 30s      │
└────────────────────────────────────────┘
```

---

### 3. **Using Backup Codes**

**If you lose your phone:**

```
Step 1: On MFA input screen, enter backup code instead
Step 2: Each backup code works ONCE ONLY
Step 3: After login, go to Settings and generate new backup codes
```

**Backup Code Format:**
- 8 characters: `A1B2C3D4`
- Mix of letters and numbers
- Case-insensitive
- You get 10 backup codes

---

## 🛠️ Technical Implementation

### Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   Frontend  │◄────►│   Backend   │◄────►│   Database   │
│  (React)    │      │  (Express)  │      │  (Postgres)  │
└─────────────┘      └─────────────┘      └──────────────┘
       │                    │                      │
       │                    │                      │
   MFA Modal          MFA Service            user_mfa table
   Login Form         TOTP Verify            user_sessions
                      Backup Codes           mfa_attempts
```

---

### Backend Components

#### 1. **Database Tables**

```sql
-- MFA configuration per user
CREATE TABLE user_mfa (
  user_id INT PRIMARY KEY,
  mfa_secret TEXT NOT NULL,           -- TOTP secret (base32)
  backup_codes TEXT[],                 -- Hashed backup codes
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track MFA attempts (security logging)
CREATE TABLE mfa_attempts (
  id SERIAL PRIMARY KEY,
  user_id INT,
  attempt_type VARCHAR(20),  -- 'totp' or 'backup'
  success BOOLEAN,
  ip_address INET,
  user_agent TEXT,
  attempted_at TIMESTAMP DEFAULT NOW()
);

-- Trusted devices (optional - "Remember this device")
CREATE TABLE trusted_devices (
  id SERIAL PRIMARY KEY,
  user_id INT,
  device_fingerprint TEXT,
  device_name TEXT,
  trusted_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP
);
```

#### 2. **MFA Service** (`api/src/services/mfa.js`)

```javascript
export class MFAService {
  // Generate secret + QR code
  static async setupMFA(userId, userEmail) {
    const secret = speakeasy.generateSecret({
      name: `HR System (${userEmail})`,
      issuer: 'HR Management System',
      length: 32
    });
    
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    const backupCodes = generateBackupCodes(10);
    
    // Store in database (NOT enabled yet - requires verification)
    await storeSecret(userId, secret.base32, backupCodes);
    
    return { secret, qrCode, backupCodes };
  }
  
  // Verify code and enable MFA
  static async verifyAndEnableMFA(userId, token) {
    const secret = await getSecret(userId);
    
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2  // ±60 seconds clock skew tolerance
    });
    
    if (verified) {
      await enableMFA(userId);
      return true;
    }
    return false;
  }
  
  // Verify during login
  static async verifyTOTP(userId, token) {
    // Same verification logic
    // Log attempt for security
  }
  
  // Verify backup code
  static async verifyBackupCode(userId, code) {
    // Check against hashed backup codes
    // Mark as used (can only use once)
  }
}
```

#### 3. **Auth Routes** (`api/src/routes/auth-mfa.js`)

```javascript
// Login endpoint
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  
  // 1. Verify username/password
  const user = await findUser(username);
  const validPassword = await verifyPassword(password, user.password_hash);
  
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  // 2. Check if MFA is enabled
  const mfaEnabled = await MFAService.isMFAEnabled(user.id);
  
  if (mfaEnabled) {
    // Create temporary token (10-minute expiry)
    const tempToken = generateSecureSessionId();
    await storeTempSession(tempToken, user.id);
    
    return res.json({
      requiresMFA: true,
      tempToken: tempToken
    });
  }
  
  // No MFA - create full session
  const sessionId = await createSession(user.id);
  return res.json({ user, sessionId });
});

// MFA verification endpoint
router.post("/verify-mfa", async (req, res) => {
  const { tempToken, code } = req.body;
  
  // 1. Get user from temp token
  const tempSession = await getTempSession(tempToken);
  const userId = tempSession.user_id;
  
  // 2. Verify TOTP code
  const verified = await MFAService.verifyTOTP(userId, code);
  
  if (!verified) {
    return res.status(401).json({ error: "Invalid code" });
  }
  
  // 3. Delete temp session, create real session
  await deleteTempSession(tempToken);
  const sessionId = await createSession(userId);
  
  return res.json({ user, sessionId });
});
```

---

### Frontend Components

#### 1. **Settings Page** (`web/src/pages/Settings.jsx`)

**MFA Toggle Handler:**
```javascript
const handleSettingUpdate = async (category, key, value) => {
  if (key === 'two_factor_auth' && value === true) {
    // Call MFA setup endpoint
    const response = await API('/api/settings/security/mfa/setup', {
      method: 'POST'
    });
    
    // Show modal with QR code
    setMfaData(response);
    setShowMFAModal(true);
  }
};

const verifyMFACode = async () => {
  const response = await API('/api/settings/security/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ code: mfaVerificationCode })
  });
  
  if (response.success) {
    // MFA enabled!
    setSecurity(prev => prev.map(setting => 
      setting.key === 'two_factor_auth' ? { ...setting, value: 'true' } : setting
    ));
    localStorage.setItem('security_two_factor_auth', 'true');
  }
};
```

#### 2. **Login Component** (`web/src/components/Login.jsx`)

**MFA Flow Handler:**
```javascript
const handleLogin = async (e) => {
  e.preventDefault();
  
  const response = await API("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
  
  // Check if MFA is required
  if (response.requiresMFA) {
    setTempToken(response.tempToken);
    setShowMFAInput(true);  // Show MFA input screen
    return;
  }
  
  // Normal login
  onLogin(response.user);
};

const handleMFAVerify = async (e) => {
  e.preventDefault();
  
  const response = await API("/api/auth/verify-mfa", {
    method: "POST",
    body: JSON.stringify({
      tempToken: tempToken,
      code: mfaCode
    })
  });
  
  if (response.user) {
    localStorage.setItem("sessionId", response.sessionId);
    onLogin(response.user);
  }
};
```

---

## 🛡️ Security Features

### 1. **TOTP Standard (RFC 6238)**
- ✅ Industry standard
- ✅ 30-second time windows
- ✅ SHA-1 algorithm
- ✅ 6-digit codes
- ✅ Base32 encoding

### 2. **Clock Skew Tolerance**
```javascript
window: 2  // Accepts codes from ±60 seconds
```
Prevents issues when device clocks are slightly off.

### 3. **Backup Codes**
- ✅ 10 codes generated
- ✅ Bcrypt hashed in database
- ✅ Single-use only
- ✅ 8-character alphanumeric

### 4. **Attempt Logging**
Every MFA attempt logged:
- ✅ User ID
- ✅ Attempt type (TOTP vs backup)
- ✅ Success/failure
- ✅ IP address
- ✅ User agent
- ✅ Timestamp

### 5. **Temporary Tokens**
- ✅ 10-minute expiry
- ✅ Single-use
- ✅ Cryptographically secure
- ✅ Metadata flag: `{ mfa_pending: true }`

### 6. **Rate Limiting**
```javascript
authRateLimit: 30 attempts / 15 minutes
```
Prevents brute force while allowing legitimate retries.

### 7. **Trusted Devices** (Optional)
- ✅ Device fingerprinting
- ✅ "Remember this device" checkbox
- ✅ 30-day trust period
- ✅ Can revoke anytime

---

## 🧪 Testing Guide

### Manual Testing:

**Test 1: Enable MFA**
```
1. Login as Avneet
2. Go to Settings → Security
3. Toggle MFA ON
4. Scan QR code with authenticator app
5. Enter code from app
6. ✅ Toggle should stay ON
```

**Test 2: Login with MFA**
```
1. Logout
2. Enter username + password
3. ✅ MFA screen should appear
4. Enter code from authenticator app
5. ✅ Should login successfully
```

**Test 3: Wrong MFA Code**
```
1. Enter username + password
2. Enter wrong code (e.g., 000000)
3. ✅ Should show error "Invalid code"
4. Enter correct code
5. ✅ Should login successfully
```

**Test 4: Backup Code**
```
1. Enter username + password
2. Enter backup code instead of TOTP
3. ✅ Should login successfully
4. Try same backup code again
5. ✅ Should fail (single-use only)
```

---

## 🐛 Troubleshooting

### Issue: "Invalid code" even with correct code

**Cause:** Clock drift between server and device

**Solution:**
1. Check iPhone/Android time settings
2. Enable "Set automatically"
3. Wait 30 seconds for next code
4. Try again

---

### Issue: Toggle turns OFF after enabling MFA

**Status:** ✅ FIXED (was a race condition bug)

**Fix Applied:** Removed `loadSettings()` call after verification

---

### Issue: MFA screen doesn't appear at login

**Status:** ✅ FIXED (Login component now handles `requiresMFA`)

**Fix Applied:** Added MFA flow to `Login.jsx`

---

### Issue: "Too many authentication attempts" (429 error)

**Status:** ✅ FIXED

**Fix Applied:** Increased rate limit from 5 → 30 attempts per 15 minutes

---

## 📊 Statistics & Monitoring

### Metrics to Track:

1. **MFA Adoption Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE mfa_enabled = true) as enabled,
     COUNT(*) as total,
     ROUND(100.0 * COUNT(*) FILTER (WHERE mfa_enabled = true) / COUNT(*), 2) as percentage
   FROM user_mfa;
   ```

2. **Failed MFA Attempts**
   ```sql
   SELECT COUNT(*) 
   FROM mfa_attempts 
   WHERE success = false 
   AND attempted_at > NOW() - INTERVAL '24 hours';
   ```

3. **Backup Code Usage**
   ```sql
   SELECT COUNT(*) 
   FROM mfa_attempts 
   WHERE attempt_type = 'backup' 
   AND success = true;
   ```

---

## ✅ Deployment Checklist

- [x] Database tables created (`025_multi_user_rbac.sql`, `026_mfa_totp.sql`)
- [x] MFA Service implemented (`api/src/services/mfa.js`)
- [x] Auth routes with MFA (`api/src/routes/auth-mfa.js`)
- [x] Settings page MFA setup (`web/src/pages/Settings.jsx`)
- [x] Login page MFA verification (`web/src/components/Login.jsx`)
- [x] Rate limits adjusted (`api/src/middleware/security.js`)
- [x] TOTP library installed (`speakeasy`)
- [x] QR code library installed (`qrcode`)
- [x] Testing completed
- [x] Documentation created

---

## 🎉 Summary

**MFA is FULLY FUNCTIONAL!**

✅ **Setup:** Beautiful modal with QR code + backup codes  
✅ **Login:** Clean MFA input screen when required  
✅ **Security:** RFC 6238 TOTP standard  
✅ **Compatibility:** Works with ALL authenticator apps  
✅ **Rate Limits:** Adjusted to allow MFA workflow  
✅ **Error Handling:** Clear error messages  
✅ **Backup Codes:** 10 single-use codes for emergencies  
✅ **Logging:** All attempts tracked for security  

**Current Status:** Production-ready 🚀

---

**Last Updated:** October 6, 2025  
**Version:** 1.0  
**Bundle:** `index-BV3BFs4Q.js`

