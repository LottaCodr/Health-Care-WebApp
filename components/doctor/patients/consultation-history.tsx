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

    if (isPending) return <p className="text-center justify-center items-center py-10"><Spinner size="lg" /> Loading consultations...</p>;
    if (isError) return <p className="text-center py-10 text-red-500">Failed to load consultations.</p>;

    if (!data || data.length === 0) return (
        <section className="flex flex-col items-center justify-center py-16 text-center space-y-6">
            <div className="text-blue-700 mb-4">
                <MdHistory size={160} className="opacity-70" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">No Consultation History Yet</h2>
            <p className="text-gray-600 max-w-md text-base">
                You haven’t added any consultations for this patient yet. Start by filling out the consultation form below to keep track of their medical history.
            </p>
            <Button
                onClick={() => {
                    const formSection = document.getElementById("doctor-consultation");
                    if (formSection) formSection.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-white bg-blue-700 hover:bg-blue-800 px-6 py-3 rounded-xl shadow text-lg"
            >
                Add First Consultation
            </Button>
        </section>
    );

    return (
        <section className="space-y-8 relative">
            <Card className="shadow-lg rounded-2xl border bg-white dark:bg-background">
                <CardHeader className="pb-4 border-b flex justify-between items-center">
                    <CardTitle className="text-3xl font-bold text-blue-900">
                        Consultation History
                    </CardTitle>

                    <div className="flex space-x-2">
                        <Button variant="outline" size="icon" onClick={() => scrollCarousel("left")}>
                            <MdChevronLeft size={24} />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => scrollCarousel("right")}>
                            <MdChevronRight size={24} />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <div
                        ref={carouselRef}
                        className="flex overflow-x-auto space-x-6 py-6 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                    >
                        {data.map((consultation) => (
                            <div
                                key={consultation.$id}
                                className="min-w-[300px] flex-shrink-0 border rounded-2xl p-6 snap-start shadow hover:shadow-xl transition bg-gray-50 dark:bg-muted/40 space-y-5"
                            >
                                <div className="flex items-center space-x-3">
                                    <MdEventNote size={24} className="text-blue-700" />
                                    <span className="text-gray-900 font-medium text-lg">
                                        {new Date(consultation.consultationDate).toLocaleDateString()}
                                    </span>
                                </div>

                                <DetailItem icon={<MdMedicalServices className="text-green-700" />} label="Diagnosis" value={consultation.diagnosis} />
                                <DetailItem icon={<MdAssignment className="text-purple-700" />} label="Symptoms" value={consultation.symptom} />
                                <DetailItem icon={<MdLocalPharmacy className="text-pink-700" />} label="Prescription" value={consultation.prescription} />
                                <DetailItem icon={<MdLocalHospital className="text-yellow-700" />} label="Recommendation" value={consultation.recommendation} />
                                <DetailItem icon={<MdLocalHospital className="text-cyan-700" />} label="Referred To" value={consultation.referredTo} />

                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full mt-4"
                                    onClick={() => {
                                        if (confirm("Are you sure you want to delete this consultation?")) {
                                            deleteConsultationMutation(consultation.$id!);
                                        }
                                    }}
                                >
                                    <MdDelete className="mr-2" /> Delete Consultation
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-start space-x-4">
            <div className="mt-1">{icon}</div>
            <div>
                <h4 className="text-base font-semibold text-gray-700">{label}</h4>
                <p className="text-gray-900 text-[15px] leading-relaxed">{value || "Not provided"}</p>
            </div>
        </div>
    );
}
