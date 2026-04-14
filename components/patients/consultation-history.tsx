"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";
import { getPatientConsultations, deleteConsultation } from "@/actions/consultations/consultation";
import {
    History, ChevronLeft, ChevronRight, CalendarDays, Stethoscope,
    ClipboardList, Pill, UserRound, ArrowRight, Trash2, CheckCircle2,
    Info, Loader2, AlertTriangle, RefreshCcw, Edit3,
} from "lucide-react";
import { canDelete, canEdit } from "../admin/AdminAuditLog";
// import { canDelete, canEdit } from "@/lib/role-permissions";

interface Props { patientId: string; }

// ─── Field config — Supabase snake_case keys ──────────────────────────────────

const FIELDS = [
    { key: "diagnosis", label: "Diagnosis", icon: Stethoscope },
    { key: "symptoms", label: "Symptoms", icon: ClipboardList }, // ← was "symptom"
    { key: "prescriptions", label: "Prescription", icon: Pill }, // ← was "prescription"
    { key: "recommendations", label: "Recommendation", icon: UserRound }, // ← was "recommendation"
    { key: "referred_to", label: "Referred To", icon: ArrowRight }, // ← was "referredTo"
] as const;

// ─── Helper — get the record id regardless of field name ─────────────────────

function getId(c: any): string {
    return c.id ?? c.$id ?? "";
}

// ─── Helper — get consultation date regardless of field name ─────────────────

function getDate(c: any): Date {
    const raw = c.created_at ?? c.consultation_date ?? c.consultationDate;
    return raw ? new Date(raw) : new Date();
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConsultationHistoryTable({ patientId }: Props) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const carouselRef = useRef<HTMLDivElement>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data, isPending, isError } = useQuery({
        queryKey: ["consultations", patientId],
        queryFn: () => getPatientConsultations(patientId),
        enabled: !!patientId,
    });

    const { mutate: deleteMutation } = useMutation({
        mutationFn: deleteConsultation,
        onMutate: async (consultationId: string) => {
            setDeletingId(consultationId);
            await queryClient.cancelQueries({ queryKey: ["consultations", patientId] });
            const previous = queryClient.getQueryData(["consultations", patientId]);
            queryClient.setQueryData(["consultations", patientId], (old: any[]) =>
                old ? old.filter((c) => getId(c) !== consultationId) : []
            );
            return { previous };
        },
        onError: (_err, _id, context) => {
            queryClient.setQueryData(["consultations", patientId], context?.previous);
            toast.error("Failed to delete consultation.");
        },
        onSuccess: () => toast.success("Consultation deleted."),
        onSettled: () => {
            setDeletingId(null);
            queryClient.invalidateQueries({ queryKey: ["consultations", patientId] });
        },
    });

    const scroll = (dir: "left" | "right") => {
        if (!carouselRef.current) return;
        const amount = carouselRef.current.clientWidth * 0.8;
        carouselRef.current.scrollTo({
            left: carouselRef.current.scrollLeft + (dir === "right" ? amount : -amount),
            behavior: "smooth",
        });
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Delete this consultation? This cannot be undone.")) {
            deleteMutation(id);
        }
    };

    // ── Loading ──
    if (isPending) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <Loader2 size={20} className="text-red-500 animate-spin" />
            </div>
            <p className="text-sm font-medium text-gray-500">Loading consultations...</p>
        </div>
    );

    // ── Error ──
    if (isError) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-700">Failed to load consultations</p>
                <p className="text-xs text-gray-400 mt-1">There was a problem fetching the records.</p>
            </div>
            <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["consultations", patientId] })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
                <RefreshCcw size={14} /> Retry
            </button>
        </div>
    );

    // ── Empty ──
    if (!data || data.length === 0) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <History size={22} className="text-gray-300" />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-700">No Consultation History</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    {user?.role === "Doctor"
                        ? "No consultations yet. Fill out the form above to get started."
                        : "The doctor hasn't added any consultations for this patient yet."}
                </p>
            </div>
            
        </div>
    );

    // ── Records ──
    return (
        <section className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <History size={16} className="text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 leading-tight">Consultation History</p>
                        <p className="text-xs text-gray-400 mt-0.5">{data.length} {data.length === 1 ? "record" : "records"} on file</p>
                    </div>
                </div>
                {data.length > 1 && (
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => scroll("left")} aria-label="Scroll left"
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors shadow-sm">
                            <ChevronLeft size={15} />
                        </button>
                        <button onClick={() => scroll("right")} aria-label="Scroll right"
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors shadow-sm">
                            <ChevronRight size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* Carousel */}
            <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide"
            >
                {data.map((consultation: any, idx: number) => (
                    <ConsultationCard
                        key={getId(consultation)}
                        consultation={consultation}
                        index={idx}
                        isDeleting={deletingId === getId(consultation)}
                        onDelete={() => handleDelete(getId(consultation))}
                        userRole={user?.role}
                    />
                ))}
            </div>
        </section>
    );
}

// ─── Consultation card ────────────────────────────────────────────────────────

function ConsultationCard({
    consultation, index, isDeleting, onDelete, userRole,
}: {
    consultation: any;
    index: number;
    isDeleting: boolean;
    onDelete: () => void;
    userRole?: string;
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const date = getDate(consultation);
    const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    const showDelete = canDelete(userRole ?? "", "consultations");
    const showEdit = canEdit(userRole ?? "", "consultations");

    return (
        <div className="min-w-[300px] max-w-[300px] flex-shrink-0 snap-start bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all duration-150 overflow-hidden group">

            {/* Red accent bar */}
            <div className="h-1 w-full bg-red-600" />

            <div className="p-5 space-y-4">

                {/* Date row */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <CalendarDays size={13} className="text-red-500 shrink-0" />
                            <span className="text-sm font-bold text-gray-800">{dateStr}</span>
                            <CheckCircle2 size={13} className="text-green-500 ml-0.5" />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 pl-5">{timeStr}</p>
                    </div>
                    <span className="text-[10px] font-black text-gray-300 tracking-widest">#{index + 1}</span>
                </div>

                <div className="border-t border-gray-50" />

                {/* Fields */}
                <div className="space-y-3">
                    {FIELDS.map(({ key, label, icon: Icon }) => {
                        const value = consultation[key];
                        return (
                            <div key={key} className="flex items-start gap-2.5">
                                <div className="w-5 h-5 rounded-md bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon size={11} className="text-red-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                                    <p className="text-xs text-gray-700 font-medium mt-0.5 line-clamp-2 leading-relaxed">
                                        {value?.trim()
                                            ? value
                                            : <span className="italic text-gray-300">Not provided</span>
                                        }
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                    {showDelete && (
                        <button
                            onClick={onDelete}
                            disabled={isDeleting}
                            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-100"
                        >
                            {isDeleting
                                ? <><Loader2 size={12} className="animate-spin" /> Deleting...</>
                                : <><Trash2 size={12} /> Delete</>
                            }
                        </button>
                    )}

                    {/* Info tooltip */}
                    <div className="relative ml-auto">
                        <button
                            type="button"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            onFocus={() => setShowTooltip(true)}
                            onBlur={() => setShowTooltip(false)}
                            aria-label="More details"
                            className="w-8 h-8 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            <Info size={13} />
                        </button>

                        {showTooltip && (
                            <div className="absolute z-50 bottom-10 right-0 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 text-xs space-y-2">
                                <p className="font-bold text-gray-800 mb-2">Full Details</p>
                                {FIELDS.map(({ key, label }) => {
                                    const val = consultation[key];
                                    return (
                                        <div key={key}>
                                            <span className="font-semibold text-gray-500">{label}: </span>
                                            <span className="text-gray-700">
                                                {val?.trim() || <span className="italic text-gray-300">Not provided</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div className="pt-1 border-t border-gray-100 mt-2">
                                    <span className="font-semibold text-gray-500">Status: </span>
                                    <span className={`font-bold ${consultation.status === "Completed" ? "text-green-600" : "text-blue-600"}`}>
                                        {consultation.status ?? "—"}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}