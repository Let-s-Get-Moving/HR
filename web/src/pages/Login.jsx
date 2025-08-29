import React, { useState } from "react";
import { motion } from "framer-motion";

const API = (path, options = {}) => fetch(`http://localhost:8080${path}`, {
  ...options,
  credentials: 'include', // Include cookies
  headers: {
    'Content-Type': 'application/json',
    ...options.headers
  }
});

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
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md"
      >
        <div className="p-8">
          {/* Logo and Branding */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🚛</div>
            <h1 className="text-2xl font-bold mb-2">Command & Control Logistics</h1>
            <p className="text-neutral-400">Human Resources Management</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                placeholder="Enter username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                placeholder="Enter password"
                disabled={loading}
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

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </motion.button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-neutral-800 rounded-lg">
            <p className="text-xs text-neutral-400 text-center">
              <strong>Demo Credentials:</strong><br />
              Username: <code>Avneet</code><br />
              Password: <code>password123</code>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
