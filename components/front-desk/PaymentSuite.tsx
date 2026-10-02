"use client";

import React, { useState, useMemo } from "react";
import {
    BadgeDollarSign, CheckCircle2, Clock,
    Loader2, RefreshCcw, AlertTriangle, Receipt,
    User, Layers, Wallet, ClipboardCheck, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { useDischargeFromFrontDesk, useFrontDeskQueuePatients, usePendingPayments } from "@/hooks/emr/use-payment";
import { useAuth } from "@/context/auth-provider";
import { SettleBillModal, QueueSettleAllModal, PayerBadge } from "@/components/patients/billing-modals";
import { formatKobo, resolvePayerFromPatient, PAYMENT_TYPE_CONFIG } from "@/lib/utils/billing";
import { displayHospitalNumber } from "@/lib/hospital-number";
import { fmtDate, fmtFull } from "@/lib/utils";

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
                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">

                            {/* Patient avatar */}
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 font-black text-gray-500 text-sm mt-0.5 hidden sm:flex">
                                {patientName?.[0]?.toUpperCase() ?? <User size={16} />}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-3">

                                    {/* Patient name + phone + hospital number */}
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                                            <span className="sm:hidden w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500">{patientName?.[0]?.toUpperCase()}</span>
                                            {patientName}
                                            <PayerBadge payer={payer.type} reference={payer.reference || null} />
                                        </p>
                                        {patientPhone && (
                                            <p className="text-xs text-gray-400 mt-0.5">{patientPhone}</p>
                                        )}
                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">HN: {displayHospitalNumber(patientHospitalNumber)}</p>
                                    </div>
                                    <span className="lg:hidden inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                                        <Clock size={10} /> {payment.created_at ? fmtDate(payment.created_at) : "—"}
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
                                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                            <Clock size={9} className="text-gray-300" />
                                            <p className="text-[10px] text-gray-400">
                                                {payment.created_at
                                                    ? fmtFull(payment.created_at)
                                                    : "Just now"}
                                            </p>
                                            {payment.category && (
                                                <>
                                                    <span className="text-gray-300 mx-1">•</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{payment.category}</span>
                                                </>
                                            )}
                                            {paymentType && (
                                                <>
                                                    <span className="text-gray-300 mx-1">•</span>
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
                            <div className="flex flex-col gap-3 shrink-0 w-full lg:w-[220px] lg:items-end">
                                <div className="w-full lg:text-right">
                                    <div className="flex items-center justify-between gap-2 lg:justify-end mb-1.5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            {paidKobo > 0 ? "Balance" : "Amount"}
                                        </p>
                                    </div>
                                    <p className="text-lg font-extrabold text-gray-900 lg:text-right">
                                        {formatKobo(paidKobo > 0 ? balanceKobo : totalKobo)}
                                    </p>
                                    {paidKobo > 0 && (
                                        <p className="text-[10px] text-gray-400 mt-0.5 lg:text-right">
                                            of {formatKobo(totalKobo)} ({PAYMENT_TYPE_CONFIG[(paymentType ?? "partial") as keyof typeof PAYMENT_TYPE_CONFIG]?.short ?? "Part"} paid)
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={() => onSettle(payment)}
                                    className="flex items-center justify-center gap-1.5 w-full lg:w-auto px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm shadow-green-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    <CheckCircle2 size={13} /> Settle Bill
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

function FrontDeskCloseoutQueue() {
    const { data: patients, isLoading, isError, isFetching, refetch } = useFrontDeskQueuePatients();
    const discharge = useDischargeFromFrontDesk();
    const [dischargingPatientId, setDischargingPatientId] = useState<string | null>(null);

    const handleDischarge = async (patient: NonNullable<typeof patients>[number]) => {
        if (dischargingPatientId) return;
        setDischargingPatientId(patient.id);
        try {
            const result = await discharge.mutateAsync(patient.id);
            toast.success(result.noPaymentDue
                ? `${patient.name}: No payment due recorded; encounter discharged.`
                : `${patient.name}: encounter discharged.`);
        } catch (error: any) {
            toast.error(error?.message ?? "Discharge could not be completed. Refresh the queue and try again.", { duration: 8000 });
        } finally {
            setDischargingPatientId(null);
        }
    };

    return (
        <section className="border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 bg-slate-50/60">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <ClipboardCheck size={17} className="text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Front Desk encounter closeout</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Coordinate service tasks and discharge only when all work and billing are clear.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => void refetch()}
                    disabled={isFetching}
                    aria-label="Refresh Front Desk closeout queue"
                    className="self-start sm:self-auto w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-60"
                >
                    <RefreshCcw size={13} className={isFetching ? "animate-spin" : ""} />
                </button>
            </div>

            {isLoading ? (
                <div className="px-6 py-8 flex items-center justify-center gap-2 text-sm text-gray-400">
                    <Loader2 size={15} className="animate-spin" /> Loading Front Desk patients…
                </div>
            ) : isError ? (
                <div className="px-6 py-5 flex items-start gap-2 text-sm text-red-700 bg-red-50">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>Could not load the encounter queue. No patient can be discharged until billing and pending clinical work are verified.</span>
                </div>
            ) : !patients?.length ? (
                <div className="px-6 py-8 text-center">
                    <p className="text-sm font-semibold text-gray-600">No patients awaiting Front Desk closeout</p>
                    <p className="text-xs text-gray-400 mt-1">Completed consultations will appear here, including visits with no bill due.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50">
                    {patients.map(patient => {
                        const pendingWork = [
                            patient.work.radiology ? `${patient.work.radiology} Radiology` : "",
                            patient.work.lab ? `${patient.work.lab} Lab` : "",
                            patient.work.pharmacy ? `${patient.work.pharmacy} Pharmacy` : "",
                            patient.work.nursing ? `${patient.work.nursing} Nursing` : "",
                            patient.work.other ? `${patient.work.other} Other` : "",
                        ].filter(Boolean);
                        const readyToClose = patient.work.total === 0 && patient.billing.openBillCount === 0;
                        const isDischarging = dischargingPatientId === patient.id;

                        return (
                            <div key={patient.id} className="px-6 py-5 flex flex-col xl:flex-row xl:items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 font-black text-blue-600 text-sm">
                                    {patient.name?.[0]?.toUpperCase() ?? <User size={15} />}
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <p className="text-sm font-bold text-gray-900">{patient.name}</p>
                                        <span className="text-[10px] text-gray-400 font-mono">HN: {displayHospitalNumber(patient.hospital_number)}</span>
                                        <span className="text-[10px] rounded-full px-2 py-0.5 border bg-blue-50 text-blue-700 border-blue-100 font-bold">Awaiting Front Desk</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {pendingWork.length > 0 ? (
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1">
                                                <Activity size={10} /> Pending: {pendingWork.join(" · ")}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">
                                                <CheckCircle2 size={10} /> {patient.work.deferredLabResults > 0 ? "Discharge blockers complete" : "Clinical work complete"}
                                            </span>
                                        )}
                                        {patient.work.deferredLabResults > 0 && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-800">
                                                {patient.work.deferredLabResults} delayed Lab result{patient.work.deferredLabResults === 1 ? "" : "s"} tracked for follow-up
                                            </span>
                                        )}
                                        {patient.billing.openBillCount > 0 ? (
                                            <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                                                {patient.billing.openBillCount} open bill{patient.billing.openBillCount === 1 ? "" : "s"} · {patient.billing.outstandingKobo > 0 ? `${formatKobo(patient.billing.outstandingKobo)} due` : "review required"}
                                            </span>
                                        ) : patient.billing.hasBills ? (
                                            <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">Bills settled / confirmed</span>
                                        ) : (
                                            <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">No open bill — confirm no payment due</span>
                                        )}
                                    </div>
                                </div>
                                <div className="xl:w-60 shrink-0">
                                    {readyToClose ? (
                                        <button
                                            type="button"
                                            onClick={() => void handleDischarge(patient)}
                                            disabled={!!dischargingPatientId}
                                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-60"
                                        >
                                            {isDischarging ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                            {patient.billing.hasBills ? "Complete discharge" : "Mark No Payment Due & Discharge"}
                                        </button>
                                    ) : (
                                        <p className="text-[10px] text-gray-500 xl:text-right">
                                            {patient.billing.openBillCount > 0
                                                ? "Settle or confirm the payer above before discharge."
                                                : "Complete blocking clinical/service tasks before discharge."}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                <p className="text-[10px] text-slate-600 leading-relaxed">
                    A prepaid or otherwise covered visit is closed as <span className="font-bold">No payment due</span> in the discharge audit trail. No zero-value invoice is created. Any open bill (including an unpriced ₦0 bill) must be resolved separately.
                </p>
            </div>
        </section>
    );
}

// ─── Main PaymentConfirmation Component ──────────────────────────────────────

export default function PaymentConfirmation() {
    const [settleTarget, setSettleTarget] = useState<any | null>(null);
    const [settleAllOpen, setSettleAllOpen] = useState(false);
    const { data: payments, isLoading, isError, isFetching, refetch } = usePendingPayments();
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

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <BadgeDollarSign size={18} className="text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">Open Bills</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Settle or confirm the payer; zero-value open bills still need review</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {payments && payments.length > 0 && (
                        <>
                            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                                <BadgeDollarSign size={11} />
                                {formatKobo(totalPending)} total
                            </span>
                            <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                {payments.length} open bills
                            </span>
                            <button
                                onClick={() => setSettleAllOpen(true)}
                                title="Settle every pending bill across all patients at once"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm shadow-orange-200 transition-colors">
                                <Layers size={13} /> Settle All
                            </button>
                        </>
                    )}
                    <button onClick={() => refetch()} aria-label="Refresh pending payments"
                        disabled={isFetching}
                        className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-60">
                        <RefreshCcw size={13} className={isFetching ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Hint banner */}
            {payments && payments.length > 0 && (
                <div className="mx-6 mt-4 flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                    <Wallet size={12} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                        <span className="font-bold">Settle a bill</span> to choose{" "}
                        <span className="font-semibold">Full payment</span>,{" "}
                        <span className="font-semibold">Part payment</span>, or{" "}
                        <span className="font-semibold">Deposit (advance)</span>, apply a{" "}
                        <span className="font-semibold">₦ discount</span>, and the payer is{" "}
                        <span className="font-semibold">auto-identified</span> (HMO / Company / Private) from registration.
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
                        <p className="text-sm font-semibold text-gray-600">No open bills</p>
                        <p className="text-xs text-gray-400 mt-1">No bill needs settlement; Front Desk encounters are listed below for service coordination and discharge.</p>
                    </div>
                </div>
            )}

            {/* ── Rows ── */}
            {payments && payments.length > 0 && (
                <PaymentList
                    payments={payments}
                    onSettle={(payment) => setSettleTarget(payment)}
                />
            )}

            <FrontDeskCloseoutQueue />

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
        </div>
    );
}
