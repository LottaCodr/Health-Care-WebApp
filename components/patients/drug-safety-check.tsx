"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Search } from "lucide-react";
import { checkDrugSafety } from "@/lib/clinical/drug-interactions";
import { useAllergies } from "@/hooks/emr/use-clinical-modules";

/**
 * Offline drug-safety checker shown on the Prescriptions tab: checks a
 * candidate drug against the patient's structured allergies and the built-in
 * interaction table — no network required.
 */
export default function DrugSafetyCheck({ patientId }: { patientId: string }) {
    const { data: allergies = [] } = useAllergies(patientId);
    const [drug, setDrug] = useState("");
    const [currentMeds, setCurrentMeds] = useState("");

    const activeAllergies = useMemo(() => allergies.filter((a) => a.status === "active"), [allergies]);
    const meds = useMemo(() => currentMeds.split(",").map((m) => m.trim()).filter(Boolean), [currentMeds]);
    const result = useMemo(
        () => (drug.trim() ? checkDrugSafety(drug.trim(), activeAllergies, meds) : null),
        [drug, activeAllergies, meds]
    );

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-900">
                {result ? (result.safe ? <ShieldCheck size={16} className="text-green-500" /> : <ShieldAlert size={16} className="text-red-500" />) : <ShieldCheck size={16} className="text-gray-300" />}
                Drug safety check <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">offline</span>
            </p>
            <p className="mb-3 text-xs text-gray-500">
                {activeAllergies.length > 0
                    ? `${activeAllergies.length} active allergies on record. Checks allergies + major interactions.`
                    : "No structured allergies on record — checks major drug interactions only."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Input placeholder="Drug to check (e.g. ibuprofen)" value={drug} onChange={(e) => setDrug(e.target.value)} />
                <Input placeholder="Current meds, comma-separated" value={currentMeds} onChange={(e) => setCurrentMeds(e.target.value)} />
                <Button variant="outline" className="gap-2 shrink-0" onClick={() => setDrug("")}>
                    <Search size={14} /> Clear
                </Button>
            </div>

            {result && (
                <div className="mt-3 space-y-2">
                    {result.safe && (
                        <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                            No allergy or major-interaction flags found in the local database.
                        </p>
                    )}
                    {result.allergies.map((a, i) => (
                        <div key={`a-${i}`} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs">
                            <p className="font-bold text-red-700">
                                <Badge className="mr-1 border-red-200 bg-red-600 text-white">{a.severity}</Badge>
                                Allergy: {a.other}
                            </p>
                            <p className="mt-1 text-red-700">{a.description}</p>
                            <p className="mt-0.5 font-semibold text-red-800">{a.recommendation}</p>
                        </div>
                    ))}
                    {result.interactions.map((x, i) => (
                        <div key={`i-${i}`} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs">
                            <p className="font-bold text-amber-800">
                                <Badge className="mr-1 border-amber-200 bg-amber-500 text-white">{x.severity}</Badge>
                                Interaction with {x.other}
                            </p>
                            <p className="mt-1 text-amber-800">{x.description}</p>
                            <p className="mt-0.5 font-semibold text-amber-900">{x.recommendation}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
