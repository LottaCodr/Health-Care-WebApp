"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, History, RefreshCcw } from "lucide-react";
import { useRecentPayments } from "@/hooks/emr/use-payment";
import { formatKobo, PAYMENT_TYPE_CONFIG } from "@/lib/utils/billing";
import { displayHospitalNumber } from "@/lib/hospital-number";
import { fmtFull } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
    pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
    paid:     "bg-green-50  text-green-700  border-green-200",
    partial:  "bg-blue-50   text-blue-700   border-blue-200",
    waived:   "bg-slate-50  text-slate-500  border-slate-200",
    refunded: "bg-rose-50   text-rose-600   border-rose-200",
    failed:   "bg-red-50    text-red-600    border-red-200",
};

function errorText(err: unknown, fallback = "Something went wrong while loading."): string {
    const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
    const clean = (raw ?? "").trim();
    if (!clean) return fallback;
    if (clean.includes("An error occurred in the Server Components render")) {
        return "Something went wrong while loading. Please retry.";
    }
    return clean;
}

export default function RecentPaymentsPanel() {
    const query = useRecentPayments(25);
    const payments = Array.isArray(query.data) ? query.data : [];

    return (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-2 border-b border-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                        <History size={16} className="text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">Recent billing activity</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Latest bills, settlements and corrections across all patients
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => void query.refetch()}
                    disabled={query.isFetching}
                    className="inline-flex items-center justify-center gap-1.5 h-8 shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                    <RefreshCcw size={13} className={query.isFetching ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {query.isLoading ? (
                <div className="space-y-2 p-6">
                    <div className="h-9 w-full animate-pulse rounded-md bg-gray-100" />
                    <div className="h-9 w-full animate-pulse rounded-md bg-gray-100" />
                    <div className="h-9 w-full animate-pulse rounded-md bg-gray-100" />
                    <div className="h-9 w-full animate-pulse rounded-md bg-gray-100" />
                </div>
            ) : query.isError ? (
                <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50">
                        <AlertTriangle size={18} className="text-red-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Failed to load recent activity</p>
                    <p className="max-w-md text-xs text-gray-400 break-words">{errorText(query.error)}</p>
                    <button
                        type="button"
                        onClick={() => void query.refetch()}
                        className="inline-flex items-center gap-1.5 h-8 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                        <RefreshCcw size={13} /> Retry
                    </button>
                </div>
            ) : payments.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                    <History size={22} className="text-gray-200" />
                    <p className="text-sm font-semibold text-gray-500">No billing activity yet</p>
                    <p className="text-xs text-gray-400">New and settled payments will appear here.</p>
                </div>
            ) : (
                <div className="max-h-[460px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
                            <tr className="border-b border-gray-100">
                                <th className="pl-6 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 py-3">Patient</th>
                                <th className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 py-3">Description</th>
                                <th className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 py-3">When</th>
                                <th className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400 py-3">Amount</th>
                                <th className="pr-6 text-right text-[10px] font-black uppercase tracking-widest text-gray-400 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p: any) => {
                                const patient = p.patients ?? null;
                                return (
                                    <tr key={p.id} className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                                        <td className="py-3 pl-6 align-middle">
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-bold text-gray-800">
                                                    {patient?.name ?? "Unknown patient"}
                                                </p>
                                                <p className="mt-0.5 font-mono text-[10px] text-gray-400">
                                                    HN: {displayHospitalNumber(patient?.hospital_number)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="max-w-[240px] py-3 align-middle">
                                            <p className="truncate text-xs font-semibold text-gray-700">
                                                {p.description || p.category || "—"}
                                            </p>
                                            {p.payment_type && (
                                                <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-blue-500">
                                                    {PAYMENT_TYPE_CONFIG[p.payment_type as keyof typeof PAYMENT_TYPE_CONFIG]?.short ?? p.payment_type}
                                                </p>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap py-3 align-middle text-xs text-gray-500">
                                            {p.updated_at || p.processed_date || p.created_at
                                                ? fmtFull(p.updated_at || p.processed_date || p.created_at)
                                                : "—"}
                                        </td>
                                        <td className="whitespace-nowrap py-3 align-middle text-right text-xs font-bold text-gray-800">
                                            {formatKobo(p.amount_kobo ?? 0)}
                                        </td>
                                        <td className="py-3 pr-6 align-middle text-right">
                                            <span className="inline-flex items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                                        STATUS_STYLE[String(p.status ?? "pending").toLowerCase()] ?? "bg-gray-50 text-gray-500 border-gray-200"
                                                    }`}
                                                >
                                                    {p.status ?? "pending"}
                                                </span>
                                                {patient?.id && (
                                                    <Link
                                                        href={`/front-desk/patient/${patient.id}?tab=billing`}
                                                        className="hidden h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-blue-600 transition-colors hover:bg-gray-100 sm:inline-flex"
                                                    >
                                                        View <ChevronRight size={12} />
                                                    </Link>
                                                )}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
