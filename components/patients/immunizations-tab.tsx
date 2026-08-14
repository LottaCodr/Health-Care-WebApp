"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Syringe, Plus } from "lucide-react";
import { useCreateImmunization, useImmunizations } from "@/hooks/emr/use-clinical-modules";

export default function ImmunizationsTab({ patientId, canEdit }: { patientId: string; canEdit: boolean }) {
    const { data: immunizations = [], isLoading } = useImmunizations(patientId);
    const createImmunization = useCreateImmunization();

    const [vaccine, setVaccine] = useState("");
    const [dose, setDose] = useState(1);
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [site, setSite] = useState("");
    const [lot, setLot] = useState("");
    const [nextDue, setNextDue] = useState("");

    const submit = async () => {
        if (!vaccine.trim()) return;
        try {
            await createImmunization.mutateAsync({
                patient_id: patientId,
                vaccine: vaccine.trim(),
                dose_number: dose,
                administered_date: date,
                site: site.trim() || undefined,
                lot_number: lot.trim() || undefined,
                next_due_date: nextDue || undefined,
            });
            setVaccine(""); setSite(""); setLot("");
            toast.success("Immunization recorded.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save the immunization.");
        }
    };

    return (
        <div className="space-y-5">
            {canEdit && (
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                        <Syringe size={16} className="text-teal-600" /> Record immunization
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Input placeholder="Vaccine (e.g. BCG, OPV…)" value={vaccine} onChange={(e) => setVaccine(e.target.value)} />
                        <Input type="number" min={1} placeholder="Dose #" value={dose} onChange={(e) => setDose(Number(e.target.value))} />
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        <Input placeholder="Site / route (e.g. left deltoid, IM)" value={site} onChange={(e) => setSite(e.target.value)} />
                        <Input placeholder="Lot number" value={lot} onChange={(e) => setLot(e.target.value)} />
                        <Input type="date" placeholder="Next due date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
                    </div>
                    <Button onClick={submit} disabled={!vaccine.trim() || createImmunization.isPending} className="mt-3 gap-2 bg-teal-600 hover:bg-teal-700">
                        <Plus size={14} /> Add record
                    </Button>
                </div>
            )}

            <div className="space-y-2">
                {isLoading && <p className="text-xs text-gray-400">Loading…</p>}
                {!isLoading && immunizations.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                        No immunization records yet.
                    </p>
                )}
                {immunizations.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-gray-900">{i.vaccine}
                                <span className="ml-2 text-[10px] font-semibold text-gray-400">DOSE {i.dose_number}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                                {i.administered_date}{i.site ? ` · ${i.site}` : ""}{i.lot_number ? ` · Lot ${i.lot_number}` : ""}
                            </p>
                        </div>
                        {i.next_due_date && (
                            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                                Next due {i.next_due_date}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
