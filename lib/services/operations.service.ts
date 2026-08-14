"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import type {
    LabSpecimen,
    Ward,
    DrugBatch,
    ConsentRecord,
    DeathCertificate,
    BirthCertificate,
} from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

// ═══════════════════════════════ SPECIMENS ════════════════════════════════════

export async function listSpecimens(opts: {
    patientId?: string;
    status?: string;
}): Promise<LabSpecimen[]> {
    await requireStaff();
    const supabase = await createClient();
    let q = supabase.from("lab_specimens").select("*, patients(name)").order("created_at", { ascending: false });
    if (opts.patientId) q = q.eq("patient_id", opts.patientId);
    if (opts.status) q = q.eq("status", opts.status);
    const { data, error } = await q;
    if (error) { console.error("[specimen] list:", error); return []; }
    return data as unknown as LabSpecimen[];
}

export async function createSpecimen(
    input: Omit<LabSpecimen, "id" | "created_at" | "status">
): Promise<LabSpecimen> {
    const actor = await requireStaff([UserRole.LabTechnician]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_specimens")
        .insert([{ ...input, collected_by: actor.userId, status: "collected" }])
        .select()
        .single();
    if (error) throw error;
    await logAction("SPECIMEN_COLLECTED", "lab_specimens", data.id, {
        patient_id: input.patient_id,
        barcode: input.barcode,
        type: input.specimen_type,
    });
    return data as unknown as LabSpecimen;
}

export async function updateSpecimen(
    id: string,
    updates: Partial<LabSpecimen>
): Promise<LabSpecimen> {
    const actor = await requireStaff([UserRole.LabTechnician]);
    const supabase = await createClient();
    const patch: Partial<LabSpecimen> = { ...updates };
    if (updates.status === "received" && !updates.received_at) {
        patch.received_at = new Date().toISOString();
        patch.received_by = actor.userId;
    }
    const { data, error } = await supabase
        .from("lab_specimens")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    if (updates.status) {
        await logAction("SPECIMEN_STATUS", "lab_specimens", id, { status: updates.status });
    }
    return data as unknown as LabSpecimen;
}

// ════════════════════════════════ WARDS ═══════════════════════════════════════

export async function listWards(): Promise<Ward[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("wards")
        .select("*")
        .eq("is_active", true)
        .order("name");
    if (error) { console.error("[ward] list:", error); return []; }
    return data as unknown as Ward[];
}

export interface WardOccupancy extends Ward {
    occupied: number;
    free: number;
    patients: Array<{ id: string; name: string; bed_number: string | null }>;
}

export async function getWardBoard(): Promise<WardOccupancy[]> {
    await requireStaff();
    const supabase = await createClient();
    const [wardsRes, admissionsRes] = await Promise.all([
        supabase.from("wards").select("*").eq("is_active", true).order("name"),
        supabase
            .from("patient_admissions")
            .select("id, patient_id, ward_name, bed_number, patients(name)")
            .eq("status", "active"),
    ]);
    const wards = (wardsRes.data ?? []) as unknown as Ward[];
    const admissions = admissionsRes.data ?? [];
    return wards.map((w) => {
        const inWard = admissions.filter((a: any) => a.ward_name === w.name);
        return {
            ...w,
            occupied: inWard.length,
            free: Math.max(0, w.total_beds - inWard.length),
            patients: inWard.map((a: any) => ({
                id: a.patient_id,
                name: a.patients?.name ?? "Unknown",
                bed_number: a.bed_number,
            })),
        };
    });
}

export async function upsertWard(input: Partial<Ward> & { name: string; total_beds: number }): Promise<Ward> {
    await requireStaff([UserRole.Nurse]);
    const supabase = await createClient();
    const { data, error } = input.id
        ? await supabase.from("wards").update(input).eq("id", input.id).select().single()
        : await supabase.from("wards").insert([input]).select().single();
    if (error) throw error;
    return data as unknown as Ward;
}

// ═══════════════════════════════ DRUG BATCHES ═════════════════════════════════

export async function listBatches(drugId?: string): Promise<(DrugBatch & { drug_name?: string })[]> {
    await requireStaff();
    const supabase = await createClient();
    let q = supabase.from("drug_batches").select("*, drug_inventory(drug_name)").order("expiry_date", { ascending: true });
    if (drugId) q = q.eq("drug_id", drugId);
    const { data, error } = await q;
    if (error) { console.error("[batch] list:", error); return []; }
    return (data ?? []).map((b: any) => ({
        ...b,
        drug_name: b?.drug_inventory?.drug_name ?? b?.drug_name ?? null,
    }));
}

export interface ExpiryReportRow {
    drugId: string;
    drugName: string;
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    status: "expired" | "expiring" | "ok";
    daysUntilExpiry: number;
}

export async function getExpiryReport(daysWindow = 90): Promise<ExpiryReportRow[]> {
    await requireStaff([UserRole.Pharmacist]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("drug_batches")
        .select("*, drug_inventory(drug_name)")
        .gt("quantity", 0)
        .order("expiry_date", { ascending: true });
    if (error) { console.error("[batch] expiry report:", error); return []; }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (data ?? [])
        .map((b: any) => {
            const expiry = new Date(`${b.expiry_date}T00:00:00`);
            const days = Math.round((expiry.getTime() - today.getTime()) / 86400000);
            return {
                drugId: b.drug_id,
                drugName: b?.drug_inventory?.drug_name ?? "Unknown drug",
                batchId: b.id,
                batchNumber: b.batch_number,
                expiryDate: b.expiry_date,
                quantity: b.quantity,
                status: (days < 0 ? "expired" : days <= daysWindow ? "expiring" : "ok") as ExpiryReportRow["status"],
                daysUntilExpiry: days,
            };
        })
        .filter((r) => r.status !== "ok");
}

export async function createBatch(
    input: Omit<DrugBatch, "id" | "created_at" | "received_at">
): Promise<DrugBatch> {
    const actor = await requireStaff([UserRole.Pharmacist]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("drug_batches")
        .insert([{ ...input, received_by: actor.userId, received_at: new Date().toISOString() }])
        .select()
        .single();
    if (error) throw error;
    await logAction("BATCH_RECEIVED", "drug_batches", data.id, {
        drug_id: input.drug_id,
        batch: input.batch_number,
        expiry: input.expiry_date,
        qty: input.quantity,
    });
    return data as unknown as DrugBatch;
}

export async function updateBatch(id: string, updates: Partial<DrugBatch>): Promise<DrugBatch> {
    await requireStaff([UserRole.Pharmacist]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("drug_batches")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data as unknown as DrugBatch;
}

/** Decrement batch quantity when a batch is dispensed. */
export async function decrementBatchQuantity(id: string, amount = 1): Promise<void> {
    await requireStaff([UserRole.Pharmacist]);
    const supabase = await createClient();
    const { data: batch } = await supabase.from("drug_batches").select("quantity").eq("id", id).single();
    if (!batch) return;
    const next = Math.max(0, (batch.quantity ?? 0) - amount);
    const { error } = await supabase.from("drug_batches").update({ quantity: next }).eq("id", id);
    if (error) throw error;
}

// ════════════════════════════════ CONSENTS ════════════════════════════════════

export async function listConsents(patientId: string): Promise<ConsentRecord[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consents")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
    if (error) { console.error("[consent] list:", error); return []; }
    return data as unknown as ConsentRecord[];
}

export async function recordConsent(
    input: Omit<ConsentRecord, "id" | "created_at" | "version" | "signed_at">
): Promise<ConsentRecord> {
    const actor = await requireStaff([UserRole.FrontDesk]);
    const supabase = await createClient();
    // versioning: highest existing version for this patient+type, +1
    const { data: existing } = await supabase
        .from("consents")
        .select("version")
        .eq("patient_id", input.patient_id)
        .eq("consent_type", input.consent_type)
        .order("version", { ascending: false })
        .limit(1);
    const version = ((existing?.[0]?.version as number) ?? 0) + 1;

    const { data, error } = await supabase
        .from("consents")
        .insert([{ ...input, witness_id: actor.userId, signed_at: new Date().toISOString(), version }])
        .select()
        .single();
    if (error) throw error;
    await logAction("CONSENT_RECORDED", "consents", data.id, {
        patient_id: input.patient_id,
        type: input.consent_type,
        status: input.status,
        version,
    });
    return data as unknown as ConsentRecord;
}

export async function withdrawConsent(id: string, notes?: string): Promise<ConsentRecord> {
    await requireStaff([UserRole.FrontDesk]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consents")
        .update({ status: "withdrawn", notes })
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    await logAction("CONSENT_WITHDRAWN", "consents", id, {});
    return data as unknown as ConsentRecord;
}

// ═══════════════════════════════ CERTIFICATES ════════════════════════════════

export async function listDeathCertificates(patientId?: string): Promise<DeathCertificate[]> {
    await requireStaff();
    const supabase = await createClient();
    let q = supabase.from("death_certificates").select("*, patients(name)").order("date_of_death", { ascending: false });
    if (patientId) q = q.eq("patient_id", patientId);
    const { data, error } = await q;
    if (error) { console.error("[certificate] death list:", error); return []; }
    return data as unknown as DeathCertificate[];
}

export async function createDeathCertificate(
    input: Omit<DeathCertificate, "id" | "created_at" | "issued_at">
): Promise<DeathCertificate> {
    const actor = await requireStaff([UserRole.Doctor]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("death_certificates")
        .insert([{ ...input, certifying_doctor: actor.userId, issued_at: new Date().toISOString() }])
        .select()
        .single();
    if (error) throw error;
    await logAction("DEATH_CERTIFICATE_ISSUED", "death_certificates", data.id, {
        patient_id: input.patient_id,
        date_of_death: input.date_of_death,
        immediate_cause: input.immediate_cause ?? null,
    });
    return data as unknown as DeathCertificate;
}

export async function listBirthCertificates(motherPatientId?: string): Promise<BirthCertificate[]> {
    await requireStaff();
    const supabase = await createClient();
    let q = supabase.from("birth_certificates").select("*").order("date_of_birth", { ascending: false });
    if (motherPatientId) q = q.eq("mother_patient_id", motherPatientId);
    const { data, error } = await q;
    if (error) { console.error("[certificate] birth list:", error); return []; }
    return data as unknown as BirthCertificate[];
}

export async function createBirthCertificate(
    input: Omit<BirthCertificate, "id" | "created_at">
): Promise<BirthCertificate> {
    const actor = await requireStaff([UserRole.Doctor, UserRole.Nurse, UserRole.FrontDesk]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("birth_certificates")
        .insert([{ ...input, attending_staff: actor.userId }])
        .select()
        .single();
    if (error) throw error;
    await logAction("BIRTH_CERTIFICATE_ISSUED", "birth_certificates", data.id, {
        child_name: input.child_name,
        mother_patient_id: input.mother_patient_id ?? null,
    });
    return data as unknown as BirthCertificate;
}
