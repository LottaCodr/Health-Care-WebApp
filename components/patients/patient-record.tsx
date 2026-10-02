"use client";

/**
 * Shared loader for every role's patient page
 * (`/nurse/queue/patient/[userId]`, `/front-desk/patient/[userId]`, …).
 *
 * Seven routes used to duplicate this logic, and all seven collapsed two very
 * different situations into one screen:
 *
 *   • the patient does not exist            → "Patient not found."
 *   • the record could not be READ (RLS/policy drift, an expired session, a
 *     database that refused or timed out)   → "Patient not found."  ← a lie
 *
 * The second one is what the nurses hit during triage: the patient was in the
 * database, the read had failed, and the screen told them the patient did not
 * exist — with no reason and no way to retry. `lookupPatient` now returns
 * `null` only for a genuinely missing row and throws for a failed read, so the
 * two states can finally be told apart here: a failed read gets the real
 * reason plus a retry, and only a missing row says "not found".
 */

import { usePatient } from "@/hooks/emr/use-patients";
import PatientDetailsComponent from "@/components/patients/patient-detail";
import { AlertTriangle, RefreshCcw, SearchX, ArrowLeft } from "lucide-react";

function LoadingState() {
    return (
        <div className="flex flex-col gap-4 justify-center items-center text-center min-h-[250px]">
            <span
                className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 border-opacity-80"
                aria-label="Loading"
            />
            <span className="text-lg text-primary font-medium sr-only">Loading patient details...</span>
        </div>
    );
}

export default function PatientRecord({ id }: { id: string }) {
    const { data: patient, isPending, isFetching, error, refetch } = usePatient(id);

    if (isPending) return <LoadingState />;

    // The read failed — say so, and offer a way out. NOT "Patient not found":
    // nothing here establishes that the patient is absent.
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                    <AlertTriangle size={28} className="text-amber-500" />
                </div>
                <div className="space-y-1">
                    <p className="text-gray-800 font-semibold">This record could not be opened</p>
                    <p className="text-sm text-gray-500 max-w-md">
                        The system could not read the patient&rsquo;s record just now. The record has not
                        been deleted — this is usually a connection or session problem.
                    </p>
                    {error.message ? (
                        <p className="text-xs text-gray-400 max-w-md break-words">{error.message}</p>
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold"
                    >
                        <RefreshCcw size={15} className={isFetching ? "animate-spin" : ""} />
                        Try again
                    </button>
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 text-sm font-semibold"
                    >
                        <ArrowLeft size={15} /> Go back
                    </button>
                </div>
            </div>
        );
    }

    // A clean null: the database was asked and there is no such patient.
    if (!patient) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <SearchX size={28} className="text-gray-400" />
                </div>
                <div className="space-y-1">
                    <p className="text-gray-600 font-semibold">Patient not found.</p>
                    <p className="text-sm text-gray-400 max-w-md">
                        No patient record matches this link. They may have been removed, or the link may
                        be out of date — search for them again from the queue.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    <ArrowLeft size={15} /> Go back
                </button>
            </div>
        );
    }

    return <PatientDetailsComponent patient={patient} />;
}
