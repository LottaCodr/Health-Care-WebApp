"use client";

/**
 * Hooks for the 24-hour amendment window: editing your own record, and reading
 * / attaching append-only correction notes.
 *
 * Invalidation is deliberately left to the caller (`invalidateKeys`) because
 * every department caches its records under its own query key
 * (["consultations", patientId], ["lab-requests"], ["prescriptions"]…). A
 * record that was just amended must disappear from the queue it was filed in
 * and reappear in the history the clinician is looking at.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    addRecordAddendum,
    amendRecord,
    listRecordAddenda,
    type RecordAddendum,
} from "@/lib/services/amendment.service";
import type { AmendableRecordType } from "@/lib/records/registry";

type QueryKey = readonly (string | number)[];

export const amendmentKeys = {
    all: () => ["record-addenda"] as const,
    forRecord: (type: AmendableRecordType, id: string) =>
        ["record-addenda", type, String(id)] as const,
};

/** Turn a thrown server-action error into a short, human sentence. */
export function amendmentErrorMessage(error: unknown, fallback = "Could not save your changes."): string {
    const raw = error instanceof Error ? error.message : String(error ?? "");
    if (raw.startsWith("LOCKED")) {
        return raw.replace(/^LOCKED(:[a-z_]+)?\s*/i, "");
    }
    if (raw.startsWith("VALIDATION") || raw.startsWith("NOT_FOUND") || raw.startsWith("NOTHING_TO_AMEND")) {
        return raw.replace(/^[A-Z_]+:\s*/i, "");
    }
    if (raw.startsWith("NOT_CONFIGURED")) {
        return "Correction notes are not switched on for this deployment yet (the record_addenda table is missing). Ask an administrator to apply the amendment migration.";
    }
    return raw || fallback;
}

/** True when a failure means "the window closed / this is not yours to edit". */
export function isLockedError(error: unknown): boolean {
    const raw = error instanceof Error ? error.message : String(error ?? "");
    return raw.startsWith("LOCKED");
}

export function useAmendRecord(opts?: {
    /** Query keys to refresh after a successful amendment. */
    invalidateKeys?: QueryKey[];
}) {
    const qc = useQueryClient();
    const keys = opts?.invalidateKeys;

    return useMutation({
        mutationFn: (input: {
            type: AmendableRecordType;
            id: string;
            updates: Record<string, any>;
            reason?: string | null;
            note?: string | null;
        }) => amendRecord(input),

        onSuccess: (result, variables) => {
            toast.success(
                result.amended.length
                    ? `Saved — ${result.amended.length} field${result.amended.length > 1 ? "s" : ""} amended.`
                    : "Saved."
            );
            // The record itself (whatever list/detail query holds it) plus the
            // note list, in case a correction arrived from another tab.
            qc.invalidateQueries({ queryKey: amendmentKeys.forRecord(variables.type, variables.id) });
            keys?.forEach((key) => qc.invalidateQueries({ queryKey: key }));
        },

        onError: (error) => {
            toast.error(amendmentErrorMessage(error), { duration: 7000 });
        },
    });
}

export function useRecordAddenda(
    type: AmendableRecordType,
    id: string | null | undefined,
    opts?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: amendmentKeys.forRecord(type, String(id ?? "")),
        queryFn: () => listRecordAddenda(type, String(id)),
        enabled: (opts?.enabled ?? true) && !!id,
        staleTime: 30_000,
    });
}

export function useAddRecordAddendum(opts?: {
    type: AmendableRecordType;
    id: string;
    invalidateKeys?: QueryKey[];
}) {
    const qc = useQueryClient();
    const { type, id, invalidateKeys } = opts ?? {};

    return useMutation({
        mutationFn: (input: {
            type: AmendableRecordType;
            id: string;
            content: string;
            reason?: string | null;
            patientId?: string | null;
        }) => addRecordAddendum(input),

        onSuccess: () => {
            toast.success("Correction note attached. The original entry is unchanged.");
            if (type && id) {
                qc.invalidateQueries({ queryKey: amendmentKeys.forRecord(type, id) });
            }
            qc.invalidateQueries({ queryKey: amendmentKeys.all() });
            invalidateKeys?.forEach((key) => qc.invalidateQueries({ queryKey: key }));
        },

        onError: (error) => {
            toast.error(amendmentErrorMessage(error, "Could not attach the correction."));
        },
    });
}

export type { RecordAddendum };
