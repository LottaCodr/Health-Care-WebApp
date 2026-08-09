"use client";

import React, { useState, useEffect } from "react";
import {
    BadgeDollarSign, CheckCircle2, Clock,
    Loader2, RefreshCcw, AlertTriangle, Receipt,
    Banknote, CreditCard, ArrowLeftRight, User,
    Pencil, DollarSign, Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmPayment, usePendingPayments } from "@/hooks/emr/use-payment";
import { useAuth } from "@/context/auth-provider";

// ─── Method config ────────────────────────────────────────────────────────────

const METHOD_CONFIG = {
    cash: { label: "Cash", icon: Banknote, color: "text-green-600", bg: "bg-green-50", border: "border-green-300" },
    card: { label: "Card", icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-300" },
    transfer: { label: "Transfer", icon: ArrowLeftRight, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-300" },
} as const;

// ─── PaymentList ──────────────────────────────────────────────────────────────

interface PaymentListProps {
    payments: any[];
    isConfirming: string | null;
    methodMap: Record<string, string>;
    setMethodMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    amountMap: Record<string, string>;
    setAmountMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    onConfirm: (id: string, amount: number, name: string) => void;
}

const PaymentList: React.FC<PaymentListProps> = ({
    payments,
    isConfirming,
    methodMap,
    setMethodMap,
    amountMap,
    setAmountMap,
    onConfirm,
}) => {
    return (
        <div className="divide-y divide-gray-50">
            {payments.map((payment: any) => {
                const confirming = isConfirming === payment.id;
                const originalAmount = Number(payment.amount ?? 0);
                const editedValue = amountMap[payment.id];
                const displayAmount = editedValue !== undefined ? Number(editedValue || 0) : originalAmount;
                const isEdited = editedValue !== undefined && Number(editedValue) !== originalAmount;
                const patientName = payment.patients?.name ?? `Patient #${payment.patient_id?.slice(-6) ?? "—"}`;
                const patientPhone = payment.patients?.phone;
                const selectedMethod = methodMap[payment.id] ?? payment.method ?? "cash";
                const methodCfg = METHOD_CONFIG[selectedMethod as keyof typeof METHOD_CONFIG] ?? METHOD_CONFIG.cash;
                const MethodIcon = methodCfg.icon;

                // Parse what they're paying for from the description
                const [descLabel, descDetail] = (payment.description ?? "Prescription dispensed").split(": ");

                return (
                    <div key={payment.id} className="px-6 py-5 hover:bg-gray-50/30 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">

                            {/* Patient avatar */}
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 font-black text-gray-500 text-sm mt-0.5 hidden sm:flex">
                                {patientName?.[0]?.toUpperCase() ?? <User size={16} />}
                            </div>

                            {/* Info + method picker */}
                            <div className="flex-1 min-w-0 space-y-3">

                                {/* Patient name + phone + ID */}
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <span className="sm:hidden w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500">{patientName?.[0]?.toUpperCase()}</span>
                                            {patientName}
                                        </p>
                                        {patientPhone && (
                                            <p className="text-xs text-gray-400 mt-0.5">{patientPhone}</p>
                                        )}
                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {payment.patient_id?.slice(-8) ?? payment.id.slice(-6)}</p>
                                    </div>
                                    <span className="lg:hidden inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                                        <Clock size={10} /> {payment.created_at ? new Date(payment.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                                    </span>
                                </div>

                                {/* What they're paying for */}
                                <div className="flex items-start gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                    <Receipt size={12} className="text-gray-400 shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{descLabel}</p>
                                        {descDetail && (
                                            <p className="text-xs font-medium text-gray-700 truncate mt-0.5">{descDetail}</p>
                                        )}
                                        <div className="flex items-center gap-1 mt-1.5">
                                            <Clock size={9} className="text-gray-300" />
                                            <p className="text-[10px] text-gray-400">
                                                {payment.created_at
                                                    ? new Date(payment.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                                    : "Just now"}
                                            </p>
                                            {payment.category && (
                                                <>
                                                    <span className="text-gray-300 mx-1">•</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{payment.category}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Method selector */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                        Method:
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        {Object.entries(METHOD_CONFIG).map(([key, cfg]) => {
                                            const Icon = cfg.icon;
                                            const isActive = selectedMethod === key;
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setMethodMap((p) => ({ ...p, [payment.id]: key }))}
                                                    disabled={confirming}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all
                                                        ${isActive
                                                            ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                                                            : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"
                                                        }`}
                                                >
                                                    <Icon size={11} /> {cfg.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Amount + confirm - now with editable price */}
                            <div className="flex flex-col gap-3 shrink-0 w-full lg:w-[220px] lg:items-end">
                                {/* Editable amount */}
                                <div className="w-full lg:text-right">
                                    <div className="flex items-center gap-2 lg:justify-end mb-1.5">
                                        <Edit3 size={11} className="text-gray-400" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            Amount (Editable)
                                        </p>
                                        {isEdited && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Edited</span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₦</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={editedValue !== undefined ? editedValue : String(originalAmount)}
                                            onChange={(e) => setAmountMap((prev) => ({ ...prev, [payment.id]: e.target.value }))}
                                            disabled={confirming}
                                            className={`w-full lg:w-[180px] h-11 pl-7 pr-3 rounded-xl border bg-white text-lg font-extrabold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400/20 focus:border-green-400 transition-all
                                                ${isEdited ? "border-amber-300 bg-amber-50/30" : "border-gray-200"}`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {originalAmount === 0 && !isEdited && (
                                        <p className="text-[10px] text-amber-600 font-medium mt-1 lg:text-right">⚠️ Price not set — please input price</p>
                                    )}
                                    {isEdited && (
                                        <p className="text-[10px] text-gray-400 mt-1 lg:text-right">
                                            Original: ₦{originalAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                        </p>
                                    )}
                                    <div className={`hidden lg:flex items-center justify-end gap-1 mt-1.5 ${methodCfg.color}`}>
                                        <MethodIcon size={10} />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">
                                            {methodCfg.label}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onConfirm(payment.id, displayAmount, patientName)}
                                    disabled={confirming || displayAmount < 0 || Number.isNaN(displayAmount)}
                                    className="flex items-center justify-center gap-1.5 w-full lg:w-auto px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm shadow-green-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {confirming
                                        ? <><Loader2 size={12} className="animate-spin" /> Confirming...</>
                                        : <><CheckCircle2 size={13} /> Confirm ₦{displayAmount.toLocaleString("en-NG", { minimumFractionDigits: 0 })} Payment</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Main PaymentConfirmation Component ──────────────────────────────────────

export default function PaymentConfirmation() {
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [methodMap, setMethodMap] = useState<Record<string, string>>({});
    const [amountMap, setAmountMap] = useState<Record<string, string>>({});
    const { data: payments, isLoading, isError, refetch } = usePendingPayments();
    const { mutate: confirm, isPending } = useConfirmPayment();
    const { user } = useAuth();
    const cashierId = user?.$id ?? user?.id ?? "";

    // Sync amountMap when payments load
    useEffect(() => {
        if (payments && payments.length > 0) {
            setAmountMap((prev) => {
                const next: Record<string, string> = { ...prev };
                payments.forEach((p: any) => {
                    if (next[p.id] === undefined) {
                        next[p.id] = String(Number(p.amount ?? 0));
                    }
                });
                // Remove stale ids
                Object.keys(next).forEach((k) => {
                    if (!payments.some((p: any) => p.id === k)) delete next[k];
                });
                return next;
            });
        }
    }, [payments]);

    const handleConfirm = (id: string, amount: number, name: string) => {
        if (isPending) return;
        if (amount < 0 || Number.isNaN(amount)) {
            toast.error("Please enter a valid amount.");
            return;
        }
        if (amount === 0) {
            if (!window.confirm(`Confirm ₦0 payment for ${name}? This will mark as paid with no charge. Continue?`)) return;
        }
        const method = methodMap[id] ?? "cash";
        const formatted = amount.toLocaleString("en-NG", { minimumFractionDigits: 2 });
        if (!window.confirm(`Confirm ₦${formatted} payment from ${name} via ${method}?`)) {
            return;
        }
        setConfirmingId(id);

        confirm(
            { id, method: method as "cash" | "card" | "transfer", cashierId, amountPaid: amount },
            {
                onSuccess: () => {
                    toast.success("Payment confirmed by cashier.");
                    refetch();
                },
                onError: (err: any) =>
                    toast.error(err?.message ?? "Failed to confirm payment."),
                onSettled: () => setConfirmingId(null),
            }
        );
    };

    // ── Loading ──
    if (isLoading) return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-center py-16 gap-3">
            <Loader2 size={18} className="text-green-500 animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading payments...</p>
        </div>
    );

    // ── Error ──
    if (isError) return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Failed to load payments</p>
            <button onClick={() => refetch()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">
                <RefreshCcw size={13} /> Retry
            </button>
        </div>
    );

    const totalPending = payments?.reduce((sum: number, p: any) => {
        const edited = amountMap[p.id];
        const val = edited !== undefined ? Number(edited || 0) : Number(p.amount ?? 0);
        return sum + (Number.isFinite(val) ? val : 0);
    }, 0) ?? 0;

    const hasEdited = payments?.some((p: any) => {
        const edited = amountMap[p.id];
        return edited !== undefined && Number(edited) !== Number(p.amount ?? 0);
    });

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <BadgeDollarSign size={18} className="text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">Pending Payments</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Awaiting front-desk confirmation • edit price before confirming</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {payments && payments.length > 0 && (
                        <>
                            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                                <BadgeDollarSign size={11} />
                                ₦{totalPending.toLocaleString("en-NG", { minimumFractionDigits: 2 })} total
                                {hasEdited && <span className="ml-1 text-[9px] bg-green-200 px-1.5 py-0.5 rounded-full">Edited</span>}
                            </span>
                            <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                {payments.length} pending
                            </span>
                        </>
                    )}
                    <button onClick={() => refetch()} aria-label="Refresh"
                        className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors">
                        <RefreshCcw size={13} />
                    </button>
                </div>
            </div>

            {/* Hint banner */}
            {payments && payments.length > 0 && (
                <div className="mx-6 mt-4 flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                    <Pencil size={12} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                        <span className="font-bold">Price editable:</span> Adjust the amount for each payment before confirming. Enter <span className="font-mono">0</span> for waived/complimentary services. Edited prices are saved on confirmation.
                    </p>
                </div>
            )}

            {/* ── Empty ── */}
            {(!payments || payments.length === 0) && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                        <CheckCircle2 size={22} className="text-green-500" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-600">All clear</p>
                        <p className="text-xs text-gray-400 mt-1">No pending payments to confirm</p>
                    </div>
                </div>
            )}

            {/* ── Rows ── */}
            {payments && payments.length > 0 && (
                <PaymentList
                    payments={payments}
                    isConfirming={confirmingId}
                    methodMap={methodMap}
                    setMethodMap={setMethodMap}
                    amountMap={amountMap}
                    setAmountMap={setAmountMap}
                    onConfirm={handleConfirm}
                />
            )}
        </div>
    );
}
