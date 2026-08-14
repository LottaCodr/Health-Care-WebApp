// Client-side staff profile READ used by the auth provider.
//
// NOTE: `registerStaff` (open client-side self-signup) and `loginStaff`
// were REMOVED as a security fix. Staff accounts must be created through
// `lib/services/staff.service.ts#createStaff`, which is Admin-only and
// runs server-side. Authentication itself goes through Supabase Auth in
// `context/auth-provider.tsx`.

import supabase from "@/utils/supabase/client";

// fetch the staff profile
export async function fetchStaffProfile(id: string) {
    try {
        const { data, error } = await supabase
            .from("staffs")
            .select("id, email, role, name, phone_number, department")
            .eq("id", id)
            .single();

        if (error) {
            return {
                success: false,
                message: error.message || "An error occurred while fetching the staff profile."
            };
        }

        if (!data) {
            return {
                success: false,
                message: "No profile found for this staff. Please check again."
            };
        }

        return {
            success: true,
            profile: data
        };
    } catch (err) {
        return {
            success: false,
            message: err instanceof Error ? err.message : "Unknown error occurred."
        };
    }
}
