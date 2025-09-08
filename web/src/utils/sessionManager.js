// Session management utility
class SessionManager {
  constructor() {
    this.sessionId = localStorage.getItem('sessionId');
    this.isChecking = false;
    this.checkPromise = null;
  }

  // Get current session ID
  getSessionId() {
    return this.sessionId;
  }

  // Set session ID
  setSessionId(sessionId) {
    this.sessionId = sessionId;
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  }

  // Check if we have a session ID
  hasSession() {
    return !!this.sessionId;
  }

  // Clear session
  clearSession() {
    this.sessionId = null;
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
  }

  // Check session validity (with caching to prevent multiple calls)
  async checkSession(API) {
    if (!this.hasSession()) {
      return null;
    }

    // If already checking, return the same promise
    if (this.isChecking && this.checkPromise) {
      return this.checkPromise;
    }

    this.isChecking = true;
    this.checkPromise = this._performSessionCheck(API);
    
    try {
      const result = await this.checkPromise;
      return result;
    } finally {
      this.isChecking = false;
      this.checkPromise = null;
    }
  }

  async _performSessionCheck(API) {
    try {
      const response = await API("/api/auth/session");
      if (response.user) {
        return response;
      } else {
        this.clearSession();
        return null;
      }
    } catch (error) {
      console.log("Session check failed:", error.message);
      // Only clear session on specific auth errors, not network issues
      if (error.message.includes("401") || 
          error.message.includes("Unauthorized") || 
          error.message.includes("Invalid or expired session") ||
          error.message.includes("No session")) {
        this.clearSession();
      }
      return null;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
