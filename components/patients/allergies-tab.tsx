"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldAlert, Plus } from "lucide-react";
import { useAllergies, useCreateAllergy, useUpdateAllergy } from "@/hooks/emr/use-clinical-modules";

const SEVERITY_STYLES: Record<string, string> = {
    mild: "bg-green-50 text-green-700 border-green-200",
    moderate: "bg-amber-50 text-amber-700 border-amber-200",
    severe: "bg-red-50 text-red-700 border-red-200",
    "life-threatening": "bg-red-600 text-white border-red-600",
};

export default function AllergiesTab({ patientId, canEdit }: { patientId: string; canEdit: boolean }) {
    const { data: allergies = [], isLoading } = useAllergies(patientId);
    const createAllergy = useCreateAllergy();
    const updateAllergy = useUpdateAllergy();

    const [allergen, setAllergen] = useState("");
    const [category, setCategory] = useState<string>("drug");
    const [severity, setSeverity] = useState<string>("moderate");
    const [reaction, setReaction] = useState("");
    const [notes, setNotes] = useState("");

    const submit = async () => {
        if (!allergen.trim()) return;
        try {
            await createAllergy.mutateAsync({
                patient_id: patientId,
                allergen: allergen.trim(),
                category: category as any,
                severity: severity as any,
                status: "active",
                reaction: reaction.trim() || undefined,
                notes: notes.trim() || undefined,
            });
            setAllergen(""); setReaction(""); setNotes("");
            toast.success("Allergy recorded.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save the allergy.");
        }
    };

    const toggleResolved = async (id: string, status: "active" | "resolved") => {
        try {
            await updateAllergy.mutateAsync({ id, updates: { status } });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Update failed.");
        }
    };

    return (
        <div className="space-y-5">
            {canEdit && (
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                        <ShieldAlert size={16} className="text-red-500" /> Record allergy
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input placeholder="Allergen (e.g. Penicillin, Peanuts…)" value={allergen}
                            onChange={(e) => setAllergen(e.target.value)} />
                        <div className="grid grid-cols-2 gap-3">
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="drug">Drug</SelectItem>
                                    <SelectItem value="food">Food</SelectItem>
                                    <SelectItem value="environmental">Environmental</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={severity} onValueChange={setSeverity}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mild">Mild</SelectItem>
                                    <SelectItem value="moderate">Moderate</SelectItem>
                                    <SelectItem value="severe">Severe</SelectItem>
                                    <SelectItem value="life-threatening">Life-threatening</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Input placeholder="Reaction (e.g. rash, anaphylaxis…)" value={reaction}
                            onChange={(e) => setReaction(e.target.value)} />
                        <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} />
                    </div>
                    <Button onClick={submit} disabled={!allergen.trim() || createAllergy.isPending}
                        className="mt-3 gap-2 bg-red-600 hover:bg-red-700">
                        <Plus size={14} /> Add allergy
                    </Button>
                </div>
            )}

            <div className="space-y-2">
                {isLoading && <p className="text-xs text-gray-400">Loading…</p>}
                {!isLoading && allergies.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                        No allergies on record. Structured allergy data powers automatic prescription safety checks.
                    </p>
                )}
                {allergies.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900">{a.allergen}
                                <span className="ml-2 text-[10px] font-semibold uppercase text-gray-400">{a.category}</span>
                            </p>
                            <p className="truncate text-xs text-gray-500">
                                {a.reaction ?? "No reaction documented"}{a.notes ? ` — ${a.notes}` : ""}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Badge className={`border ${SEVERITY_STYLES[a.severity] ?? ""}`}>{a.severity}</Badge>
                            <Badge variant={a.status === "active" ? "destructive" : "secondary"}>{a.status}</Badge>
                            {canEdit && (
                                <Button size="sm" variant="ghost" className="text-xs"
                                    onClick={() => toggleResolved(a.id, a.status === "active" ? "resolved" : "active")}>
                                    {a.status === "active" ? "Mark resolved" : "Reactivate"}
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
