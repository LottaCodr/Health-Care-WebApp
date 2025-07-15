"use client";

import { useRef } from "react";
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
} from "react-icons/md";

interface Props {
    patientId: string;
}

export default function ConsultationHistoryTable({ patientId }: Props) {
    const queryClient = useQueryClient();
    const carouselRef = useRef<HTMLDivElement>(null);

    const { data, isPending, isError } = useQuery<Consultation[]>({
        queryKey: ["consultations", patientId],
        queryFn: () => getPatientConsultations(patientId),
    });

    const { mutate: deleteConsultationMutation } = useMutation({
        mutationFn: deleteConsultation,
        onMutate: async (consultationId: string) => {
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
            <div className="flex flex-col items-center justify-center py-16">
                <Spinner size="lg" className="text-red-600" />
                <span className="mt-4 text-lg text-red-700 font-semibold animate-pulse">Loading consultations...</span>
            </div>
        );

    if (isError)
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <MdHistory size={80} className="text-red-400 mb-4 animate-bounce" />
                <span className="text-center text-red-600 text-lg font-semibold">Failed to load consultations.</span>
            </div>
        );

    if (!data || data.length === 0)
        return (
            <section className="flex flex-col items-center justify-center py-16 text-center space-y-6">
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
                    className="text-white bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl shadow text-lg transition"
                >
                    Add First Consultation
                </Button>
            </section>
        );

    return (
        <section className="space-y-8 relative">
            <Card className="shadow-2xl rounded-3xl border border-red-100 bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-background dark:to-muted/40">
                <CardHeader className="pb-4 border-b flex justify-between items-center bg-gradient-to-r from-red-50/60 to-white/0 dark:from-muted/30 dark:to-background rounded-t-3xl">
                    <CardTitle className="text-3xl font-bold text-red-800 flex items-center gap-3">
                        <MdHistory className="text-red-600 text-2xl" />
                        Consultation History
                    </CardTitle>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => scrollCarousel("left")}
                            className="border-red-200 hover:bg-red-100 dark:hover:bg-muted/30"
                            aria-label="Scroll left"
                        >
                            <MdChevronLeft size={24} className="text-red-600" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => scrollCarousel("right")}
                            className="border-red-200 hover:bg-red-100 dark:hover:bg-muted/30"
                            aria-label="Scroll right"
                        >
                            <MdChevronRight size={24} className="text-red-600" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <div
                        ref={carouselRef}
                        className="flex overflow-x-auto space-x-6 py-6 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                        tabIndex={0}
                        aria-label="Consultation history carousel"
                    >
                        {data.map((consultation, idx) => (
                            <div
                                key={consultation.$id}
                                className="min-w-[320px] max-w-xs flex-shrink-0 border border-red-100 rounded-2xl p-6 snap-start shadow-lg hover:shadow-2xl transition bg-white/90 dark:bg-muted/40 space-y-5 relative group"
                                tabIndex={0}
                                aria-label={`Consultation on ${new Date(consultation.consultationDate).toLocaleDateString()}`}
                            >
                                <div className="flex items-center space-x-3 mb-2">
                                    <MdEventNote size={24} className="text-red-600" />
                                    <span className="text-red-800 font-semibold text-lg tracking-wide">
                                        {new Date(consultation.consultationDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                                    </span>
                                </div>
                                <div className="divide-y divide-red-100 dark:divide-muted/30 space-y-3">
                                    <DetailItem icon={<MdMedicalServices className="text-red-700" />} label="Diagnosis" value={consultation.diagnosis} />
                                    <DetailItem icon={<MdAssignment className="text-red-500" />} label="Symptoms" value={consultation.symptom} />
                                    <DetailItem icon={<MdLocalPharmacy className="text-red-400" />} label="Prescription" value={consultation.prescription} />
                                    <DetailItem icon={<MdLocalHospital className="text-red-300" />} label="Recommendation" value={consultation.recommendation} />
                                    <DetailItem icon={<MdLocalHospital className="text-red-200" />} label="Referred To" value={consultation.referredTo} />
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold shadow transition"
                                    onClick={() => {
                                        if (confirm("Are you sure you want to delete this consultation?")) {
                                            deleteConsultationMutation(consultation.$id!);
                                        }
                                    }}
                                    aria-label="Delete consultation"
                                >
                                    <MdDelete className="mr-2" /> Delete Consultation
                                </Button>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded shadow">#{idx + 1}</span>
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
