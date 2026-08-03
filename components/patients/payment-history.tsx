"use client";

import React, { useMemo, useState } from "react";
import { usePaymentsByPatient, useCreatePayment } from "@/hooks/emr/use-payment";
import { mapPaymentsForHistory } from "@/lib/utils/map-payment-history";
import type { Payment as DbPayment } from "@/types/models";
import { Plus, Printer, Loader2, X } from "lucide-react";

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
    lab:          "Lab Test",
    radiology:    "Radiology",
    pharmacy:     "Pharmacist",
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
    const [isAddBillOpen, setIsAddBillOpen] = useState(false);
    
    // Add Bill Form State
    const [newBill, setNewBill] = useState({ description: "", amount: "", category: "other" as PaymentCategory });

    const { data: raw = [], isLoading, isError } = usePaymentsByPatient(patientId);
    const { mutate: createPayment, isPending: isCreatingBill } = useCreatePayment();

    const handleAddBill = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBill.description.trim() || !newBill.amount || Number(newBill.amount) <= 0) return;
        createPayment({
            patient_id: patientId,
            description: newBill.description,
            amount: Number(newBill.amount),
            category: newBill.category,
            status: "pending"
        }, {
            onSuccess: () => {
                setIsAddBillOpen(false);
                setNewBill({ description: "", amount: "", category: "other" });
            }
        });
    };

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
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Payment History</h3>
                    <span className="text-xs text-slate-400">{payments.length} record{payments.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
                        <Printer size={13} /> Export Invoice
                    </button>
                    {!readOnly && (
                        <button 
                            onClick={() => setIsAddBillOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-200 text-xs font-bold transition-colors">
                            <Plus size={13} /> Add Bill
                        </button>
                    )}
                </div>
            </div>

            {/* Print Header (Visible only when printing) */}
            <div className="hidden print:block mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Nile Valley Hospital</h1>
                <p className="text-sm text-slate-500 mb-6">Patient Invoice / Billing Statement</p>
                <div className="flex justify-between border-b pb-4">
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Patient ID</p>
                        <p className="text-sm font-medium">{patientId}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Date Generated</p>
                        <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Summary */}
            {payments.length > 0 && (
                <div className="print:mb-8">
                    <PaymentSummary payments={payments} />
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 print:hidden">
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
                <div className="overflow-x-auto rounded-xl border border-slate-100 print:border-none print:shadow-none">
                    <table className="w-full text-sm print:text-xs">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide print:bg-transparent print:border-b-2 print:border-slate-800">
                                <th className="px-4 py-3 text-left font-medium">Description</th>
                                <th className="px-4 py-3 text-left font-medium">Category</th>
                                <th className="px-4 py-3 text-right font-medium">Billed</th>
                                <th className="px-4 py-3 text-right font-medium">Paid</th>
                                <th className="px-4 py-3 text-right font-medium">Balance</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                <th className="px-4 py-3 text-left font-medium print:hidden">Date</th>
                                {!readOnly && <th className="px-4 py-3 print:hidden" />}
                            </tr>
                        </thead>
                        <tbody className="print:divide-y print:divide-slate-200">
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

            {/* Add Bill Modal */}
            {isAddBillOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:hidden">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">Add Custom Bill</h3>
                            <button onClick={() => setIsAddBillOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddBill} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                                <input required value={newBill.description} onChange={e => setNewBill({...newBill, description: e.target.value})}
                                    placeholder="e.g. Syringes, Extra Dressing"
                                    className="w-full text-sm border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                                    <select value={newBill.category} onChange={e => setNewBill({...newBill, category: e.target.value as PaymentCategory})}
                                        className="w-full text-sm border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition-colors">
                                        {(Object.keys(CATEGORY_LABELS) as PaymentCategory[]).map(c => (
                                            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount (NGN)</label>
                                    <input required type="number" min="1" value={newBill.amount} onChange={e => setNewBill({...newBill, amount: e.target.value})}
                                        placeholder="0.00"
                                        className="w-full text-sm border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition-colors" />
                                </div>
                            </div>
                            <div className="pt-2">
                                <button type="submit" disabled={isCreatingBill}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-200 transition-colors disabled:opacity-50">
                                    {isCreatingBill ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Bill"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}