"use client";

import { useQuery } from "@tanstack/react-query";
import { careTeamKeys } from "../query-keys";
import {
    getPatientCareTeam,
    getBatchPatientsCareTeam,
} from "@/lib/services/care-team.service";
import type { PatientCareTeamSummary } from "@/types/care-team";

const STALE_TIME = 30_000; // 30s cache
const GC_TIME = 5 * 60_000;

export function usePatientCareTeam(patientId?: string) {
    return useQuery<PatientCareTeamSummary>({
        queryKey: careTeamKeys.byPatient(patientId ?? ""),
        queryFn: () => getPatientCareTeam(patientId ?? ""),
        enabled: Boolean(patientId),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useBatchCareTeam(patientIds: string[]) {
    const validIds = (patientIds || []).filter(Boolean);
    return useQuery({
        queryKey: careTeamKeys.batch(validIds),
        queryFn: () => getBatchPatientsCareTeam(validIds),
        enabled: validIds.length > 0,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}
