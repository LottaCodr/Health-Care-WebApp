"use server";

import { createClient } from "@/utils/supabase/server";
import { LabRequest } from "@/types/models";
import { createNotification } from "./notification.service";

// ─── Lab Requests ─────────────────────────────────────────────────────────────

export interface CreateLabRequestInput {
    patientId: string;
    requestedBy?: string;
    testType: string;
    priority?: "routine" | "urgent" | "stat";
    notes?: string;
    status?: string;
}

export async function createLabRequest(
    input: CreateLabRequestInput
): Promise<LabRequest> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .insert([{
            visit_id: input.patientId,
            requested_by: input.requestedBy ?? null,
            test_type: input.testType,
            priority: input.priority ?? "routine",
            notes: input.notes ?? null,
            status: input.status ?? "pending",
        }])
        .select()
        .single();

    if (error) { console.error("[lab] createRequest:", error); throw error; }

    await createNotification({
        role: "LabTechnician",
        title: "New Lab Request",
        message: `A new ${input.priority === "urgent" || input.priority === "stat" ? "urgent " : ""}lab test (${input.testType}) has been requested.`,
        type: input.priority === "stat" ? "alert" : "info"
    });

    return data as unknown as LabRequest;
}

export async function getLabRequestById(id: string): Promise<LabRequest | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[lab] getById:", error); return null; }
    return data as unknown as LabRequest;
}

export async function listLabRequestsByPatient(
    patientId: string
): Promise<LabRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("visit_id", patientId)
        .not("test_type", "like", "[RADIOLOGY]%")   // ← exclude radiology rows
        .order("created_at", { ascending: false });

    if (error) { console.error("[lab] listByPatient:", error); return []; }
    return data as unknown as LabRequest[];
}

export async function listPendingLabRequests(): Promise<LabRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("status", "pending")
        .not("test_type", "like", "[RADIOLOGY]%")   // ← exclude radiology rows
        .order("created_at", { ascending: true });   // oldest first → FIFO queue

    if (error) { console.error("[lab] listPending:", error); return []; }
    return data as unknown as LabRequest[];
}

export async function listCompletedLabRequests(): Promise<LabRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("status", "completed")
        .not("test_type", "like", "[RADIOLOGY]%")   // ← exclude radiology rows
        .order("completed_at", { ascending: false });

    if (error) { console.error("[lab] listCompleted:", error); return []; }
    return data as unknown as LabRequest[];
}

export async function updateLabRequest(
    id: string,
    updates: {
        status?: string;
        result?: string;
        completed_by?: string;
        completed_at?: string;
        priority?: string;
        notes?: string;
    }
): Promise<LabRequest> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[lab] updateRequest:", error); throw error; }

    // Auto-route patient back to doctor queue when tests complete
    if (updates.status === "completed" && data?.visit_id) {
        await supabase
            .from("patients")
            .update({ status: "under-observation" })
            .eq("id", data.visit_id);

        await createNotification({
            recipient_id: data.requested_by ?? undefined,
            role: data.requested_by ? undefined : "Doctor",
            title: "Lab Result Ready",
            message: `Results for ${data.test_type} are now available.`,
            type: "success"
        });
    }

    return data as unknown as LabRequest;
}

// ─── Lab Test Catalog ─────────────────────────────────────────────────────────

export interface LabTestCatalogItem {
    id?: string;
    test_name: string;
    test_code?: string;
    category: string;
    description?: string;
    price: number;
    sample_type?: string;
    turnaround_time?: string;
    normal_range?: string;
    instructions?: string;
    is_active?: boolean;
}

export async function listActiveLabTests(): Promise<LabTestCatalogItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_test_catalog")
        .select("id, test_name, test_code, category, sample_type, turnaround_time, price, instructions")
        .eq("is_active", true)
        .order("category")
        .order("test_name");

    if (error) { console.error("[lab] listActiveTests:", error); return []; }
    return data as LabTestCatalogItem[];
}

export async function listAllLabTests(): Promise<LabTestCatalogItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_test_catalog")
        .select("*")
        .order("category")
        .order("test_name");

    if (error) { console.error("[lab] listAllTests:", error); return []; }
    return data as LabTestCatalogItem[];
}

export async function upsertLabTest(
    test: Partial<LabTestCatalogItem>,
    id?: string
): Promise<LabTestCatalogItem> {
    const supabase = await createClient();
    const { data, error } = id
        ? await supabase.from("lab_test_catalog").update(test).eq("id", id).select().single()
        : await supabase.from("lab_test_catalog").insert([test]).select().single();

    if (error) { console.error("[lab] upsertTest:", error); throw error; }
    return data as LabTestCatalogItem;
}

export async function deleteLabTest(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("lab_test_catalog").delete().eq("id", id);
    if (error) { console.error("[lab] deleteTest:", error); throw error; }
}

export async function toggleLabTestActive(
    id: string,
    current: boolean
): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from("lab_test_catalog")
        .update({ is_active: !current })
        .eq("id", id);

    if (error) { console.error("[lab] toggleActive:", error); throw error; }
}