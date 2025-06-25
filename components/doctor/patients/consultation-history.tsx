
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getPatientConsultations, deleteConsultation } from "@/actions/consultations/consultation";
import { Consultation } from "@/actions/consultations/types";
import { Spinner } from "@/components/ui/spinner";



interface Props {
    patientId: string;
}

export default function ConsultationHistoryTable({ patientId }: Props) {
    const queryClient = useQueryClient();

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
                old ? old.filter((consultation) => consultation.patientId !== consultationId) : []
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

    if (isPending) return <p className="text-center justify-center items-center py-10"> <Spinner size="lg" /> Loading consultations...</p>;
    if (isError) return <p className="text-center py-10 text-red-500">Failed to load consultations.</p>;
    if (!data || data === 0) return <p className="text-center py-10">No consultations found.</p>;

    return (
        <section>
            <Card className="shadow-lg rounded-2xl border bg-white dark:bg-background">
                <CardHeader className="pb-4 border-b">
                    <CardTitle className="text-2xl font-semibold text-blue-900">
                        Consultation History
                    </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr className="text-left border-b">
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Diagnosis</th>
                                <th className="px-4 py-2">Prescription</th>
                                <th className="px-4 py-2">Referred To</th>
                                <th className="px-4 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.map((consultation) => (
                                <tr key={consultation.$id} className="border-b">
                                    <td className="px-4 py-2">{new Date(consultation.consultationDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">{consultation.diagnosis}</td>
                                    <td className="px-4 py-2">{consultation.prescription}</td>
                                    <td className="px-4 py-2 capitalize">{consultation.referredTo}</td>
                                    <td className="px-4 py-2">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => deleteConsultationMutation(consultation.$id)}
                                        >
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </section>
    );
}
