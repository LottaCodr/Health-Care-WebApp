"use client";

import React, { useRef } from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import {
    useConsultationsByPatient,
    usePrescriptionsByPatient,
    useLabRequestsByPatient,
    useNursingActionsByPatient,
} from "@/hooks/emr/use-emr";
import {
    Printer, Download, User, Phone, Mail, Droplets,
    Dna, AlertCircle, MapPin, Calendar, Stethoscope,
    Pill, FlaskConical, HeartPulse, CheckCircle2,
    Clock, Loader2,
} from "lucide-react";
import { Patient } from "@/types/models";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDt(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Print styles injected into <head> ───────────────────────────────────────

const PRINT_STYLES = `
@media print {
    body * { visibility: hidden !important; }
    #patient-record-print, #patient-record-print * { visibility: visible !important; }
    #patient-record-print { position: fixed; inset: 0; background: white; padding: 32px; font-family: Georgia, serif; }
    .no-print { display: none !important; }
    .print-section { page-break-inside: avoid; margin-bottom: 20px; }
    @page { margin: 20mm; size: A4; }
}
`;

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, color, children }: {
    title: string; icon: React.ElementType; color: string; children: React.ReactNode;
}) {
    return (
        <div className="print-section bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                <Icon size={15} className={color} />
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">{title}</p>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function InfoGrid({ items }: { items: { label: string; value?: string | null; red?: boolean }[] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map(({ label, value, red }) => (
                <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                    <p className={`text-sm font-semibold ${red ? "text-red-600" : "text-gray-800"}`}>{value || "—"}</p>
                </div>
            ))}
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { patient: Patient; }

// ─── Main component ───────────────────────────────────────────────────────────

export default function PatientRecordPage({ patient }: Props) {
    const { authorized } = useRoleProtection([UserRole.Doctor, UserRole.Admin]);
    const printRef = useRef<HTMLDivElement>(null);

    const { data: consultations } = useConsultationsByPatient(patient.id!);
    const { data: prescriptions } = usePrescriptionsByPatient(patient.id!);
    const { data: labRequests } = useLabRequestsByPatient(patient.id!);
    const { data: nursing } = useNursingActionsByPatient(patient.id!, { enabled: !!patient.id });

    if (!authorized) return null;

    const completedLabs = labRequests?.filter((r: any) => r.status === "completed") ?? [];
    const vitalsAction = nursing?.filter((a: any) => a.action_type === "Vitals")
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const handlePrint = () => {
        // Inject print styles once
        if (!document.getElementById("patient-record-print-styles")) {
            const style = document.createElement("style");
            style.id = "patient-record-print-styles";
            style.innerHTML = PRINT_STYLES;
            document.head.appendChild(style);
        }
        window.print();
    };

    return (
        <div className="space-y-5">

            {/* ── Toolbar ── */}
            <div className="no-print flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-gray-900">Patient Record</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Complete medical history for {patient.name}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-sm font-bold text-gray-700 shadow-sm transition-all">
                        <Printer size={14} /> Print
                    </button>
                    <button onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-sm font-bold shadow-sm shadow-red-200 transition-all">
                        <Download size={14} /> Export PDF
                    </button>
                </div>
            </div>

            {/* ── Printable region ── */}
            <div id="patient-record-print" ref={printRef} className="space-y-5">

                {/* ── Print header (only visible in print) ── */}
                <div className="hidden print:block mb-6">
                    <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Nile Valley Mother & Child Hospital</h1>
                            <p className="text-sm text-gray-600 mt-1">Patient Medical Record</p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                            <p>Generated: {new Date().toLocaleString("en-GB")}</p>
                            <p>Record ID: {patient.id?.slice(0, 8)?.toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                {/* ── Patient demographics ── */}
                <Section title="Patient Demographics" icon={User} color="text-blue-600">
                    <div className="flex items-start gap-5 mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 text-xl shrink-0">
                            {patient.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900">{patient.name}</h3>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">Patient ID: {patient.id}</p>
                            {patient.status && (
                                <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {patient.status}
                                </span>
                            )}
                        </div>
                    </div>
                    <InfoGrid items={[
                        { label: "Date of Birth", value: fmt(patient.birth_date) },
                        { label: "Gender", value: patient.gender },
                        { label: "Blood Group", value: patient.blood_group ?? patient.blood_group },
                        { label: "Genotype", value: patient.geno_type ?? patient.geno_type },
                        { label: "Phone", value: patient.phone },
                        { label: "Email", value: patient.email },
                        { label: "Occupation", value: patient.occupation },
                        { label: "Religion", value: patient.city },
                        { label: "Address", value: patient.address },
                        { label: "Allergies", value: patient.allergies, red: true },
                        { label: "Medical History", value: patient.significant_medication_history ?? patient.significant_medication_history },
                        { label: "Long-term Meds", value: patient.long_term_medication },
                    ]} />
                </Section>

                {/* ── Latest vitals ── */}
                {vitalsAction && (
                    <Section title="Latest Vitals" icon={HeartPulse} color="text-teal-600">
                        <div className="flex items-center gap-3 mb-3">
                            <p className="text-xs text-gray-400">Recorded {fmtDt(vitalsAction.completion_time ?? vitalsAction.created_at)}</p>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 font-mono">
                            {vitalsAction.description}
                        </p>
                    </Section>
                )}

                {/* ── Consultations ── */}
                <Section title={`Consultations (${consultations?.length ?? 0})`} icon={Stethoscope} color="text-red-600">
                    {!consultations?.length ? (
                        <p className="text-xs text-gray-400 italic">No consultations recorded.</p>
                    ) : (
                        <div className="space-y-3">
                            {consultations.map((c: any) => (
                                <div key={c.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">{fmtDt(c.created_at ?? c.consultation_date)}</p>
                                        {c.status && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                                                ${c.status === "Completed" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                                                {c.status}
                                            </span>
                                        )}
                                    </div>
                                    {c.symptoms && <p className="text-xs text-gray-700 mb-1"><span className="font-bold">Symptoms:</span> {c.symptoms}</p>}
                                    {c.diagnosis && <p className="text-xs text-gray-700 mb-1"><span className="font-bold">Diagnosis:</span> {c.diagnosis}</p>}
                                    {c.recommendations && <p className="text-xs text-gray-700 mb-1"><span className="font-bold">Recommendations:</span> {c.recommendations}</p>}
                                    {c.referred_to && (
                                        <p className="text-xs text-blue-600 mt-1 font-medium">
                                            → Referred to: <span className="font-bold capitalize">{c.referred_to}</span>
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                {/* ── Prescriptions ── */}
                <Section title={`Prescriptions (${prescriptions?.length ?? 0})`} icon={Pill} color="text-violet-600">
                    {!prescriptions?.length ? (
                        <p className="text-xs text-gray-400 italic">No prescriptions recorded.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-2 pr-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Drug</th>
                                        <th className="text-left py-2 pr-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Dosage</th>
                                        <th className="text-left py-2 pr-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Duration</th>
                                        <th className="text-left py-2 pr-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Price</th>
                                        <th className="text-left py-2 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {prescriptions.map((p: any) => (
                                        <tr key={p.id}>
                                            <td className="py-2.5 pr-4 font-semibold text-gray-800">{p.drug_name}</td>
                                            <td className="py-2.5 pr-4 text-gray-600">{p.dosage}</td>
                                            <td className="py-2.5 pr-4 text-gray-600">{p.duration || "—"}</td>
                                            <td className="py-2.5 pr-4 text-gray-800 font-bold">
                                                {p.price ? `₦${Number(p.price).toLocaleString("en-NG")}` : "—"}
                                            </td>
                                            <td className="py-2.5 text-gray-500">{fmt(p.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>

                {/* ── Lab results ── */}
                <Section title={`Lab Results (${completedLabs.length})`} icon={FlaskConical} color="text-indigo-600">
                    {!completedLabs.length ? (
                        <p className="text-xs text-gray-400 italic">No completed lab results.</p>
                    ) : (
                        <div className="space-y-3">
                            {completedLabs.map((r: any) => (
                                <div key={r.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-bold text-gray-800">{r.test_type}</p>
                                        <p className="text-[10px] text-gray-400">{fmt(r.completed_at)}</p>
                                    </div>
                                    {r.result && (
                                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                                            {r.result}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                {/* ── Print footer ── */}
                <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
                    <p>Nile Valley Mother & Child Hospital — Confidential Medical Record</p>
                    <p className="mt-1">This document was generated electronically and is valid without a signature.</p>
                </div>
            </div>
        </div>
    );
}