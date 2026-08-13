"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    usePaymentsByPatient,
    useCreatePayment,
    useUpdatePayment,
} from "@/hooks/emr/use-payment";
import { mapPaymentsForHistory } from "@/lib/utils/map-payment-history";
import { exportPatientInvoice, type InvoicePatientInfo } from "@/lib/utils/invoice";
import type { Payment as DbPayment } from "@/types/models";
import {
    SettleBillModal, SettleAllBillsModal, DepositModal, PayerBadge,
} from "./billing-modals";
import { resolvePayerFromPatient, PAYMENT_TYPE_CONFIG } from "@/lib/utils/billing";
import {
    Plus, Printer, Loader2, X, Pencil, CheckCircle2,
    Receipt, AlertTriangle, Wallet, Layers, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentStatus   = "pending" | "paid" | "partial" | "waived" | "refunded";
export type PaymentCategory = "consultation" | "lab" | "radiology" | "pharmacy" | "procedure" | "admission" | "deposit" | "other";

export interface Payment {
    id:           string;
    patient_id:   string;
    category:     PaymentCategory;
    description:  string;
    amount_kobo:  number;
    amount_paid_kobo: number;
    status:       PaymentStatus;
    payment_type?: "full" | "partial" | "deposit";
    payer?:       "private" | "hmo" | "company" | null;
    payer_reference?: string | null;
    payer_code?:  string | null;
    discount_kobo?: number;
    discount_percent?: number | null;
    applied_kobo?: number;
    deposit_available_kobo?: number;
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
    deposit:      "Deposit",
    other:        "Other",
};

// ─── Summary Cards ────────────────────────────────────────────────────────────

function PaymentSummary({ payments }: { payments: Payment[] }) {
    const bills    = payments.filter((p) => p.category !== "deposit");
    const deposits = payments.filter((p) => p.category === "deposit");
    const total    = bills.reduce((s, p) => s + p.amount_kobo, 0);
    const paid     = bills.reduce((s, p) => s + p.amount_paid_kobo, 0);
    const pending  = bills.filter((p) => p.status === "pending" || p.status === "partial").reduce((s, p) => s + (p.amount_kobo - p.amount_paid_kobo), 0);
    const creditAvailable = deposits.reduce((s, p) => s + (p.deposit_available_kobo ?? 0), 0);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <div className={`rounded-xl p-4 border ${creditAvailable > 0 ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
                <p className={`text-xs font-medium uppercase tracking-wide ${creditAvailable > 0 ? "text-emerald-600" : "text-slate-500"}`}>Deposit Credit</p>
                <p className={`text-lg font-bold mt-1 ${creditAvailable > 0 ? "text-emerald-700" : "text-slate-400"}`}>{formatNaira(creditAvailable)}</p>
            </div>
        </div>
    );
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

interface PaymentRowProps {
    payment:    Payment;
    canManage:  boolean;
    onEdit?:    (payment: Payment) => void;
    onSettle?:  (payment: Payment) => void;
}

function PaymentRow({ payment, canManage, onEdit, onSettle }: PaymentRowProps) {
    const balance = payment.amount_kobo - payment.amount_paid_kobo;
    const outstanding = payment.status === "pending" || payment.status === "partial";
    const isDeposit = payment.category === "deposit";

    return (
        <tr className={`border-b border-slate-100 transition-colors ${isDeposit ? "bg-emerald-50/40 hover:bg-emerald-50/60" : "hover:bg-slate-50"}`}>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-medium text-slate-800">{payment.description}</div>
                    {payment.payment_type && (
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${
                            payment.payment_type === "deposit" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : payment.payment_type === "partial" ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                            {PAYMENT_TYPE_CONFIG[payment.payment_type]?.short ?? payment.payment_type}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400">{payment.invoice_no}</span>
                    {payment.payer && (
                        <PayerBadge payer={payment.payer} reference={payment.payer_reference ?? null} />
                    )}
                </div>
                {payment.payer_code && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {payment.payer_code}</div>
                )}
            </td>
            <td className="px-4 py-3">
                <span className="text-xs font-medium text-slate-600 bg-slate-100 rounded px-2 py-0.5">
                    {CATEGORY_LABELS[payment.category] ?? "Other"}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-slate-700 text-right whitespace-nowrap">
                {formatNaira(payment.amount_kobo)}
                {!!payment.discount_kobo && (
                    <div className="text-[10px] text-teal-600">−{formatNaira(payment.discount_kobo)} discount</div>
                )}
            </td>
            <td className="px-4 py-3 text-sm text-green-700 text-right whitespace-nowrap">
                {formatNaira(payment.amount_paid_kobo)}
            </td>
            <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                {isDeposit ? (
                    (payment.deposit_available_kobo ?? 0) > 0 ? (
                        <span className="text-emerald-600 font-semibold">{formatNaira(payment.deposit_available_kobo!)} credit</span>
                    ) : (
                        <span className="text-slate-400">applied</span>
                    )
                ) : balance > 0
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
                {outstanding && canManage && (
                    <div className="flex items-center gap-2">
                        {/* Edit the bill (price/description) before settling */}
                        <button
                            onClick={() => onEdit?.(payment)}
                            title="Edit bill price & details"
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-teal-700 font-medium transition-colors"
                        >
                            <Pencil size={11} /> Edit
                        </button>
                        <button
                            onClick={() => onSettle?.(payment)}
                            title="Settle this bill — full / part payment, discount, or deposit"
                            className="text-xs text-teal-600 hover:underline font-bold"
                        >
                            Settle
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}

// ─── Edit Bill Modal (before settling) ────────────────────────────────────────

interface EditBillModalProps {
    payment: Payment;
    onClose: () => void;
}

function EditBillModal({ payment, onClose }: EditBillModalProps) {
    const { mutate: updateBill, isPending } = useUpdatePayment();

    const [description, setDescription] = useState(payment.description ?? "");
    const [category, setCategory] = useState<PaymentCategory>(payment.category ?? "other");
    const [amount, setAmount] = useState<string>(String(payment.amount_kobo / 100));

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !isPending) onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isPending, onClose]);

    const parsed = Number(amount);
    const valid = description.trim().length > 0 && amount.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;

    function handleSave(e?: React.FormEvent) {
        e?.preventDefault();
        if (!valid || isPending) return;
        updateBill(
            {
                id: payment.id,
                description: description.trim(),
                category,
                amount: parsed,
            },
            {
                onSuccess: () => {
                    toast.success("Bill updated.");
                    onClose();
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update bill."),
            }
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:hidden" role="presentation">
            <form onSubmit={handleSave} role="dialog" aria-modal="true" aria-labelledby="edit-bill-title"
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                            <Pencil size={14} className="text-slate-500" />
                        </div>
                        <div>
                            <h3 id="edit-bill-title" className="font-bold text-slate-800">Edit Bill</h3>
                            <p className="text-[10px] text-slate-400">{payment.invoice_no} · changes apply before settling</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} disabled={isPending} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                        <input
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isPending}
                            className="w-full text-sm border border-slate-200 bg-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as PaymentCategory)}
                                disabled={isPending}
                                className="w-full text-sm border border-slate-200 bg-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors"
                            >
                                {(Object.keys(CATEGORY_LABELS) as PaymentCategory[]).map((c) => (
                                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price (NGN)</label>
                            <input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={isPending}
                                className="w-full text-sm border border-slate-200 bg-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors"
                            />
                        </div>
                    </div>
                    {payment.amount_paid_kobo > 0 && (
                        <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                            This bill is partially paid ({formatNaira(payment.amount_paid_kobo)}). The price cannot be lowered below the amount already collected.
                        </p>
                    )}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} disabled={isPending}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={!valid || isPending}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isPending ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Save changes"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PaymentHistoryProps {
    patientId:  string;
    patient?:   InvoicePatientInfo | null;
    readOnly?:  boolean;
    /** Staff id recorded as the cashier on settled payments. */
    cashierId?: string;
    /**
     * Optional external settle handler. When omitted (default), the built-in
     * Settle Bill modal is used, which lets the cashier adjust the final price
     * and pick a payment method before confirming.
     */
    onSettle?:  (paymentId: string) => void;
}

export default function PaymentHistory({ patientId, patient = null, readOnly = false, cashierId = "", onSettle }: PaymentHistoryProps) {
    const [categoryFilter, setCategoryFilter] = useState<PaymentCategory | "all">("all");
    const [statusFilter,   setStatusFilter]   = useState<PaymentStatus   | "all">("all");
    const [isAddBillOpen, setIsAddBillOpen] = useState(false);
    const [settleTarget, setSettleTarget] = useState<Payment | null>(null);
    const [editTarget, setEditTarget] = useState<Payment | null>(null);
    const [settleAllOpen, setSettleAllOpen] = useState(false);
    const [depositOpen, setDepositOpen] = useState(false);

    // Add Bill Form State
    const [newBill, setNewBill] = useState({ description: "", amount: "", category: "other" as PaymentCategory });

    const { data: raw = [], isLoading, isError } = usePaymentsByPatient(patientId);
    const { mutate: createPayment, isPending: isCreatingBill } = useCreatePayment();

    // Payer auto-identified from the patient's registration (HMO / Company / Private).
    const payerHint = useMemo(() => resolvePayerFromPatient(patient as any), [patient]);

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

    const outstandingPayments = useMemo(
        () => payments.filter((p) => p.status === "pending" || p.status === "partial" && p.category !== "deposit"),
        [payments]
    );

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
            <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Payment History</h3>
                    <span className="text-xs text-slate-400">{payments.length} record{payments.length !== 1 ? "s" : ""}</span>
                    <PayerBadge payer={payerHint.type} reference={payerHint.reference || null} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => exportPatientInvoice({ patientId, patient, payments })}
                        disabled={isLoading}
                        title="Download a branded invoice with all paid and pending items"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Printer size={13} /> Export Invoice
                    </button>
                    {!readOnly && (
                        <>
                            <button
                                onClick={() => setDepositOpen(true)}
                                title="Collect an advance deposit — held as credit on the patient's account"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 text-xs font-bold transition-colors">
                                <Wallet size={13} /> Take Deposit
                            </button>
                            {outstandingPayments.length > 0 && (
                                <button
                                    onClick={() => setSettleAllOpen(true)}
                                    title="Settle every outstanding bill for this patient in one go"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm shadow-orange-200 text-xs font-bold transition-colors">
                                    <Layers size={13} /> Settle All ({outstandingPayments.length})
                                </button>
                            )}
                            <button
                                onClick={() => setIsAddBillOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-200 text-xs font-bold transition-colors">
                                <Plus size={13} /> Add Bill
                            </button>
                        </>
                    )}
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

            {/* Editable-billing hint */}
            {!readOnly && sorted.some((p) => p.status === "pending" || p.status === "partial") && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-teal-50/70 border border-teal-100 rounded-xl">
                    <Pencil size={12} className="text-teal-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-teal-800 leading-relaxed">
                        <span className="font-bold">Prices are editable:</span> use <strong>Edit</strong> to correct a bill, or click{" "}
                        <strong>Settle</strong> to review and adjust the final amount before confirming payment.
                    </p>
                </div>
            )}

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
                <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white print:border-none print:shadow-none">
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
                                    canManage={!readOnly}
                                    onEdit={!readOnly ? setEditTarget : undefined}
                                    onSettle={!readOnly
                                        ? (onSettle ? (payment) => onSettle(payment.id) : setSettleTarget)
                                        : undefined}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Settle Bill Modal — full / part / deposit + discount + auto-identified payer */}
            {settleTarget && !readOnly && !onSettle && (
                <SettleBillModal
                    payment={settleTarget}
                    patient={patient as any}
                    payerHint={payerHint}
                    cashierId={cashierId}
                    onClose={() => setSettleTarget(null)}
                />
            )}

            {/* Settle ALL accumulated bills for this patient */}
            {settleAllOpen && !readOnly && (
                <SettleAllBillsModal
                    payments={payments}
                    patientId={patientId}
                    patient={patient as any}
                    payerHint={payerHint}
                    cashierId={cashierId}
                    onClose={() => setSettleAllOpen(false)}
                />
            )}

            {/* Take an advance deposit */}
            {depositOpen && !readOnly && (
                <DepositModal
                    patientId={patientId}
                    patient={patient as any}
                    payerHint={payerHint}
                    cashierId={cashierId}
                    onClose={() => setDepositOpen(false)}
                />
            )}

            {/* Edit Bill Modal — adjust price/description/category while pending */}
            {editTarget && !readOnly && (
                <EditBillModal
                    payment={editTarget}
                    onClose={() => setEditTarget(null)}
                />
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
                                    className="w-full text-sm border border-slate-200 bg-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                                    <select value={newBill.category} onChange={e => setNewBill({...newBill, category: e.target.value as PaymentCategory})}
                                        className="w-full text-sm border border-slate-200 bg-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors">
                                        {(Object.keys(CATEGORY_LABELS) as PaymentCategory[]).map(c => (
                                            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount (NGN)</label>
                                    <input required type="number" min="1" value={newBill.amount} onChange={e => setNewBill({...newBill, amount: e.target.value})}
                                        placeholder="0.00"
                                        className="w-full text-sm border border-slate-200 bg-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors" />
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
