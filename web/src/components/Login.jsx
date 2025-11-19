import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { API } from '../config/api.js';
import { sessionManager } from '../utils/sessionManager.js';

export default function Login({ onLogin }) {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // MFA State
  const [showMFAInput, setShowMFAInput] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  
  // Password Change State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordChangeReason, setPasswordChangeReason] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    // Check for existing session on component mount
    checkSession();
  }, []);

  const checkSession = async () => {
    const sessionData = await sessionManager.checkSession(API);
    if (sessionData && sessionData.user) {
      onLogin(sessionData.user);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMfaError("");

    try {
      // Generate device fingerprint for trust device feature
      const deviceFingerprint = `${navigator.userAgent}_${navigator.language}_${screen.width}x${screen.height}_${navigator.platform}`;
      
      const response = await API("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credentials,
          deviceFingerprint: deviceFingerprint  // Send fingerprint to check if device is already trusted
        }),
        credentials: "include" // Include cookies
      });

      // Check if password change is required
      if (response.requiresPasswordChange) {
        console.log('🔐 Password change required');
        setTempToken(response.tempToken);
        setPasswordChangeReason(response.reason || 'Your password has expired');
        setShowPasswordChange(true);
        setLoading(false);
        return;
      }
      
      // Check if MFA is required
      if (response.requiresMFA) {
        console.log('🔐 MFA required for login');
        setTempToken(response.tempToken);
        setShowMFAInput(true);
        setLoading(false);
        return;
      }

      // Normal login (no MFA or trusted device)
      if (response.user) {
        // Store session info in localStorage for persistence
        localStorage.setItem("sessionId", response.sessionId);
        localStorage.setItem("user", JSON.stringify(response.user));
        
        // Store password warning if present
        if (response.passwordWarning) {
          localStorage.setItem("passwordWarning", JSON.stringify(response.passwordWarning));
        } else {
          localStorage.removeItem("passwordWarning");
        }
        
        // Set up session extension timer
        setupSessionExtension();
        
        onLogin(response.user, response.passwordWarning || null);
      } else {
        setError("Login failed - no user data received");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (e) => {
    e.preventDefault();
    
    if (mfaCode.length !== 6) {
      setMfaError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    setMfaError("");

    try {
      // Generate device fingerprint for trust feature (must match fingerprint sent during login)
      const deviceFingerprint = trustDevice ? 
        `${navigator.userAgent}_${navigator.language}_${screen.width}x${screen.height}_${navigator.platform}` : null;
      const deviceName = trustDevice ? 
        `${navigator.platform} - ${navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] || 'Browser'}` : null;
      
      const response = await API("/api/auth/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken: tempToken,
          code: mfaCode,
          trustDevice: trustDevice,
          deviceFingerprint: deviceFingerprint,
          deviceName: deviceName
        }),
        credentials: "include"
      });

      if (response.user) {
        // Store session info
        localStorage.setItem("sessionId", response.sessionId);
        localStorage.setItem("user", JSON.stringify(response.user));
        
        // Store password warning if present
        if (response.passwordWarning) {
          localStorage.setItem("passwordWarning", JSON.stringify(response.passwordWarning));
        } else {
          localStorage.removeItem("passwordWarning");
        }
        
        // Set up session extension timer
        setupSessionExtension();
        
        // Reset MFA state
        setShowMFAInput(false);
        setMfaCode("");
        setTempToken("");
        
        onLogin(response.user, response.passwordWarning || null);
      } else {
        setMfaError("MFA verification failed");
      }
    } catch (error) {
      console.error("MFA verification error:", error);
      setMfaError(error.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    
    // Validation
    if (!passwordChangeData.newPassword || !passwordChangeData.confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }
    
    if (passwordChangeData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await API("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken: tempToken,
          newPassword: passwordChangeData.newPassword
        })
      });
      
      // Password changed successfully - now need to log in again
      setShowPasswordChange(false);
      setPasswordChangeData({ newPassword: '', confirmPassword: '' });
      setTempToken('');
      alert(t('login.passwordChangeSuccess'));
      
      // Reset form
      setCredentials({ username: credentials.username, password: '' });
      
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const setupSessionExtension = () => {
    // Extend session every 25 minutes (before 30-minute timeout)
    const extensionInterval = setInterval(async () => {
      try {
        await API("/api/auth/extend", {
          method: "POST",
          credentials: "include"
        });
      } catch (error) {
        console.error("Session extension failed:", error);
        // Session expired, redirect to login
        handleLogout();
        clearInterval(extensionInterval);
      }
    }, 25 * 60 * 1000); // 25 minutes

    // Store interval ID for cleanup
    localStorage.setItem("sessionExtensionInterval", extensionInterval);
  };

  const handleLogout = () => {
    // Clear session data
    localStorage.removeItem("sessionId");
    localStorage.removeItem("user");
    
    // Clear extension interval
    const intervalId = localStorage.getItem("sessionExtensionInterval");
    if (intervalId) {
      clearInterval(parseInt(intervalId));
      localStorage.removeItem("sessionExtensionInterval");
    }

    // Call logout API
    API("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    }).catch(console.error);

    // Redirect to login
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl"
      >
        <div className="card-lg backdrop-blur-md border border-primary/20 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-primary">{t('login.title')}</h1>
            <p className="text-secondary">{t('login.subtitle')}</p>
            <p className="text-sm text-tertiary mt-2">{t('login.developer')}</p>
          </div>

          {/* Password Change Screen */}
          {showPasswordChange ? (
            <form onSubmit={handlePasswordChangeSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="text-xl font-bold mb-2">{t('login.passwordChangeRequired')}</h2>
                <p className="text-sm text-secondary">{passwordChangeReason}</p>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-2 text-primary">{t('login.newPassword')}</label>
                <input
                  type="password"
                  value={passwordChangeData.newPassword}
                  onChange={(e) => setPasswordChangeData({...passwordChangeData, newPassword: e.target.value})}
                  className="w-full px-3 py-2 input-md"
                  placeholder={t('login.newPasswordPlaceholder')}
                  required
                  minLength="8"
                  autoFocus
                />
                <p className="text-xs text-tertiary mt-1">
                  Must be at least 8 characters. Cannot reuse your last 5 passwords.
                </p>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-2 text-primary">{t('login.confirmPassword')}</label>
                <input
                  type="password"
                  value={passwordChangeData.confirmPassword}
                  onChange={(e) => setPasswordChangeData({...passwordChangeData, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 input-md"
                  placeholder={t('login.reenterPasswordPlaceholder')}
                  required
                />
              </div>

              {passwordError && (
                <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 p-3 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? t('login.changingPassword') : t('login.changePassword')}
              </button>

              <div className="mt-4 text-center text-xs text-tertiary">
                <p>💡 After changing, you'll need to log in with your new password</p>
              </div>
            </form>
          ) : /* MFA Input Screen */
          showMFAInput ? (
            <form onSubmit={handleMFAVerify} className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🔐</div>
                <h2 className="text-xl font-bold mb-2">{t('login.mfaTitle')}</h2>
                <p className="text-sm text-secondary">
                  {t('login.mfaDescription')}
                </p>
              </div>

              <div className="form-group">
                <input
                  type="text"
                  maxLength="6"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-4 text-center text-3xl tracking-widest font-mono input-md"
                  placeholder="000000"
                  required
                  autoFocus
                />
              </div>

              {mfaError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-error text-sm text-center"
                >
                  {mfaError}
                </motion.div>
              )}

              {/* Trust This Device Checkbox */}
              <div className="flex items-start space-x-3 p-3 bg-neutral-900 bg-opacity-30 rounded-lg border border-neutral-700">
                <input
                  type="checkbox"
                  id="trustDevice"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-neutral-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-neutral-900"
                />
                <label htmlFor="trustDevice" className="flex-1 text-sm">
                  <div className="font-medium text-primary">{t('login.trustDevice')}</div>
                  <div className="text-xs text-tertiary mt-1">
                    ⚠️ Only enable on devices you personally own and control. Never use on public or shared computers.
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="w-full btn-primary py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? t('login.verifying') : t('login.verifyCode')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMFAInput(false);
                  setMfaCode("");
                  setTempToken("");
                  setMfaError("");
                }}
                className="w-full text-secondary hover:text-primary text-sm"
              >
                {t('login.backToLogin')}
              </button>

              <div className="mt-4 text-center text-xs text-tertiary">
                <p>💡 Tip: The code changes every 30 seconds</p>
              </div>
            </form>
          ) : (
            /* Regular Login Form */
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="form-group">
                <label className="block text-sm font-medium mb-2 text-primary">{t('login.username')}</label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full px-3 py-2 input-md"
                  placeholder={t('login.usernamePlaceholder')}
                  required
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-2 text-primary">{t('login.password')}</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-3 py-2 input-md"
                  placeholder={t('login.passwordPlaceholder')}
                  required
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-error text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? t('login.signingIn') : t('login.signIn')}
              </button>
            </form>
          )}

          {!showMFAInput && (
            <>
              <div className="mt-6 text-center text-sm text-secondary">
                <p>{t('login.demoCredentials')}:</p>
                <p>{t('login.demoUsername')}: <span className="text-primary font-medium">Avneet</span></p>
                <p>{t('login.demoPassword')}: <span className="text-primary font-medium">password123</span></p>
              </div>

              <div className="mt-4 text-center text-xs text-tertiary">
                <p>{t('login.sessionTimeout')}</p>
                <p>{t('login.autoLogout')}</p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
