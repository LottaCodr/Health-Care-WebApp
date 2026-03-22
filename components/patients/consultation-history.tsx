"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-provider";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getPatientConsultations, deleteConsultation } from "@/actions/consultations/consultation";
import { Consultation } from "@/actions/consultations/types";
import {
    History, ChevronLeft, ChevronRight, CalendarDays, Stethoscope,
    ClipboardList, Pill, UserRound, ArrowRight, Trash2, CheckCircle2,
    Info, Loader2, AlertTriangle, RefreshCcw,
} from "lucide-react";

interface Props {
    patientId: string;
}

// ─── Field config ─────────────────────────────────────────────────────────────

const FIELDS = [
    { key: "diagnosis",      label: "Diagnosis",       icon: Stethoscope  },
    { key: "symptom",        label: "Symptoms",        icon: ClipboardList },
    { key: "prescription",   label: "Prescription",    icon: Pill         },
    { key: "recommendation", label: "Recommendation",  icon: UserRound    },
    { key: "referredTo",     label: "Referred To",     icon: ArrowRight   },
] as const;

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConsultationHistoryTable({ patientId }: Props) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const carouselRef = useRef<HTMLDivElement>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data, isPending, isError } = useQuery<Consultation[]>({
        queryKey: ["consultations", patientId],
        queryFn: () => getPatientConsultations(patientId),
    });

    const { mutate: deleteConsultationMutation } = useMutation({
        mutationFn: deleteConsultation,
        onMutate: async (consultationId: string) => {
            setDeletingId(consultationId);
            await queryClient.cancelQueries({ queryKey: ["consultations", patientId] });
            const previous = queryClient.getQueryData<Consultation[]>(["consultations", patientId]);
            queryClient.setQueryData<Consultation[]>(["consultations", patientId], (old) =>
                old ? old.filter((c) => c.$id !== consultationId) : []
            );
            return { previous };
        },
        onError: (_err, _id, context) => {
            queryClient.setQueryData(["consultations", patientId], context?.previous);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete consultation." });
        },
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
            deleteConsultationMutation(id);
        }
    };

    // ── Loading ──
    if (isPending) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                    <Loader2 size={22} className="text-red-500 animate-spin" />
                </div>
                <p className="text-sm font-medium text-gray-500">Loading consultations...</p>
            </div>
        );
    }

    // ── Error ──
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle size={22} className="text-red-500" />
                </div>
                <div className="text-center">
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
    }

    // ── Empty ──
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <History size={24} className="text-gray-300" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-700">No Consultation History</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                        {user?.role === "doctor"
                            ? "You haven't added any consultations yet. Fill out the form below to get started."
                            : "The doctor hasn't added any consultations for this patient yet."}
                    </p>
                </div>
                {user?.role === "doctor" && (
                    <button
                        onClick={() => document.getElementById("doctor-consultation")?.scrollIntoView({ behavior: "smooth" })}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-sm font-bold shadow-sm shadow-red-200 transition-colors"
                    >
                        <Stethoscope size={15} />
                        Add First Consultation
                    </button>
                )}
            </div>
        );
    }

    // ── Records ──
    return (
        <section className="space-y-4">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <History size={17} className="text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">Consultation History</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {data.length} {data.length === 1 ? "record" : "records"} on file
                        </p>
                    </div>
                </div>

                {/* Carousel controls */}
                {data.length > 1 && (
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => scroll("left")}
                            aria-label="Scroll left"
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => scroll("right")}
                            aria-label="Scroll right"
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Carousel ── */}
            <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide"
                aria-label="Consultation history"
            >
                {data.map((consultation, idx) => (
                    <ConsultationCard
                        key={consultation.$id}
                        consultation={consultation}
                        index={idx}
                        isDeleting={deletingId === consultation.$id}
                        onDelete={() => handleDelete(consultation.$id!)}
                    />
                ))}
            </div>
        </section>
    );
}

// ─── Consultation card ────────────────────────────────────────────────────────

function ConsultationCard({
    consultation, index, isDeleting, onDelete,
}: {
    consultation: Consultation;
    index: number;
    isDeleting: boolean;
    onDelete: () => void;
}) {
    const [showTooltip, setShowTooltip] = useState(false);

    const date = new Date(consultation.consultationDate);
    const dateStr = date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

    return (
        <div className="min-w-[300px] max-w-[300px] flex-shrink-0 snap-start bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all duration-150 overflow-hidden group">

            {/* Red top accent */}
            <div className="h-1 w-full bg-red-600" />

            <div className="p-5 space-y-4">

                {/* ── Date row ── */}
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

                {/* ── Divider ── */}
                <div className="border-t border-gray-50" />

                {/* ── Fields ── */}
                <div className="space-y-3">
                    {FIELDS.map(({ key, label, icon: Icon }) => {
                        const value = consultation[key as keyof Consultation] as string | undefined;
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

                {/* ── Actions ── */}
                <div className="flex items-center gap-2 pt-1">
                    <button
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-100"
                    >
                        {isDeleting ? (
                            <><Loader2 size={12} className="animate-spin" /> Deleting...</>
                        ) : (
                            <><Trash2 size={12} /> Delete</>
                        )}
                    </button>

                    {/* Info popover */}
                    <div className="relative">
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
                                    const val = consultation[key as keyof Consultation] as string | undefined;
                                    return (
                                        <div key={key}>
                                            <span className="font-semibold text-gray-500">{label}: </span>
                                            <span className="text-gray-700">
                                                {val?.trim() || <span className="italic text-gray-300">Not provided</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}