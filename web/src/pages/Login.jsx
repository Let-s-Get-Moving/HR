import React, { useState } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';

export default function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await API("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      
      if (response.ok) {
        const data = await response.json();
        onLogin(data.user);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md"
      >
        <div className="p-8">
          {/* Logo and Branding */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🚛</div>
            <h1 className="text-2xl font-bold mb-2 text-primary">Command & Control Logistics</h1>
            <p className="text-secondary">Human Resources Management</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label className="block text-sm font-medium mb-2 text-primary">Username</label>
              <input
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="w-full px-4 py-3 input-md"
                placeholder="Enter username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium mb-2 text-primary">Password</label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="w-full px-4 py-3 input-md"
                placeholder="Enter password"
                disabled={loading}
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

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </motion.button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 card-sm">
            <p className="text-xs text-secondary text-center">
              <strong>Demo Credentials:</strong><br />
              Username: <code className="text-primary font-medium">Avneet</code><br />
              Password: <code className="text-primary font-medium">password123</code>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
