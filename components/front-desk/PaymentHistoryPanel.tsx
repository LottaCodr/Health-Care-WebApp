"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle, BadgeDollarSign, ChevronRight, Clock, CreditCard,
    Loader2, RefreshCcw, Search, User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useSearchPatients } from "@/hooks/emr/use-patients";
import {
    usePaymentsByPatient,
    usePatientDepositCredit,
} from "@/hooks/emr/use-payment";
import { useAuth } from "@/context/auth-provider";
import { SettleBillModal, PayerBadge } from "@/components/patients/billing-modals";
import type { Payment as PaymentType } from "@/components/patients/payment-history";
import { formatKobo, resolvePayerFromPatient, PAYMENT_TYPE_CONFIG } from "@/lib/utils/billing";
import { displayHospitalNumber } from "@/lib/hospital-number";
import { cn, fmtFull } from "@/lib/utils";

// ─── Local helpers ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
    pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
    paid:     "bg-green-50  text-green-700  border-green-200",
    partial:  "bg-blue-50   text-blue-700   border-blue-200",
    waived:   "bg-slate-50  text-slate-500  border-slate-200",
    refunded: "bg-rose-50   text-rose-600   border-rose-200",
    failed:   "bg-red-50    text-red-600    border-red-200",
};

function isDepositRow(p: any): boolean {
    const category = String(p?.category ?? "").toLowerCase();
    const type = String(p?.payment_type ?? "").toLowerCase();
    return category === "deposit" || type === "deposit" || type === "advance";
}

function outstandingKobo(p: any): number {
    const total = p?.amount_kobo ?? 0;
    const paid = p?.amount_paid_kobo ?? 0;
    return Math.max(0, total - paid);
}

function errorText(err: unknown, fallback = "Something went wrong while loading."): string {
    const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
    const clean = (raw ?? "").trim();
    if (!clean) return fallback;
    if (clean.includes("An error occurred in the Server Components render")) {
        return "Something went wrong while loading. Please retry.";
    }
    return clean;
}

// ─── Patient picker row ───────────────────────────────────────────────────────

function PatientOption({ patient, onSelect }: { patient: any; onSelect: (p: any) => void }) {
    return (
        <Button
            type="button"
            onClick={() => onSelect(patient)}
            className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50"
        >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-600">
                {typeof patient.name === "string" && patient.name.length > 0
                    ? patient.name[0].toUpperCase()
                    : <User size={15} />}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-800">{patient.name ?? "Unnamed patient"}</p>
                <p className="text-[11px] text-gray-400">
                    HN: {displayHospitalNumber(patient.hospital_number)}
                    {patient.phone ? ` · ${patient.phone}` : ""}
                </p>
            </div>
            <ChevronRight size={14} className="shrink-0 text-gray-300" />
        </Button>
    );
}

// ─── Selected patient: summary + history ─────────────────────────────────────

function PatientHistory({ patient, onBack }: { patient: any; onBack: () => void }) {
    const { user } = useAuth();
    const cashierId = user?.$id ?? user?.id ?? "";

    const paymentsQuery = usePaymentsByPatient(patient.id);
    const depositQuery  = usePatientDepositCredit(patient.id);
    const [settleTarget, setSettleTarget] = useState<any | null>(null);

    // Rows are raw `payments` records (snake_case + join extras) shaped by
    // the payment service's normalizer — superset of the UI's Payment type.
    const payments = useMemo(
        () => (Array.isArray(paymentsQuery.data)
            ? paymentsQuery.data
            : []) as unknown as Array<PaymentType & Record<string, any>>,
        [paymentsQuery.data]
    );

    const summary = useMemo(() => {
        let billed = 0;
        let paid = 0;
        let outstandingCount = 0;
        for (const p of payments) {
            if (isDepositRow(p)) continue;
            billed += p.amount_kobo ?? 0;
            paid += p.amount_paid_kobo ?? 0;
            const status = String(p.status ?? "").toLowerCase();
            if ((status === "pending" || status === "partial") && outstandingKobo(p) > 0) {
                outstandingCount += 1;
            }
        }
        return { billed, paid, balance: Math.max(0, billed - paid), outstandingCount };
    }, [payments]);

    const depositCredit = depositQuery.data?.availableKobo ?? 0;

    // First open bill the cashier can act on right away.
    const firstOutstanding = payments.find(
        p => !isDepositRow(p)
            && (p.status === "pending" || p.status === "partial")
            && outstandingKobo(p) > 0
    );

    const stat = (label: string, value: string, tone: string) => (
        <div className={cn("rounded-2xl border px-4 py-3", tone)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
            <p className="mt-1 text-base font-extrabold text-gray-900">{value}</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Patient header */}
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-black text-blue-700">
                        {typeof patient.name === "string" && patient.name.length > 0
                            ? patient.name[0].toUpperCase()
                            : <User size={16} />}
                    </div>
                    <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900">
                            <span className="truncate">{patient.name ?? "Unnamed patient"}</span>
                            <PayerBadge payer={resolvePayerFromPatient(patient).type} reference={resolvePayerFromPatient(patient).reference || null} />
                        </p>
                        <p className="text-[11px] text-gray-400">
                            HN: {displayHospitalNumber(patient.hospital_number)}
                            {patient.phone ? ` · ${patient.phone}` : ""}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={onBack} className="h-8 rounded-xl text-xs font-bold">
                        <Search size={13} /> Search another
                    </Button>
                    <Button asChild size="sm" className="h-8 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700">
                        <Link href={`/front-desk/patient/${patient.id}?tab=billing`}>
                            Open full billing <ChevronRight size={13} />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stat("Total billed", formatKobo(summary.billed), "border-gray-200 bg-white")}
                {stat("Collected", formatKobo(summary.paid), "border-green-100 bg-green-50/40")}
                {stat("Outstanding", formatKobo(summary.balance), "border-amber-100 bg-amber-50/40")}
                {stat("Deposit credit", formatKobo(depositCredit), "border-cyan-100 bg-cyan-50/40")}
            </div>

            {/* History table */}
            <Card className="overflow-hidden rounded-3xl border-gray-200 bg-white">
                <CardContent className="p-0">
                    <div className="flex flex-col gap-2 border-b border-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <p className="text-sm font-bold text-gray-800">Payment history</p>
                            <p className="mt-0.5 text-xs text-gray-400">
                                {payments.length} record{payments.length === 1 ? "" : "s"} · newest first
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {firstOutstanding && (
                                <Button
                                    size="sm"
                                    onClick={() => setSettleTarget(firstOutstanding)}
                                    className="h-8 rounded-xl bg-green-600 text-xs font-bold text-white shadow-sm hover:bg-green-700"
                                >
                                    <BadgeDollarSign size={13} />
                                    Settle {summary.outstandingCount} open bill{summary.outstandingCount === 1 ? "" : "s"}
                                </Button>
                            )}
                            <Button
                                aria-label="Refresh payment history"
                                type="button"
                                onClick={() => { void paymentsQuery.refetch(); }}
                                disabled={paymentsQuery.isFetching}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-700"
                            >
                                <RefreshCcw size={13} className={paymentsQuery.isFetching ? "animate-spin" : ""} />
                            </Button>
                        </div>
                    </div>

                    {paymentsQuery.isLoading ? (
                        <div className="space-y-2 p-6">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    ) : paymentsQuery.isError ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50">
                                <AlertTriangle size={18} className="text-red-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600">Failed to load payment history</p>
                            <p className="max-w-md text-xs text-gray-400 break-words">{errorText(paymentsQuery.error)}</p>
                            <Button size="sm" variant="outline" onClick={() => void paymentsQuery.refetch()} className="h-8 rounded-xl text-xs font-bold">
                                <RefreshCcw size={13} /> Retry
                            </Button>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                            <CreditCard size={22} className="text-gray-200" />
                            <p className="text-sm font-semibold text-gray-500">No payments recorded for this patient yet</p>
                            <p className="text-xs text-gray-400">Bills appear here as soon as they are created or settled.</p>
                        </div>
                    ) : (
                        <div className="max-h-[420px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Paid</TableHead>
                                        <TableHead className="pr-6 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map(p => {
                                        const total = p.amount_kobo ?? 0;
                                        const paid = p.amount_paid_kobo ?? 0;
                                        return (
                                            <TableRow key={p.id} className="hover:bg-gray-50/50">
                                                <TableCell className="whitespace-nowrap py-3 pl-6 text-xs text-gray-500">
                                                    {p.processed_date || p.created_at ? fmtFull(p.processed_date || p.created_at) : "—"}
                                                </TableCell>
                                                <TableCell className="max-w-[220px] py-3">
                                                    <p className="truncate text-xs font-semibold text-gray-700">
                                                        {p.description || p.category || "—"}
                                                    </p>
                                                    {p.payment_type && (
                                                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-blue-500">
                                                            {PAYMENT_TYPE_CONFIG[p.payment_type]?.short ?? p.payment_type}
                                                            {isDepositRow(p) ? " · deposit" : ""}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap py-3 font-mono text-[11px] text-gray-400">
                                                    {p.invoice_no ?? "—"}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap py-3 text-right text-xs font-bold text-gray-800">
                                                    {formatKobo(total)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap py-3 text-right text-xs font-medium text-gray-500">
                                                    {formatKobo(paid)}
                                                </TableCell>
                                                <TableCell className="py-3 pr-6 text-right">
                                                    <Badge variant="outline" className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATUS_STYLE[String(p.status ?? "pending").toLowerCase()] ?? "bg-gray-50 text-gray-500 border-gray-200")}>
                                                        {p.status ?? "pending"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Settle modal (shared with the patient billing tab) */}
            {settleTarget && (
                <SettleBillModal
                    payment={{
                        id: settleTarget.id,
                        patient_id: settleTarget.patient_id,
                        category: settleTarget.category ?? "other",
                        description: settleTarget.description ?? "",
                        amount_kobo: settleTarget.amount_kobo ?? 0,
                        amount_paid_kobo: settleTarget.amount_paid_kobo ?? 0,
                        status: settleTarget.status,
                        payment_type: settleTarget.payment_type,
                        payer: settleTarget.payer,
                        payer_reference: settleTarget.payer_reference,
                        payer_code: settleTarget.payer_code,
                        payment_date: settleTarget.processed_date ?? settleTarget.paid_at ?? null,
                        invoice_no: settleTarget.invoice_no
                            ?? (patient.hospital_number
                                ? `INV-${String(patient.hospital_number).replace(/[^A-Za-z0-9]/g, "").toUpperCase()}`
                                : String(settleTarget.id ?? "").slice(0, 8).toUpperCase()),
                        collected_by: settleTarget.processed_by ?? null,
                        notes: settleTarget.notes ?? null,
                        created_at: settleTarget.created_at ?? new Date().toISOString(),
                    }}
                    payerHint={resolvePayerFromPatient(patient)}
                    cashierId={cashierId}
                    onClose={() => setSettleTarget(null)}
                />
            )}
        </div>
    );
}

// ─── Panel: search + history ──────────────────────────────────────────────────

export default function PaymentHistoryPanel() {
    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");
    const [selected, setSelected] = useState<any | null>(null);

    // Debounce the search input (250 ms) before hitting the database.
    useEffect(() => {
        const t = setTimeout(() => setDebounced(query.trim()), 250);
        return () => clearTimeout(t);
    }, [query]);

    const search = useSearchPatients(debounced);
    const results = Array.isArray(search.data) ? search.data : [];
    const searching = search.isFetching && debounced.length >= 2;

    return (
        <Card className="overflow-hidden rounded-3xl border-gray-200 bg-white">
            <CardContent className="p-4 sm:p-6">
                {selected ? (
                    <PatientHistory patient={selected} onBack={() => { setSelected(null); setQuery(""); }} />
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50">
                                <CreditCard size={17} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">Per-patient payment history</p>
                                <p className="text-xs text-gray-400">Search any patient to see their bills, collections and balances</p>
                            </div>
                        </div>

                        {/* Search box */}
                        <div className="relative">
                            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                            <Input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search by name, hospital number or phone…"
                                className="h-11 rounded-2xl border-gray-200 pl-10 text-sm shadow-sm"
                                autoFocus
                            />
                            {searching && (
                                <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
                            )}
                        </div>

                        {/* Results */}
                        <div className="min-h-[120px]">
                            {searching && (
                                <div className="space-y-2">
                                    <Skeleton className="h-14 w-full" />
                                    <Skeleton className="h-14 w-full" />
                                </div>
                            )}

                            {!searching && search.isError && (
                                <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-6 text-center">
                                    <AlertTriangle size={18} className="text-red-500" />
                                    <p className="text-sm font-semibold text-red-700">Patient search failed</p>
                                    <p className="max-w-md text-xs text-red-600/80 break-words">{errorText(search.error)}</p>
                                    <Button size="sm" variant="outline" onClick={() => void search.refetch()} className="h-8 rounded-xl text-xs font-bold">
                                        <RefreshCcw size={13} /> Retry
                                    </Button>
                                </div>
                            )}

                            {!searching && !search.isError && debounced.length < 2 && (
                                <div className="flex flex-col items-center gap-2 py-8 text-center">
                                    <Clock size={20} className="text-gray-200" />
                                    <p className="text-sm text-gray-400">Start typing at least two characters to search the patient registry.</p>
                                </div>
                            )}

                            {!searching && !search.isError && debounced.length >= 2 && results.length === 0 && (
                                <div className="flex flex-col items-center gap-2 py-8 text-center">
                                    <Search size={20} className="text-gray-200" />
                                    <p className="text-sm text-gray-400">No patients match “{debounced}”.</p>
                                </div>
                            )}

                            {!searching && !search.isError && results.length > 0 && (
                                <div className="grid gap-1 sm:grid-cols-2">
                                    {results.slice(0, 8).map(p => (
                                        <PatientOption key={p.id} patient={p} onSelect={setSelected} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
