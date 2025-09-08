import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { API } from '../config/api.js';

export default function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check for existing session on component mount
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await API("/api/auth/session");
      if (response.user) {
        onLogin(response.user);
      }
    } catch (error) {
      // No valid session, user needs to login
      console.log("No valid session found");
      // Clear any stale session data
      localStorage.removeItem("sessionId");
      localStorage.removeItem("user");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await API("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include" // Include cookies
      });

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
      setError("Invalid username or password");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">C&C HR</h1>
            <p className="text-neutral-400">Command & Control Logistics</p>
            <p className="text-sm text-neutral-500 mt-2">Developed by Udi Shkolnik</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:border-indigo-400 text-white placeholder-neutral-300"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:border-indigo-400 text-white placeholder-neutral-300"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-indigo-800 disabled:to-purple-800 py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-400">
            <p>Demo Credentials:</p>
            <p>Username: <span className="text-indigo-400">Avneet</span></p>
            <p>Password: <span className="text-indigo-400">password123</span></p>
          </div>

          <div className="mt-4 text-center text-xs text-neutral-500">
            <p>Session timeout: 30 minutes</p>
            <p>Auto-logout on inactivity</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
