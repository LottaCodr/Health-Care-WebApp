"use client";

/**
 * Care Packages — the prepaid bundles (the antenatal package today).
 *
 * This panel is deliberately NOT part of the bill. A service delivered under a
 * package has no row in `payments`, so it never enters the outstanding total or
 * the checkout queue; it appears here instead, with the value the package
 * absorbed. That is the separation the front desk needs: "already paid for in
 * the package" is visible, and it is not a debt.
 */

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import {
    useCarePackages,
    usePatientPackages,
    useEnrolPatientInPackage,
    useUpdateEnrolment,
} from "@/hooks/emr/use-emr";
import {
    describeAllowance,
    enrolmentBlockReason,
    type PackageEnrolment,
    type PackageUsageRow,
} from "@/lib/utils/care-packages";
import { formatNaira } from "@/lib/utils/radiology-catalog";
import {
    Package, Plus, X, Loader2, CheckCircle2, Ban, CalendarClock, Wallet,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const KIND_LABELS: Record<string, string> = {
    radiology_scan: "Scan",
    lab_test: "Lab test",
    pharmacy: "Medication",
    consultation: "Consultation",
    procedure: "Procedure",
    other: "Service",
};

// ─── Enrolment dialog ─────────────────────────────────────────────────────────

function EnrolDialog({ patientId, onClose }: { patientId: string; onClose: () => void }) {
    const { data: packages = [], isLoading } = useCarePackages();
    const { mutate: enrol, isPending } = useEnrolPatientInPackage();

    const [packageId, setPackageId] = useState("");
    const [amount, setAmount] = useState("");
    const [receipt, setReceipt] = useState("");
    const [notes, setNotes] = useState("");

    const selected = (packages as any[]).find((p) => p.id === packageId) ?? null;
    const scanItem = (selected?.items ?? []).find((i: any) => i.item_kind === "radiology_scan");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!packageId) { toast.error("Choose the package."); return; }

        enrol(
            {
                patientId,
                packageId,
                amountPaid: amount.trim() === "" ? undefined : Number(amount),
                receiptNo: receipt.trim() || undefined,
                notes: notes.trim() || undefined,
            },
            {
                onSuccess: (enrolment: PackageEnrolment) => {
                    toast.success(
                        `${(enrolment as any).care_packages?.name ?? "Package"} activated — included scans will no longer be billed.`
                    );
                    onClose();
                },
                onError: (err: any) => toast.error(err?.message ?? "Could not enrol the patient."),
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/80 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white">
                            <Package size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">Enrol in a Care Package</h3>
                            <p className="text-xs text-gray-400">Prepaid — included services are not billed again</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                            Package
                        </label>
                        {isLoading ? (
                            <p className="text-xs text-gray-400">Loading packages…</p>
                        ) : (packages as any[]).length === 0 ? (
                            <p className="text-xs text-amber-600">
                                No packages are configured. An administrator needs to add one first.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {(packages as any[]).map((pkg) => {
                                    const isSelected = packageId === pkg.id;
                                    const item = (pkg.items ?? []).find((i: any) => i.item_kind === "radiology_scan");
                                    return (
                                        <button
                                            key={pkg.id}
                                            type="button"
                                            onClick={() => {
                                                setPackageId(pkg.id);
                                                if (typeof pkg.price === "number") setAmount(String(pkg.price));
                                            }}
                                            className={`w-full text-left px-3.5 py-3 rounded-2xl border transition-all ${
                                                isSelected ? "border-emerald-500 bg-emerald-50/70" : "border-gray-200 bg-white hover:border-emerald-200"
                                            }`}
                                        >
                                            <p className="text-xs font-bold text-gray-900">{pkg.name}</p>
                                            {pkg.description && (
                                                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{pkg.description}</p>
                                            )}
                                            <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                                                {item
                                                    ? describeAllowance(item.included_quantity, 0, "scan")
                                                    : "No scans included"}
                                                {typeof pkg.validity_days === "number" ? ` · ${pkg.validity_days} days` : " · no expiry"}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                Amount prepaid (₦)
                            </label>
                            <input
                                type="number" min="0" step="1" value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full h-10 px-3 text-xs font-bold bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                Receipt no.
                            </label>
                            <input
                                type="text" value={receipt}
                                onChange={(e) => setReceipt(e.target.value)}
                                placeholder="Optional"
                                className="w-full h-10 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                            Notes
                        </label>
                        <textarea
                            rows={2} value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. 28 weeks at booking, paid in full."
                            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                        />
                    </div>

                    {selected && scanItem && (
                        <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                            Scans requested while this enrolment is active are covered by the package and will
                            NOT appear in the patient&apos;s billing.
                        </p>
                    )}

                    <div className="flex gap-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600">
                            Cancel
                        </button>
                        <button type="submit" disabled={isPending || !packageId}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
                            {isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            {isPending ? "Enrolling…" : "Activate Package"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Enrolment row ────────────────────────────────────────────────────────────

function EnrolmentRow({
    enrolment,
    usage,
    canManage,
}: {
    enrolment: PackageEnrolment;
    usage: PackageUsageRow[];
    canManage: boolean;
}) {
    const { mutate: update, isPending } = useUpdateEnrolment();
    const pkg = (enrolment as any).care_packages ?? null;
    const blocked = enrolmentBlockReason(enrolment);
    const isActive = !blocked;

    const scanItem = (pkg?.items ?? []).find((i: any) => i.item_kind === "radiology_scan");
    const used = usage.filter(
        (u) => u.enrolment_id === enrolment.id && (!u.item_kind || u.item_kind === "radiology_scan")
    );
    const coveredValue = used.reduce((s, u) => s + (u.value_kobo ?? 0) / 100, 0);

    const close = (status: "completed" | "cancelled") =>
        update(
            { id: enrolment.id, status },
            {
                onSuccess: () => toast.success(`Package marked ${status}.`),
                onError: (err: any) => toast.error(err?.message ?? "Could not update the package."),
            }
        );

    return (
        <div className={`rounded-2xl border p-4 ${isActive ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-gray-50/60"}`}>
            <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-100" : "bg-gray-200"}`}>
                    <Package size={15} className={isActive ? "text-emerald-700" : "text-gray-500"} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">{pkg?.name ?? "Care package"}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isActive
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}>
                            {isActive
                                ? "Active"
                                : blocked === "expired"
                                    ? "Expired"
                                    : String(enrolment.status ?? "").toLowerCase() === "cancelled"
                                        ? "Cancelled"
                                        : blocked === "not_started"
                                            ? "Not started"
                                            : "Closed"}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                            <CalendarClock size={10} className="text-gray-400" />
                            {fmtDate(enrolment.starts_on)} → {enrolment.expires_on ? fmtDate(enrolment.expires_on) : "no expiry"}
                        </span>
                        {typeof enrolment.amount_paid === "number" && (
                            <span className="flex items-center gap-1">
                                <Wallet size={10} className="text-gray-400" />
                                {formatNaira(enrolment.amount_paid)} prepaid
                            </span>
                        )}
                        {enrolment.receipt_no && <span className="font-mono text-[10px] text-gray-400">#{enrolment.receipt_no}</span>}
                    </div>

                    {/* Allowance */}
                    {scanItem && (
                        <p className="text-[11px] font-semibold text-emerald-800 mt-2">
                            {describeAllowance(scanItem.included_quantity, used.length, "scan")}
                            {coveredValue > 0 && (
                                <span className="font-medium text-emerald-700"> · {formatNaira(coveredValue)} covered so far</span>
                            )}
                        </p>
                    )}

                    {/* Covered services */}
                    {used.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {used.slice().reverse().map((u) => (
                                <li key={u.id} className="flex items-center gap-2 text-[11px] text-gray-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                    <span className="font-medium">{u.item_name}</span>
                                    <span className="text-gray-400">{KIND_LABELS[u.item_kind ?? "other"] ?? "Service"}</span>
                                    <span className="ml-auto text-gray-400">{fmtDate((u as any).created_at)}</span>
                                    <span className="font-mono text-emerald-700">{formatNaira((u.value_kobo ?? 0) / 100)}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {enrolment.notes && (
                        <p className="text-[11px] text-gray-500 italic mt-2">{enrolment.notes}</p>
                    )}
                </div>

                {canManage && isActive && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={() => close("completed")}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Complete
                        </button>
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={() => close("cancelled")}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-red-100 text-[10px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1 justify-center"
                        >
                            <Ban size={10} /> Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function CarePackagesPanel({
    patientId,
    canManage = false,
}: {
    patientId: string;
    canManage?: boolean;
}) {
    const { data, isPending } = usePatientPackages(patientId);
    const [enrolling, setEnrolling] = useState(false);

    const enrolments = useMemo(() => (data?.enrolments ?? []) as PackageEnrolment[], [data]);
    const usage = useMemo(() => (data?.usage ?? []) as PackageUsageRow[], [data]);

    if (isPending) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
                <Loader2 size={15} className="animate-spin text-emerald-500" />
                <p className="text-xs text-gray-400">Loading care packages…</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3.5 sm:px-5 border-b border-gray-50">
                <div className="w-1.5 h-4 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Prepaid Care Packages
                </p>
                {data && data.coveredValueNaira > 0 && (
                    <span className="ml-auto text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">
                        {formatNaira(data.coveredValueNaira)} covered — not billed
                    </span>
                )}
                {canManage && (
                    <button
                        type="button"
                        onClick={() => setEnrolling(true)}
                        className={`${data && data.coveredValueNaira > 0 ? "" : "ml-auto"} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors`}
                    >
                        <Plus size={12} /> Enrol
                    </button>
                )}
            </div>

            <div className="p-4 sm:p-5 space-y-3">
                {enrolments.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-xs font-semibold text-gray-500">No care package on this file</p>
                        <p className="text-[11px] text-gray-400 mt-1 max-w-md mx-auto">
                            Antenatal patients are usually registered on the prepaid Antenatal Care Package.
                            Scans requested under it are covered by the package and never billed again.
                        </p>
                    </div>
                ) : (
                    enrolments.map((e) => (
                        <EnrolmentRow key={e.id} enrolment={e} usage={usage} canManage={canManage} />
                    ))
                )}
            </div>

            {enrolling && <EnrolDialog patientId={patientId} onClose={() => setEnrolling(false)} />}
        </div>
    );
}
