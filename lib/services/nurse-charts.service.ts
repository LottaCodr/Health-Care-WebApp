"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";
import { assertRecordAmendable, assertRecordDeletable } from "./record-lock";

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
    await requireStaff([UserRole.Nurse]);
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
    await requireStaff();
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
    const actor = await requireStaff([UserRole.Nurse]);
    const sb = await createClient();
    const mapped: Record<string, any> = {};
    if (updates.drugName    !== undefined) mapped.drug_name     = updates.drugName;
    if (updates.dose        !== undefined) mapped.dose          = updates.dose;
    if (updates.route       !== undefined) mapped.route         = updates.route;
    if (updates.frequency   !== undefined) mapped.frequency     = updates.frequency;
    if (updates.endDate     !== undefined) mapped.end_date      = updates.endDate;
    if (updates.isActive    !== undefined) mapped.is_active     = updates.isActive;
    if (updates.notes       !== undefined) mapped.notes         = updates.notes;

    // Drug/dose/route/frequency/notes are chart content → 24h window, author
    // only. Stopping a line (is_active) is an order, not an edit, so it stays
    // possible at any time.
    const ctx = await assertRecordAmendable("drug_chart", id, mapped, { roles: false, actor });

    const { data, error } = await sb
        .from("nurse_drug_chart")
        .update({ ...mapped, ...(ctx?.patch ?? {}) })
        .eq("id", id)
        .select()
        .single();
    if (error) {
        if (/amendment window/i.test(error.message)) {
            throw new Error("LOCKED:window_expired This drug chart entry is past its 24-hour amendment window. Attach a correction note instead.");
        }
        console.error("[nurse-charts] updateDrugChartEntry:", error);
        throw error;
    }
    return data;
}

export async function deleteDrugChartEntry(id: string) {
    // A chart line can be withdrawn while it is still fresh; later it is
    // history. Stopping it (isActive: false) is always available.
    await assertRecordDeletable("drug_chart", id, { allowAdmin: true });
    const sb = await createClient();
    const { error } = await sb.from("nurse_drug_chart").delete().eq("id", id);
    if (error) {
        if (/amendment window/i.test(error.message)) {
            throw new Error("LOCKED:window_expired Old chart entries cannot be deleted — stop the line or attach a correction note.");
        }
        console.error("[nurse-charts] deleteDrugChartEntry:", error);
        throw error;
    }
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
    /** Second-checker (electronic witness) for high-risk drugs. */
    witnessedBy?:    string;
    /** Timestamp of the e-signature (defaults to now when witness present). */
    signedAt?:       string;
}) {
    await requireStaff([UserRole.Nurse]);
    const sb = await createClient();
    const hasWitness = Boolean(input.witnessedBy);
    const { data, error } = await sb.from("drug_administration_records").insert([{
        drug_chart_id:   input.drugChartId,
        patient_id:      input.patientId,
        scheduled_time:  input.scheduledTime,
        status:          input.status,
        given_by:        input.givenBy,
        administered_at: input.administeredAt ?? new Date().toISOString(),
        notes:           input.notes          ?? null,
        witnessed_by:    input.witnessedBy    ?? null,
        witnessed_at:    hasWitness ? new Date().toISOString() : null,
        signed_at:       input.signedAt ?? (hasWitness ? new Date().toISOString() : null),
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
    /** Free-text description of the intake fluid/solution (e.g. 0.9% Normal Saline). */
    inputFluidType?:string;
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
    await requireStaff([UserRole.Nurse]);
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
        input_fluid_type: input.inputFluidType  ?? null,
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
    await requireStaff();
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

/**
 * Correct a fluid-balance line inside the 24-hour window (author only).
 * Balances are re-calculated on read, so only the recorded volumes/note are
 * touched here.
 */
export async function updateFluidEntry(
    id: string,
    updates: Partial<CreateFluidEntryInput>
): Promise<any> {
    const actor = await requireStaff([UserRole.Nurse]);
    const sb = await createClient();
    const mapped: Record<string, any> = {};
    if (updates.oralMl        !== undefined) mapped.oral_ml         = updates.oralMl;
    if (updates.ivMl          !== undefined) mapped.iv_ml           = updates.ivMl;
    if (updates.ngMl          !== undefined) mapped.ng_ml           = updates.ngMl;
    if (updates.otherInputMl  !== undefined) mapped.other_input_ml  = updates.otherInputMl;
    if (updates.otherInputType!== undefined) mapped.other_input_type= updates.otherInputType;
    if (updates.inputFluidType!== undefined) mapped.input_fluid_type= updates.inputFluidType;
    if (updates.urineMl       !== undefined) mapped.urine_ml        = updates.urineMl;
    if (updates.aspirateMl    !== undefined) mapped.aspirate_ml     = updates.aspirateMl;
    if (updates.vomitMl       !== undefined) mapped.vomit_ml        = updates.vomitMl;
    if (updates.bowelMl       !== undefined) mapped.bowel_ml        = updates.bowelMl;
    if (updates.drainMl       !== undefined) mapped.drain_ml        = updates.drainMl;
    if (updates.otherOutputMl !== undefined) mapped.other_output_ml = updates.otherOutputMl;
    if (updates.notes         !== undefined) mapped.notes           = updates.notes;

    const ctx = await assertRecordAmendable("fluid_balance", id, mapped, { roles: false, actor });

    const { data, error } = await sb
        .from("fluid_balance")
        .update({ ...mapped, ...(ctx?.patch ?? {}) })
        .eq("id", id)
        .select()
        .single();
    if (error) {
        if (/amendment window/i.test(error.message)) {
            throw new Error("LOCKED:window_expired This fluid balance entry is past its 24-hour amendment window. Attach a correction note instead.");
        }
        console.error("[nurse-charts] updateFluidEntry:", error);
        throw error;
    }
    return data;
}

export async function deleteFluidEntry(id: string) {
    await assertRecordDeletable("fluid_balance", id, { allowAdmin: true });
    const sb = await createClient();
    const { error } = await sb.from("fluid_balance").delete().eq("id", id);
    if (error) {
        if (/amendment window/i.test(error.message)) {
            throw new Error("LOCKED:window_expired Old fluid balance entries cannot be deleted — attach a correction note instead.");
        }
        console.error("[nurse-charts] deleteFluidEntry:", error);
        throw error;
    }
}