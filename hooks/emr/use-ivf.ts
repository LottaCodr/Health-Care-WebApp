"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as IVF from "@/lib/services/ivf.service";

export const ivfKeys = {
    workspace: (facilityId: string) => ["ivf", "workspace", facilityId] as const,
    cycles: (facilityId?: string) => ["ivf", "cycles", facilityId ?? "all"] as const,
    monitoring: (cycleId: string) => ["ivf", "monitoring", cycleId] as const,
    semen: (cycleId: string) => ["ivf", "semen", cycleId] as const,
    retrievals: (cycleId: string) => ["ivf", "retrievals", cycleId] as const,
    oocytes: (cycleId: string) => ["ivf", "oocytes", cycleId] as const,
    embryos: (cycleId: string) => ["ivf", "embryos", cycleId] as const,
    cryo: (facilityId: string) => ["ivf", "cryo", facilityId] as const,
    consents: (cycleId: string) => ["ivf", "consents", cycleId] as const,
    outcomes: (cycleId: string) => ["ivf", "outcomes", cycleId] as const,
    patientSearch: (query: string) => ["ivf", "patient-search", query] as const,
    witnesses: (facilityId: string) => ["ivf", "witnesses", facilityId] as const,
};

export function useIVFWorkspace(facilityId?: string) {
    return useQuery({
        queryKey: ivfKeys.workspace(facilityId ?? ""),
        queryFn: () => IVF.getIVFWorkspace(facilityId!),
        enabled: !!facilityId,
        staleTime: 20_000,
        refetchOnWindowFocus: false,
    });
}

export function useIVFCycles(facilityId?: string) {
    return useQuery({
        queryKey: ivfKeys.cycles(facilityId),
        queryFn: () => IVF.listIVFCycles(facilityId),
        staleTime: 20_000,
        refetchOnWindowFocus: false,
    });
}

export function useIVFMonitoring(cycleId?: string) {
    return useQuery({
        queryKey: ivfKeys.monitoring(cycleId ?? ""),
        queryFn: () => IVF.listIVFMonitoring(cycleId!),
        enabled: !!cycleId,
        staleTime: 20_000,
    });
}

export function useIVFSemenSamples(cycleId?: string) {
    return useQuery({
        queryKey: ivfKeys.semen(cycleId ?? ""),
        queryFn: () => IVF.listIVFSemenSamples(cycleId!),
        enabled: !!cycleId,
        staleTime: 20_000,
    });
}

export function useIVFRetrievals(cycleId?: string) {
    return useQuery({
        queryKey: ivfKeys.retrievals(cycleId ?? ""),
        queryFn: () => IVF.listIVFRetrievals(cycleId!),
        enabled: !!cycleId,
        staleTime: 20_000,
    });
}

export function useIVFOocytes(cycleId?: string) {
    return useQuery({
        queryKey: ivfKeys.oocytes(cycleId ?? ""),
        queryFn: () => IVF.listIVFOocytes(cycleId!),
        enabled: !!cycleId,
        staleTime: 20_000,
    });
}

export function useIVFEmbryos(cycleId?: string) {
    return useQuery({
        queryKey: ivfKeys.embryos(cycleId ?? ""),
        queryFn: () => IVF.listIVFEmbryos(cycleId!),
        enabled: !!cycleId,
        staleTime: 20_000,
    });
}

export function useIVFCryoInventory(facilityId?: string) {
    return useQuery({
        queryKey: ivfKeys.cryo(facilityId ?? ""),
        queryFn: () => IVF.listIVFCryoInventory(facilityId!),
        enabled: !!facilityId,
        staleTime: 20_000,
    });
}

export function useIVFConsents(cycleId?: string) {
    return useQuery({
        queryKey: ivfKeys.consents(cycleId ?? ""),
        queryFn: () => IVF.listIVFConsents(cycleId!),
        enabled: !!cycleId,
        staleTime: 20_000,
    });
}

export function useIVFOutcomes(cycleId?: string) {
    return useQuery({
        queryKey: ivfKeys.outcomes(cycleId ?? ""),
        queryFn: () => IVF.listIVFOutcomes(cycleId!),
        enabled: !!cycleId,
        staleTime: 20_000,
    });
}

export function useIVFWitnesses(facilityId?: string) {
    return useQuery({
        queryKey: ivfKeys.witnesses(facilityId ?? ""),
        queryFn: () => IVF.listIVFWitnesses(facilityId!),
        enabled: !!facilityId,
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useSearchIVFPatients(query: string) {
    return useQuery({
        queryKey: ivfKeys.patientSearch(query),
        queryFn: () => IVF.searchIVFPatients(query),
        enabled: query.trim().length >= 2,
        staleTime: 30_000,
        placeholderData: (previous) => previous,
    });
}

export function useCreateIVFCycle() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: IVF.createIVFCycle,
        onSuccess: (cycle) => {
            qc.invalidateQueries({ queryKey: ["ivf", "workspace", cycle.facility_id] });
            qc.invalidateQueries({ queryKey: ["ivf", "cycles"] });
        },
    });
}

export function useUpdateIVFCycle() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof IVF.updateIVFCycle>[1] }) => IVF.updateIVFCycle(id, updates),
        onSuccess: (cycle) => {
            qc.invalidateQueries({ queryKey: ["ivf", "workspace"] });
            qc.invalidateQueries({ queryKey: ivfKeys.cycles(cycle.facility_id) });
        },
    });
}

export function useCreateIVFMonitoring() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: IVF.createIVFMonitoring,
        onSuccess: (visit) => qc.invalidateQueries({ queryKey: ivfKeys.monitoring(visit.cycle_id) }),
    });
}

export function useCreateIVFSemenSample() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: IVF.createIVFSemenSample,
        onSuccess: (sample) => qc.invalidateQueries({ queryKey: ivfKeys.semen(sample.cycle_id) }),
    });
}

export function useCreateIVFRetrieval() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: IVF.createIVFRetrieval,
        onSuccess: (retrieval) => qc.invalidateQueries({ queryKey: ivfKeys.retrievals(retrieval.cycle_id) }),
    });
}

export function useCreateIVFOocyte() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: IVF.createIVFOocyte,
        onSuccess: (oocyte) => qc.invalidateQueries({ queryKey: ivfKeys.oocytes(oocyte.cycle_id) }),
    });
}

export function useCreateIVFEmbryo() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: IVF.createIVFEmbryo,
        onSuccess: (embryo) => qc.invalidateQueries({ queryKey: ivfKeys.embryos(embryo.cycle_id) }),
    });
}

export function useUpdateIVFEmbryo() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof IVF.updateIVFEmbryo>[1] }) => IVF.updateIVFEmbryo(id, updates),
        onSuccess: (embryo) => qc.invalidateQueries({ queryKey: ivfKeys.embryos(embryo.cycle_id) }),
    });
}

export function useCreateIVFCryo() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: IVF.createIVFCryo,
        onSuccess: (item) => {
            qc.invalidateQueries({ queryKey: ivfKeys.cryo(item.facility_id) });
            qc.invalidateQueries({ queryKey: ["ivf", "workspace", item.facility_id] });
        },
    });
}

export function useRecordIVFLabEvent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: IVF.recordIVFLabEvent,
        onSuccess: (event) => qc.invalidateQueries({ queryKey: ["ivf", "workspace", event.facility_id] }),
    });
}

export function useCreateIVFConsent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: IVF.createIVFConsent,
        onSuccess: (consent) => {
            qc.invalidateQueries({ queryKey: ivfKeys.consents(consent.cycle_id) });
            qc.invalidateQueries({ queryKey: ["ivf", "workspace"] });
        },
    });
}

export function useUpsertIVFOutcome() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: IVF.upsertIVFOutcome,
        onSuccess: (outcome) => {
            qc.invalidateQueries({ queryKey: ivfKeys.outcomes(outcome.cycle_id) });
            qc.invalidateQueries({ queryKey: ["ivf", "workspace"] });
        },
    });
}
