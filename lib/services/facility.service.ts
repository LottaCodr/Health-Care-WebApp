"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import type { Facility } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

/**
 * Multi-facility support. Staff and patients can be assigned to a facility;
 * key list queries scope by the caller's facility when one is set (with
 * graceful fallback for schemas that lack the column).
 */

export async function listFacilities(): Promise<Facility[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("name");
    if (error) { console.error("[facility] list:", error); return []; }
    return data as unknown as Facility[];
}

export async function createFacility(input: Omit<Facility, "id" | "created_at">): Promise<Facility> {
    await requireStaff([UserRole.Admin]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("facilities")
        .insert([input])
        .select()
        .single();
    if (error) throw error;
    await logAction("FACILITY_CREATED", "facilities", data.id, { name: input.name, code: input.code });
    return data as unknown as Facility;
}

export async function updateFacility(id: string, updates: Partial<Facility>): Promise<Facility> {
    await requireStaff([UserRole.Admin]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("facilities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data as unknown as Facility;
}

/** Current staff member's facility id (used for list scoping). */
export async function getCurrentFacilityId(): Promise<string | null> {
    const { getCurrentStaff } = await import("./auth-guard");
    const staff = await getCurrentStaff();
    if (!staff) return null;
    const supabase = await createClient();
    const { data } = await supabase
        .from("staffs")
        .select("facility_id")
        .eq("id", staff.userId)
        .maybeSingle();
    return data?.facility_id ?? null;
}
