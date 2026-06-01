import type { Payment as DbPayment } from "@/types/models";
import type { Payment as HistoryPayment } from "@/components/patients/payment-history";

function mapStatus(raw?: string): HistoryPayment["status"] {
    const s = (raw ?? "").toLowerCase();
    if (s === "paid" || s === "completed") return "paid";
    if (s === "partial") return "partial";
    if (s === "waived") return "waived";
    if (s === "refunded") return "refunded";
    return "pending";
}

function mapCategory(desc?: string): HistoryPayment["category"] {
    const d = (desc ?? "").toLowerCase();
    if (d.includes("lab")) return "lab";
    if (d.includes("radio")) return "radiology";
    if (d.includes("pharm")) return "pharmacy";
    if (d.includes("admit")) return "admission";
    if (d.includes("procedure")) return "procedure";
    if (d.includes("consult")) return "consultation";
    return "other";
}

/** Maps Supabase payment rows to PaymentHistory component shape. */
export function mapPaymentsForHistory(rows: DbPayment[]): HistoryPayment[] {
    return rows.map((p) => {
        const amount =
            (p as any).amount_kobo ??
            (typeof p.amount === "number" ? Math.round(p.amount * 100) : 0);
        const paid =
            (p as any).amount_paid_kobo ??
            (mapStatus(p.status) === "paid" ? amount : 0);

        return {
            id: p.id,
            patient_id: p.patient_id ?? p.patientId ?? "",
            category: mapCategory(p.description),
            description: p.description ?? "Payment",
            amount_kobo: amount,
            amount_paid_kobo: paid,
            status: mapStatus(p.status),
            payment_date: (p as any).paid_at ?? p.processed_date ?? p.processedDate ?? null,
            invoice_no: (p as any).invoice_no ?? p.id.slice(0, 8).toUpperCase(),
            collected_by: p.processed_by ?? p.processedBy ?? null,
            notes: (p as any).notes ?? null,
            created_at: p.created_at ?? new Date().toISOString(),
        };
    });
}
