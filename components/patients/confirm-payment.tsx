"use client";

import React, { useState } from "react";
import {
    BadgeDollarSign, CheckCircle2, Clock,
    Loader2, RefreshCcw, AlertTriangle, Receipt,
    Banknote, CreditCard, ArrowLeftRight, User,
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
    onConfirm: (id: string, amount: number, name: string, method: string) => void;
}

const PaymentList: React.FC<PaymentListProps> = ({
    payments,
    isConfirming,
    methodMap,
    setMethodMap,
    onConfirm,
}) => {
    return (
        <div className="divide-y divide-gray-50">
            {payments.map((payment: any) => {
                const confirming = isConfirming === payment.id;
                const amount = Number(payment.amount ?? 0);
                const patientName = payment.patients?.name ?? "Unknown patient";
                const patientPhone = payment.patients?.phone;
                const selectedMethod = methodMap[payment.id] ?? payment.method ?? "cash";
                const methodCfg = METHOD_CONFIG[selectedMethod as keyof typeof METHOD_CONFIG] ?? METHOD_CONFIG.cash;
                const MethodIcon = methodCfg.icon;

                const [descLabel, descDetail] = (payment.description ?? "Prescription dispensed").split(": ");

                return (
                    <div key={payment.id} className="px-6 py-5 hover:bg-gray-50/30 transition-colors">
                        <div className="flex items-start gap-4">

                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 font-black text-gray-500 text-sm mt-0.5">
                                {patientName?.[0]?.toUpperCase() ?? <User size={16} />}
                            </div>

                            <div className="flex-1 min-w-0 space-y-3">

                                <div>
                                    <p className="text-sm font-bold text-gray-900">{patientName}</p>
                                    {patientPhone && (
                                        <p className="text-xs text-gray-400 mt-0.5">{patientPhone}</p>
                                    )}
                                </div>

                                <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                    <Receipt size={12} className="text-gray-400 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{descLabel}</p>
                                        {descDetail && (
                                            <p className="text-xs font-medium text-gray-700 truncate mt-0.5">{descDetail}</p>
                                        )}
                                        <div className="flex items-center gap-1 mt-1">
                                            <Clock size={9} className="text-gray-300" />
                                            <p className="text-[10px] text-gray-400">
                                                {payment.created_at
                                                    ? new Date(payment.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                                    : "Just now"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

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

                            <div className="flex flex-col items-end gap-3 shrink-0">
                                <div className="text-right">
                                    <p className="text-lg font-extrabold text-gray-900">
                                        ₦{amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                    </p>
                                    <div className={`flex items-center justify-end gap-1 mt-0.5 ${methodCfg.color}`}>
                                        <MethodIcon size={10} />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">
                                            {methodCfg.label}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onConfirm(payment.id, amount, patientName, selectedMethod)}
                                    disabled={confirming}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm shadow-green-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {confirming
                                        ? <><Loader2 size={12} className="animate-spin" /> Confirming...</>
                                        : <><CheckCircle2 size={13} /> Confirm Payment</>
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
    const { data: payments, isLoading, isError, refetch } = usePendingPayments();
    const { mutate: confirm, isPending } = useConfirmPayment();
    const { user } = useAuth();
    const cashierId = user?.$id ?? user?.id ?? "";

    // FIXED: the selected method is now actually passed through to the
    // server and persisted — previously the method picker was decorative
    // because only the payment id was ever sent.
    const handleConfirm = (id: string, amount: number, name: string, method: string) => {
        if (isPending) return;
        if (!window.confirm(`Confirm ₦${amount.toLocaleString()} payment from ${name} via ${method}?`)) {
            return;
        }
        setConfirmingId(id);

        confirm(
            { id, method, cashierId },
            {
                onSuccess: () => {
                    toast.success("Payment confirmed by cashier.");
                    refetch();
                },
                onError: () => toast.error("Failed to confirm payment."),
                onSettled: () => setConfirmingId(null),
            }
        );
    };

    if (isLoading) return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-center py-16 gap-3">
            <Loader2 size={18} className="text-green-500 animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading payments...</p>
        </div>
    );

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

    const totalPending = payments?.reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0) ?? 0;

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <BadgeDollarSign size={18} className="text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">Pending Payments</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Awaiting front-desk confirmation</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {payments && payments.length > 0 && (
                        <>
                            <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                                <BadgeDollarSign size={11} />
                                ₦{totalPending.toLocaleString("en-NG", { minimumFractionDigits: 2 })} total
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

            {payments && payments.length > 0 && (
                <PaymentList
                    payments={payments}
                    isConfirming={confirmingId}
                    methodMap={methodMap}
                    setMethodMap={setMethodMap}
                    onConfirm={handleConfirm}
                />
            )}
        </div>
    );
}
