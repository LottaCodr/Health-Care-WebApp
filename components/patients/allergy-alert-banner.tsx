"use client";

import { useMemo } from "react";
import { useAllergies } from "@/hooks/emr/use-clinical-modules";
import { ShieldAlert, ArrowRight } from "lucide-react";

const SEVERITY_RANK: Record<string, number> = {
    "life-threatening": 4,
    severe: 3,
    moderate: 2,
    mild: 1,
};

interface Props {
    patientId: string;
    /** Free-text allergies field on the patient record (legacy data). */
    legacyAllergies?: string | null;
    onViewAllergies?: () => void;
}

/**
 * High-visibility allergy alert shown at the very top of the patient detail.
 * A pulsating signal + soft red glow makes it impossible for any staff member
 * to miss. Combines structured allergies (patient_allergies table) with the
 * legacy free-text field, and links straight to the Allergies tab.
 */
export default function AllergyAlertBanner({ patientId, legacyAllergies, onViewAllergies }: Props) {
    const { data: allergies = [], isLoading } = useAllergies(patientId);

    const active = useMemo(
        () => allergies.filter((a) => a.status !== "resolved"),
        [allergies]
    );

    const legacy = legacyAllergies?.trim();

    if ((isLoading && !legacy) || (!active.length && !legacy)) return null;

    const worst = active.reduce<any | null>((acc, a) => {
        const rank = SEVERITY_RANK[a.severity] ?? 0;
        if (!acc || rank > (SEVERITY_RANK[acc.severity] ?? 0)) return a;
        return acc;
    }, null);
    const critical = worst && (SEVERITY_RANK[worst.severity] ?? 0) >= 3;
    const shown = active.slice(0, 3).map((a) => a.allergen);

    const viewAll = () => {
        onViewAllergies?.();
        // Fallback hook — PatientDetailTabs listens for this event and opens
        // the Allergies tab.
        window.dispatchEvent(new CustomEvent("emr:open-allergies"));
    };

    return (
        <div
            role="alert"
            aria-live="polite"
            className={`animate-alert-glow relative flex flex-col gap-3 rounded-2xl border px-4 py-3.5 shadow-sm sm:flex-row sm:items-center ${
                critical
                    ? "border-red-500 bg-gradient-to-r from-red-600 to-rose-600 text-white"
                    : "border-red-200 bg-red-50 text-red-800"
            }`}
        >
            <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* Pulsating signal dot */}
                <span className="relative flex h-3 w-3 shrink-0">
                    <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                            critical ? "bg-white" : "bg-red-500"
                        }`}
                    />
                    <span
                        className={`relative inline-flex h-3 w-3 rounded-full ${
                            critical ? "bg-white" : "bg-red-500"
                        }`}
                    />
                </span>
                <ShieldAlert size={18} className="shrink-0" />
                <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wider sm:text-sm">
                        {critical ? "Severe Allergy Alert" : "Allergy Alert"}
                        {critical && (
                            <span className="rounded-full bg-white/25 px-2 py-0.5 text-[9px] font-black tracking-widest">
                                High risk
                            </span>
                        )}
                    </p>
                    <p
                        className={`mt-0.5 line-clamp-2 text-xs leading-snug ${
                            critical ? "text-white/90" : "text-red-700"
                        }`}
                    >
                        {active.length > 0 && (
                            <span className="font-semibold">
                                {shown.join(", ")}
                                {active.length > 3 ? ` +${active.length - 3} more` : ""}
                            </span>
                        )}
                        {legacy && (
                            <span> {active.length > 0 ? "·" : ""} {legacy}</span>
                        )}
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={viewAll}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                    critical
                        ? "border-white/60 bg-white text-red-700 hover:bg-red-50"
                        : "border-red-600 bg-red-600 text-white hover:bg-red-700"
                }`}
            >
                View allergies <ArrowRight size={13} />
            </button>
        </div>
    );
}
