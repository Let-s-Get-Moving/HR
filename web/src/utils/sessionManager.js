// Session management utility
// NOTE: Session token is now HttpOnly cookie-only (not accessible to JS)
// This manager validates sessions by calling the server, not by checking localStorage

class SessionManager {
  constructor() {
    this.isChecking = false;
    this.checkPromise = null;
  }

  // Clear user data (session is cookie-based, cleared by server on logout)
  clearSession() {
    localStorage.removeItem('user');
    localStorage.removeItem('passwordWarning');
  }

  // Get user data from localStorage (cached from last successful session check)
  getUser() {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  // Check if we have cached user data
  hasUser() {
    return !!this.getUser();
  }

  // Check session validity by calling the server (with caching to prevent multiple calls)
  // The server will validate the HttpOnly session cookie
  async checkSession(API) {
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
        // Store user data in localStorage for quick access (but NOT session token)
        localStorage.setItem('user', JSON.stringify(response.user));
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
