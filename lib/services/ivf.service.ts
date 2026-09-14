"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import type {
    IVFConsent,
    IVFCryoInventory,
    IVFCycle,
    IVFEmbryo,
    IVFMonitoringVisit,
    IVFOutcome,
    IVFOocyte,
    IVFOocyteRetrieval,
    IVFSemenSample,
} from "@/types/ivf";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

const CLINICAL = [UserRole.Doctor, UserRole.Nurse];
const IVF_LAB = [UserRole.Doctor, UserRole.LabTechnician];

function errorMessage(error: unknown): string {
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message?: unknown }).message ?? "Unknown database error");
    }
    return String(error);
}

function isMissingTable(error: unknown): boolean {
    const text = errorMessage(error).toLowerCase();
    return text.includes("could not find the table") || text.includes("relation") && text.includes("does not exist");
}

async function listRows<T>(table: string, configure: (query: any) => any): Promise<T[]> {
    const supabase = await createClient();
    let query = configure(supabase.from(table).select("*"));
    const { data, error } = await query;
    if (error) {
        if (!isMissingTable(error)) console.error(`[ivf] ${table}:`, error);
        return [];
    }
    return (data ?? []) as T[];
}

async function requireIVFStaff(roles?: UserRole[]) {
    return requireStaff(roles);
}

export interface CreateIVFCycleInput {
    facility_id: string;
    patient_id: string;
    partner_patient_id?: string | null;
    cycle_number?: number;
    treatment_type?: IVFCycle["treatment_type"];
    cycle_type?: IVFCycle["cycle_type"];
    status?: IVFCycle["status"];
    indication?: string | null;
    protocol?: string | null;
    planned_start_date?: string | null;
    stimulation_start_date?: string | null;
    notes?: string | null;
}

export async function listIVFCycles(facilityId?: string): Promise<IVFCycle[]> {
    await requireIVFStaff();
    const rows = await listRows<IVFCycle>("ivf_cycles", (query) => {
        const scoped = facilityId ? query.eq("facility_id", facilityId) : query;
        return scoped.order("updated_at", { ascending: false });
    });

    const patientIds = [...new Set(rows.flatMap((row) => [row.patient_id, row.partner_patient_id].filter(Boolean) as string[]))];
    if (!patientIds.length) return rows;

    const supabase = await createClient();
    const { data: patients, error } = await supabase.from("patients").select("*").in("id", patientIds);
    if (error) {
        console.error("[ivf] patient context:", error);
        return rows;
    }
    const byId = new Map((patients ?? []).map((patient) => [String(patient.id), patient]));
    return rows.map((row) => ({
        ...row,
        patient: byId.get(row.patient_id) as IVFCycle["patient"],
        partner: row.partner_patient_id ? byId.get(row.partner_patient_id) as IVFCycle["partner"] : undefined,
    }));
}

export async function getIVFWorkspace(facilityId: string): Promise<{
    cycles: IVFCycle[];
    cryo: IVFCryoInventory[];
    consents: IVFConsent[];
}> {
    await requireIVFStaff();
    const [cycles, cryo, consents] = await Promise.all([
        listIVFCycles(facilityId),
        listRows<IVFCryoInventory>("ivf_cryo_inventory", (query) => query.eq("facility_id", facilityId).order("consent_until", { ascending: true })),
        listRows<IVFConsent>("ivf_consents", (query) => query.order("expires_at", { ascending: true })),
    ]);
    return { cycles, cryo, consents };
}

export async function createIVFCycle(input: CreateIVFCycleInput): Promise<IVFCycle> {
    const actor = await requireIVFStaff([UserRole.FrontDesk, UserRole.Doctor, UserRole.Nurse]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ivf_cycles")
        .insert([{
            ...input,
            cycle_number: input.cycle_number ?? 1,
            treatment_type: input.treatment_type ?? "ivf",
            cycle_type: input.cycle_type ?? "fresh",
            status: input.status ?? "planned",
            created_by: actor.userId,
        }])
        .select()
        .single();
    if (error) throw error;
    await logAction("IVF_CYCLE_CREATED", "ivf_cycles", data.id, {
        facility_id: input.facility_id,
        patient_id: input.patient_id,
        cycle_number: input.cycle_number ?? 1,
        treatment_type: input.treatment_type ?? "ivf",
    });
    return data as IVFCycle;
}

export async function updateIVFCycle(id: string, updates: Partial<IVFCycle>): Promise<IVFCycle> {
    const actor = await requireIVFStaff(CLINICAL);
    const supabase = await createClient();
    const { patient, partner, id: _id, created_at, ...safeUpdates } = updates;
    const { data, error } = await supabase
        .from("ivf_cycles")
        .update({ ...safeUpdates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    await logAction("IVF_CYCLE_UPDATED", "ivf_cycles", id, {
        updated_fields: Object.keys(safeUpdates),
        changed_by: actor.userId,
    });
    return data as IVFCycle;
}

export interface CreateIVFMonitoringInput {
    cycle_id: string;
    visit_at?: string;
    cycle_day?: number | null;
    endometrial_thickness_mm?: number | null;
    endometrial_pattern?: string | null;
    right_follicles?: IVFMonitoringVisit["right_follicles"];
    left_follicles?: IVFMonitoringVisit["left_follicles"];
    estradiol_pg_ml?: number | null;
    lh_iu_l?: number | null;
    progesterone_ng_ml?: number | null;
    medication_changes?: IVFMonitoringVisit["medication_changes"];
    assessment?: string | null;
    plan?: string | null;
}

export async function listIVFMonitoring(cycleId: string): Promise<IVFMonitoringVisit[]> {
    await requireIVFStaff();
    return listRows<IVFMonitoringVisit>("ivf_monitoring_visits", (query) => query.eq("cycle_id", cycleId).order("visit_at", { ascending: false }));
}

export async function createIVFMonitoring(input: CreateIVFMonitoringInput): Promise<IVFMonitoringVisit> {
    const actor = await requireIVFStaff(CLINICAL);
    const supabase = await createClient();
    const { data, error } = await supabase.from("ivf_monitoring_visits").insert([{
        ...input,
        visit_at: input.visit_at ?? new Date().toISOString(),
        right_follicles: input.right_follicles ?? [],
        left_follicles: input.left_follicles ?? [],
        medication_changes: input.medication_changes ?? [],
        clinician_id: actor.userId,
    }]).select().single();
    if (error) throw error;
    await logAction("IVF_MONITORING_RECORDED", "ivf_monitoring_visits", data.id, { cycle_id: input.cycle_id, clinician_id: actor.userId });
    return data as IVFMonitoringVisit;
}

export async function listIVFSemenSamples(cycleId: string): Promise<IVFSemenSample[]> {
    await requireIVFStaff();
    return listRows<IVFSemenSample>("ivf_semen_samples", (query) => query.eq("cycle_id", cycleId).order("created_at", { ascending: false }));
}

export type CreateIVFSemenSampleInput = Omit<IVFSemenSample, "id" | "created_at" | "operator_id">;

export async function createIVFSemenSample(input: CreateIVFSemenSampleInput): Promise<IVFSemenSample> {
    if (!input.witness_id) throw new Error("A second qualified witness is required before recording a semen sample.");
    const actor = await requireIVFStaff(IVF_LAB);
    const supabase = await createClient();
    const { data, error } = await supabase.from("ivf_semen_samples").insert([{ ...input, operator_id: actor.userId }]).select().single();
    if (error) throw error;
    await logAction("IVF_SEMEN_SAMPLE_RECORDED", "ivf_semen_samples", data.id, { cycle_id: input.cycle_id, sample_code: input.sample_code ?? null });
    return data as IVFSemenSample;
}

export async function listIVFRetrievals(cycleId: string): Promise<IVFOocyteRetrieval[]> {
    await requireIVFStaff();
    return listRows<IVFOocyteRetrieval>("ivf_oocyte_retrievals", (query) => query.eq("cycle_id", cycleId).order("retrieval_at", { ascending: false }));
}

export type CreateIVFRetrievalInput = Omit<IVFOocyteRetrieval, "id" | "created_at" | "clinician_id" | "embryologist_id">;

export async function createIVFRetrieval(input: CreateIVFRetrievalInput): Promise<IVFOocyteRetrieval> {
    if (!input.witness_id) throw new Error("A second qualified witness is required before recording retrieval.");
    const actor = await requireIVFStaff(IVF_LAB);
    const supabase = await createClient();
    const { data, error } = await supabase.from("ivf_oocyte_retrievals").insert([{
        ...input,
        clinician_id: actor.role === UserRole.Doctor ? actor.userId : null,
        embryologist_id: actor.role === UserRole.LabTechnician ? actor.userId : null,
    }]).select().single();
    if (error) throw error;
    await logAction("IVF_OOCYTE_RETRIEVAL_RECORDED", "ivf_oocyte_retrievals", data.id, { cycle_id: input.cycle_id, oocytes_retrieved: input.oocytes_retrieved ?? null });
    return data as IVFOocyteRetrieval;
}

export async function listIVFOocytes(cycleId: string): Promise<IVFOocyte[]> {
    await requireIVFStaff();
    return listRows<IVFOocyte>("ivf_oocytes", (query) => query.eq("cycle_id", cycleId).order("oocyte_number", { ascending: true }));
}

export type CreateIVFOocyteInput = Omit<IVFOocyte, "id" | "created_at" | "operator_id">;

export async function createIVFOocyte(input: CreateIVFOocyteInput): Promise<IVFOocyte> {
    if (!input.witness_id) throw new Error("A second qualified witness is required before adding an oocyte.");
    const actor = await requireIVFStaff(IVF_LAB);
    const supabase = await createClient();
    const { data, error } = await supabase.from("ivf_oocytes").insert([{ ...input, operator_id: actor.userId }]).select().single();
    if (error) throw error;
    return data as IVFOocyte;
}

export async function listIVFEmbryos(cycleId: string): Promise<IVFEmbryo[]> {
    await requireIVFStaff();
    return listRows<IVFEmbryo>("ivf_embryos", (query) => query.eq("cycle_id", cycleId).order("embryo_number", { ascending: true }));
}

export type CreateIVFEmbryoInput = Omit<IVFEmbryo, "id" | "created_at" | "operator_id">;

export async function createIVFEmbryo(input: CreateIVFEmbryoInput): Promise<IVFEmbryo> {
    if (!input.witness_id) throw new Error("A second qualified witness is required before adding an embryo.");
    const actor = await requireIVFStaff(IVF_LAB);
    const supabase = await createClient();
    const { data, error } = await supabase.from("ivf_embryos").insert([{ ...input, operator_id: actor.userId }]).select().single();
    if (error) throw error;
    await logAction("IVF_EMBRYO_RECORDED", "ivf_embryos", data.id, { cycle_id: input.cycle_id, embryo_number: input.embryo_number, day: input.day ?? null });
    return data as IVFEmbryo;
}

export async function updateIVFEmbryo(id: string, updates: Partial<IVFEmbryo>): Promise<IVFEmbryo> {
    const actor = await requireIVFStaff(IVF_LAB);
    const supabase = await createClient();
    const { id: _id, created_at, ...safeUpdates } = updates;
    const { data, error } = await supabase.from("ivf_embryos").update(safeUpdates).eq("id", id).select().single();
    if (error) throw error;
    await logAction("IVF_EMBRYO_UPDATED", "ivf_embryos", id, { updated_fields: Object.keys(safeUpdates), changed_by: actor.userId });
    return data as IVFEmbryo;
}

export async function listIVFCryoInventory(facilityId: string): Promise<IVFCryoInventory[]> {
    await requireIVFStaff();
    return listRows<IVFCryoInventory>("ivf_cryo_inventory", (query) => query.eq("facility_id", facilityId).order("consent_until", { ascending: true }));
}

export type CreateIVFCryoInput = Omit<IVFCryoInventory, "id" | "created_at" | "operator_id">;

export async function createIVFCryo(input: CreateIVFCryoInput): Promise<IVFCryoInventory> {
    if (!input.witness_id) throw new Error("A second qualified witness is required before placing material into cryostorage.");
    const actor = await requireIVFStaff([UserRole.LabTechnician]);
    const supabase = await createClient();
    const { data, error } = await supabase.from("ivf_cryo_inventory").insert([{ ...input, operator_id: actor.userId }]).select().single();
    if (error) throw error;
    await logAction("IVF_CRYO_STORED", "ivf_cryo_inventory", data.id, {
        facility_id: input.facility_id,
        cycle_id: input.cycle_id,
        material_type: input.material_type,
        cryodevice_id: input.cryodevice_id,
        witness_id: input.witness_id ?? null,
    });
    return data as IVFCryoInventory;
}

export interface CreateIVFLabEventInput {
    facility_id: string;
    cycle_id: string;
    event_type: string;
    entity_type: string;
    entity_id?: string | null;
    event_at?: string;
    witness_id: string;
    witness_method?: "manual" | "electronic";
    verification_status?: "passed" | "mismatch" | "stopped" | "downtime-reconciled";
    identifiers_checked?: Record<string, string | boolean | number>;
    source_identifier?: string | null;
    destination_identifier?: string | null;
    details?: Record<string, unknown>;
}

export async function recordIVFLabEvent(input: CreateIVFLabEventInput) {
    const actor = await requireIVFStaff([UserRole.LabTechnician]);
    const supabase = await createClient();
    const { data, error } = await supabase.from("ivf_lab_events").insert([{
        ...input,
        operator_id: actor.userId,
        event_at: input.event_at ?? new Date().toISOString(),
        witness_method: input.witness_method ?? "manual",
        verification_status: input.verification_status ?? "passed",
        identifiers_checked: input.identifiers_checked ?? {},
        details: input.details ?? {},
    }]).select().single();
    if (error) throw error;
    await logAction("IVF_WITNESS_EVENT_RECORDED", "ivf_lab_events", data.id, {
        facility_id: input.facility_id,
        cycle_id: input.cycle_id,
        event_type: input.event_type,
        verification_status: input.verification_status ?? "passed",
    });
    return data;
}

export async function listIVFConsents(cycleId: string): Promise<IVFConsent[]> {
    await requireIVFStaff();
    return listRows<IVFConsent>("ivf_consents", (query) => query.eq("cycle_id", cycleId).order("expires_at", { ascending: true }));
}

export type CreateIVFConsentInput = Omit<IVFConsent, "id" | "created_at">;

export async function createIVFConsent(input: CreateIVFConsentInput): Promise<IVFConsent> {
    if (input.status === "signed" && (!input.signed_at || !input.witness_id)) {
        throw new Error("A signed consent needs its signature time and witness recorded.");
    }
    const actor = await requireIVFStaff([UserRole.FrontDesk, UserRole.Doctor, UserRole.Nurse]);
    const supabase = await createClient();
    const { data, error } = await supabase.from("ivf_consents").insert([input]).select().single();
    if (error) throw error;
    await logAction("IVF_CONSENT_RECORDED", "ivf_consents", data.id, { cycle_id: input.cycle_id, consent_type: input.consent_type, recorded_by: actor.userId });
    return data as IVFConsent;
}

export async function listIVFOutcomes(cycleId: string): Promise<IVFOutcome[]> {
    await requireIVFStaff();
    return listRows<IVFOutcome>("ivf_outcomes", (query) => query.eq("cycle_id", cycleId).limit(1));
}

export type UpsertIVFOutcomeInput = Omit<IVFOutcome, "id" | "created_at" | "updated_at" | "recorded_by">;

export async function upsertIVFOutcome(input: UpsertIVFOutcomeInput): Promise<IVFOutcome> {
    const actor = await requireIVFStaff([UserRole.Doctor, UserRole.Nurse]);
    const supabase = await createClient();
    const { data, error } = await supabase.from("ivf_outcomes").upsert([{ ...input, recorded_by: actor.userId }], { onConflict: "cycle_id" }).select().single();
    if (error) throw error;
    await logAction("IVF_OUTCOME_RECORDED", "ivf_outcomes", data.id, { cycle_id: input.cycle_id, changed_by: actor.userId });
    return data as IVFOutcome;
}

export async function listIVFWitnesses(facilityId: string) {
    await requireIVFStaff();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("ivf_list_witnesses", { p_facility_id: facilityId });
    if (error) {
        console.error("[ivf] witness list:", error);
        return [];
    }
    return (data ?? []) as Array<{ id: string; name: string; role?: string | null; department?: string | null }>;
}

export async function searchIVFPatients(query: string) {
    await requireIVFStaff();
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const supabase = await createClient();
    const pattern = `%${trimmed}%`;
    const { data, error } = await supabase
        .from("patients")
        .select("id, name, hospital_number, birth_date, gender, phone")
        .or(`name.ilike.${pattern},hospital_number.ilike.${pattern},phone.ilike.${pattern}`)
        .order("name")
        .limit(20);
    if (error) {
        console.error("[ivf] patient search:", error);
        return [];
    }
    return data ?? [];
}
