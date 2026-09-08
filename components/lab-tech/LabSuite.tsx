"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { useLabRequest, useUpdateLabRequest, useUpdatePatientStatus } from "@/hooks/emr/use-emr";
import { LoadingSkeleton, SuccessAlert } from "@/components/emr";
import { Beaker, Clock, User, Calendar, FileText, AlertTriangle, Phone, Hash, Droplets, FlaskConical } from "lucide-react";
import TestTemplateForm from "./TestTemplateForm";
import { findTemplate } from "./test-templates";
import { displayHospitalNumber, getPatientHospitalNumber } from "@/lib/hospital-number";
import { RecordAmendmentControls } from "@/components/records";
import { calculateAge } from "@/utils/export";
import { fmtDate } from "@/lib/utils";

interface LabSuiteProps {
    requestId: string;
    onComplete?: () => void;
}

export default function LabSuite({ requestId, onComplete }: LabSuiteProps) {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: request, isLoading: requestLoading } = useLabRequest(requestId);

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [price, setPrice] = useState("");
    const updatePatientStatusMutation = useUpdatePatientStatus();
    const updateLabRequestMutation = useUpdateLabRequest();

    if (!authorized) return null;

    const handleTemplateSubmit = async (resultString: string) => {
        setSubmitting(true);
        try {
            const parsedPrice = Number(price);

            // The service (lab.service.ts updateLabRequest) handles everything:
            //  • persists the price
            //  • creates / updates a pending payment when price > 0
            //  • routes the patient to "awaiting-payment" (billable) or
            //    "under-observation" (no charge) on completion
            updateLabRequestMutation.mutate({
                id: requestId,
                updates: {
                    status: "completed",
                    completed_by: user?.$id ?? user?.id,
                    completed_at: new Date().toISOString(),
                    result: resultString,
                    ...(parsedPrice > 0 ? { price: parsedPrice } : {}),
                },
            });

            setSuccess(
                parsedPrice > 0
                    ? "Test results submitted. A payment bill has been created — the patient is now in the front-desk billing queue."
                    : "Test results submitted successfully."
            );
            if (onComplete) setTimeout(onComplete, 2000);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (requestLoading) return <LoadingSkeleton rows={5} />;

    const template = findTemplate(request?.test_type);
    const patient: any = (request as any)?.patients ?? null;
    const patientName = patient?.name ?? null;
    const patientAge = patient?.birth_date ? calculateAge(patient.birth_date) : null;
    // Precise age in years — required by the hematology analyzer template so
    // the newborn (0–28 days) vs child (28 days–17 yrs) boundary is exact.
    const patientAgePrecise = patient?.birth_date
        ? Math.max(0, (Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 86400000))
        : null;

    return (
        <div className="space-y-6">
            {success && <SuccessAlert message={success} />}

            {/* Patient + Request info card - properly arranged */}
            {request && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Patient header - important details at top */}
                    {patient && (
                        <div className="px-6 py-5 bg-gradient-to-br from-indigo-50 to-blue-50 border-b border-indigo-100">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shrink-0 text-white font-black shadow-sm">
                                    {patientName ? patientName.split(" ").map((n:string)=>n[0]).slice(0,2).join("").toUpperCase() : <User size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-bold text-gray-900">{patientName}</h3>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-[10px] font-mono font-bold text-indigo-700">
                                            <Hash size={10} /> {displayHospitalNumber(getPatientHospitalNumber(patient))}
                                        </span>
                                        {patient?.gender && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{patient.gender}</span>
                                        )}
                                        {patientAge !== null && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{patientAge} yrs</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-600">
                                        {patient?.phone && <span className="flex items-center gap-1"><Phone size={11} className="text-gray-400" /> {patient.phone}</span>}
                                        {patient?.blood_group && <span className="flex items-center gap-1 font-semibold text-red-700"><Droplets size={11} /> {patient.blood_group}</span>}
                                        {patient?.geno_type && <span className="text-gray-500">Genotype: {patient.geno_type}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                    <Beaker className="text-indigo-600" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{request?.test_type ?? "Lab Test"}</h3>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {template && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                <FlaskConical size={10} /> {template.category}
                                            </span>
                                        )}
                                        {!template && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                                <AlertTriangle size={9} />
                                                No template – free text
                                            </span>
                                        )}
                                        {request.priority && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                request.priority === "stat" ? "bg-red-50 text-red-700 border-red-100" :
                                                request.priority === "urgent" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                "bg-gray-50 text-gray-600 border-gray-100"
                                            }`}>
                                                <Clock size={9} />
                                                {request.priority.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Doctor's notes */}
                        {request.notes && (
                            <div className="mt-4 px-4 py-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <FileText size={11} className="text-blue-500" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Doctor&apos;s Note</p>
                                </div>
                                <p className="text-sm text-blue-800 leading-relaxed">{request.notes}</p>
                            </div>
                        )}

                        {/* Meta strip - properly arranged */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                            <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hospital No.</p>
                                <p className="text-xs font-mono font-bold text-gray-800 mt-1">{displayHospitalNumber(getPatientHospitalNumber(patient))}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Requested</p>
                                <p className="text-xs font-semibold text-gray-800 mt-1">{request.created_at ? fmtDate(request.created_at) : "—"}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Priority</p>
                                <p className="text-xs font-bold text-gray-800 mt-1 capitalize">{request.priority ?? "Routine"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Filed result: editable by the scientist who filed it for 24h ──
                    The template form below can be resubmitted, which would
                    silently overwrite a signed result; this panel is the only
                    sanctioned way to change it, and after 24h it becomes an
                    append-only correction note instead. */}
            {request?.result && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Filed result — {request.completed_at ? fmtDate(request.completed_at) : fmtDate(request.created_at)}
                        </p>
                        <RecordAmendmentControls
                            type="lab_result"
                            id={requestId}
                            row={request as Record<string, any>}
                            patientId={request.visit_id ?? request.patient_id ?? null}
                            invalidateKeys={[["lab"]]}
                            contextLine={request.test_type ?? "Lab result"}
                        />
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                        {request.result}
                    </pre>
                </div>
            )}

            {/* Template-based form - properly arranged with patient context */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-50 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <FileText size={13} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500">Lab Result Entry</p>
                            <p className="text-xs text-gray-400">Structured template • reference ranges • auto-reflected in frontdesk billing</p>
                        </div>
                    </div>

                    {/* Optional Price for Billing */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Price (NGN):</span>
                        <div className="relative w-32">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₦</span>
                            <input
                                type="number"
                                min="0"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="e.g. 5000"
                                className="w-full h-8 pl-6 pr-2 text-xs font-bold rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                        </div>
                    </div>
                </div>

                <TestTemplateForm
                    testType={request?.test_type ?? ""}
                    onSubmit={handleTemplateSubmit}
                    submitting={submitting}
                    patient={{ age: patientAgePrecise, gender: patient?.gender ?? null, name: patientName }}
                    sampleId={request?.visit_id ?? request?.patient_id ?? null}
                />
            </div>
        </div>
    );
}
