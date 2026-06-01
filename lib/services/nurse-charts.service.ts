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