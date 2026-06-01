"use server";

import { createClient } from "@/utils/supabase/server";

// ─── Drug Chart ───────────────────────────────────────────────────────────────

export interface CreateDrugChartInput {
    patientId:    string;
    drugName:     string;
    genericName?: string;
    dose:         string;
    route:        string;
    frequency:    string;
    startDate:    string;
    endDate?:     string;
    prescribedBy: string;
    notes?:       string;
}

export async function createDrugChartEntry(input: CreateDrugChartInput) {
    const sb = await createClient();
    const { data, error } = await sb.from("nurse_drug_chart").insert([{
        patient_id:    input.patientId,
        drug_name:     input.drugName,
        generic_name:  input.genericName  ?? null,
        dose:          input.dose,
        route:         input.route,
        frequency:     input.frequency,
        start_date:    input.startDate,
        end_date:      input.endDate      ?? null,
        prescribed_by: input.prescribedBy,
        notes:         input.notes        ?? null,
        is_active:     true,
    }]).select().single();
    if (error) throw error;
    return data;
}

export async function listDrugChartByPatient(patientId: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("nurse_drug_chart")
        .select(`*, drug_administration_records(*)`)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function updateDrugChartEntry(id: string, updates: Partial<CreateDrugChartInput & { isActive: boolean }>) {
    const sb = await createClient();
    const mapped: Record<string, any> = {};
    if (updates.drugName    !== undefined) mapped.drug_name     = updates.drugName;
    if (updates.dose        !== undefined) mapped.dose          = updates.dose;
    if (updates.route       !== undefined) mapped.route         = updates.route;
    if (updates.frequency   !== undefined) mapped.frequency     = updates.frequency;
    if (updates.endDate     !== undefined) mapped.end_date      = updates.endDate;
    if (updates.isActive    !== undefined) mapped.is_active     = updates.isActive;
    if (updates.notes       !== undefined) mapped.notes         = updates.notes;
    const { data, error } = await sb.from("nurse_drug_chart").update(mapped).eq("id", id).select().single();
    if (error) throw error;
    return data;
}

export async function deleteDrugChartEntry(id: string) {
    const sb = await createClient();
    const { error } = await sb.from("nurse_drug_chart").delete().eq("id", id);
    if (error) throw error;
}

// ─── Drug Administration Records ─────────────────────────────────────────────

export async function logDrugAdministration(input: {
    drugChartId:     string;
    patientId:       string;
    scheduledTime:   string;
    status:          string;
    givenBy:         string;
    administeredAt?: string;
    notes?:          string;
}) {
    const sb = await createClient();
    const { data, error } = await sb.from("drug_administration_records").insert([{
        drug_chart_id:   input.drugChartId,
        patient_id:      input.patientId,
        scheduled_time:  input.scheduledTime,
        status:          input.status,
        given_by:        input.givenBy,
        administered_at: input.administeredAt ?? new Date().toISOString(),
        notes:           input.notes          ?? null,
    }]).select().single();
    if (error) throw error;
    return data;
}

// ─── Fluid Balance ────────────────────────────────────────────────────────────

export interface CreateFluidEntryInput {
    patientId:      string;
    recordDate:     string;
    recordTime:     string;
    oralMl?:        number;
    ivMl?:          number;
    ngMl?:          number;
    otherInputMl?:  number;
    otherInputType?:string;
    urineMl?:       number;
    aspirateMl?:    number;
    vomitMl?:       number;
    bowelMl?:       number;
    drainMl?:       number;
    otherOutputMl?: number;
    signedBy:       string;
    notes?:         string;
}

export async function createFluidEntry(input: CreateFluidEntryInput) {
    const sb = await createClient();
    const { data, error } = await sb.from("fluid_balance").insert([{
        patient_id:       input.patientId,
        record_date:      input.recordDate,
        record_time:      input.recordTime,
        oral_ml:          input.oralMl          ?? 0,
        iv_ml:            input.ivMl            ?? 0,
        ng_ml:            input.ngMl            ?? 0,
        other_input_ml:   input.otherInputMl    ?? 0,
        other_input_type: input.otherInputType  ?? null,
        urine_ml:         input.urineMl         ?? 0,
        aspirate_ml:      input.aspirateMl      ?? 0,
        vomit_ml:         input.vomitMl         ?? 0,
        bowel_ml:         input.bowelMl         ?? 0,
        drain_ml:         input.drainMl         ?? 0,
        other_output_ml:  input.otherOutputMl   ?? 0,
        signed_by:        input.signedBy,
        notes:            input.notes           ?? null,
    }]).select().single();
    if (error) throw error;
    return data;
}

export async function listFluidBalanceByPatientDate(patientId: string, date: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("fluid_balance")
        .select("*")
        .eq("patient_id", patientId)
        .eq("record_date", date)
        .order("record_time", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function deleteFluidEntry(id: string) {
    const sb = await createClient();
    const { error } = await sb.from("fluid_balance").delete().eq("id", id);
    if (error) throw error;
}


"use server";

import { createClient } from "@/utils/supabase/server";

const SELECT = `
    *,
    patients!appointments_patient_id_fkey(id, name, phone, gender, date_of_birth),
    staffs!appointments_doctor_id_fkey(id, name, role)
`.trim();

export interface CreateAppointmentInput {
    patientId:       string;
    scheduledBy:     string;
    doctorId?:       string;
    appointmentDate: string;
    appointmentTime: string;
    reason:          string;
    department?:     string;
    priority?:       string;
    notes?:          string;
}

export async function createAppointment(input: CreateAppointmentInput) {
    const sb = await createClient();
    const { data, error } = await sb.from("appointments").insert([{
        patient_id:       input.patientId,
        scheduled_by:     input.scheduledBy,
        doctor_id:        input.doctorId        ?? null,
        appointment_date: input.appointmentDate,
        appointment_time: input.appointmentTime,
        reason:           input.reason,
        department:       input.department      ?? "Doctor",
        priority:         input.priority        ?? "routine",
        notes:            input.notes           ?? null,
        status:           "scheduled",
    }]).select(SELECT).single();
    if (error) throw error;
    return data;
}

export async function listAppointmentsByDate(date: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("appointments")
        .select(SELECT)
        .eq("appointment_date", date)
        .order("appointment_time", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function listAppointmentsByPatient(patientId: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("appointments")
        .select(SELECT)
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function listUpcomingAppointments() {
    const sb   = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb
        .from("appointments")
        .select(SELECT)
        .gte("appointment_date", today)
        .not("status", "in", '("cancelled","completed","no_show")')
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function updateAppointmentStatus(id: string, status: string, cancellationReason?: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("appointments")
        .update({ status, cancellation_reason: cancellationReason ?? null, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(SELECT)
        .single();
    if (error) throw error;
    return data;
}

export async function updateAppointment(id: string, updates: Partial<CreateAppointmentInput>) {
    const sb = await createClient();
    const mapped: Record<string, any> = {};
    if (updates.doctorId)        mapped.doctor_id        = updates.doctorId;
    if (updates.appointmentDate) mapped.appointment_date = updates.appointmentDate;
    if (updates.appointmentTime) mapped.appointment_time = updates.appointmentTime;
    if (updates.reason)          mapped.reason           = updates.reason;
    if (updates.department)      mapped.department       = updates.department;
    if (updates.priority)        mapped.priority         = updates.priority;
    if (updates.notes !== undefined) mapped.notes        = updates.notes;
    mapped.updated_at = new Date().toISOString();
    const { data, error } = await sb
        .from("appointments").update(mapped).eq("id", id).select(SELECT).single();
    if (error) throw error;
    return data;
}

export async function deleteAppointment(id: string) {
    const sb = await createClient();
    const { error } = await sb.from("appointments").delete().eq("id", id);
    if (error) throw error;
}

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Drug Chart ───────────────────────────────────────────────────────────────

export type DrugRoute     = "oral" | "IV" | "IM" | "SC" | "topical" | "sublingual" | "rectal" | "inhaled";
export type DrugFrequency = "OD" | "BD" | "TDS" | "QDS" | "PRN" | "STAT" | "nocte" | "mane";
export type AdminStatus   = "pending" | "given" | "missed" | "refused" | "held";

export interface DrugChartForm {
    drugName:    string;
    genericName: string;
    dose:        string;
    route:       DrugRoute;
    frequency:   DrugFrequency;
    startDate:   string;
    endDate:     string;
    notes:       string;
}

// ─── Fluid Balance ────────────────────────────────────────────────────────────

export interface FluidEntryForm {
    recordDate:      string;
    recordTime:      string;
    // Input
    oralMl:          string;
    ivMl:            string;
    ngMl:            string;
    otherInputMl:    string;
    otherInputType:  string;
    // Output
    urineMl:         string;
    aspirateMl:      string;
    vomitMl:         string;
    bowelMl:         string;
    drainMl:         string;
    otherOutputMl:   string;
    notes:           string;
}

// ─── Store State ──────────────────────────────────────────────────────────────

export interface NurseChartsState {
    // Active chart tab
    activeChartTab: "vitals" | "drug_chart" | "fluid_balance";

    // Drug chart form
    drugForm:           DrugChartForm;
    showDrugForm:       boolean;
    editDrugId:         string | null;

    // Drug admin logging
    loggingAdminId:     string | null;   // drug_administration_record id being updated

    // Fluid balance form
    fluidForm:          FluidEntryForm;
    showFluidForm:      boolean;
    editFluidId:        string | null;

    // Fluid date filter
    fluidDateFilter:    string;          // ISO date or "" for today
}

export interface NurseChartsActions {
    setActiveTab:    (tab: NurseChartsState["activeChartTab"]) => void;
    setDrugField:    <K extends keyof DrugChartForm>(k: K, v: DrugChartForm[K]) => void;
    openDrugForm:    (existing?: { id: string } & DrugChartForm) => void;
    closeDrugForm:   () => void;
    resetDrugForm:   () => void;
    setFluidField:   <K extends keyof FluidEntryForm>(k: K, v: FluidEntryForm[K]) => void;
    openFluidForm:   (existing?: { id: string } & FluidEntryForm) => void;
    closeFluidForm:  () => void;
    resetFluidForm:  () => void;
    setFluidDate:    (date: string) => void;
    setLoggingAdmin: (id: string | null) => void;
}

const initialDrugForm: DrugChartForm = {
    drugName:    "",
    genericName: "",
    dose:        "",
    route:       "oral",
    frequency:   "OD",
    startDate:   new Date().toISOString().slice(0, 10),
    endDate:     "",
    notes:       "",
};

const initialFluidForm: FluidEntryForm = {
    recordDate:     new Date().toISOString().slice(0, 10),
    recordTime:     new Date().toTimeString().slice(0, 5),
    oralMl:         "",
    ivMl:           "",
    ngMl:           "",
    otherInputMl:   "",
    otherInputType: "",
    urineMl:        "",
    aspirateMl:     "",
    vomitMl:        "",
    bowelMl:        "",
    drainMl:        "",
    otherOutputMl:  "",
    notes:          "",
};

const initialState: NurseChartsState = {
    activeChartTab:  "vitals",
    drugForm:        initialDrugForm,
    showDrugForm:    false,
    editDrugId:      null,
    loggingAdminId:  null,
    fluidForm:       initialFluidForm,
    showFluidForm:   false,
    editFluidId:     null,
    fluidDateFilter: new Date().toISOString().slice(0, 10),
};

type NurseChartsStore = NurseChartsState & NurseChartsActions;

export const useNurseChartsStore = create<NurseChartsStore>()(
    devtools(
        (set) => ({
            ...initialState,

            setActiveTab: (tab) => set({ activeChartTab: tab }),

            setDrugField: (k, v) =>
                set((s) => ({ drugForm: { ...s.drugForm, [k]: v } })),

            openDrugForm: (existing) => existing
                ? set({ showDrugForm: true, editDrugId: existing.id, drugForm: { ...existing } })
                : set({ showDrugForm: true, editDrugId: null, drugForm: { ...initialDrugForm } }),

            closeDrugForm:  () => set({ showDrugForm: false, editDrugId: null }),
            resetDrugForm:  () => set({ drugForm: { ...initialDrugForm } }),

            setFluidField: (k, v) =>
                set((s) => ({ fluidForm: { ...s.fluidForm, [k]: v } })),

            openFluidForm: (existing) => existing
                ? set({ showFluidForm: true, editFluidId: existing.id, fluidForm: { ...existing } })
                : set({ showFluidForm: true, editFluidId: null, fluidForm: {
                    ...initialFluidForm,
                    recordDate: new Date().toISOString().slice(0, 10),
                    recordTime: new Date().toTimeString().slice(0, 5),
                }}),

            closeFluidForm:  () => set({ showFluidForm: false, editFluidId: null }),
            resetFluidForm:  () => set({ fluidForm: { ...initialFluidForm } }),
            setFluidDate:    (date) => set({ fluidDateFilter: date }),
            setLoggingAdmin: (id) => set({ loggingAdminId: id }),
        }),
        { name: "nurse-charts-store" }
    )
);

// ─── Patients ─────────────────────────────────────────────────────────────────

export const patientKeys = {
    all: () => ["patients"] as const,
    lists: () => ["patients", "list"] as const,
    byStatus: (s: string) => ["patients", "list", "status", s] as const,
    search: (q: string) => ["patients", "search", q] as const,
    details: () => ["patients", "detail"] as const,
    detail: (id: string) => ["patients", "detail", id] as const,
    appointments: () => ["patients", "appointments"] as const,
    appointmentsByDate: (date: string) => ["patients", "appointments", "date", date] as const,
    appointmentsByPatient: (id: string) => ["patients", "appointments", "patient", id] as const,
    appointmentsUpcoming: () => ["patients", "appointments", "upcoming"] as const,
    appointmentsDetail: (id: string) => ["patients", "appointments", "detail", id] as const,
    appointmentsCreate: () => ["patients", "appointments", "create"] as const,
    appointmentsUpdate: () => ["patients", "appointments", "update"] as const,
    appointmentsDelete: () => ["patients", "appointments", "delete"] as const,
    appointmentsUpdateStatus: () => ["patients", "appointments", "update", "status"] as const,
    appointmentsUpdateStatusDetail: (id: string) => ["patients", "appointments", "update", "status", "detail", id] as const,
    appointmentsUpdateStatusCreate: () => ["patients", "appointments", "update", "status", "create"] as const,
    appointmentsUpdateStatusDelete: () => ["patients", "appointments", "update", "status", "delete"] as const,
    
};

export const dischargeKeys = {
    all:       ()           => ["discharge_notes"]              as const,
    byPatient: (id: string) => ["discharge_notes", "patient", id] as const,
    detail: (id: string) => ["discharge_notes", "detail", id] as const,
    create: () => ["discharge_notes", "create"] as const,
    update: () => ["discharge_notes", "update"] as const,
    delete: () => ["discharge_notes", "delete"] as const,
    updateStatus: () => ["discharge_notes", "update", "status"] as const,
    updateStatusDetail: (id: string) => ["discharge_notes", "update", "status", "detail", id] as const,
    updateStatusCreate: () => ["discharge_notes", "update", "status", "create"] as const,
    updateStatusDelete: () => ["discharge_notes", "update", "status", "delete"] as const,
};


export const appointmentKeys = {
    all:       ()           => ["appointments"]                          as const,
    upcoming:  ()           => ["appointments", "upcoming"]              as const,
    byDate:    (d: string)  => ["appointments", "date", d]               as const,
    byPatient: (id: string) => ["appointments", "patient", id]           as const,
};

// ─── Consultations ────────────────────────────────────────────────────────────

export const consultationKeys = {
    all: () => ["consultations"] as const,
    byPatient: (id: string) => ["consultations", "patient", id] as const,
    byDoctor: (id: string) => ["consultations", "doctor", id] as const,
    detail: (id: string) => ["consultations", "detail", id] as const,
};

// ─── Lab requests (NON-radiology only) ────────────────────────────────────────
// These keys cover test_type values that do NOT start with "[RADIOLOGY]".
// All lab tech dashboard data uses these keys exclusively.

export const labKeys = {
    all: () => ["lab"] as const,
    pending: () => ["lab", "requests", "pending"] as const,
    completed: () => ["lab", "requests", "completed"] as const,
    byPatient: (id: string) => ["lab", "requests", "patient", id] as const,
    detail: (id: string) => ["lab", "requests", "detail", id] as const,
    // Test catalog
    catalog: () => ["lab", "catalog"] as const,
    catalogActive: () => ["lab", "catalog", "active"] as const,
};

// ─── Radiology requests ───────────────────────────────────────────────────────
// Separate namespace for test_type values that start with "[RADIOLOGY]".
// Radiologist dashboard and patient radiology tab use these keys exclusively.
// Invalidating radiologyKeys.pending() will NEVER touch labKeys.pending() and
// vice versa — no cross-department cache pollution.

export const radiologyKeys = {
    all: () => ["radiology"] as const,
    pending: () => ["radiology", "pending"] as const,
    completed: () => ["radiology", "completed"] as const,
    byPatient: (id: string) => ["radiology", "patient", id] as const,
    detail: (id: string) => ["radiology", "detail", id] as const,
};

// ─── Nursing ──────────────────────────────────────────────────────────────────

export const nursingKeys = {
    all: () => ["nursing"] as const,
    pending: () => ["nursing", "pending"] as const,
    byPatient: (id: string) => ["nursing", "patient", id] as const,
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentKeys = {
    all: () => ["payments"] as const,
    pending: () => ["payments", "pending"] as const,
    byPatient: (id: string) => ["payments", "patient", id] as const,
};

// ─── Pharmacy ─────────────────────────────────────────────────────────────────

export const pharmacyKeys = {
    prescriptions: () => ["pharmacy", "prescriptions"] as const,
    prescriptionsPending: () => ["pharmacy", "prescriptions", "pending"] as const,
    prescriptionsByPatient: (id: string) => ["pharmacy", "prescriptions", "patient", id] as const,
    prescription: (id: string) => ["pharmacy", "prescriptions", "detail", id] as const,
    inventory: () => ["pharmacy", "inventory"] as const,
    inventoryActive: () => ["pharmacy", "inventory", "active"] as const,
    catalog: () => ["pharmacy", "catalog"] as const,
    dispensing: (id: string) => ["pharmacy", "dispensing", "patient", id] as const,
};

// ─── Staff ────────────────────────────────────────────────────────────────────

export const staffKeys = {
    all: () => ["staff"] as const,
    byRole: (r: string) => ["staff", "role", r] as const,
    detail: (id: string) => ["staff", "detail", id] as const,
};