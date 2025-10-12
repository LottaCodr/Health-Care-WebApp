

// import { createClient } from "@/utils/supabase/client";
// import { revalidatePath } from "next/cache";

import supabase from "@/utils/supabase/client";
import { Staff } from "./types";

// fetch the staff profile
export async function fetchStaffProfile(id: string) {
    try {
        const { data, error } = await supabase
            .from("staffs")
            .select("id, email, role, name")
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

// Register the staff
export async function registerStaff(email: string, password: string, name: string) {
    // const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
        email: email, password: password, options: {
            data: { name }, // user_metadata
        },
    })

    if (error) {
        return { success: false, message: error.message };

    }

    if (!data) {
        return { success: false, message: error }
    }
    console.log("Creating User: ", data)

    return { success: true, user: data.user }
}

//Login the staff

export async function loginStaff(email: string, password: string) {


    const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password });



    if (error) {

        return { success: false, message: error.message };
    }

    if (!data) {
        return { success: false, message: error }
    }

    console.log('Login error: ', error)

    // ✅ fetch staff profile from your DB
    const { data: staffProfile } = await supabase
        .from("staffs")
        .select("id, email, role, name")
        .eq("id", data.user?.id)
        .single();

    if (!staffProfile) {
        return {
            success: false,
            message: "No staff profile found. Contact administrator.",
        };
    }

    // revalidatePath('/staff', 'layout')

    return { success: true, staff: staffProfile };
}


