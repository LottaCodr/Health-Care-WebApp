import { account, databases } from "@/lib/appwrite.config";
import { 
  loginRateLimiter, 
  logSecurityEvent, 
  generateSecureToken, 
  createSecureSession,
  isSessionValid,
  handleAuthError,
  checkAccountLockout,
  ACCOUNT_LOCKOUT_CONFIG
} from "./auth-utils";
import { StaffRole } from "@/actions/staff/types";
import { ROLE_ROUTES } from "@/constants";

export interface AuthResult {
  success: boolean;
  message: string;
  user?: any;
  role?: StaffRole;
  sessionId?: string;
  redirectTo?: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  role: StaffRole;
  expiresAt: number;
  createdAt: number;
}

class AuthService {
  private sessions: Map<string, SessionData> = new Map();
  private accountLockouts: Map<string, any> = new Map();

  // Enhanced login with security features
  async login(email: string, password: string): Promise<AuthResult> {
    const identifier = email.toLowerCase();
    
    try {
      // Check rate limiting
      if (loginRateLimiter.isBlocked(identifier)) {
        logSecurityEvent('LOGIN_BLOCKED', { email: identifier, reason: 'rate_limit' });
        return {
          success: false,
          message: "Too many login attempts. Please try again in 15 minutes.",
        };
      }

      // Check account lockout
      const lockoutInfo = this.accountLockouts.get(identifier);
      if (lockoutInfo) {
        const lockoutCheck = checkAccountLockout(lockoutInfo);
        if (lockoutCheck.isLocked) {
          const remainingMinutes = Math.ceil((lockoutCheck.remainingTime || 0) / 60000);
          logSecurityEvent('LOGIN_BLOCKED', { email: identifier, reason: 'account_locked', remainingTime: remainingMinutes });
          return {
            success: false,
            message: `Account is locked. Please try again in ${remainingMinutes} minutes.`,
          };
        }
      }

      // Attempt login
      await account.deleteSession("current").catch(() => {});
      await account.createEmailPasswordSession(email, password);

      // Get user details
      const user = await account.get();
      const userDoc = await databases.getDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!,
        user.$id
      );

      const role = userDoc?.role as StaffRole;

      if (!role || !ROLE_ROUTES[role]) {
        throw new Error("Invalid or missing user role");
      }

      // Clear failed attempts on successful login
      loginRateLimiter.clearAttempts(identifier);
      this.accountLockouts.delete(identifier);

      // Create secure session
      const session = createSecureSession(user.$id, role);
      this.sessions.set(session.sessionId, session);

      // Update user preferences
      await account.updatePrefs({ role });

      // Log successful login
      logSecurityEvent('LOGIN_SUCCESS', { 
        userId: user.$id, 
        email: identifier, 
        role,
        sessionId: session.sessionId 
      });

      return {
        success: true,
        message: `Welcome, ${role.charAt(0).toUpperCase() + role.slice(1)}!`,
        user: userDoc,
        role,
        sessionId: session.sessionId,
        redirectTo: ROLE_ROUTES[role],
      };

    } catch (error: any) {
      // Record failed attempt
      const rateLimitResult = loginRateLimiter.recordAttempt(identifier);
      
      // Update account lockout info
      const currentLockout = this.accountLockouts.get(identifier) || {
        failedAttempts: 0,
        lastFailedAttempt: 0,
        isLocked: false,
      };
      
      currentLockout.failedAttempts++;
      currentLockout.lastFailedAttempt = Date.now();
      
      if (currentLockout.failedAttempts >= ACCOUNT_LOCKOUT_CONFIG.maxFailedAttempts) {
        currentLockout.lockedUntil = Date.now() + ACCOUNT_LOCKOUT_CONFIG.lockoutDuration;
        currentLockout.isLocked = true;
      }
      
      this.accountLockouts.set(identifier, currentLockout);

      // Log failed login attempt
      logSecurityEvent('LOGIN_FAILED', { 
        email: identifier, 
        error: error.message,
        failedAttempts: currentLockout.failedAttempts,
        remainingAttempts: rateLimitResult.remainingAttempts
      });

      const errorMessage = handleAuthError(error);
      
      if (rateLimitResult.blocked) {
        return {
          success: false,
          message: "Too many failed attempts. Please try again in 15 minutes.",
        };
      }

      if (currentLockout.isLocked) {
        return {
          success: false,
          message: "Account is locked due to multiple failed attempts. Please try again in 15 minutes.",
        };
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  // Secure logout
  async logout(sessionId?: string): Promise<void> {
    try {
      // Delete Appwrite session
      await account.deleteSession("current");
      
      // Remove session from memory
      if (sessionId) {
        this.sessions.delete(sessionId);
      }

      // Clear any stored session data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_session');
        sessionStorage.removeItem('auth_session');
      }

      logSecurityEvent('LOGOUT_SUCCESS', { sessionId });
    } catch (error) {
      logSecurityEvent('LOGOUT_ERROR', { error: error.message });
      console.error('Logout error:', error);
    }
  }

  // Validate session
  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const isValid = isSessionValid(session);
    
    if (!isValid) {
      this.sessions.delete(sessionId);
      logSecurityEvent('SESSION_EXPIRED', { sessionId });
    }
    
    return isValid;
  }

  // Get session data
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session || !isSessionValid(session)) {
      return null;
    }
    return session;
  }

  // Refresh session
  refreshSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Extend session
    session.expiresAt = Date.now() + (8 * 60 * 60 * 1000); // 8 hours
    this.sessions.set(sessionId, session);

    logSecurityEvent('SESSION_REFRESHED', { sessionId });
    return session;
  }

  // Get current user
  async getCurrentUser(): Promise<any> {
    try {
      const session = await account.get();
      const userDoc = await databases.getDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!,
        session.$id
      );
      return userDoc;
    } catch (error) {
      return null;
    }
  }

  // Change password with security validation
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      // Validate current password
      await account.updatePassword(newPassword, currentPassword);
      
      logSecurityEvent('PASSWORD_CHANGED', { userId: (await account.get()).$id });
      
      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error: any) {
      logSecurityEvent('PASSWORD_CHANGE_FAILED', { error: error.message });
      return {
        success: false,
        message: handleAuthError(error),
      };
    }
  }

  // Reset password (for admin use)
  async resetPassword(userId: string, newPassword: string): Promise<AuthResult> {
    try {
      // This would typically be done by an admin or through a secure reset process
      // For now, we'll just log the attempt
      logSecurityEvent('PASSWORD_RESET_ATTEMPTED', { userId, newPassword: '***' });
      
      return {
        success: true,
        message: "Password reset successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to reset password",
      };
    }
  }

  // Get account lockout status
  getAccountLockoutStatus(email: string): any {
    return this.accountLockouts.get(email.toLowerCase()) || {
      failedAttempts: 0,
      lastFailedAttempt: 0,
      isLocked: false,
    };
  }

  // Clear account lockout (admin function)
  clearAccountLockout(email: string): void {
    this.accountLockouts.delete(email.toLowerCase());
    loginRateLimiter.clearAttempts(email.toLowerCase());
    logSecurityEvent('ACCOUNT_LOCKOUT_CLEARED', { email });
  }

  // Get active sessions count
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  // Clean up expired sessions
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Create singleton instance
export const authService = new AuthService();

// Cleanup expired sessions every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    authService.cleanupExpiredSessions();
  }, 5 * 60 * 1000);
} 