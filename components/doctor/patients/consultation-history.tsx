"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";

import { getPatientConsultations, deleteConsultation } from "@/actions/consultations/consultation";
import { Consultation } from "@/actions/consultations/types";

import {
    MdHistory,
    MdDelete,
    MdEventNote,
    MdLocalHospital,
    MdMedicalServices,
    MdLocalPharmacy,
    MdAssignment,
    MdChevronLeft,
    MdChevronRight,
    MdInfoOutline,
} from "react-icons/md";

import { FaRegCheckCircle } from "react-icons/fa";

interface Props {
    patientId: string;
}

export default function ConsultationHistoryTable({ patientId }: Props) {
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
            const previousConsultations = queryClient.getQueryData<Consultation[]>(["consultations", patientId]);
            queryClient.setQueryData<Consultation[]>(["consultations", patientId], (old) =>
                old ? old.filter((consultation) => consultation.$id !== consultationId) : []
            );
            return { previousConsultations };
        },
        onError: (err, _, context) => {
            queryClient.setQueryData(["consultations", patientId], context?.previousConsultations);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete consultation.",
            });
        },
        onSettled: () => {
            setDeletingId(null);
            queryClient.invalidateQueries({ queryKey: ["consultations", patientId] });
        },
    });

    //When patient history > 1
    const scrollCarousel = (direction: "left" | "right") => {
        if (carouselRef.current) {
            const { scrollLeft, clientWidth } = carouselRef.current;
            const scrollAmount = clientWidth * 0.8; // 80% of the visible width

            carouselRef.current.scrollTo({
                left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: "smooth",
            });
        }
    };

    if (isPending)
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Spinner size="lg" />
                <span className="mt-6 text-lg text-red-700 font-semibold animate-pulse">Loading consultations...</span>
            </div>
        );

    if (isError)
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <MdHistory size={90} className="text-red-400 mb-4 animate-bounce" />
                <span className="text-center text-red-600 text-lg font-semibold">Failed to load consultations.</span>
                <Button
                    className="mt-6 bg-primary hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["consultations", patientId] })}
                >
                    Retry
                </Button>
            </div>
        );

    if (!data || data.length === 0)
        return (
            <section className="flex flex-col items-center justify-center py-24 text-center space-y-7">
                <div className="text-red-600 mb-4">
                    <MdHistory size={160} className="opacity-70" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">No Consultation History Yet</h2>
                <p className="text-gray-600 dark:text-gray-300 max-w-md text-base">
                    You haven’t added any consultations for this patient yet. Start by filling out the consultation form below to keep track of their medical history.
                </p>
                <Button
                    onClick={() => {
                        const formSection = document.getElementById("doctor-consultation");
                        if (formSection) formSection.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-white bg-primary hover:scale-105 hover:shadow-xl px-7 py-3 rounded-2xl shadow-lg text-lg transition-all duration-200 font-semibold focus:ring-2 focus:ring-red-400"
                >
                    Add First Consultation
                </Button>
            </section>
        );

    return (
        <section className="space-y-8 relative">
            <Card className="shadow-2xl rounded-3xl border border-red-100 bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-background dark:to-muted/40">
                <CardHeader className="pb-4 border-b flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-red-50/60 to-white/0 dark:from-muted/30 dark:to-background rounded-t-3xl gap-4">
                    <div className="flex items-center gap-3">
                        <MdHistory className="text-red-600 text-2xl" />
                        <CardTitle className="text-3xl font-bold text-red-800 flex items-center gap-2">
                            Consultation History
                        </CardTitle>
                        <span className="ml-2 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
                            {data.length} {data.length === 1 ? "consultation" : "consultations"}
                        </span>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => scrollCarousel("left")}
                            className="border-red-200 hover:bg-red-100 dark:hover:bg-muted/30"
                            aria-label="Scroll left"
                        >
                            <MdChevronLeft size={28} className="text-red-600" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => scrollCarousel("right")}
                            className="border-red-200 hover:bg-red-100 dark:hover:bg-muted/30"
                            aria-label="Scroll right"
                        >
                            <MdChevronRight size={28} className="text-red-600" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <div
                        ref={carouselRef}
                        className="flex overflow-x-auto space-x-6 py-8 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                        tabIndex={0}
                        aria-label="Consultation history carousel"
                    >
                        {data.map((consultation, idx) => (
                            <div
                                key={consultation.$id}
                                className="min-w-[340px] max-w-xs flex-shrink-0 border border-red-100 rounded-2xl p-6 snap-start shadow-lg hover:shadow-2xl transition bg-white/95 dark:bg-muted/40 space-y-5 relative group focus-within:ring-2 focus-within:ring-red-300"
                                tabIndex={0}
                                aria-label={`Consultation on ${new Date(consultation.consultationDate).toLocaleDateString()}`}
                            >
                                <div className="flex items-center space-x-3 mb-2">
                                    <MdEventNote size={26} className="text-red-600" />
                                    <span className="text-red-800 font-semibold text-lg tracking-wide">
                                        {new Date(consultation.consultationDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-300">
                                        {new Date(consultation.consultationDate).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                    {consultation.isCompleted && (
                                        <FaRegCheckCircle className="text-green-500 ml-2" title="Consultation completed" />
                                    )}
                                </div>
                                <div className="divide-y divide-red-100 dark:divide-muted/30 space-y-3">
                                    <DetailItem icon={<MdMedicalServices className="text-red-700" />} label="Diagnosis" value={consultation.diagnosis} />
                                    <DetailItem icon={<MdAssignment className="text-red-500" />} label="Symptoms" value={consultation.symptom} />
                                    <DetailItem icon={<MdLocalPharmacy className="text-red-400" />} label="Prescription" value={consultation.prescription} />
                                    <DetailItem icon={<MdLocalHospital className="text-red-300" />} label="Recommendation" value={consultation.recommendation} />
                                    <DetailItem icon={<MdLocalHospital className="text-red-200" />} label="Referred To" value={consultation.referredTo} />
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className={`w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-semibold shadow transition flex items-center justify-center ${deletingId === consultation.$id ? "opacity-60 pointer-events-none" : ""}`}
                                        onClick={() => {
                                            if (window.confirm("Are you sure you want to delete this consultation? This action cannot be undone.")) {
                                                deleteConsultationMutation(consultation.$id!);
                                            }
                                        }}
                                        aria-label="Delete consultation"
                                        disabled={deletingId === consultation.$id}
                                    >
                                        {deletingId === consultation.$id ? (
                                            <>
                                                <Spinner size="sm" /> <span className="ml-2">Deleting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <MdDelete className="mr-2" /> Delete
                                            </>
                                        )}
                                    </Button>
                                    <TooltipInfo consultation={consultation} />
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                    <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded shadow font-semibold tracking-wide">#{idx + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start space-x-4 py-2">
            <div className="mt-1">{icon}</div>
            <div>
                <h4 className="text-base font-semibold text-red-700">{label}</h4>
                <p className="text-gray-900 dark:text-gray-100 text-[15px] leading-relaxed">
                    {value?.trim() ? value : <span className="italic text-gray-400">Not provided</span>}
                </p>
            </div>
        </div>
    );
}

// TooltipInfo: shows more details in a tooltip/popover for accessibility and UX
import { useState as useReactState } from "react";
function TooltipInfo({ consultation }: { consultation: Consultation }) {
    const [show, setShow] = useReactState(false);

    // For accessibility: close popover on Escape
    // (optional: could use useEffect, but keeping it simple for now)

    return (
        <div className="relative">
            <button
                type="button"
                aria-label="Show consultation details"
                className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition focus:outline-none focus:ring-2 focus:ring-red-300"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                onFocus={() => setShow(true)}
                onBlur={() => setShow(false)}
                tabIndex={0}
            >
                <MdInfoOutline size={22} />
            </button>
            {show && (
                <div
                    className="absolute z-50 top-10 right-0 w-72 bg-white dark:bg-muted/90 border border-red-200 rounded-xl shadow-2xl p-5 text-sm text-gray-800 dark:text-gray-100 animate-fade-in"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="mb-3 font-semibold text-red-700 flex items-center gap-2">
                        <MdEventNote className="mr-1" /> Consultation Details
                    </div>
                    <div className="space-y-2">
                        <TooltipDetail label="Date" value={new Date(consultation.consultationDate).toLocaleString()} />
                        <TooltipDetail label="Diagnosis" value={consultation.diagnosis} />
                        <TooltipDetail label="Symptoms" value={consultation.symptom} />
                        <TooltipDetail label="Prescription" value={consultation.prescription} />
                        <TooltipDetail label="Recommendation" value={consultation.recommendation} />
                        <TooltipDetail label="Referred To" value={consultation.referredTo} />
                    </div>
                </div>
            )}
        </div>
    );
}

function TooltipDetail({ label, value }: { label: string; value?: string }) {
    return (
        <div>
            <span className="font-medium">{label}:</span>{" "}
            {value?.trim() ? (
                <span className="text-gray-800 dark:text-gray-100">{value}</span>
            ) : (
                <span className="italic text-gray-400">Not provided</span>
            )}
        </div>
    );
}
