"use client";

import React, { useMemo, useState } from "react";
import { usePaymentsByPatient } from "@/hooks/emr/use-payment";
import { mapPaymentsForHistory } from "@/lib/utils/map-payment-history";
import type { Payment as DbPayment } from "@/types/models";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentStatus   = "pending" | "paid" | "partial" | "waived" | "refunded";
export type PaymentCategory = "consultation" | "lab" | "radiology" | "pharmacy" | "procedure" | "admission" | "other";

export interface Payment {
    id:           string;
    patient_id:   string;
    category:     PaymentCategory;
    description:  string;
    amount_kobo:  number;
    amount_paid_kobo: number;
    status:       PaymentStatus;
    payment_date: string | null;
    invoice_no:   string;
    collected_by: string | null;
    notes:        string | null;
    created_at:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNaira(kobo: number): string {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(kobo / 100);
}

const STATUS_STYLE: Record<PaymentStatus, string> = {
    pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
    paid:     "bg-green-50  text-green-700  border-green-200",
    partial:  "bg-blue-50   text-blue-700   border-blue-200",
    waived:   "bg-slate-50  text-slate-500  border-slate-200",
    refunded: "bg-rose-50   text-rose-600   border-rose-200",
};

const CATEGORY_LABELS: Record<PaymentCategory, string> = {
    consultation: "Consultation",
    lab:          "Laboratory",
    radiology:    "Radiology",
    pharmacy:     "Pharmacy",
    procedure:    "Procedure",
    admission:    "Admission",
    other:        "Other",
};

// ─── Summary Cards ────────────────────────────────────────────────────────────

function PaymentSummary({ payments }: { payments: Payment[] }) {
    const total   = payments.reduce((s, p) => s + p.amount_kobo, 0);
    const paid    = payments.reduce((s, p) => s + p.amount_paid_kobo, 0);
    const pending = payments.filter((p) => p.status === "pending" || p.status === "partial").reduce((s, p) => s + (p.amount_kobo - p.amount_paid_kobo), 0);

    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Billed</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{formatNaira(total)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total Paid</p>
                <p className="text-lg font-bold text-green-700 mt-1">{formatNaira(paid)}</p>
            </div>
            <div className={`rounded-xl p-4 border ${pending > 0 ? "bg-yellow-50 border-yellow-100" : "bg-slate-50 border-slate-100"}`}>
                <p className={`text-xs font-medium uppercase tracking-wide ${pending > 0 ? "text-yellow-600" : "text-slate-500"}`}>Outstanding</p>
                <p className={`text-lg font-bold mt-1 ${pending > 0 ? "text-yellow-700" : "text-slate-400"}`}>{formatNaira(pending)}</p>
            </div>
        </div>
    );
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

interface PaymentRowProps {
    payment:    Payment;
    onSettle?:  (id: string) => void;
}

function PaymentRow({ payment, onSettle }: PaymentRowProps) {
    const balance = payment.amount_kobo - payment.amount_paid_kobo;

    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td className="px-4 py-3">
                <div className="text-sm font-medium text-slate-800">{payment.description}</div>
                <div className="text-xs text-slate-400">{payment.invoice_no}</div>
            </td>
            <td className="px-4 py-3">
                <span className="text-xs font-medium text-slate-600 bg-slate-100 rounded px-2 py-0.5">
                    {CATEGORY_LABELS[payment.category]}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-slate-700 text-right whitespace-nowrap">
                {formatNaira(payment.amount_kobo)}
            </td>
            <td className="px-4 py-3 text-sm text-green-700 text-right whitespace-nowrap">
                {formatNaira(payment.amount_paid_kobo)}
            </td>
            <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                {balance > 0
                    ? <span className="text-yellow-600">{formatNaira(balance)}</span>
                    : <span className="text-slate-400">—</span>
                }
            </td>
            <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLE[payment.status]}`}>
                    {payment.status}
                </span>
            </td>
            <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                {payment.payment_date ?? "—"}
            </td>
            <td className="px-4 py-3">
                {(payment.status === "pending" || payment.status === "partial") && onSettle && (
                    <button
                        onClick={() => onSettle(payment.id)}
                        className="text-xs text-teal-600 hover:underline font-medium"
                    >
                        Settle
                    </button>
                )}
            </td>
        </tr>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PaymentHistoryProps {
    patientId:  string;
    readOnly?:  boolean;
    onSettle?:  (paymentId: string) => void;
}

export default function PaymentHistory({ patientId, readOnly = false, onSettle }: PaymentHistoryProps) {
    const [categoryFilter, setCategoryFilter] = useState<PaymentCategory | "all">("all");
    const [statusFilter,   setStatusFilter]   = useState<PaymentStatus   | "all">("all");

    const { data: raw = [], isLoading, isError } = usePaymentsByPatient(patientId);

    const payments = useMemo(() => mapPaymentsForHistory(raw as DbPayment[]), [raw]);

    const filtered = payments.filter((p) => {
        const matchCat    = categoryFilter === "all" || p.category === categoryFilter;
        const matchStatus = statusFilter   === "all" || p.status   === statusFilter;
        return matchCat && matchStatus;
    });

    // Sort: unpaid first, then by date desc
    const sorted = [...filtered].sort((a, b) => {
        const aUrgent = a.status === "pending" || a.status === "partial" ? 0 : 1;
        const bUrgent = b.status === "pending" || b.status === "partial" ? 0 : 1;
        if (aUrgent !== bUrgent) return aUrgent - bUrgent;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Payment History</h3>
                <span className="text-xs text-slate-400">{payments.length} record{payments.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Summary */}
            {payments.length > 0 && <PaymentSummary payments={payments} />}

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as PaymentCategory | "all")}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                    <option value="all">All categories</option>
                    {(Object.keys(CATEGORY_LABELS) as PaymentCategory[]).map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "all")}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                    {(["all","pending","partial","paid","waived","refunded"] as const).map((s) => (
                        <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="text-sm text-slate-400 py-8 text-center">Loading payment history…</div>
            ) : isError ? (
                <div className="text-sm text-red-400 py-8 text-center">Failed to load payments</div>
            ) : sorted.length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                    No payment records found
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                                <th className="px-4 py-3 text-left font-medium">Description</th>
                                <th className="px-4 py-3 text-left font-medium">Category</th>
                                <th className="px-4 py-3 text-right font-medium">Billed</th>
                                <th className="px-4 py-3 text-right font-medium">Paid</th>
                                <th className="px-4 py-3 text-right font-medium">Balance</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                <th className="px-4 py-3 text-left font-medium">Date</th>
                                {!readOnly && <th className="px-4 py-3" />}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((p) => (
                                <PaymentRow
                                    key={p.id}
                                    payment={p}
                                    onSettle={!readOnly ? onSettle : undefined}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}