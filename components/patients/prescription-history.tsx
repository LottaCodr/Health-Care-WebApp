"use client";

import { usePrescriptionsByPatient } from "@/hooks/use-emr"; // adjust if hook name differs
import {
  Pill, Eye, DownloadCloud, ClipboardList,
  Clock, CheckCircle2, XCircle, Loader2,
} from "lucide-react";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; icon: React.ElementType }> = {
  Active: { label: "Active", color: "text-green-700", bg: "bg-green-50", dot: "bg-green-500", icon: CheckCircle2 },
  Completed: { label: "Completed", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500", icon: Clock },
  Expired: { label: "Expired", color: "text-red-600", bg: "bg-red-50", dot: "bg-red-500", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-50", dot: "bg-gray-400", icon: Clock };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  patientId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrescriptionHistory({ patientId }: Props) {
  const { data: prescriptions, loading, error } = usePrescriptionsByPatient(patientId);

  // ── Loading ──
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Pill size={15} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Prescription History</p>
            <p className="text-xs text-gray-400 mt-0.5">Records of all medications prescribed</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 size={18} className="text-blue-500 animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading prescriptions...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
          <XCircle size={22} className="text-red-500" />
        </div>
        <p className="text-sm font-semibold text-gray-600">Failed to load prescriptions</p>
      </div>
    );
  }

  // ── Empty ──
  if (!prescriptions?.length) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Pill size={15} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Prescription History</p>
            <p className="text-xs text-gray-400 mt-0.5">Records of all medications prescribed</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
            <ClipboardList size={20} className="text-gray-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-500">No prescriptions yet</p>
            <p className="text-xs text-gray-400 mt-1">Prescribed medications will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Data ──
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Pill size={15} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Prescription History</p>
            <p className="text-xs text-gray-400 mt-0.5">Records of all medications prescribed</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
          {prescriptions.length} record{prescriptions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              {["Date", "Medication", "Dosage", "Route", "Duration", "Notes", "Status", ""].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {prescriptions.map((rx: any) => (
              <tr key={rx.id ?? rx.$id} className="group hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-3.5 text-xs text-gray-500 font-medium whitespace-nowrap">
                  {rx.date
                    ? new Date(rx.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : rx.created_at
                      ? new Date(rx.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-semibold text-gray-800">
                    {rx.medication ?? rx.drug_name ?? rx.drugName ?? "—"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-600 font-medium whitespace-nowrap">
                  {rx.dosage ?? "—"}
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                  {rx.route ?? "—"}
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                  {rx.duration ?? "—"}
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-400 max-w-[140px] truncate" title={rx.notes ?? rx.note ?? ""}>
                  {rx.notes ?? rx.note ?? "—"}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <StatusBadge status={rx.status ?? "Active"} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <button
                      aria-label="View prescription"
                      className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      aria-label="Download prescription"
                      className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                    >
                      <DownloadCloud size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}