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
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0B0B0C' }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.25, 0.8, 0.25, 1] }}
        className="w-full max-w-md card-lg"
        style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderColor: 'rgba(255, 255, 255, 0.12)' }}
      >
        <div className="p-8">
          {/* Logo and Branding */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🚛</div>
            <h1 className="text-2xl font-semibold mb-2 text-tahoe-text-primary">Command & Control Logistics</h1>
            <p className="text-tahoe-text-secondary">Human Resources Management</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label className="block text-xs font-medium mb-1.5 text-tahoe-text-primary tracking-wide">Username</label>
              <input
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="form-input"
                placeholder="Enter username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="block text-xs font-medium mb-1.5 text-tahoe-text-primary tracking-wide">Password</label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="form-input"
                placeholder="Enter password"
                disabled={loading}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="status-error text-sm text-center p-3 rounded-tahoe-input"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full btn-primary"
            >
              {loading ? "Signing In..." : "Sign In"}
            </motion.button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 rounded-tahoe border border-tahoe-border-primary" style={{ backgroundColor: 'rgba(22, 22, 24, 0.6)' }}>
            <p className="text-xs text-tahoe-text-secondary text-center">
              <strong className="text-tahoe-text-primary">Demo Credentials:</strong><br />
              Username: <code className="text-tahoe-accent font-medium">Avneet</code><br />
              Password: <code className="text-tahoe-accent font-medium">password123</code>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
