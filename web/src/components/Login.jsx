import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { API } from '../config/api.js';
import { sessionManager } from '../utils/sessionManager.js';

export default function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // MFA State
  const [showMFAInput, setShowMFAInput] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [mfaError, setMfaError] = useState("");

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
      const response = await API("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include" // Include cookies
      });

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
        
        // Set up session extension timer
        setupSessionExtension();
        
        onLogin(response.user);
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
      const response = await API("/api/auth/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken: tempToken,
          code: mfaCode
        }),
        credentials: "include"
      });

      if (response.user) {
        // Store session info
        localStorage.setItem("sessionId", response.sessionId);
        localStorage.setItem("user", JSON.stringify(response.user));
        
        // Set up session extension timer
        setupSessionExtension();
        
        // Reset MFA state
        setShowMFAInput(false);
        setMfaCode("");
        setTempToken("");
        
        onLogin(response.user);
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
            <h1 className="text-3xl font-bold mb-2 text-primary">C&C HR</h1>
            <p className="text-secondary">Command & Control Logistics</p>
            <p className="text-sm text-tertiary mt-2">Developed by Udi Shkolnik</p>
          </div>

          {/* MFA Input Screen */}
          {showMFAInput ? (
            <form onSubmit={handleMFAVerify} className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🔐</div>
                <h2 className="text-xl font-bold mb-2">Two-Factor Authentication</h2>
                <p className="text-sm text-secondary">
                  Enter the 6-digit code from your authenticator app
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

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="w-full btn-primary py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify Code"}
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
                ← Back to login
              </button>

              <div className="mt-4 text-center text-xs text-tertiary">
                <p>💡 Tip: The code changes every 30 seconds</p>
              </div>
            </form>
          ) : (
            /* Regular Login Form */
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="form-group">
                <label className="block text-sm font-medium mb-2 text-primary">Username</label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full px-3 py-2 input-md"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium mb-2 text-primary">Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-3 py-2 input-md"
                  placeholder="Enter password"
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
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          {!showMFAInput && (
            <>
              <div className="mt-6 text-center text-sm text-secondary">
                <p>Demo Credentials:</p>
                <p>Username: <span className="text-primary font-medium">Avneet</span></p>
                <p>Password: <span className="text-primary font-medium">password123</span></p>
              </div>

              <div className="mt-4 text-center text-xs text-tertiary">
                <p>Session timeout: 30 minutes</p>
                <p>Auto-logout on inactivity</p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
