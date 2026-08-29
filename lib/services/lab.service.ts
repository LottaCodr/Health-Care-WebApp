"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { LabRequest, UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

import { createNotification } from "./notification.service";
import { createPayment } from "./payment.service";

// ─── Lab Requests ─────────────────────────────────────────────────────────────

export interface CreateLabRequestInput {
    patientId: string;
    requestedBy?: string;
    testType: string;
    priority?: "routine" | "urgent" | "stat";
    notes?: string;
    status?: string;
    price?: number;
}

export async function createLabRequest(
    input: CreateLabRequestInput
): Promise<LabRequest> {
    await requireStaff([UserRole.Doctor, UserRole.FrontDesk]);
    const supabase = await createClient();

    // 1. Resolve test price (from input or catalog)
    let testPrice = typeof input.price === "number" && input.price >= 0 ? input.price : 0;
    if (testPrice === 0 && input.testType) {
        try {
            const cleanTestName = input.testType.replace(/^\[RADIOLOGY\]\s*/i, "").trim();
            const { data: catalogItem } = await supabase
                .from("lab_test_catalog")
                .select("price")
                .ilike("test_name", cleanTestName)
                .maybeSingle();

            if (catalogItem && typeof catalogItem.price === "number" && catalogItem.price > 0) {
                testPrice = catalogItem.price;
            }
        } catch (catErr) {
            console.error("[lab] catalog lookup error:", catErr);
        }
    }

    // 2. Insert lab request
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

    // 3. Automatically create a pending payment in billing so it reflects in FrontDesk & Patient Billing
    try {
        await createPayment({
            patient_id: input.patientId,
            amount: testPrice,
            description: `Lab Test: ${input.testType}`,
            category: "lab",
            status: "pending",
            processed_by: input.requestedBy || undefined,
            notes: input.notes ? `Clinical notes: ${input.notes}` : undefined,
        });
    } catch (payErr) {
        console.error("[lab] auto-create payment failed:", payErr);
    }

    // 4. Update patient status to sent-to-lab so the lab queue picks them up.
    //    Anyone can request tests (doctor, front desk, admin…), so we route the
    //    patient from any "walking" state. Admitted and discharged patients keep
    //    their status — the request still lands in the lab queue.
    try {
        const { data: currentPatient } = await supabase
            .from("patients")
            .select("status")
            .eq("id", input.patientId)
            .maybeSingle();

        const KEEP_STATUS = new Set(["admitted", "discharged"]);

        if (currentPatient && !KEEP_STATUS.has(String(currentPatient.status).toLowerCase())) {
            await supabase
                .from("patients")
                .update({ status: "sent-to-lab" })
                .eq("id", input.patientId);
        }
    } catch (stErr) {
        console.error("[lab] patient status update error:", stErr);
    }

    // 5. Send notification
    await createNotification({
        role: "LabTechnician",
        title: "New Lab Request",
        message: `A new ${input.priority === "urgent" || input.priority === "stat" ? "urgent " : ""}lab test (${input.testType}) has been requested.`,
        type: input.priority === "stat" ? "alert" : "info"
    });

    return data as unknown as LabRequest;
}

export async function getLabRequestById(id: string): Promise<LabRequest | null> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[lab] getById:", error); return null; }
    if (!data) return null;
    // Attach patient for richer UI
    const { data: patient } = await supabase
        .from("patients")
        .select("id, name, phone, gender, birth_date, blood_group, geno_type, address, email")
        .eq("id", (data as any).visit_id)
        .maybeSingle();
    return { ...(data as any), patients: patient ?? null } as unknown as LabRequest;
}

export async function listLabRequestsByPatient(
    patientId: string
): Promise<LabRequest[]> {
    await requireStaff();
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
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("status", "pending")
        .not("test_type", "like", "[RADIOLOGY]%")
        .order("created_at", { ascending: true });

    if (error) { console.error("[lab] listPending:", error); return []; }
    if (!data || data.length === 0) return [];
    // Enrich with patient details for dashboard
    const ids = [...new Set(data.map((r: any) => r.visit_id).filter(Boolean))];
    const { data: patients } = await supabase
        .from("patients")
        .select("id, name, phone, gender, birth_date, blood_group, geno_type")
        .in("id", ids);
    const patientMap = Object.fromEntries((patients ?? []).map((pt: any) => [pt.id, pt]));
    return data.map((r: any) => ({ ...r, patients: patientMap[r.visit_id] ?? null })) as unknown as LabRequest[];
}

export async function listCompletedLabRequests(): Promise<LabRequest[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("status", "completed")
        .not("test_type", "like", "[RADIOLOGY]%")
        .order("completed_at", { ascending: false });

    if (error) { console.error("[lab] listCompleted:", error); return []; }
    if (!data || data.length === 0) return [];
    const ids = [...new Set(data.map((r: any) => r.visit_id).filter(Boolean))];
    const { data: patients } = await supabase
        .from("patients")
        .select("id, name, phone, gender, birth_date, blood_group, geno_type")
        .in("id", ids);
    const patientMap = Object.fromEntries((patients ?? []).map((pt: any) => [pt.id, pt]));
    return data.map((r: any) => ({ ...r, patients: patientMap[r.visit_id] ?? null })) as unknown as LabRequest[];
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
        price?: number;
    }
): Promise<LabRequest> {
    await requireStaff([UserRole.LabTechnician, UserRole.Doctor]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .update({
            status: updates.status,
            result: updates.result,
            completed_by: updates.completed_by,
            completed_at: updates.completed_at,
            priority: updates.priority,
            notes: updates.notes,
            price: updates.price,   // Persist the price set by the lab tech so the
                                    // billing logic below can read it back.
        })
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[lab] updateRequest:", error); throw error; }

    // ── Billing: create or update a pending payment when a price is set ────────
    // This covers both: (a) the lab tech entering a price at result-submission
    // time, and (b) any other code path that calls updateLabRequest with a price.
    //
    // A failed sync is remembered and rethrown AFTER routing below: the result
    // itself is already saved, and the front desk MUST get the updated price —
    // swallowing the failure here is how bills silently stayed at ₦0.
    let billingSyncError: Error | null = null;
    if (typeof updates.price === "number" && updates.price > 0 && data?.visit_id) {
        try {
            const desc = `Lab Test: ${data.test_type}`;
            // Locate the bill this price belongs to. Orders for tests that are
            // not in the catalogue are auto-billed at ₦0, so the match has to be
            // robust: exact description → fuzzy description → any zero-amount
            // open lab bill for this patient (the orphan this order created).
            const { data: openLabBills, error: payLookupError } = await supabase
                .from("payments")
                .select("id, amount, amount_kobo, status, description")
                .eq("patient_id", data.visit_id)
                .eq("category", "lab")
                .in("status", ["pending", "partial"])
                .order("created_at", { ascending: false })
                .limit(25);

            if (payLookupError) {
                console.error("[lab] bill lookup failed while setting price:", payLookupError);
            }

            const candidates = (openLabBills ?? []) as any[];
            const testTypeLower = String(data.test_type ?? "").trim().toLowerCase();
            const exact = candidates.find((p) => String(p.description ?? "").trim().toLowerCase() === desc.trim().toLowerCase());
            const fuzzy = candidates.find((p) => String(p.description ?? "").toLowerCase().includes(testTypeLower));
            const zeroAmount = candidates.find((p) => !p.amount_kobo || p.amount_kobo <= 0);
            const target = exact ?? fuzzy ?? zeroAmount;

            if (target) {
                // Schema-tolerant write: `updated_at` may be missing on older
                // tables — retry without it instead of failing silently.
                //
                // RLS: the `payments` table only allows FrontDesk/Admin to
                // update rows, and this runs as the lab tech — so writing with
                // the caller's session would silently match zero rows and the
                // bill would stay at ₦0 forever (the exact "price not showing
                // at the front desk" bug). The sync is a trusted server-side
                // hand-off (the lab tech already passed requireStaff above),
                // so prefer the service-role client when it is configured and
                // verify every write actually changed a row.
                const pricePayload = {
                    amount: updates.price,
                    amount_kobo: Math.round(updates.price * 100),
                    updated_at: new Date().toISOString(),
                };

                const writeClient = createAdminClient() ?? supabase;
                const { error: updateError, count } = await writeClient
                    .from("payments")
                    .update(pricePayload, { count: "exact" })
                    .eq("id", target.id);

                let applied = !updateError && (count ?? 0) > 0;

                if (!applied) {
                    const { updated_at: _omit, ...retryPayload } = pricePayload;
                    void _omit;
                    const { error: retryError, count: retryCount } = await writeClient
                        .from("payments")
                        .update(retryPayload, { count: "exact" })
                        .eq("id", target.id);
                    applied = !retryError && (retryCount ?? 0) > 0;
                    if (!applied) {
                        console.error(
                            "[lab] failed to update lab bill price:",
                            retryError ?? updateError ?? `${retryCount ?? 0} rows changed`,
                            { billId: target.id, labRequestId: id }
                        );
                        if (writeClient === supabase) {
                            // No service-role client configured AND the caller's
                            // own session was filtered out by RLS — surface it
                            // instead of letting the price silently vanish.
                            throw new Error(
                                "Lab result saved, but the price could not be written to the bill " +
                                "(the database rejected the write). Apply migration " +
                                "20260829_fix_staff_role_matching_casing.sql or configure " +
                                "SUPABASE_SERVICE_ROLE_KEY, then set the price again."
                            );
                        }
                    }
                }
            } else {
                // No open lab bill found — create one
                await createPayment({
                    patient_id: data.visit_id,
                    amount: updates.price,
                    description: desc,
                    category: "lab",
                    status: "pending",
                    processed_by: updates.completed_by || undefined,
                });
            }
        } catch (payErr) {
            // Remember (don't throw yet) — patient routing below must still run.
            billingSyncError =
                payErr instanceof Error ? payErr : new Error(String(payErr));
            console.error("[lab] error updating/creating payment on lab update:", payErr);
        }
    } else if (typeof updates.price === "number" && updates.price > 0 && !data?.visit_id) {
        console.warn("[lab] price set but lab request has no visit_id — no bill was created or updated");
    }

    // ── Route patient after test completion ─────────────────────────────────────
    if (updates.status === "completed" && data?.visit_id) {
        // If a billable price was set, route to front-desk billing queue so the
        // settle button is available. Otherwise return to the doctor's queue.
        const hasBillablePrice =
            typeof updates.price === "number" && updates.price > 0;

        await supabase
            .from("patients")
            .update({ status: hasBillablePrice ? "awaiting-payment" : "under-observation" })
            .eq("id", data.visit_id);

        await createNotification({
            recipient_id: data.requested_by ?? undefined,
            role: data.requested_by ? undefined : "Doctor",
            title: "Lab Result Ready",
            message: `Results for ${data.test_type} are now available.${hasBillablePrice ? " A payment is pending — please settle at the front desk." : ""}`,
            type: "success"
        });
    }

    // Routing is done — now surface a failed price→bill sync so the lab tech
    // sees exactly what happened and can retry the price (the result itself
    // is already saved above).
    if (billingSyncError) throw billingSyncError;

    return data as unknown as LabRequest;
}

// ─── Lab Test Catalog ─────────────────────────────────────────────────────────

export interface LabTestCatalogItem {
    id?: string;
    test_name: string;
    test_code?: string;
    category: string;
    description?: string;
    /** Coding standards: ICD-10 indication, LOINC, SNOMED. */
    icd10_code?: string;
    loinc_code?: string;
    snomed_code?: string;
    price: number;
    sample_type?: string;
    turnaround_time?: string;
    normal_range?: string;
    instructions?: string;
    is_active?: boolean;
}

export async function listActiveLabTests(): Promise<LabTestCatalogItem[]> {
    await requireStaff();
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
    await requireStaff();
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
    await requireStaff([UserRole.LabTechnician]);
    const supabase = await createClient();
    const { data, error } = id
        ? await supabase.from("lab_test_catalog").update(test).eq("id", id).select().single()
        : await supabase.from("lab_test_catalog").insert([test]).select().single();

    if (error) { console.error("[lab] upsertTest:", error); throw error; }
    return data as LabTestCatalogItem;
}

export async function deleteLabTest(id: string): Promise<void> {
    await requireStaff([UserRole.LabTechnician]);
    const supabase = await createClient();
    const { error } = await supabase.from("lab_test_catalog").delete().eq("id", id);
    if (error) { console.error("[lab] deleteTest:", error); throw error; }
}

export async function toggleLabTestActive(
    id: string,
    current: boolean
): Promise<void> {
    await requireStaff([UserRole.LabTechnician]);
    const supabase = await createClient();
    const { error } = await supabase
        .from("lab_test_catalog")
        .update({ is_active: !current })
        .eq("id", id);

    if (error) { console.error("[lab] toggleActive:", error); throw error; }
}
