import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import Login from "./components/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Employees from "./pages/Employees.jsx";
import TimeTracking from "./pages/TimeTracking.jsx";
import Compliance from "./pages/Compliance.jsx";
import Payroll from "./pages/Payroll.jsx";
import PayrollV2 from "./pages/PayrollV2.jsx";
import Settings from "./pages/Settings.jsx";
import LeaveManagement from "./pages/LeaveManagement.jsx";
import Testing from "./pages/Testing.jsx";
import Benefits from "./pages/Benefits.jsx";
import BonusesCommissions from "./pages/BonusesCommissions.jsx";

import { API } from './config/api.js';
import { sessionManager } from './utils/sessionManager.js';
import { checkAndFixSession, forceLogout } from './utils/sessionFix.js';

// Professional SVG Icons
const Icons = {
  dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  employees: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  timeTracking: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  compliance: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  payroll: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  leave: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  testing: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  benefits: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  bonuses: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  logout: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
};

// Define pages configuration (will be translated dynamically)
const getPagesConfig = (t) => ({
  dashboard: { name: t('nav.dashboard'), component: Dashboard, icon: Icons.dashboard },
  employees: { name: t('nav.employees'), component: Employees, icon: Icons.employees },
  timeTracking: { name: t('nav.timeTracking'), component: TimeTracking, icon: Icons.timeTracking },
  leave: { name: t('nav.leave'), component: LeaveManagement, icon: Icons.leave },
  payroll: { name: t('nav.payroll'), component: Payroll, icon: Icons.payroll },
  compliance: { name: t('nav.compliance'), component: Compliance, icon: Icons.compliance },
  benefits: { name: t('nav.benefits'), component: Benefits, icon: Icons.benefits },
  bonuses: { name: t('nav.bonuses'), component: BonusesCommissions, icon: Icons.bonuses },
  testing: { name: "Testing", component: Testing, icon: Icons.testing },
  settings: { name: t('nav.settings'), component: Settings, icon: Icons.settings }
});

import { useUserRole, canAccessPage } from './hooks/useUserRole.js';

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("employees");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Get user role directly from user state (updates immediately on login)
  const userRole = user?.role || null;
  
  // Get pages with translations
  const pages = getPagesConfig(t);
  
  // Filter pages based on user role
  const allowedPages = useMemo(() => {
    if (!user || !userRole) return pages; // Show all during loading
    
    return Object.fromEntries(
      Object.entries(pages).filter(([key]) => canAccessPage(userRole, key))
    );
  }, [user, userRole, pages]);

  // Redirect to first allowed page if current page is not accessible
  useEffect(() => {
    if (user && userRole && allowedPages && !canAccessPage(userRole, currentPage)) {
      const firstAllowedPage = Object.keys(allowedPages)[0];
      if (firstAllowedPage) {
        setCurrentPage(firstAllowedPage);
      }
    }
  }, [user, userRole, allowedPages, currentPage]);
  const [passwordWarning, setPasswordWarning] = useState(null);

  useEffect(() => {
    // Apply theme on app load
    const applyTheme = () => {
      const theme = localStorage.getItem('preferences_theme') || 'dark';
      const root = document.documentElement;

      if (theme === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
      }
    };

    applyTheme(); // Call applyTheme on app load

    // Check for existing session on app load with proper cleanup
    const checkSession = async () => {
      try {
        const isValid = await checkAndFixSession(API);
        
        if (isValid) {
          const sessionData = await sessionManager.checkSession(API);
          if (sessionData && sessionData.user) {
            setUser(sessionData.user);
            console.log('✅ Session valid, user logged in');
          } else {
            console.log('❌ Session check failed, user not logged in');
            setUser(null);
          }
        } else {
          console.log('❌ No valid session found, user not logged in');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Session check error:', error);
        setUser(null);
      }
    };

    checkSession();
  }, []);

  const handleLogin = (userData, passwordWarningData = null) => {
    setUser(userData);
    setCurrentPage("dashboard");
    
    // Check for password warning
    if (passwordWarningData) {
      setPasswordWarning(passwordWarningData);
    }
    
    // Also check localStorage for password warning (set by Login component)
    const storedWarning = localStorage.getItem('passwordWarning');
    if (storedWarning) {
      try {
        setPasswordWarning(JSON.parse(storedWarning));
      } catch (e) {
        console.error('Failed to parse password warning:', e);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await API("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    setUser(null);
    setCurrentPage("dashboard");
  };

  // Show login if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const CurrentComponent = pages[currentPage].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-hover dark:hover:bg-slate-700/50 transition-colors lg:hidden"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">HR</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-primary">HR Management System</h1>
                  <p className="text-xs text-secondary">Professional HR Solutions</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-sm">
                <div className="text-primary font-medium">Welcome, {user.username}</div>
                <div className="text-xs text-secondary">Last login: {new Date().toLocaleDateString()}</div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-secondary hover:text-primary hover:bg-hover dark:hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <Icons.logout />
                <span className="hidden sm:inline font-medium">Logout</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Password Expiry Warning Banner */}
      {passwordWarning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500 dark:bg-yellow-600 text-black dark:text-white shadow-md"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold">{passwordWarning.message}</p>
                  <p className="text-sm opacity-90">
                    Please change your password soon to avoid being locked out.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage('settings')}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Change Password
                </button>
                <button
                  onClick={() => {
                    setPasswordWarning(null);
                    localStorage.removeItem('passwordWarning');
                  }}
                  className="p-2 hover:bg-black hover:bg-opacity-10 rounded-lg transition-colors"
                  title="Dismiss"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar Navigation */}
        <nav className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-600 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6 lg:hidden">
              <h2 className="text-lg font-semibold text-primary">Navigation</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-hover dark:hover:bg-slate-700/50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(allowedPages).map(([key, page]) => (
                <motion.button
                  key={key}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCurrentPage(key);
                    setSidebarOpen(false); // Close sidebar on mobile
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    currentPage === key
                      ? "bg-indigo-600 dark:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 dark:shadow-indigo-500/50"
                      : "text-secondary hover:bg-hover hover:text-primary dark:hover:bg-slate-700/50"
                  }`}
                >
                  <page.icon />
                  <span className="font-medium">{page.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </nav>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 p-6 lg:p-8">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <CurrentComponent onNavigate={setCurrentPage} user={user} />
          </motion.div>
        </main>
      </div>
    </div>
  );
}