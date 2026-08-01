import { z } from "zod";

// Password validation schema with enhanced security
export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
    .refine((password) => {
        // Check for common patterns
        const commonPatterns = [
            "password",
            "123456",
            "qwerty",
            "admin",
            "letmein",
            "welcome",
            "monkey",
            "dragon",
            "master",
            "football",
        ];
        return !commonPatterns.some(pattern =>
            password.toLowerCase().includes(pattern)
        );
    }, "Password contains common patterns that are not allowed");

// Enhanced login schema
export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

// Rate limiting utilities
class RateLimiter {
    private attempts: Map<string, { count: number; lastAttempt: number; blockedUntil?: number }> = new Map();

    private readonly MAX_ATTEMPTS = 5;
    private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
    private readonly RESET_DURATION = 60 * 60 * 1000; // 1 hour

    isBlocked(identifier: string): boolean {
        const record = this.attempts.get(identifier);
        if (!record) return false;

        // Check if still blocked
        if (record.blockedUntil && Date.now() < record.blockedUntil) {
            return true;
        }

        // Reset if enough time has passed
        if (Date.now() - record.lastAttempt > this.RESET_DURATION) {
            this.attempts.delete(identifier);
            return false;
        }

        return false;
    }

    recordAttempt(identifier: string): { blocked: boolean; remainingAttempts: number } {
        const record = this.attempts.get(identifier) || { count: 0, lastAttempt: 0 };

        record.count++;
        record.lastAttempt = Date.now();

        if (record.count >= this.MAX_ATTEMPTS) {
            record.blockedUntil = Date.now() + this.BLOCK_DURATION;
        }

        this.attempts.set(identifier, record);

        return {
            blocked: record.blockedUntil ? Date.now() < record.blockedUntil : false,
            remainingAttempts: Math.max(0, this.MAX_ATTEMPTS - record.count)
        };
    }

    getRemainingAttempts(identifier: string): number {
        const record = this.attempts.get(identifier);
        if (!record) return this.MAX_ATTEMPTS;
        return Math.max(0, this.MAX_ATTEMPTS - record.count);
    }

    clearAttempts(identifier: string): void {
        this.attempts.delete(identifier);
    }
}

export const loginRateLimiter = new RateLimiter();

// Session management utilities
export const SESSION_CONFIG = {
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
};

// Security utilities
export const generateSecureToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePasswordStrength = (password: string): {
    isValid: boolean;
    errors: string[];
} => {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
    }

    if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least one number");
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push("Password must contain at least one special character");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Audit logging
export const logSecurityEvent = (event: string, details: any) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        details,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        ip: 'client-ip', // In production, get from request headers
    };

    console.log('SECURITY_EVENT:', logEntry);

    // In production, send to logging service
    // await sendToLoggingService(logEntry);
};

// CSRF protection
export const generateCSRFToken = (): string => {
    return generateSecureToken();
};

export const validateCSRFToken = (token: string, storedToken: string): boolean => {
    return token === storedToken;
};

// Account lockout utilities
export const ACCOUNT_LOCKOUT_CONFIG = {
    maxFailedAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    warningThreshold: 3,
};

export interface AccountLockoutInfo {
    failedAttempts: number;
    lastFailedAttempt: number;
    lockedUntil?: number;
    isLocked: boolean;
}

export const checkAccountLockout = (lockoutInfo: AccountLockoutInfo): {
    isLocked: boolean;
    remainingTime?: number;
    warning?: string;
} => {
    const now = Date.now();

    // Check if account is locked
    if (lockoutInfo.lockedUntil && now < lockoutInfo.lockedUntil) {
        return {
            isLocked: true,
            remainingTime: lockoutInfo.lockedUntil - now,
        };
    }

    // Check if approaching lockout threshold
    if (lockoutInfo.failedAttempts >= ACCOUNT_LOCKOUT_CONFIG.warningThreshold) {
        const remainingAttempts = ACCOUNT_LOCKOUT_CONFIG.maxFailedAttempts - lockoutInfo.failedAttempts;
        return {
            isLocked: false,
            warning: `Warning: ${remainingAttempts} login attempts remaining before account lockout.`,
        };
    }

    return { isLocked: false };
};

// Session utilities
export const createSecureSession = (userId: string, role: string) => {
    const sessionId = generateSecureToken();
    const expiresAt = Date.now() + SESSION_CONFIG.maxAge;

    return {
        sessionId,
        userId,
        role,
        expiresAt,
        createdAt: Date.now(),
    };
};

export const isSessionValid = (session: any): boolean => {
    return session && session.expiresAt && Date.now() < session.expiresAt;
};

// Error handling
export const handleAuthError = (error: any): string => {
    if (error.code === 401) {
        return "Invalid email or password";
    }
    if (error.code === 429) {
        return "Too many login attempts. Please try again later.";
    }
    if (error.code === 403) {
        return "Account is locked. Please contact administrator.";
    }
    return "Authentication failed. Please try again.";
}; 

// -------------------------

//     /**
//      * Logout logic. This is a placeholder.
//      * If you have a session store, you would clear the session here.
//      */
//     async logout(sessionId?: string) {
//         // If you're using Supabase Auth, you could use supabase.auth.signOut()
//         // Otherwise, delete sessionId from session store
//         // Placeholder implementation:
//         return { success: true };
//     }
// };
// 