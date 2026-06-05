"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DS from "@/lib/services/patient-documents.service";

export const documentKeys = {
    all:       ()           => ["patient_documents"]                     as const,
    byPatient: (id: string) => ["patient_documents", "patient", id]     as const,
};

export function usePatientDocuments(patientId: string) {
    return useQuery({
        queryKey:             documentKeys.byPatient(patientId),
        queryFn:              () => DS.listPatientDocuments(patientId),
        enabled:              !!patientId,
        staleTime:            2 * 60_000,
        gcTime:               10 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useUploadPatientDocument() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: Parameters<typeof DS.uploadPatientDocument>[0]) =>
            DS.uploadPatientDocument(input),
        onSuccess: (doc) => {
            qc.invalidateQueries({ queryKey: documentKeys.byPatient(doc.patient_id) });
        },
    });
}

export function useDeletePatientDocument() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, storagePath, patientId }: { id: string; storagePath: string; patientId: string }) =>
            DS.deletePatientDocument(id, storagePath),
        onSuccess: (_, { patientId }) => {
            qc.invalidateQueries({ queryKey: documentKeys.byPatient(patientId) });
        },
    });
}