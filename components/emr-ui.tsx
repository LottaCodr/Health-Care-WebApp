/**
 * Reusable UI Components — Nile Valley Hospital EMR
 * Supabase-compatible (id, created_at) with Appwrite fallbacks ($id, startTime)
 */

import React from "react";
import Link from "next/link";
import { Patient, PatientStatus, Consultation, Payment } from "@/types/models";
import { hasActualAllergy, fmtDate, fmtFull } from "@/lib/utils";
import {
  User, Phone, Mail, MapPin, Droplets, AlertCircle,
  Stethoscope, ChevronRight, CheckCircle2, Clock,
  XCircle, BadgeDollarSign, CreditCard,
} from "lucide-react";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  "registered": { color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
  "awaiting-consultation": { color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  "under-consultation": { color: "text-purple-700", bg: "bg-purple-50", dot: "bg-purple-500" },
  "sent-to-nurse": { color: "text-teal-700", bg: "bg-teal-50", dot: "bg-teal-500" },
  "sent-to-lab": { color: "text-indigo-700", bg: "bg-indigo-50", dot: "bg-indigo-500" },
  "sent-to-pharmacy": { color: "text-violet-700", bg: "bg-violet-50", dot: "bg-violet-500" },
  "awaiting-payment": { color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
  "admitted": { color: "text-cyan-700", bg: "bg-cyan-50", dot: "bg-cyan-500" },
  "under-observation": { color: "text-orange-700", bg: "bg-orange-50", dot: "bg-orange-500" },
  "discharged": { color: "text-green-700", bg: "bg-green-50", dot: "bg-green-500" },
  "no-status": { color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" },
};

function StatusBadge({ status }: { status?: string }) {
  const key = (status ?? "no-status").toLowerCase();
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG["no-status"];
  const label = status
    ? status.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "No Status";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
}

// ─── Info item ────────────────────────────────────────────────────────────────

function InfoItem({ icon: Icon, label, value, red }: {
  icon: React.ElementType; label: string; value?: string | null; red?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={12} className="text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 ${red ? "text-red-600" : "text-gray-800"}`}>{value}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT INFO CARD
// ═══════════════════════════════════════════════════════════════════════════════

export function PatientInfoCard({ patient }: { patient: Patient | any }) {
  const id = patient.id ?? patient.$id ?? "—";
  const name = patient.name ?? "Unknown Patient";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 text-base shrink-0">
            {name[0]?.toUpperCase() ?? "P"}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">{name}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {id.slice(-8)}</p>
          </div>
        </div>
        <StatusBadge status={patient.status} />
      </div>

      {/* Details grid */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoItem icon={Mail} label="Email" value={patient.email} />
        <InfoItem icon={Phone} label="Phone" value={patient.phone} />
        <InfoItem icon={User} label="Gender" value={patient.gender} />
        <InfoItem icon={Droplets} label="Blood Group" value={patient.blood_group ?? patient.blood_group} />
        {(patient.address) && (
          <div className="sm:col-span-2">
            <InfoItem icon={MapPin} label="Address" value={patient.address} />
          </div>
        )}
        {hasActualAllergy(patient.allergies) && (
          <div className="sm:col-span-2">
            <InfoItem icon={AlertCircle} label="Allergies" value={patient.allergies} red />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSULTATION CARD
// ═══════════════════════════════════════════════════════════════════════════════

const CONSULTATION_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  Completed: { color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
  InProgress: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  underConsultation: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  Scheduled: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
};

export function ConsultationCard({ consultation }: { consultation: Consultation | any }) {
  const displayId = consultation.id ?? consultation.$id ?? "—";
  const displayDate = consultation.created_at ?? consultation.consultation_date ?? consultation.startTime;
  const statusCfg = CONSULTATION_STATUS_CONFIG[consultation.status ?? ""] ?? { color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-red-100 transition-all">
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Stethoscope size={14} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">
              Consultation #{displayId.substring(0, 8)}
            </p>
            {displayDate && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {fmtFull(displayDate)}
              </p>
            )}
          </div>
        </div>
        {consultation.status && (
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
            {consultation.status}
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {consultation.symptoms && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Symptoms</p>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{consultation.symptoms}</p>
          </div>
        )}
        {consultation.diagnosis && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Diagnosis</p>
            <p className="text-sm font-semibold text-gray-800 line-clamp-1">{consultation.diagnosis}</p>
          </div>
        )}
        {consultation.referred_to && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
            <ChevronRight size={12} className="text-blue-500" />
            <p className="text-xs text-blue-700 font-medium">
              Referred to: <span className="font-bold capitalize">{consultation.referred_to}</span>
            </p>
          </div>
        )}
      </div>

      {(consultation.patient_id ?? consultation.patientId) && (
        <div className="px-5 pb-4">
          <Link
            href={`/doctor/patients/${consultation.patient_id ?? consultation.patientId}`}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-xs font-semibold text-gray-600 transition-colors"
          >
            View Patient <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT CARD
// ═══════════════════════════════════════════════════════════════════════════════

const PAYMENT_STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  paid: { color: "text-green-700", bg: "bg-green-50", dot: "bg-green-500" },
  pending: { color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  failed: { color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
  Completed: { color: "text-green-700", bg: "bg-green-50", dot: "bg-green-500" },
  Pending: { color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  Failed: { color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
};

export function PaymentCard({ payment }: { payment: Payment | any }) {
  const statusCfg = PAYMENT_STATUS_CONFIG[payment.status ?? ""] ?? { color: "text-gray-600", bg: "bg-gray-50", dot: "bg-gray-400" };
  const date = payment.paid_at ?? payment.created_at ?? payment.processedDate;
  const method = payment.method ?? payment.paymentMethod;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <BadgeDollarSign size={15} className="text-green-600" />
          </div>
          <div>
            <p className="text-base font-extrabold text-gray-900">
              ₦{Number(payment.amount ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
            {date && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {fmtDate(date)}
              </p>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.bg} ${statusCfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          {payment.status}
        </span>
      </div>
      <div className="px-5 py-4 flex items-center gap-4">
        {method && (
          <div className="flex items-center gap-1.5">
            <CreditCard size={12} className="text-gray-400" />
            <p className="text-xs text-gray-600 font-medium capitalize">{method}</p>
          </div>
        )}
        {payment.description && (
          <p className="text-xs text-gray-400 truncate">{payment.description}</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════════════

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-gray-100 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-100 rounded-full w-2/5" />
              <div className="h-2.5 bg-gray-100 rounded-full w-1/4" />
            </div>
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="space-y-2 pl-12">
            <div className="h-2.5 bg-gray-100 rounded-full w-full" />
            <div className="h-2.5 bg-gray-100 rounded-full w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════════

export function EmptyState({ title, description, icon }: {
  title: string; description: string; icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl">
          {icon}
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-600">{title}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR ALERT
// ═══════════════════════════════════════════════════════════════════════════════

export function ErrorAlert({ error, message, onDismiss }: {
  error?: Error; message?: string; onDismiss?: () => void;
}) {
  const msg = message ?? error?.message ?? "An unexpected error occurred.";
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 bg-red-50 border border-red-100 rounded-2xl">
      <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
        <XCircle size={14} className="text-red-600" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-red-700">Something went wrong</p>
        <p className="text-xs text-red-600 mt-0.5">{msg}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors shrink-0">
          ×
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS ALERT
// ═══════════════════════════════════════════════════════════════════════════════

export function SuccessAlert({ message, onDismiss }: {
  message: string; onDismiss?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 bg-green-50 border border-green-100 rounded-2xl">
      <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
        <CheckCircle2 size={14} className="text-green-600" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-green-700">Success</p>
        <p className="text-xs text-green-600 mt-0.5">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-green-400 hover:text-green-600 hover:bg-green-100 transition-colors shrink-0">
          ×
        </button>
      )}
    </div>
  );
}