# 🔥 MANUAL TEST CHECKLIST - EVERYTHING FIXED

## What Was Broken (And Now Fixed)
1. ❌ **MFA toggle defaulted to OFF** → ✅ **Now loads actual value from database**
2. ❌ **Session timeout reset to 30** → ✅ **Now persists across page loads**
3. ❌ **Trust Device was cosmetic** → ✅ **Now fully functional**
4. ❌ **Settings lost on refresh** → ✅ **Now all settings persist**

---

## 🧪 TEST 1: MFA Toggle Persistence

### Steps:
1. **Log in** to the HR system
2. **Go to Settings → Security**
3. **Check the current MFA toggle state** (ON or OFF)
4. If OFF:
   - Turn it **ON**
   - Complete the QR code setup
   - **Verify toggle shows ON**
5. **Navigate to another page** (Dashboard, Employees, etc.)
6. **Come back to Settings → Security**
7. **✅ VERIFY: MFA toggle is still in the position you left it**

### Expected Result:
- ✅ MFA toggle shows the ACTUAL status from the database
- ✅ It does NOT reset to OFF after page navigation
- ✅ Status persists even after logging out and back in

---

## 🧪 TEST 2: Session Timeout Persistence

### Steps:
1. **Go to Settings → Security**
2. **Find "Session Timeout (minutes)"**
3. **Note the current value** (probably 30 or 120)
4. **Change it to 90 minutes**
5. **Switch to another tab** (Preferences, Notifications, etc.)
6. **Come back to Security tab**
7. **✅ VERIFY: Session Timeout still shows 90 minutes**

### Expected Result:
- ✅ Session timeout value persists across tab switches
- ✅ Value persists after page reload (F5)
- ✅ Value persists after logging out and back in

---

## 🧪 TEST 3: Trust Device Functionality

### Prerequisites:
- MFA must be enabled (see TEST 1)

### Steps:
1. **Log out** of the system
2. **Log in again** with username and password
3. **You should see MFA prompt** (6-digit code)
4. **Before entering code:**
   - ✅ **Check the box: "Trust this device for 30 days"**
5. **Enter your 6-digit TOTP code** from authenticator app
6. **Log in successfully**
7. **Log out again immediately**
8. **Log in again** with same username and password
9. **✅ VERIFY: You should NOT see MFA prompt** (trusted device)
10. **You should be logged in directly** (MFA bypassed)

### Expected Result:
- ✅ With "Trust Device" checked: Second login skips MFA
- ✅ Without "Trust Device" checked: Every login requires MFA
- ✅ Trust expires after 30 days

---

## 🧪 TEST 4: All Settings Persistence

### Steps:
1. **Go to Settings → Preferences**
2. **Change theme to Light** (or Dark if currently Light)
3. **Change language to Spanish** (es)
4. **Go to Settings → Notifications**
5. **Toggle Email Notifications OFF**
6. **Go to Settings → Maintenance**
7. **Change Backup Frequency to Weekly**
8. **Close the browser completely**
9. **Reopen and log in**
10. **Check all settings you changed**
11. **✅ VERIFY: All settings are exactly as you left them**

### Expected Result:
- ✅ Theme persists (Light/Dark)
- ✅ Language persists (Spanish)
- ✅ Email Notifications persists (OFF)
- ✅ Backup Frequency persists (Weekly)
- ✅ MFA toggle persists (ON/OFF)
- ✅ Session timeout persists (90)

---

## 🧪 TEST 5: Multiple Browser Tabs

### Steps:
1. **Open Settings in Tab 1**
2. **Change Session Timeout to 45 minutes**
3. **Open Settings in Tab 2** (new tab, same browser)
4. **✅ VERIFY: Tab 2 shows Session Timeout as 45 minutes**
5. **In Tab 2, change Session Timeout to 60 minutes**
6. **Go back to Tab 1**
7. **Refresh Tab 1** (F5)
8. **✅ VERIFY: Tab 1 now shows 60 minutes**

### Expected Result:
- ✅ Settings sync across multiple tabs
- ✅ Changes in one tab appear in other tabs after refresh
- ✅ No conflicts or race conditions

---

## 🧪 TEST 6: MFA Toggle Consistency

### Steps:
1. **With MFA ENABLED:**
   - Go to Settings → Security
   - ✅ **Verify toggle shows ON**
   - Log out
   - Log in (you should see MFA prompt)
   - Go to Settings → Security
   - ✅ **Verify toggle STILL shows ON**
2. **Disable MFA:**
   - Toggle MFA OFF
   - Confirm the disabling
   - ✅ **Verify toggle shows OFF**
   - Navigate away and back
   - ✅ **Verify toggle STILL shows OFF**
3. **Log out and in:**
   - Log in (should NOT see MFA prompt)
   - Go to Settings
   - ✅ **Verify toggle shows OFF**

### Expected Result:
- ✅ MFA toggle is ALWAYS consistent with actual database state
- ✅ Never shows wrong value
- ✅ Never "flickers" between ON and OFF

---

## 📊 RESULTS TRACKING

After completing all tests, fill this out:

| Test | Status | Notes |
|------|--------|-------|
| TEST 1: MFA Toggle | ⬜ PASS / ⬜ FAIL | |
| TEST 2: Session Timeout | ⬜ PASS / ⬜ FAIL | |
| TEST 3: Trust Device | ⬜ PASS / ⬜ FAIL | |
| TEST 4: All Settings | ⬜ PASS / ⬜ FAIL | |
| TEST 5: Multiple Tabs | ⬜ PASS / ⬜ FAIL | |
| TEST 6: MFA Consistency | ⬜ PASS / ⬜ FAIL | |

---

## 🐛 If Something Fails

### MFA Toggle Still Resets to OFF:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Go to Settings → Security
4. Look for logs that say:
   - `📡 [Settings] Attempting to load authenticated settings from API...`
   - `✅ [Settings] Security settings loaded from API:`
   - `🔐 [Settings] MFA toggle value:`
5. Copy the logs and report them

### Session Timeout Resets to 30:
1. Open browser DevTools (F12)
2. Change session timeout to 90
3. Switch tabs and come back
4. Look for logs about settings persistence
5. Copy the logs and report them

### Trust Device Not Working:
1. Enable MFA
2. Log out
3. Open DevTools Console
4. Log in with "Trust Device" checked
5. Look for logs about trusted devices
6. Copy the logs and report them

---

## ✅ SUCCESS CRITERIA

**ALL TESTS MUST PASS** for the system to be considered fixed.

If any test fails, there's still a bug that needs fixing.

---

## 📝 NOTES

- These tests should be performed on the **LIVE DEPLOYED VERSION**
- Allow 2-3 minutes after pushing code for Render to deploy
- Use latest version of Chrome/Firefox for testing
- Clear browser cache if seeing stale data: `Ctrl+Shift+Delete` → Clear cache

