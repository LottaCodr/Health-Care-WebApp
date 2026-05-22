"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DS from "@/lib/services/discharge.service";
import { patientKeys } from "../query-keys";
import { dischargeKeys } from "../query-keys";


export function useDischargeNoteByPatient(patientId: string) {
    return useQuery({
        queryKey:             dischargeKeys.byPatient(patientId),
        queryFn:              () => DS.getDischargeNoteByPatient(patientId),
        enabled:              !!patientId,
        staleTime:            5 * 60_000,
        gcTime:               10 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useCreateDischargeNote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: DS.CreateDischargeNoteInput) => DS.createDischargeNote(input),
        onSuccess: (note: any) => {
            const pid = note?.patient_id ?? note?.patientId;
            if (pid) {
                qc.invalidateQueries({ queryKey: dischargeKeys.byPatient(pid) });
                qc.invalidateQueries({ queryKey: patientKeys.detail(pid) });
            }
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}