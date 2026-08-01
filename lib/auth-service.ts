/**
 * Client-side auth helpers used by the Settings UI.
 *
 * NOTE: Auth itself is handled by Supabase Auth (see `context/auth-provider.tsx`
 * and `proxy.ts`). This module only wraps a couple of account self-service
 * operations that the Security Settings / Security Audit screens need.
 */
import supabase from "@/utils/supabase/client";

export interface ChangePasswordResult {
    success: boolean;
    message: string;
}

export const authService = {
    /**
     * Change the current user's password. Supabase requires a sufficiently
     * fresh session; if the session has expired the caller should re-authenticate.
     */
    async changePassword(
        _currentPassword: string,
        newPassword: string
    ): Promise<ChangePasswordResult> {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            return { success: false, message: error.message };
        }

        return { success: true, message: "Password updated successfully." };
    },

    /**
     * Supabase does not expose a simple cross-device session count from the
     * browser client, so we report the current session only.
     */
    getActiveSessionsCount(): number {
        return 1;
    },
};
