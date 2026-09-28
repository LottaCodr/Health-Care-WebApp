"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { useCreateReconciliation, useReconciliations } from "@/hooks/emr/use-clinical-modules";
import type { MedReconciliationItem } from "@/types/models";

const ACTION_STYLES: Record<string, string> = {
    continue: "bg-green-50 text-green-700 border-green-200",
    stop: "bg-red-50 text-red-700 border-red-200",
    change: "bg-amber-50 text-amber-700 border-amber-200",
    start: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function ReconciliationTab({ patientId, canEdit }: { patientId: string; canEdit: boolean }) {
    const { data: reconciliations = [] } = useReconciliations(patientId);
    const createReconciliation = useCreateReconciliation();

    const [encounterType, setEncounterType] = useState<string>("admission");
    const [items, setItems] = useState<MedReconciliationItem[]>([]);
    const [summary, setSummary] = useState("");

    const [drugName, setDrugName] = useState("");
    const [dosage, setDosage] = useState("");
    const [frequency, setFrequency] = useState("");
    const [route, setRoute] = useState("oral");
    const [action, setAction] = useState<MedReconciliationItem["action"]>("continue");

    const addItem = () => {
        if (!drugName.trim()) return;
        setItems((prev) => [
            ...prev,
            { drugName: drugName.trim(), dosage: dosage.trim(), frequency: frequency.trim(), route: route.trim(), action },
        ]);
        setDrugName(""); setDosage(""); setFrequency("");
    };

    const submit = async () => {
        if (items.length === 0) {
            toast.error("Add at least one medication to reconcile.");
            return;
        }
        try {
            await createReconciliation.mutateAsync({
                patient_id: patientId,
                encounter_type: encounterType as any,
                medications: items,
                changes_summary: summary.trim() || undefined,
            });
            setItems([]); setSummary("");
            toast.success("Reconciliation saved.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save the reconciliation.");
        }
    };

    return (
        <div className="space-y-5">
            {canEdit && (
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                        <ListChecks size={16} className="text-violet-600" /> New medication reconciliation
                    </p>
                    <div className="mb-3 flex items-center gap-3">
                        <select className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm" value={encounterType}
                            onChange={(e) => setEncounterType(e.target.value)}>
                            <option value="admission">On admission</option>
                            <option value="transfer">On transfer</option>
                            <option value="discharge">On discharge</option>
                        </select>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-6">
                        <Input placeholder="Drug" value={drugName} onChange={(e) => setDrugName(e.target.value)} />
                        <Input placeholder="Dose" value={dosage} onChange={(e) => setDosage(e.target.value)} />
                        <Input placeholder="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
                        <Input placeholder="Route" value={route} onChange={(e) => setRoute(e.target.value)} />
                        <select className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm" value={action}
                            onChange={(e) => setAction(e.target.value as any)}>
                            <option value="continue">Continue</option>
                            <option value="change">Change</option>
                            <option value="stop">Stop</option>
                            <option value="start">Start</option>
                        </select>
                        <Button variant="outline" className="gap-2" onClick={addItem}><Plus size={14} /> Add</Button>
                    </div>

                    {items.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                            {items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                                    <span className="font-bold text-gray-800">{item.drugName}</span>
                                    <span className="text-gray-500">{item.dosage} · {item.frequency} · {item.route}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge className={`border ${ACTION_STYLES[item.action]}`}>{item.action}</Badge>
                                        <button onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                                            className="text-gray-400 hover:text-red-500">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Textarea placeholder="Changes summary (e.g. stopped aspirin, adjusted insulin…)" rows={2}
                        className="mt-3" value={summary} onChange={(e) => setSummary(e.target.value)} />
                    <Button onClick={submit} disabled={items.length === 0 || createReconciliation.isPending}
                        className="mt-3 bg-violet-600 hover:bg-violet-700">
                        Save reconciliation
                    </Button>
                </div>
            )}

            <div className="space-y-2">
                {reconciliations.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                        No reconciliations yet. Reconcile at admission, transfer and discharge.
                    </p>
                )}
                {reconciliations.map((r) => (
                    <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-gray-900">
                                {r.encounter_type.toUpperCase()} reconciliation
                                <span className="ml-2 text-[10px] font-semibold text-gray-400">
                                    {r.performed_at ? new Date(r.performed_at).toLocaleString("en-GB") : ""}
                                </span>
                            </p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {(r.medications ?? []).map((m, i) => (
                                <Badge key={i} variant="outline" className={`border ${ACTION_STYLES[m.action] ?? ""}`}>
                                    {m.drugName} — {m.action}
                                </Badge>
                            ))}
                        </div>
                        {r.changes_summary && <p className="mt-2 text-xs text-gray-600">{r.changes_summary}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
