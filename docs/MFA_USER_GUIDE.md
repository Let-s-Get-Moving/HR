> **LEGACY DOCUMENT**
> This document is outdated. See [security/authentication.md](./security/authentication.md) for current MFA documentation.

# 📱 Multi-Factor Authentication (MFA) User Guide

**Complete Step-by-Step Instructions for Enabling and Using MFA**

---

## 🎯 What is MFA?

Multi-Factor Authentication (MFA) adds an extra layer of security to your account. Even if someone steals your password, they can't log in without your phone.

**How it works:**
1. You log in with your password (something you know)
2. System asks for a code from your phone (something you have)
3. Both correct = access granted ✅

---

## 📲 Step 1: Get an Authenticator App

**Before you begin, download one of these FREE apps:**

### **Option A: Google Authenticator** (Recommended)
- **iPhone:** [App Store Link](https://apps.apple.com/app/google-authenticator/id388497605)
- **Android:** [Play Store Link](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)

### **Option B: Microsoft Authenticator**
- **iPhone:** [App Store Link](https://apps.apple.com/app/microsoft-authenticator/id983156458)
- **Android:** [Play Store Link](https://play.google.com/store/apps/details?id=com.azure.authenticator)

### **Option C: Authy**
- **iPhone:** [App Store Link](https://apps.apple.com/app/authy/id494168017)
- **Android:** [Play Store Link](https://play.google.com/store/apps/details?id=com.authy.authy)

**Install one of these apps on your phone before continuing.**

---

## 🔐 Step 2: Enable MFA in HR System

### **2.1: Log In**
1. Go to your HR system website
2. Enter your username: `Avneet`
3. Enter your password: `password123` (or your current password)
4. Click **"Sign In"**

### **2.2: Go to Settings**
1. Click your profile/avatar in the top right
2. Click **"Settings"** from the dropdown
   - OR click the ⚙️ settings icon in the sidebar

### **2.3: Navigate to Security Settings**
1. In the Settings page, click **"Security"** tab
2. Look for **"Two-Factor Authentication"** section
3. You'll see a toggle switch that says:
   - "Enable two-factor authentication"
   - Currently set to OFF (gray/red)

### **2.4: Enable MFA**
1. Click the toggle switch to turn it **ON** (it will turn green/blue)
2. A popup/modal will appear with:
   - ✅ A QR code (black and white square)
   - ✅ A text code (like: `JBSWY3DPEHPK3PXP`)
   - ✅ 10 backup codes (like: `A1B2C3D4`)

**⚠️ IMPORTANT: Don't close this popup yet!**

### **2.5: Scan the QR Code**
1. Open your authenticator app on your phone
2. Tap the **"+"** or **"Add account"** button
3. Choose **"Scan QR code"** or **"Scan barcode"**
4. Point your phone camera at the QR code on your computer screen
5. The app will add your HR account automatically
6. You'll see: **"HR System"** or **"C&C Logistics"** in your app
7. Below it, you'll see a **6-digit code** that changes every 30 seconds

**Can't scan the QR code?**
- In your authenticator app, choose "Enter key manually"
- Type in the text code shown (like: `JBSWY3DPEHPK3PXP`)
- Account name: `HR System`
- Save it

### **2.6: Verify the Code**
1. Look at your authenticator app
2. Find the 6-digit code for "HR System" (like: `123456`)
3. Type this code into the verification box on your computer
4. Click **"Verify"** or **"Enable MFA"**
5. ✅ You should see: **"MFA enabled successfully!"**

### **2.7: Save Your Backup Codes**
**CRITICAL STEP - DON'T SKIP THIS!**

1. The popup shows 10 backup codes (like: `A1B2C3D4`)
2. Copy these codes or click "Download backup codes"
3. Save them somewhere safe:
   - Print them out
   - Save to password manager
   - Write them down and store in a safe place
4. **If you lose your phone, these codes are the ONLY way to log in!**
5. Each code works ONCE only

**Example backup codes:**
```
A1B2C3D4
E5F6G7H8
I9J0K1L2
M3N4O5P6
Q7R8S9T0
U1V2W3X4
Y5Z6A7B8
C9D0E1F2
G3H4I5J6
K7L8M9N0
```

6. Click "Done" or "I've saved my codes"
7. ✅ MFA is now enabled!

---

## 🚪 Step 3: Logging In with MFA

**From now on, every login requires MFA:**

### **3.1: Normal Login**
1. Go to HR system login page
2. Enter your username and password
3. Click "Sign In"
4. **NEW STEP:** You'll see: **"Enter verification code"**

### **3.2: Get Your Code**
1. Open your authenticator app on your phone
2. Find "HR System" in the list
3. Look at the 6-digit code (like: `456789`)
4. **Note:** This code changes every 30 seconds!

### **3.3: Enter the Code**
1. Type the 6-digit code from your phone
2. Click "Verify" or "Submit"
3. ✅ You're logged in!

**Optional: Trust This Device**
- Check the box "Trust this device for 30 days"
- You won't need MFA codes on this device for 30 days
- Still need password though!

---

## 🆘 Step 4: What If I Lose My Phone?

### **Option A: Use a Backup Code**
1. Go to login page
2. Enter username and password
3. When asked for MFA code, click **"Use backup code"**
4. Enter one of your 10 backup codes
5. ✅ You're in!
6. **Important:** That backup code is now USED and won't work again
7. **Generate new backup codes immediately!**

### **Option B: Contact Admin**
If you lost both your phone AND backup codes:
1. Contact your HR administrator
2. They can disable MFA for your account
3. You'll need to set it up again

---

## 🔄 Step 5: Managing MFA

### **Disable MFA (Not Recommended)**
1. Go to Settings → Security
2. Toggle "Two-factor authentication" to OFF
3. Confirm you want to disable it
4. ✅ MFA is disabled

**⚠️ Warning:** Your account is now less secure!

### **Regenerate Backup Codes**
If you used some backup codes:
1. Go to Settings → Security
2. Click "Regenerate backup codes"
3. Your old codes stop working
4. Save the NEW 10 codes
5. ✅ Fresh backup codes ready

### **View Trusted Devices**
To see which devices skip MFA:
1. Go to Settings → Security
2. Click "Manage trusted devices"
3. See list of trusted devices
4. Remove any you don't recognize
5. Click "Remove" next to suspicious devices

---

## 📱 Step 6: Using Different Devices

### **On Your Computer**
- First time: Enter MFA code
- Check "Trust this device" = skip MFA for 30 days
- After 30 days: Enter MFA code again

### **On Your Phone**
- Same process as computer
- You can trust your phone too
- Useful for checking HR on the go

### **On a Public Computer**
- **DON'T check "Trust this device"**
- Always log out when done
- Never save your password

---

## ❓ Troubleshooting

### **"Invalid code" Error**
**Possible reasons:**
1. **Code expired:** Get a new code from your app (they change every 30 seconds)
2. **Wrong account:** Make sure you're looking at "HR System" in your app
3. **Time sync issue:** Your phone's time might be wrong
   - Go to phone settings
   - Enable "Automatic date & time"
   - Try again

### **"Account locked" Error**
- Too many wrong codes
- Wait 30 minutes
- Or use a backup code
- Or contact admin

### **Lost Authenticator App**
**If you deleted the app:**
1. Reinstall the authenticator app
2. You'll need a backup code to log in
3. Then disable and re-enable MFA to get a new QR code

**If you got a new phone:**
1. Use a backup code to log in
2. Disable MFA
3. Set up MFA again on your new phone

### **QR Code Won't Scan**
1. Make sure your phone camera is working
2. Try manual entry instead:
   - In authenticator app, choose "Enter key manually"
   - Type the text code shown
3. Make sure screen brightness is high
4. Try different authenticator app

---

## ✅ Quick Reference Card

**Print this and keep it handy:**

```
===========================================
HR SYSTEM MFA QUICK REFERENCE
===========================================

LOGIN STEPS:
1. Username + Password
2. Open authenticator app
3. Enter 6-digit code
4. Done!

BACKUP CODES LOCATION:
_______________________________________
(Write where you saved them)

AUTHENTICATOR APP:
□ Google Authenticator
□ Microsoft Authenticator  
□ Authy
□ Other: ____________

EMERGENCY CONTACTS:
HR Admin: _______________________
IT Support: _____________________

IF LOCKED OUT:
- Use backup code
- Contact HR Admin
- Wait 30 minutes for auto-unlock
===========================================
```

---

## 🔒 Security Tips

### **DO:**
- ✅ Save backup codes in a safe place
- ✅ Use "Trust device" on your personal devices
- ✅ Keep your authenticator app updated
- ✅ Enable phone lock screen/biometrics
- ✅ Log out when using public computers

### **DON'T:**
- ❌ Share your backup codes with anyone
- ❌ Screenshot your QR code and post it
- ❌ Trust public/shared computers
- ❌ Share your verification codes
- ❌ Use the same password everywhere

---

## 📞 Need Help?

### **Common Questions:**

**Q: Can I use the same authenticator app for multiple accounts?**
A: Yes! Add your bank, email, and other accounts to the same app.

**Q: What if my phone dies during login?**
A: Use a backup code instead.

**Q: How long does the 6-digit code work?**
A: 30 seconds. Then it changes to a new code.

**Q: Can someone else see my codes?**
A: No. Each account has unique codes that only show on your phone.

**Q: Is MFA mandatory?**
A: Your admin can make it mandatory. If so, you must enable it.

**Q: Can I disable MFA temporarily?**
A: No. Once enabled, it's always required (until you fully disable it).

---

## 🎓 Training Checklist

After reading this guide, you should be able to:

- [ ] Download and install an authenticator app
- [ ] Enable MFA in the HR system
- [ ] Scan a QR code with your phone
- [ ] Save backup codes securely
- [ ] Log in using MFA
- [ ] Use a backup code
- [ ] Trust a device
- [ ] Troubleshoot common issues

**If you need help with any of these, contact your HR administrator or IT support.**

---

## 📊 Benefits of Using MFA

### **For You:**
- 🔒 Your account is 99.9% safer from hackers
- 🛡️ Even if password leaks, you're protected
- 📱 Simple 6-digit code to remember
- ⚡ Takes only 5 extra seconds to log in
- 🌐 Industry standard security

### **For the Company:**
- 🏢 Meets compliance requirements
- 🔐 Protects sensitive employee data
- 📋 Prevents data breaches
- ✅ Passes security audits
- 💼 Professional security standards

---

**Document Version:** 1.0  
**Last Updated:** October 6, 2025  
**Questions?** Contact your HR administrator

---

**🎉 Congratulations! You're now using enterprise-grade security!** 🎉


