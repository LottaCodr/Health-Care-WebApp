"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as CM from "@/lib/services/clinical-modules.service";
import * as OPS from "@/lib/services/operations.service";
import * as FAC from "@/lib/services/facility.service";
import * as REP from "@/lib/services/reporting.service";
import * as MSG from "@/lib/services/messaging.service";
import * as IO from "@/lib/services/interop.service";
import * as BG from "@/lib/services/break-glass.service";
import * as PORTAL from "@/lib/services/portal.service";

// ─── Keys ─────────────────────────────────────────────────────────────────────
export const allergyKeys = { byPatient: (id: string) => ["allergies", id] as const };
export const immunizationKeys = { byPatient: (id: string) => ["immunizations", id] as const };
export const surgeryKeys = { byPatient: (id: string) => ["surgeries", id] as const, schedule: () => ["surgeries", "schedule"] as const };
export const referralKeys = { byPatient: (id: string) => ["referrals", id] as const };
export const reconciliationKeys = { byPatient: (id: string) => ["med-reconciliations", id] as const };
export const specimenKeys = { all: () => ["specimens"] as const, byPatient: (id: string) => ["specimens", id] as const };
export const wardKeys = { all: () => ["wards"] as const, board: () => ["wards", "board"] as const };
export const batchKeys = { all: () => ["drug-batches"] as const };
export const consentKeys = { byPatient: (id: string) => ["consents", id] as const };
export const deathKeys = { byPatient: (id?: string) => ["death-certificates", id ?? "all"] as const };
export const birthKeys = { byPatient: (id?: string) => ["birth-certificates", id ?? "all"] as const };
export const facilityKeys = { all: () => ["facilities"] as const };

function invalidate(qc: ReturnType<typeof useQueryClient>, keys: readonly unknown[]) {
    qc.invalidateQueries({ queryKey: [...keys] });
}

// ═══════════════════════════════ ALLERGIES ════════════════════════════════════
export function useAllergies(patientId: string) {
    return useQuery({ queryKey: allergyKeys.byPatient(patientId), queryFn: () => CM.listAllergies(patientId), enabled: !!patientId });
}
export function useCreateAllergy() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: CM.createAllergy,
        onSuccess: (a) => invalidate(qc, allergyKeys.byPatient(a.patient_id)),
    });
}
export function useUpdateAllergy() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Parameters<typeof CM.updateAllergy>[1]> }) => CM.updateAllergy(id, updates),
        onSuccess: (a) => invalidate(qc, allergyKeys.byPatient(a.patient_id)),
    });
}

// ═══════════════════════════════ IMMUNIZATIONS ════════════════════════════════
export function useImmunizations(patientId: string) {
    return useQuery({ queryKey: immunizationKeys.byPatient(patientId), queryFn: () => CM.listImmunizations(patientId), enabled: !!patientId });
}
export function useCreateImmunization() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: CM.createImmunization,
        onSuccess: (i) => invalidate(qc, immunizationKeys.byPatient(i.patient_id)),
    });
}

// ════════════════════════════════ SURGERIES ═══════════════════════════════════
export function useSurgeries(patientId: string) {
    return useQuery({ queryKey: surgeryKeys.byPatient(patientId), queryFn: () => CM.listSurgeries(patientId), enabled: !!patientId });
}
export function useSurgerySchedule() {
    return useQuery({ queryKey: surgeryKeys.schedule(), queryFn: CM.listSurgerySchedule, refetchInterval: 30_000 });
}
export function useCreateSurgery() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: CM.createSurgery,
        onSuccess: (s) => { invalidate(qc, surgeryKeys.byPatient(s.patient_id)); invalidate(qc, surgeryKeys.schedule()); },
    });
}
export function useUpdateSurgery() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof CM.updateSurgery>[1] }) => CM.updateSurgery(id, updates),
        onSuccess: (s) => { invalidate(qc, surgeryKeys.byPatient(s.patient_id)); invalidate(qc, surgeryKeys.schedule()); },
    });
}

// ════════════════════════════════ REFERRALS ═══════════════════════════════════
export function useReferrals(patientId: string) {
    return useQuery({ queryKey: referralKeys.byPatient(patientId), queryFn: () => CM.listReferrals(patientId), enabled: !!patientId });
}
export function useCreateReferral() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: CM.createReferral,
        onSuccess: (r) => invalidate(qc, referralKeys.byPatient(r.patient_id)),
    });
}
export function useUpdateReferral() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof CM.updateReferral>[1] }) => CM.updateReferral(id, updates),
        onSuccess: (r) => invalidate(qc, referralKeys.byPatient(r.patient_id)),
    });
}

// ═════════════════════════════ RECONCILIATION ═════════════════════════════════
export function useReconciliations(patientId: string) {
    return useQuery({ queryKey: reconciliationKeys.byPatient(patientId), queryFn: () => CM.listReconciliations(patientId), enabled: !!patientId });
}
export function useCreateReconciliation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: CM.createReconciliation,
        onSuccess: (r) => invalidate(qc, reconciliationKeys.byPatient(r.patient_id)),
    });
}

// ════════════════════════════════ SPECIMENS ═══════════════════════════════════
export function useSpecimens(opts: { patientId?: string; status?: string } = {}) {
    return useQuery({ queryKey: [...specimenKeys.all(), opts.patientId ?? "", opts.status ?? ""], queryFn: () => OPS.listSpecimens(opts) });
}
export function useCreateSpecimen() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: OPS.createSpecimen, onSuccess: () => invalidate(qc, specimenKeys.all()) });
}
export function useUpdateSpecimen() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof OPS.updateSpecimen>[1] }) => OPS.updateSpecimen(id, updates), onSuccess: () => invalidate(qc, specimenKeys.all()) });
}

// ═════════════════════════════════ WARDS ══════════════════════════════════════
export function useWards() {
    return useQuery({ queryKey: wardKeys.all(), queryFn: OPS.listWards });
}
export function useWardBoard() {
    return useQuery({ queryKey: wardKeys.board(), queryFn: OPS.getWardBoard, refetchInterval: 60_000 });
}
export function useUpsertWard() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: OPS.upsertWard, onSuccess: () => { invalidate(qc, wardKeys.all()); invalidate(qc, wardKeys.board()); } });
}

// ═══════════════════════════════ DRUG BATCHES ═════════════════════════════════
export function useBatches(drugId?: string) {
    return useQuery({ queryKey: [...batchKeys.all(), drugId ?? ""], queryFn: () => OPS.listBatches(drugId) });
}
export function useExpiryReport(daysWindow = 90) {
    return useQuery({ queryKey: ["expiry-report", daysWindow], queryFn: () => OPS.getExpiryReport(daysWindow) });
}
export function useCreateBatch() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: OPS.createBatch, onSuccess: () => invalidate(qc, batchKeys.all()) });
}
export function useDecrementBatch() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, amount }: { id: string; amount?: number }) => OPS.decrementBatchQuantity(id, amount), onSuccess: () => invalidate(qc, batchKeys.all()) });
}

// ════════════════════════════════ CONSENTS ════════════════════════════════════
export function useConsents(patientId: string) {
    return useQuery({ queryKey: consentKeys.byPatient(patientId), queryFn: () => OPS.listConsents(patientId), enabled: !!patientId });
}
export function useRecordConsent() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: OPS.recordConsent, onSuccess: (c) => invalidate(qc, consentKeys.byPatient(c.patient_id)) });
}
export function useWithdrawConsent() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, notes }: { id: string; notes?: string }) => OPS.withdrawConsent(id, notes), onSuccess: () => qc.invalidateQueries({ queryKey: ["consents"] }) });
}

// ═══════════════════════════════ CERTIFICATES ═════════════════════════════════
export function useDeathCertificates(patientId?: string) {
    return useQuery({ queryKey: deathKeys.byPatient(patientId), queryFn: () => OPS.listDeathCertificates(patientId) });
}
export function useBirthCertificates(motherPatientId?: string) {
    return useQuery({ queryKey: birthKeys.byPatient(motherPatientId), queryFn: () => OPS.listBirthCertificates(motherPatientId) });
}
export function useCreateDeathCertificate() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: OPS.createDeathCertificate, onSuccess: () => qc.invalidateQueries({ queryKey: ["death-certificates"] }) });
}
export function useCreateBirthCertificate() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: OPS.createBirthCertificate, onSuccess: () => qc.invalidateQueries({ queryKey: ["birth-certificates"] }) });
}

// ═══════════════════════════════ FACILITIES ═══════════════════════════════════
export function useFacilities() {
    return useQuery({ queryKey: facilityKeys.all(), queryFn: FAC.listFacilities });
}
export function useCreateFacility() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: FAC.createFacility, onSuccess: () => invalidate(qc, facilityKeys.all()) });
}
export function useUpdateFacility() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof FAC.updateFacility>[1] }) => FAC.updateFacility(id, updates), onSuccess: () => invalidate(qc, facilityKeys.all()) });
}

// ════════════════════════════════ REPORTING ═══════════════════════════════════
export function useDailyCensus(days = 14) {
    return useQuery({ queryKey: ["report", "census", days], queryFn: () => REP.getDailyCensus(days), staleTime: 5 * 60_000 });
}
export function useRevenueReport(days = 30) {
    return useQuery({ queryKey: ["report", "revenue", days], queryFn: () => REP.getRevenueReport(days), staleTime: 5 * 60_000 });
}
export function useLabTurnaround(days = 30) {
    return useQuery({ queryKey: ["report", "lab-tat", days], queryFn: () => REP.getLabTurnaroundReport(days), staleTime: 5 * 60_000 });
}
export function useMortalityReport() {
    return useQuery({ queryKey: ["report", "mortality"], queryFn: REP.getMortalityReport, staleTime: 5 * 60_000 });
}
export function usePharmacyReport(days = 30) {
    return useQuery({ queryKey: ["report", "pharmacy", days], queryFn: () => REP.getPharmacyDispenseReport(days), staleTime: 5 * 60_000 });
}
export function useSendAppointmentReminders() {
    return useMutation({ mutationFn: (dateISO: string) => MSG.sendAppointmentReminders(dateISO) });
}
export function useSendTestMessage() {
    return useMutation({ mutationFn: ({ channel, to, body, subject }: { channel: "sms" | "email"; to: string; body: string; subject?: string }) => channel === "sms" ? MSG.sendSms(to, body) : MSG.sendEmail(to, subject ?? "", body) });
}

// ═══════════════════════════════ INTEROP ══════════════════════════════════════
export function useFhirExport(patientId: string) {
    return useMutation({ mutationFn: () => IO.buildFhirBundle(patientId) });
}
export function useHl7Export(patientId: string) {
    return useMutation({ mutationFn: () => IO.buildHl7Adt(patientId) });
}

// ═══════════════════════════════ BREAK GLASS ══════════════════════════════════
export function useBreakGlass(patientId: string) {
    return useMutation({ mutationFn: (reason: string) => BG.requestBreakGlass(patientId, reason) });
}
export function useBreakGlassEvents() {
    return useQuery({ queryKey: ["break-glass-events"], queryFn: () => BG.listBreakGlassEvents(100) });
}

// ════════════════════════════════ PORTAL ══════════════════════════════════════
export function usePortalDashboard() {
    return useQuery({ queryKey: ["portal", "dashboard"], queryFn: PORTAL.getPortalDashboard });
}
export function useEnablePortal() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: PORTAL.enablePatientPortal, onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }) });
}
export function useDisablePortal() {
    const qc = useQueryClient();
    return useMutation({ mutationFn: PORTAL.disablePatientPortal, onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }) });
}
