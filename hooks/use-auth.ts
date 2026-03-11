import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";

export async function getUser() {
    try {
        const supabase = await createClient();

        // 1. Get user from Supabase Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return null;

        // 2. Fetch staff profile from public.staffs table
        const { data: staff, error: staffError } = await supabase
            .from("staffs")
            .select("id, name, email, role")
            .eq("id", user.id)
            .single();

        if (staffError || !staff) {
            console.error("Staff profile not found for user:", user.id);
            return null;
        }

        // 3. Return normalized object
        return {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            role: staff.role as UserRole,
        };
    } catch (err) {
        console.error("getUser error:", err);
        return null;
    }
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
}
