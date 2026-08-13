"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    X, Loader2, CheckCircle2, Receipt, AlertTriangle, Banknote, CreditCard,
    ArrowLeftRight, Percent, Wallet, Layers, ShieldCheck, BadgePercent,
} from "lucide-react";
import { toast } from "sonner";
import {
    useConfirmPayment,
    useRecordDeposit,
    useSettleAllPatientBills,
    useSettleAllPendingBills,
    usePatientDepositCredit,
} from "@/hooks/emr/use-payment";
import {
    computeDiscountKobo,
    formatKobo,
    resolvePayerFromPatient,
    PAYMENT_TYPE_CONFIG,
    PAYER_CONFIG,
    type PaymentType,
    type PayerType,
    type ResolvedPayer,
} from "@/lib/utils/billing";
import type { Payment } from "@/components/patients/payment-history";

// ─── Small shared pieces ──────────────────────────────────────────────────────

export function PayerBadge({ payer, reference, className = "" }: {
    payer: PayerType | null | undefined;
    reference?: string | null;
    className?: string;
}) {
    const type: PayerType = payer ?? "private";
    const cfg = PAYER_CONFIG[type];
    const styles: Record<PayerType, string> = {
        private: "bg-emerald-50 text-emerald-700 border-emerald-200",
        hmo: "bg-indigo-50 text-indigo-700 border-indigo-200",
        company: "bg-sky-50 text-sky-700 border-sky-200",
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${styles[type]} ${className}`}>
            <ShieldCheck size={10} />
            {cfg.label}
            {reference && type !== "private" && (
                <span className="font-semibold opacity-80">· {reference}</span>
            )}
        </span>
    );
}

function PaymentTypeChips({ value, onChange, disabled }: {
    value: PaymentType;
    onChange: (t: PaymentType) => void;
    disabled?: boolean;
}) {
    return (
        <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PAYMENT_TYPE_CONFIG) as PaymentType[]).map((type) => {
                const cfg = PAYMENT_TYPE_CONFIG[type];
                const active = value === type;
                return (
                    <button
                        key={type}
                        type="button"
                        onClick={() => onChange(type)}
                        disabled={disabled}
                        className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-2xl border text-left transition-all ${
                            active
                                ? "border-teal-300 bg-teal-50 text-teal-800 shadow-sm"
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        }`}
                    >
                        <span className="text-xs font-bold">{cfg.label}</span>
                        <span className={`text-[9px] leading-snug ${active ? "text-teal-600" : "text-slate-400"}`}>
                            {cfg.short === "Deposit" ? "Advance credit" : cfg.short}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

const METHOD_OPTIONS: { key: string; label: string; icon: React.ElementType }[] = [
    { key: "cash", label: "Cash", icon: Banknote },
    { key: "card", label: "Card", icon: CreditCard },
    { key: "transfer", label: "Transfer", icon: ArrowLeftRight },
];

function MethodPicker({ value, onChange, disabled }: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}) {
    return (
        <div className="grid grid-cols-3 gap-2">
            {METHOD_OPTIONS.map(({ key, label, icon: Icon }) => {
                const active = value === key;
                return (
                    <button key={key} type="button" onClick={() => onChange(key)} disabled={disabled}
                        className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                            active ? "bg-teal-50 text-teal-700 border-teal-300" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                        }`}>
                        <Icon size={16} /> {label}
                    </button>
                );
            })}
        </div>
    );
}

function useEscape(onClose: () => void, disabled: boolean) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !disabled) onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [disabled, onClose]);
}

function ModalShell({ title, subtitle, icon, onClose, disabled, children, wide }: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    onClose: () => void;
    disabled?: boolean;
    wide?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:hidden" role="presentation">
            <div role="dialog" aria-modal="true"
                className={`bg-white rounded-3xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                            {icon ?? <CheckCircle2 size={16} className="text-teal-600" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                            {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} disabled={disabled} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return (
        <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{children}</label>
            {hint && <span className="text-[9px] text-slate-300 font-semibold normal-case">{hint}</span>}
        </div>
    );
}

function NairaInput({ value, onChange, disabled, placeholder = "0.00", autoFocus }: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    placeholder?: string;
    autoFocus?: boolean;
}) {
    return (
        <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">₦</span>
            <input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                autoFocus={autoFocus}
                placeholder={placeholder}
                className="w-full h-11 pl-8 pr-3 rounded-xl border border-slate-200 bg-white text-base font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400 transition-all disabled:bg-slate-50"
            />
        </div>
    );
}

// ─── Settle a single bill (full / part / deposit + discount + payer) ──────────

export interface SettleBillModalProps {
    payment: Payment;
    /** Full patient row (payer flags) — used to auto-identify HMO/Company/Private. */
    patient?: Record<string, any> | null;
    /** Pre-resolved payer (e.g. from the joined row in the checkout queue). */
    payerHint?: ResolvedPayer | null;
    /** Optional price correction made on the queue row before opening. */
    initialTotal?: number;
    cashierId: string;
    onClose: () => void;
}

export function SettleBillModal({ payment, patient, payerHint, initialTotal, cashierId, onClose }: SettleBillModalProps) {
    const { mutate: confirmPayment, isPending } = useConfirmPayment();
    const { data: credit } = usePatientDepositCredit(payment.patient_id ?? "");

    const resolvedPayer = useMemo<ResolvedPayer>(
        () => payerHint ?? resolvePayerFromPatient(patient ?? null),
        [payerHint, patient]
    );

    const originalTotalNaira = payment.amount_kobo / 100;
    const [billTotal, setBillTotal] = useState<string>(
        String(initialTotal ?? originalTotalNaira)
    );
    const [paymentType, setPaymentType] = useState<PaymentType>("full");
    const [collectAmount, setCollectAmount] = useState<string>("");
    const [discountPercent, setDiscountPercent] = useState<string>("");
    const [discountAmount, setDiscountAmount] = useState<string>("");
    const [payerType, setPayerType] = useState<PayerType>(resolvedPayer.type);
    const [payerCode, setPayerCode] = useState<string>("");
    const [useCredit, setUseCredit] = useState<boolean>(false);
    const [method, setMethod] = useState<string>(resolvedPayer.type === "private" ? "cash" : resolvedPayer.type);

    useEscape(onClose, isPending);

    const totalKobo = Math.max(0, Math.round((Number(billTotal) || 0) * 100));
    const paidKobo = payment.amount_paid_kobo;
    const discount = computeDiscountKobo({
        totalKobo,
        paidKobo,
        discountPercent: Number(discountPercent) || 0,
        discountAmount: Number(discountAmount) || 0,
    });
    const effectiveTotalKobo = Math.max(paidKobo, totalKobo - discount.discountKobo);
    const remainingKobo = Math.max(0, effectiveTotalKobo - paidKobo);
    const creditAvailableKobo = credit?.availableKobo ?? 0;
    const creditUsedKobo = useCredit ? Math.min(creditAvailableKobo, remainingKobo) : 0;

    const collectNum = Number(collectAmount) || 0;
    let collectedKobo = 0;
    if (paymentType === "full") collectedKobo = Math.max(0, remainingKobo - creditUsedKobo);
    if (paymentType === "partial") collectedKobo = Math.min(Math.max(0, remainingKobo - creditUsedKobo), Math.round(collectNum * 100));
    if (paymentType === "deposit") collectedKobo = Math.max(0, Math.round(collectNum * 100));

    const valid =
        billTotal.trim() !== "" && Number(billTotal) >= 0 &&
        (paymentType === "full" ||
            (paymentType === "partial" && collectedKobo > 0) ||
            (paymentType === "deposit" && collectedKobo > 0));

    const isHmoCompany = payerType === "hmo" || payerType === "company";
    // Method is fixed to the payer for HMO/Company; private clients pick cash/card/transfer.
    const autoPayerChanged = payerType !== resolvedPayer.type;

    function handleConfirm() {
        if (!valid || isPending) return;
        confirmPayment(
            {
                id: payment.id,
                paymentType,
                amountPaid: paymentType === "full" ? undefined : collectedKobo / 100,
                correctedAmount: Math.round(Number(billTotal) * 100) !== payment.amount_kobo
                    ? Number(billTotal)
                    : undefined,
                discountPercent: Number(discountPercent) > 0 ? Number(discountPercent) : undefined,
                discountAmount: Number(discountAmount) > 0 ? Number(discountAmount) : undefined,
                method,
                payer: payerType,
                payerReference: isHmoCompany ? resolvedPayer.reference || undefined : undefined,
                payerCode: isHmoCompany && payerCode.trim() ? payerCode.trim() : undefined,
                useDepositCredit: useCredit || undefined,
                cashierId,
            },
            {
                onSuccess: (updated) => {
                    if (paymentType === "deposit") {
                        toast.success(`Deposit of ${formatKobo(collectedKobo)} recorded as patient credit.`);
                    } else if (updated.status === "paid") {
                        toast.success(`Payment confirmed (${PAYER_CONFIG[payerType].label}).`);
                    } else {
                        toast.success(`Part payment of ${formatKobo(collectedKobo)} recorded — balance remains.`);
                    }
                    onClose();
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to settle payment."),
            }
        );
    }

    return (
        <ModalShell title="Settle Bill" subtitle={`${payment.invoice_no} · ${payment.description}`}
            icon={<Receipt size={15} className="text-teal-600" />} onClose={onClose} disabled={isPending}>
            <div className="space-y-4">
                {/* Bill total (price correction) */}
                <div className="space-y-1.5">
                    <FieldLabel hint="price correction allowed">Bill total (editable)</FieldLabel>
                    <NairaInput value={billTotal} onChange={setBillTotal} disabled={isPending} />
                </div>

                {/* Payment type */}
                <div className="space-y-1.5">
                    <FieldLabel>Payment type</FieldLabel>
                    <PaymentTypeChips value={paymentType} onChange={setPaymentType} disabled={isPending} />
                    <p className="text-[10px] text-slate-400 leading-snug">
                        {PAYMENT_TYPE_CONFIG[paymentType].desc}
                    </p>
                </div>

                {/* Amount for partial / deposit */}
                {paymentType !== "full" && (
                    <div className="space-y-1.5">
                        <FieldLabel>
                            {paymentType === "partial" ? "Amount to collect now" : "Deposit amount"}
                        </FieldLabel>
                        <NairaInput value={collectAmount} onChange={setCollectAmount} disabled={isPending} autoFocus />
                        {paymentType === "deposit" && (
                            <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-snug">
                                <AlertTriangle size={10} className="inline mr-1" />
                                Held as credit: it pays this bill first, and any remainder stays on the patient&apos;s
                                account for future bills.
                            </p>
                        )}
                    </div>
                )}

                {/* Discount */}
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-2">
                        <BadgePercent size={13} className="text-teal-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discount</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <FieldLabel>By percentage (%)</FieldLabel>
                            <div className="relative">
                                <input type="number" min="0" max="100" step="0.1" value={discountPercent}
                                    onChange={(e) => setDiscountPercent(e.target.value)} disabled={isPending}
                                    placeholder="e.g. 10"
                                    className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400" />
                                <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <FieldLabel>By amount (₦)</FieldLabel>
                            <NairaInput value={discountAmount} onChange={setDiscountAmount} disabled={isPending} />
                        </div>
                    </div>
                    {discount.discountKobo > 0 && (
                        <p className="text-[10px] font-semibold text-teal-700">
                            Total discount: −{formatKobo(discount.discountKobo)}
                        </p>
                    )}
                </div>

                {/* Payer — auto-identified from registration */}
                <div className="space-y-1.5">
                    <FieldLabel hint="auto-identified from registration">Payer</FieldLabel>
                    <div className="flex items-center gap-2 flex-wrap">
                        <PayerBadge payer={resolvedPayer.type} reference={resolvedPayer.reference || null} />
                        {autoPayerChanged && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                overridden
                            </span>
                        )}
                    </div>
                    <select
                        value={payerType}
                        onChange={(e) => setPayerType(e.target.value as PayerType)}
                        disabled={isPending}
                        className="w-full text-sm border border-slate-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                        <option value="private">Private Client — cash / card / transfer</option>
                        <option value="hmo">HMO — settle against insurer{resolvedPayer.reference ? ` (${resolvedPayer.reference})` : ""}</option>
                        <option value="company">Company — settle against employer{resolvedPayer.reference ? ` (${resolvedPayer.reference})` : ""}</option>
                    </select>
                    {isHmoCompany && (
                        <input
                            value={payerCode}
                            onChange={(e) => setPayerCode(e.target.value)}
                            disabled={isPending}
                            placeholder={payerType === "hmo" ? "HMO authorization / claim code (optional)" : "Company reference / LPO number (optional)"}
                            className="w-full text-sm border border-slate-200 bg-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    )}
                    {!isHmoCompany && (
                        <div className="pt-1">
                            <FieldLabel>Payment method</FieldLabel>
                            <MethodPicker value={method} onChange={setMethod} disabled={isPending} />
                        </div>
                    )}
                </div>

                {/* Deposit credit */}
                {creditAvailableKobo > 0 && (
                    <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${useCredit ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
                        <input type="checkbox" checked={useCredit} disabled={isPending}
                            onChange={(e) => setUseCredit(e.target.checked)} className="mt-0.5 accent-emerald-600" />
                        <span className="flex-1">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                <Wallet size={12} className="text-emerald-600" />
                                Use deposit credit ({formatKobo(creditAvailableKobo)} available)
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                                Apply the patient&apos;s advance-deposit balance toward this bill before collecting.
                            </span>
                        </span>
                    </label>
                )}

                {/* Preview */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                        <span>Bill total</span><span className="font-semibold">{formatKobo(totalKobo)}</span>
                    </div>
                    {payment.amount_paid_kobo > 0 && (
                        <div className="flex justify-between text-green-700">
                            <span>Already paid</span><span className="font-semibold">−{formatKobo(payment.amount_paid_kobo)}</span>
                        </div>
                    )}
                    {discount.discountKobo > 0 && (
                        <div className="flex justify-between text-teal-700">
                            <span>Discount</span><span className="font-semibold">−{formatKobo(discount.discountKobo)}</span>
                        </div>
                    )}
                    {creditUsedKobo > 0 && (
                        <div className="flex justify-between text-emerald-700">
                            <span>Deposit credit</span><span className="font-semibold">−{formatKobo(creditUsedKobo)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-slate-800 border-t border-slate-200 pt-1.5 font-bold">
                        <span>{paymentType === "deposit" ? "Deposit to record" : "Collect now"}</span>
                        <span>{formatKobo(collectedKobo)}</span>
                    </div>
                    {paymentType === "partial" && collectedKobo > 0 && (
                        <p className="text-[10px] text-amber-600">
                            Remaining after this payment: {formatKobo(Math.max(0, remainingKobo - creditUsedKobo - collectedKobo))}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} disabled={isPending}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="button" onClick={handleConfirm} disabled={!valid || isPending}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isPending ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
                            : <><CheckCircle2 size={15} /> {paymentType === "deposit" ? "Record Deposit" : "Confirm Payment"}</>}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}

// ─── Settle ALL accumulated bills for one patient ─────────────────────────────

export interface SettleAllBillsModalProps {
    payments: Payment[];
    patientId: string;
    patient?: Record<string, any> | null;
    payerHint?: ResolvedPayer | null;
    cashierId: string;
    onClose: () => void;
}

export function SettleAllBillsModal({ payments, patientId, patient, payerHint, cashierId, onClose }: SettleAllBillsModalProps) {
    const { mutate: settleAll, isPending } = useSettleAllPatientBills();
    const { data: credit } = usePatientDepositCredit(patientId);

    const resolvedPayer = useMemo<ResolvedPayer>(
        () => payerHint ?? resolvePayerFromPatient(patient ?? null),
        [payerHint, patient]
    );

    const outstandingBills = payments.filter((p) => p.status === "pending" || p.status === "partial");
    const totalOutstandingKobo = outstandingBills.reduce((s, p) => s + (p.amount_kobo - p.amount_paid_kobo), 0);

    const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
    const [collectAmount, setCollectAmount] = useState<string>(String(totalOutstandingKobo / 100));
    const [discountPercent, setDiscountPercent] = useState<string>("");
    const [discountAmount, setDiscountAmount] = useState<string>("");
    const [payerType, setPayerType] = useState<PayerType>(resolvedPayer.type);
    const [payerCode, setPayerCode] = useState<string>("");
    const [method, setMethod] = useState<string>(resolvedPayer.type === "private" ? "cash" : resolvedPayer.type);
    const [useCredit, setUseCredit] = useState<boolean>(false);

    useEscape(onClose, isPending);

    const discount = computeDiscountKobo({
        totalKobo: totalOutstandingKobo,
        paidKobo: 0,
        discountPercent: Number(discountPercent) || 0,
        discountAmount: Number(discountAmount) || 0,
    });
    const creditAvailableKobo = credit?.availableKobo ?? 0;
    const creditUsedKobo = useCredit ? Math.min(creditAvailableKobo, Math.max(0, totalOutstandingKobo - discount.discountKobo)) : 0;
    const afterDiscountCredit = Math.max(0, totalOutstandingKobo - discount.discountKobo - creditUsedKobo);
    const collectedKobo = paymentType === "full" ? afterDiscountCredit : Math.min(afterDiscountCredit, Math.round((Number(collectAmount) || 0) * 100));

    const valid = paymentType === "full" || collectedKobo > 0;
    const isHmoCompany = payerType === "hmo" || payerType === "company";

    function handleSettleAll() {
        if (!valid || isPending) return;
        settleAll(
            {
                patientId,
                paymentType,
                amountPaid: paymentType === "partial" ? collectedKobo / 100 : undefined,
                discountPercent: Number(discountPercent) > 0 ? Number(discountPercent) : undefined,
                discountAmount: Number(discountAmount) > 0 ? Number(discountAmount) : undefined,
                method: isHmoCompany ? payerType : method,
                payer: payerType,
                payerReference: isHmoCompany ? resolvedPayer.reference || undefined : undefined,
                payerCode: isHmoCompany && payerCode.trim() ? payerCode.trim() : undefined,
                useDepositCredit: useCredit || undefined,
                cashierId,
            },
            {
                onSuccess: (result) => {
                    toast.success(
                        `Settled ${result.billsSettled} bill${result.billsSettled === 1 ? "" : "s"}${result.billsPartiallyPaid ? `, ${result.billsPartiallyPaid} partially paid` : ""} — collected ${formatKobo(result.collectedKobo)}.`
                    );
                    onClose();
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to settle bills."),
            }
        );
    }

    return (
        <ModalShell title="Settle All Bills" subtitle={`${outstandingBills.length} outstanding bill${outstandingBills.length === 1 ? "" : "s"} · ${formatKobo(totalOutstandingKobo)}`}
            icon={<Layers size={16} className="text-teal-600" />} onClose={onClose} disabled={isPending} wide>
            <div className="space-y-4">
                {/* Payment type */}
                <div className="space-y-1.5">
                    <FieldLabel>Payment type</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                        {(["full", "partial"] as const).map((type) => (
                            <button key={type} type="button" onClick={() => setPaymentType(type)} disabled={isPending}
                                className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-2xl border text-left transition-all ${
                                    paymentType === type ? "border-teal-300 bg-teal-50 text-teal-800 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                }`}>
                                <span className="text-xs font-bold">{PAYMENT_TYPE_CONFIG[type].label}</span>
                                <span className="text-[9px] text-slate-400">{PAYMENT_TYPE_CONFIG[type].desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {paymentType === "partial" && (
                    <div className="space-y-1.5">
                        <FieldLabel hint={`max ${formatKobo(afterDiscountCredit)}`}>Amount to collect now</FieldLabel>
                        <NairaInput value={collectAmount} onChange={setCollectAmount} disabled={isPending} autoFocus />
                        <p className="text-[10px] text-amber-600">
                            Remaining balance of {formatKobo(Math.max(0, afterDiscountCredit - collectedKobo))} stays outstanding on the affected bills.
                        </p>
                    </div>
                )}

                {/* Discount */}
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-2">
                        <BadgePercent size={13} className="text-teal-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discount across all bills</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <FieldLabel>By percentage (%)</FieldLabel>
                            <div className="relative">
                                <input type="number" min="0" max="100" step="0.1" value={discountPercent}
                                    onChange={(e) => setDiscountPercent(e.target.value)} disabled={isPending} placeholder="e.g. 5"
                                    className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400" />
                                <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <FieldLabel>By amount (₦)</FieldLabel>
                            <NairaInput value={discountAmount} onChange={setDiscountAmount} disabled={isPending} />
                        </div>
                    </div>
                </div>

                {/* Payer */}
                <div className="space-y-1.5">
                    <FieldLabel hint="auto-identified from registration">Payer</FieldLabel>
                    <div className="flex items-center gap-2">
                        <PayerBadge payer={resolvedPayer.type} reference={resolvedPayer.reference || null} />
                    </div>
                    <select value={payerType} onChange={(e) => setPayerType(e.target.value as PayerType)} disabled={isPending}
                        className="w-full text-sm border border-slate-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400">
                        <option value="private">Private Client — cash / card / transfer</option>
                        <option value="hmo">HMO — settle against insurer</option>
                        <option value="company">Company — settle against employer</option>
                    </select>
                    {isHmoCompany && (
                        <input value={payerCode} onChange={(e) => setPayerCode(e.target.value)} disabled={isPending}
                            placeholder={payerType === "hmo" ? "HMO authorization / claim code (optional)" : "Company reference / LPO number (optional)"}
                            className="w-full text-sm border border-slate-200 bg-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    )}
                    {!isHmoCompany && (
                        <div className="pt-1">
                            <FieldLabel>Payment method</FieldLabel>
                            <MethodPicker value={method} onChange={setMethod} disabled={isPending} />
                        </div>
                    )}
                </div>

                {creditAvailableKobo > 0 && (
                    <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${useCredit ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
                        <input type="checkbox" checked={useCredit} disabled={isPending}
                            onChange={(e) => setUseCredit(e.target.checked)} className="mt-0.5 accent-emerald-600" />
                        <span className="flex-1">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                <Wallet size={12} className="text-emerald-600" />
                                Use deposit credit ({formatKobo(creditAvailableKobo)} available)
                            </span>
                        </span>
                    </label>
                )}

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                        <span>Accumulated outstanding</span><span className="font-semibold">{formatKobo(totalOutstandingKobo)}</span>
                    </div>
                    {discount.discountKobo > 0 && (
                        <div className="flex justify-between text-teal-700">
                            <span>Discount</span><span className="font-semibold">−{formatKobo(discount.discountKobo)}</span>
                        </div>
                    )}
                    {creditUsedKobo > 0 && (
                        <div className="flex justify-between text-emerald-700">
                            <span>Deposit credit</span><span className="font-semibold">−{formatKobo(creditUsedKobo)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-slate-800 border-t border-slate-200 pt-1.5 font-bold">
                        <span>Collect now</span><span>{formatKobo(collectedKobo)}</span>
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} disabled={isPending}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={handleSettleAll} disabled={!valid || isPending}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isPending ? <><Loader2 size={15} className="animate-spin" /> Settling…</>
                            : <><CheckCircle2 size={15} /> Settle {outstandingBills.length} Bill{outstandingBills.length === 1 ? "" : "s"}</>}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}

// ─── Take a deposit (advance payment) ─────────────────────────────────────────

export interface DepositModalProps {
    patientId: string;
    patient?: Record<string, any> | null;
    payerHint?: ResolvedPayer | null;
    cashierId: string;
    onClose: () => void;
}

export function DepositModal({ patientId, patient, payerHint, cashierId, onClose }: DepositModalProps) {
    const { mutate: recordDeposit, isPending } = useRecordDeposit();
    const { data: credit } = usePatientDepositCredit(patientId);

    const resolvedPayer = useMemo<ResolvedPayer>(
        () => payerHint ?? resolvePayerFromPatient(patient ?? null),
        [payerHint, patient]
    );

    const [amount, setAmount] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [payerType, setPayerType] = useState<PayerType>(resolvedPayer.type);
    const [method, setMethod] = useState<string>(resolvedPayer.type === "private" ? "cash" : resolvedPayer.type);

    useEscape(onClose, isPending);

    const amountKobo = Math.round((Number(amount) || 0) * 100);
    const valid = amountKobo > 0;
    const isHmoCompany = payerType === "hmo" || payerType === "company";

    function handleDeposit() {
        if (!valid || isPending) return;
        recordDeposit(
            {
                patient_id: patientId,
                amount: amountKobo / 100,
                method: isHmoCompany ? payerType : method,
                payer: payerType,
                payerReference: isHmoCompany ? resolvedPayer.reference || undefined : undefined,
                notes: notes.trim() || undefined,
                cashierId,
            },
            {
                onSuccess: () => {
                    toast.success(`Deposit of ${formatKobo(amountKobo)} recorded — applied to any outstanding bills.`);
                    onClose();
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to record deposit."),
            }
        );
    }

    return (
        <ModalShell title="Take Deposit (Advance Payment)" subtitle="Money collected in advance — credited to the patient's account"
            icon={<Wallet size={16} className="text-teal-600" />} onClose={onClose} disabled={isPending}>
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                    <Wallet size={13} className="text-emerald-600 shrink-0" />
                    <span>Current available credit: <strong>{formatKobo(credit?.availableKobo ?? 0)}</strong></span>
                </div>

                <div className="space-y-1.5">
                    <FieldLabel>Deposit amount</FieldLabel>
                    <NairaInput value={amount} onChange={setAmount} disabled={isPending} autoFocus />
                </div>

                <div className="space-y-1.5">
                    <FieldLabel hint="auto-identified from registration">Payer</FieldLabel>
                    <div className="flex items-center gap-2 mb-1">
                        <PayerBadge payer={resolvedPayer.type} reference={resolvedPayer.reference || null} />
                    </div>
                    <select value={payerType} onChange={(e) => setPayerType(e.target.value as PayerType)} disabled={isPending}
                        className="w-full text-sm border border-slate-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400">
                        <option value="private">Private Client — cash / card / transfer</option>
                        <option value="hmo">HMO</option>
                        <option value="company">Company</option>
                    </select>
                    {payerType === "private" && (
                        <div className="pt-1">
                            <FieldLabel>Payment method</FieldLabel>
                            <MethodPicker value={method} onChange={setMethod} disabled={isPending} />
                        </div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <FieldLabel>Notes (optional)</FieldLabel>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isPending}
                        placeholder="e.g. Admission deposit, theatre booking…"
                        className="w-full text-sm border border-slate-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} disabled={isPending}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={handleDeposit} disabled={!valid || isPending}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isPending ? <><Loader2 size={15} className="animate-spin" /> Recording…</>
                            : <><CheckCircle2 size={15} /> Record Deposit</>}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}

// ─── Settle the whole checkout queue (payer-aware) ────────────────────────────

export interface QueueSettleAllModalProps {
    totalBills: number;
    totalKobo: number;
    cashierId: string;
    onClose: () => void;
}

export function QueueSettleAllModal({ totalBills, totalKobo, cashierId, onClose }: QueueSettleAllModalProps) {
    const { mutate: settleQueue, isPending } = useSettleAllPendingBills();
    const [method, setMethod] = useState<string>("cash");

    useEscape(onClose, isPending);

    function handleSettleQueue() {
        if (isPending) return;
        settleQueue(
            { method, cashierId },
            {
                onSuccess: (result) => {
                    toast.success(
                        `Settled ${result.settled} bill${result.settled === 1 ? "" : "s"} · ` +
                        `HMO: ${result.byPayer.hmo} · Company: ${result.byPayer.company} · Private: ${result.byPayer.private}`
                    );
                    onClose();
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to settle queue."),
            }
        );
    }

    return (
        <ModalShell title="Settle Entire Queue" subtitle={`${totalBills} pending bill${totalBills === 1 ? "" : "s"} · ${formatKobo(totalKobo)}`}
            icon={<Layers size={16} className="text-teal-600" />} onClose={onClose} disabled={isPending}>
            <div className="space-y-4">
                <div className="flex items-start gap-2.5 px-3.5 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <ShieldCheck size={14} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                        Every bill is settled <strong>in full</strong>. The system auto-identifies each
                        patient&apos;s payer from registration — <strong>HMO</strong> and <strong>Company</strong>{" "}
                        bills are settled against the insurer/employer, while private clients use the method below.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <FieldLabel hint="used for private clients only">Default payment method</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                        {METHOD_OPTIONS.map(({ key, label, icon: Icon }) => {
                            const active = method === key;
                            return (
                                <button key={key} type="button" onClick={() => setMethod(key)} disabled={isPending}
                                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border text-xs font-bold transition-all ${
                                        active ? "bg-teal-50 text-teal-700 border-teal-300" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                                    }`}>
                                    <Icon size={16} /> {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} disabled={isPending}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={handleSettleQueue} disabled={isPending}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isPending ? <><Loader2 size={15} className="animate-spin" /> Settling…</>
                            : <><CheckCircle2 size={15} /> Settle All {totalBills} Bills</>}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}
