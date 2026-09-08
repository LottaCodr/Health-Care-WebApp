"use client";

/**
 * Saved-discharge-note amendment card.
 *
 * The discharge form itself is write-once (it builds a new note from the
 * Zustand store), so the 24-hour correction path for a note that has already
 * been filed lives here: the doctor sees what was saved, edits it while the
 * window is open, and can always attach a correction note afterwards.
 */

import { useAuth } from "@/context/auth-provider";
import { useDischargeNoteByPatient } from "@/hooks/emr/use-discharge";
import { dischargeKeys } from "@/hooks/query-keys";
import { RecordAmendmentControls } from "@/components/records";
import { fmtDate, fmtFull } from "@/lib/utils";
import { ClipboardCheck, Loader2 } from "lucide-react";

export function DischargeNoteAmendmentCard({ patientId }: { patientId: string }) {
    const { user } = useAuth();
    const noteId = String(user?.id ?? (user as any)?.$id ?? "");
    const { data: note, isLoading } = useDischargeNoteByPatient(patientId);

    if (isLoading) {
        return (
            <p className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin" /> Checking the filed discharge summary…
            </p>
        );
    }
    if (!note) return null;

    const row = note as Record<string, any>;
    const authoredByMe = !row.doctor_id || row.doctor_id === noteId;

    return (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <ClipboardCheck size={12} className="text-emerald-500" /> Filed discharge summary
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        Saved {fmtDate(row.created_at)} at {fmtFull(row.created_at)}
                        {row.final_diagnosis ? (
                            <>
                                {" · "}
                                <span className="font-semibold text-gray-700">{row.final_diagnosis}</span>
                            </>
                        ) : null}
                    </p>
                    {!authoredByMe && (
                        <p className="mt-1 text-[10px] font-medium text-gray-400">
                            Filed by another clinician — you can attach a correction, not rewrite it.
                        </p>
                    )}
                </div>
            </div>

            <RecordAmendmentControls
                type="discharge_note"
                id={String(row.id)}
                row={row}
                actorId={noteId}
                patientId={patientId}
                invalidateKeys={[dischargeKeys.byPatient(patientId), dischargeKeys.all()]}
                contextLine="Corrections stay attached to the signed summary"
            />
        </div>
    );
}
