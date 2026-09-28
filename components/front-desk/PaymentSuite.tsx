"use client";

import React, { useState, useMemo } from "react";
import {
    BadgeDollarSign, CheckCircle2, Clock,
    Loader2, RefreshCcw, AlertTriangle, Receipt,
    User, Layers, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { usePendingPayments } from "@/hooks/emr/use-payment";
import { useAuth } from "@/context/auth-provider";
import { SettleBillModal, QueueSettleAllModal, PayerBadge } from "@/components/patients/billing-modals";
import { formatKobo, resolvePayerFromPatient, PAYMENT_TYPE_CONFIG } from "@/lib/utils/billing";
import { displayHospitalNumber } from "@/lib/hospital-number";
import { fmtDate, fmtFull } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ─── PaymentList ──────────────────────────────────────────────────────────────

interface PaymentListProps {
    payments: any[];
    onSettle: (payment: any) => void;
}

const PaymentList: React.FC<PaymentListProps> = ({ payments, onSettle }) => {
    return (
        <div className="divide-y divide-gray-50">
            {payments.map((payment: any) => {
                const patientName = payment.patients?.name ?? "Unknown patient";
                const patientPhone = payment.patients?.phone;
                const patientHospitalNumber = payment.patients?.hospital_number;
                const payer = resolvePayerFromPatient(payment.patients ?? null);
                const totalKobo = payment.amount_kobo ?? Math.round(Number(payment.amount ?? 0) * 100);
                const paidKobo = payment.amount_paid_kobo ?? 0;
                const balanceKobo = Math.max(0, totalKobo - paidKobo);
                const paymentType = payment.payment_type;

                // Parse what they're paying for from the description
                const [descLabel, descDetail] = (payment.description ?? "Prescription dispensed").split(": ");

                return (
                    <div key={payment.id} className="px-6 py-5 hover:bg-gray-50/30 transition-colors">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

                            {/* Patient avatar */}
                            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 font-black text-gray-500 text-sm mt-0.5 sm:flex">
                                {patientName?.[0]?.toUpperCase() ?? <User size={16} />}
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1 space-y-3">

                                    {/* Patient name + phone + hospital number */}
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-black text-gray-500 sm:hidden">{patientName?.[0]?.toUpperCase()}</span>
                                            {patientName}
                                            <PayerBadge payer={payer.type} reference={payer.reference || null} />
                                        </p>
                                        {patientPhone && (
                                            <p className="mt-0.5 text-xs text-gray-400">{patientPhone}</p>
                                        )}
                                        <p className="mt-0.5 font-mono text-[10px] text-gray-400">HN: {displayHospitalNumber(patientHospitalNumber)}</p>
                                    </div>
                                    <Badge variant="outline" className="hidden gap-1 rounded-full bg-gray-50 text-gray-600 lg:inline-flex">
                                        <Clock size={10} /> {payment.created_at ? fmtDate(payment.created_at) : "—"}
                                    </Badge>
                                </div>

                                {/* What they're paying for */}
                                <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                                    <Receipt size={12} className="mt-0.5 shrink-0 text-gray-400" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{descLabel}</p>
                                        {descDetail && (
                                            <p className="mt-0.5 truncate text-xs font-medium text-gray-700">{descDetail}</p>
                                        )}
                                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                            <Clock size={9} className="text-gray-300" />
                                            <p className="text-[10px] text-gray-400">
                                                {payment.created_at
                                                    ? fmtFull(payment.created_at)
                                                    : "Just now"}
                                            </p>
                                            {payment.category && (
                                                <>
                                                    <span className="mx-1 text-gray-300">•</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{payment.category}</span>
                                                </>
                                            )}
                                            {paymentType && (
                                                <>
                                                    <span className="mx-1 text-gray-300">•</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                                        {PAYMENT_TYPE_CONFIG[paymentType as keyof typeof PAYMENT_TYPE_CONFIG]?.short ?? paymentType ?? ""}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Amount + settle */}
                            <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[220px] lg:items-end">
                                <div className="w-full lg:text-right">
                                    <div className="mb-1.5 flex items-center justify-between gap-2 lg:justify-end">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            {paidKobo > 0 ? "Balance" : "Amount"}
                                        </p>
                                    </div>
                                    <p className="text-lg font-extrabold text-gray-900 lg:text-right">
                                        {formatKobo(paidKobo > 0 ? balanceKobo : totalKobo)}
                                    </p>
                                    {paidKobo > 0 && (
                                        <p className="mt-0.5 text-[10px] text-gray-400 lg:text-right">
                                            of {formatKobo(totalKobo)} ({PAYMENT_TYPE_CONFIG[(paymentType ?? "partial") as keyof typeof PAYMENT_TYPE_CONFIG]?.short ?? "Part"} paid)
                                        </p>
                                    )}
                                </div>

                                <Button
                                    onClick={() => onSettle(payment)}
                                    className="h-10 w-full gap-1.5 rounded-xl bg-green-600 text-xs font-bold text-white shadow-sm shadow-green-200 hover:bg-green-700 lg:w-auto"
                                >
                                    <CheckCircle2 size={13} /> Settle Bill
                                </Button>
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
    const [settleTarget, setSettleTarget] = useState<any | null>(null);
    const [settleAllOpen, setSettleAllOpen] = useState(false);
    const { data: payments, isLoading, isError, refetch } = usePendingPayments();
    const { user } = useAuth();
    const cashierId = user?.$id ?? user?.id ?? "";

    const totalPending = useMemo(
        () => (payments ?? []).reduce((sum: number, p: any) => {
            const total = p.amount_kobo ?? Math.round(Number(p.amount ?? 0) * 100);
            const paid = p.amount_paid_kobo ?? 0;
            return sum + Math.max(0, total - paid);
        }, 0),
        [payments]
    );

    // ── Loading ─
    if (isLoading) return (
        <Card className="flex items-center justify-center gap-3 rounded-3xl border-gray-100 bg-white py-16 shadow-sm">
            <Loader2 size={18} className="animate-spin text-green-500" />
            <p className="text-sm font-medium text-gray-400">Loading payments...</p>
        </Card>
    );

    // ── Error ──
    if (isError) return (
        <Card className="flex flex-col items-center justify-center gap-4 rounded-3xl border-gray-100 bg-white py-16 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                <AlertTriangle size={20} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Failed to load payments</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}
                className="gap-2 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-200">
                <RefreshCcw size={13} /> Retry
            </Button>
        </Card>
    );

    return (
        <Card className="overflow-hidden rounded-3xl border-gray-100 bg-white shadow-sm">

            {/* ── Header ── */}
            <div className="flex flex-col justify-between gap-3 border-b border-gray-50 px-6 py-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50">
                        <BadgeDollarSign size={18} className="text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold leading-tight text-gray-900">Pending Payments</h3>
                        <p className="mt-0.5 text-xs text-gray-400">Full / part / deposit payments • discounts • auto-identified payer</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {payments && payments.length > 0 && (
                        <>
                            <Badge variant="outline" className="gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                                <BadgeDollarSign size={11} />
                                {formatKobo(totalPending)} total
                            </Badge>
                            <Badge variant="outline" className="rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700">
                                {payments.length} pending
                            </Badge>
                            <Button
                                onClick={() => setSettleAllOpen(true)}
                                title="Settle every pending bill across all patients at once"
                                size="sm"
                                className="gap-1.5 rounded-xl bg-orange-600 text-xs font-bold shadow-sm shadow-orange-200 hover:bg-orange-700"
                            >
                                <Layers size={13} /> Settle All
                            </Button>
                        </>
                    )}
                    <Button
                        onClick={() => refetch()}
                        aria-label="Refresh"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl"
                    >
                        <RefreshCcw size={13} />
                    </Button>
                </div>
            </div>

            {/* Hint banner */}
            {payments && payments.length > 0 && (
                <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
                    <Wallet size={12} className="mt-0.5 shrink-0 text-blue-500" />
                    <p className="text-xs leading-relaxed text-blue-700">
                        <span className="font-bold">Settle a bill</span> to choose{" "}
                        <span className="font-semibold">Full payment</span>,{" "}
                        <span className="font-semibold">Part payment</span>, or{" "}
                        <span className="font-semibold">Deposit (advance)</span>, apply a{" "}
                        <span className="font-semibold">₦ discount</span>, and the payer is{" "}
                        <span className="font-semibold">auto-identified</span> (HMO / Company / Private) from registration.
                    </p>
                </div>
            )}

            {/* ── Empty ─ */}
            {(!payments || payments.length === 0) && (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-green-100 bg-green-50">
                        <CheckCircle2 size={22} className="text-green-500" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-600">All clear</p>
                        <p className="mt-1 text-xs text-gray-400">No pending payments to confirm</p>
                    </div>
                </div>
            )}

            {/* ── Rows ─ */}
            {payments && payments.length > 0 && (
                <PaymentList
                    payments={payments}
                    onSettle={(payment) => setSettleTarget(payment)}
                />
            )}

            {/* ── Settle modal (shared with the patient billing tab) ── */}
            {settleTarget && (
                <SettleBillModal
                    payment={{
                        id: settleTarget.id,
                        patient_id: settleTarget.patient_id,
                        category: settleTarget.category ?? "other",
                        description: settleTarget.description ?? "",
                        amount_kobo: settleTarget.amount_kobo ?? Math.round(Number(settleTarget.amount ?? 0) * 100),
                        amount_paid_kobo: settleTarget.amount_paid_kobo ?? 0,
                        status: settleTarget.status,
                        payment_type: settleTarget.payment_type,
                        payer: settleTarget.payer,
                        payer_reference: settleTarget.payer_reference,
                        payer_code: settleTarget.payer_code,
                        payment_date: settleTarget.paid_at ?? settleTarget.processed_date ?? null,
                        invoice_no: settleTarget.invoice_no
                            ?? (settleTarget.patients?.hospital_number
                                ? `INV-${settleTarget.patients.hospital_number.replace(/[^A-Za-z0-9]/g, "").toUpperCase()}`
                                : String(settleTarget.id ?? "").slice(0, 8).toUpperCase()),
                        collected_by: settleTarget.processed_by ?? null,
                        notes: settleTarget.notes ?? null,
                        created_at: settleTarget.created_at ?? new Date().toISOString(),
                    }}
                    payerHint={resolvePayerFromPatient(settleTarget.patients ?? null)}
                    cashierId={cashierId}
                    onClose={() => setSettleTarget(null)}
                />
            )}

            {/* ── Settle entire queue ── */}
            {settleAllOpen && (
                <QueueSettleAllModal
                    totalBills={payments?.length ?? 0}
                    totalKobo={totalPending}
                    cashierId={cashierId}
                    onClose={() => setSettleAllOpen(false)}
                />
            )}
        </Card>
    );
}
