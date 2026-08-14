"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";

/**
 * Admin reporting & analytics (daily census, revenue, lab turnaround,
 * pharmacy dispense, mortality). All endpoints are Admin-only; exports are
 * CSV strings produced server-side.
 */

export interface ReportResult {
    columns: string[];
    rows: Array<Record<string, string | number | null>>;
}

function isoDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
}

export async function getDailyCensus(days = 14): Promise<ReportResult> {
    await requireStaff([UserRole.Admin]);
    const supabase = await createClient();
    const since = isoDaysAgo(days);

    const [admissions, discharges, registrations] = await Promise.all([
        supabase.from("patient_admissions").select("admitted_at").gte("admitted_at", since),
        supabase.from("patient_admissions").select("discharged_at").gte("discharged_at", since),
        supabase.from("patients").select("created_at").gte("created_at", since),
    ]);

    const byDay = new Map<string, { date: string; admissions: number; discharges: number; registrations: number }>();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        byDay.set(key, { date: key, admissions: 0, discharges: 0, registrations: 0 });
    }
    const bucket = (iso: string | null) => (iso ? iso.slice(0, 10) : null);
    for (const a of admissions.data ?? []) {
        const k = bucket(a.admitted_at);
        if (k && byDay.has(k)) byDay.get(k)!.admissions++;
    }
    for (const a of discharges.data ?? []) {
        const k = bucket(a.discharged_at);
        if (k && byDay.has(k)) byDay.get(k)!.discharges++;
    }
    for (const r of registrations.data ?? []) {
        const k = bucket(r.created_at);
        if (k && byDay.has(k)) byDay.get(k)!.registrations++;
    }

    return {
        columns: ["date", "admissions", "discharges", "registrations"],
        rows: [...byDay.values()],
    };
}

export async function getRevenueReport(days = 30): Promise<ReportResult> {
    await requireStaff([UserRole.Admin]);
    const supabase = await createClient();
    const since = isoDaysAgo(days);
    const { data } = await supabase
        .from("payments")
        .select("amount, status, method, payment_method, payer, category, processed_date, created_at")
        .gte("created_at", since);

    const rows = (data ?? [])
        .filter((p: any) => ["paid", "partial", "Completed"].includes(p.status))
        .map((p: any) => ({
            date: (p.processed_date ?? p.created_at ?? "").slice(0, 10),
            amount: p.amount ?? 0,
            method: p.method ?? p.payment_method ?? "unknown",
            payer: p.payer ?? "private",
            category: p.category ?? "other",
        }));

    const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
    rows.push({ date: "TOTAL", amount: Number(total.toFixed(2)), method: "", payer: "", category: "" } as any);

    return { columns: ["date", "amount", "method", "payer", "category"], rows };
}

export async function getLabTurnaroundReport(days = 30): Promise<ReportResult> {
    await requireStaff([UserRole.Admin]);
    const supabase = await createClient();
    const since = isoDaysAgo(days);
    const { data } = await supabase
        .from("lab_requests")
        .select("id, test_type, status, created_at, completed_at")
        .gte("created_at", since);

    const rows = (data ?? [])
        .filter((l: any) => l.status === "completed" && l.completed_at)
        .map((l: any) => {
            const hrs = Math.max(
                0,
                (new Date(l.completed_at).getTime() - new Date(l.created_at).getTime()) / 3600000
            );
            return {
                date: (l.created_at ?? "").slice(0, 10),
                test: String(l.test_type).replace(/^\[RADIOLOGY\]\s*/i, ""),
                turnaround_hours: Number(hrs.toFixed(1)),
            };
        });

    return { columns: ["date", "test", "turnaround_hours"], rows };
}

export async function getMortalityReport(): Promise<ReportResult> {
    await requireStaff([UserRole.Admin]);
    const supabase = await createClient();
    const { data } = await supabase
        .from("death_certificates")
        .select("date_of_death, immediate_cause, icd10_immediate, manner_of_death, patients(name)")
        .order("date_of_death", { ascending: false });

    const rows = (data ?? []).map((d: any) => ({
        date_of_death: d.date_of_death,
        patient: d.patients?.name ?? "Unknown",
        immediate_cause: d.immediate_cause ?? "",
        icd10: d.icd10_immediate ?? "",
        manner: d.manner_of_death,
    }));

    return { columns: ["date_of_death", "patient", "immediate_cause", "icd10", "manner"], rows };
}

export async function getPharmacyDispenseReport(days = 30): Promise<ReportResult> {
    await requireStaff([UserRole.Admin]);
    const supabase = await createClient();
    const since = isoDaysAgo(days);
    const { data } = await supabase
        .from("drug_dispensing")
        .select("drug_name, quantity, dispensed_at, batch_number")
        .gte("dispensed_at", since);

    const rows = (data ?? []).map((d: any) => ({
        date: (d.dispensed_at ?? "").slice(0, 10),
        drug: d.drug_name ?? "Unknown",
        quantity: d.quantity ?? 1,
        batch: d.batch_number ?? "",
    }));

    return { columns: ["date", "drug", "quantity", "batch"], rows };
}
