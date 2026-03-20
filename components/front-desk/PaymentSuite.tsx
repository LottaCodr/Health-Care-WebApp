"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPendingPayments, confirmPayment } from "@/lib/supabase-service";
import {
    BadgeDollarSign, CheckCircle2, Clock,
    Loader2, RefreshCcw, AlertTriangle, Receipt,
} from "lucide-react";
import { toast } from "sonner";

export default function PaymentConfirmation() {
    const queryClient = useQueryClient();
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    const { data: payments, isLoading, isError, refetch } = useQuery({
        queryKey: ["pending-payments"],
        queryFn: listPendingPayments,
        refetchInterval: 30_000,
    });

    const { mutate: confirm } = useMutation({
        mutationFn: (paymentId: string) => confirmPayment(paymentId),
        onMutate: (id) => setConfirmingId(id),
        onSuccess: () => {
            toast.success("Payment confirmed successfully.");
            queryClient.invalidateQueries({ queryKey: ["pending-payments"] });
        },
        onError: () => toast.error("Failed to confirm payment."),
        onSettled: () => setConfirmingId(null),
    });

    const handleConfirm = (id: string, amount: number, ref: string) => {
        if (window.confirm(`Confirm payment of ₦${amount.toLocaleString()} for visit #${ref}?`)) {
            confirm(id);
        }
    };

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-center py-16 gap-3">
                <Loader2 size={18} className="text-green-500 animate-spin" />
                <p className="text-sm text-gray-400 font-medium">Loading payments...</p>
            </div>
        );
    }

    // ── Error ──
    if (isError) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-500" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Failed to load payments</p>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors"
                >
                    <RefreshCcw size={13} /> Retry
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            {/* ── Header ── */}
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
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                            {payments.length} pending
                        </span>
                    )}
                    <button
                        onClick={() => refetch()}
                        aria-label="Refresh"
                        className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
                    >
                        <RefreshCcw size={13} />
                    </button>
                </div>
            </div>

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
                <div className="divide-y divide-gray-50">
                    {payments.map((payment: any) => {
                        const isConfirming = confirmingId === payment.id;
                        const shortRef = payment.visit_id?.slice(-6) ?? "—";
                        const amount = Number(payment.amount ?? 0);

                        return (
                            <div
                                key={payment.id}
                                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors"
                            >
                                {/* Icon */}
                                <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                    <Receipt size={15} className="text-gray-400" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800">Visit #{shortRef}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Clock size={10} className="text-gray-300" />
                                        <p className="text-xs text-gray-400 truncate">
                                            {payment.description ?? "Prescription dispensed"}
                                        </p>
                                    </div>
                                    {payment.notes && (
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{payment.notes}</p>
                                    )}
                                </div>

                                {/* Amount + method */}
                                <div className="text-right shrink-0 mr-2">
                                    <p className="text-sm font-extrabold text-gray-900">
                                        ₦{amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-0.5">
                                        {payment.method
                                            ? payment.method.charAt(0).toUpperCase() + payment.method.slice(1)
                                            : "Pending"}
                                    </p>
                                </div>

                                {/* Confirm */}
                                <button
                                    onClick={() => handleConfirm(payment.id, amount, shortRef)}
                                    disabled={isConfirming}
                                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm shadow-green-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isConfirming
                                        ? <><Loader2 size={12} className="animate-spin" /> Confirming...</>
                                        : <><CheckCircle2 size={13} /> Confirm Payment</>
                                    }
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}