"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Scissors, Plus } from "lucide-react";
import { useCreateSurgery, useSurgeries, useUpdateSurgery } from "@/hooks/emr/use-clinical-modules";
import type { SurgeryStatus } from "@/types/models";

const STATUS_STYLES: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    "in-progress": "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function SurgeryTab({ patientId, staffId, canEdit }: { patientId: string; staffId: string; canEdit: boolean }) {
    const { data: surgeries = [], isLoading } = useSurgeries(patientId);
    const createSurgery = useCreateSurgery();
    const updateSurgery = useUpdateSurgery();

    const [procedure, setProcedure] = useState("");
    const [urgency, setUrgency] = useState<string>("elective");
    const [theatre, setTheatre] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [diagnosis, setDiagnosis] = useState("");

    const submit = async () => {
        if (!procedure.trim()) return;
        try {
            await createSurgery.mutateAsync({
                patient_id: patientId,
                surgeon_id: staffId,
                procedure_name: procedure.trim(),
                urgency: urgency as any,
                theatre: theatre.trim() || undefined,
                scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                pre_op_diagnosis: diagnosis.trim() || undefined,
                status: "scheduled",
            });
            setProcedure(""); setTheatre(""); setDiagnosis("");
            toast.success("Surgery scheduled.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not schedule the surgery.");
        }
    };

    const advance = async (id: string, next: SurgeryStatus) => {
        try {
            const patch: Record<string, any> = { status: next };
            if (next === "in-progress") patch.started_at = new Date().toISOString();
            if (next === "completed") patch.completed_at = new Date().toISOString();
            await updateSurgery.mutateAsync({ id, updates: patch });
            toast.success(`Status → ${next}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Update failed.");
        }
    };

    const [opNoteId, setOpNoteId] = useState<string | null>(null);
    const [findings, setFindings] = useState("");
    const [details, setDetails] = useState("");
    const [complications, setComplications] = useState("");
    const [postOpDx, setPostOpDx] = useState("");

    const saveOpNote = async () => {
        if (!opNoteId) return;
        try {
            await updateSurgery.mutateAsync({
                id: opNoteId,
                updates: {
                    findings: findings || undefined,
                    procedure_details: details || undefined,
                    complications: complications || undefined,
                    post_op_diagnosis: postOpDx || undefined,
                },
            });
            setOpNoteId(null); setFindings(""); setDetails(""); setComplications(""); setPostOpDx("");
            toast.success("Operation note saved.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save the operation note.");
        }
    };

    return (
        <div className="space-y-5">
            {canEdit && (
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                        <Scissors size={16} className="text-rose-500" /> Schedule surgery
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input placeholder="Procedure (e.g. Appendicectomy)" value={procedure} onChange={(e) => setProcedure(e.target.value)} />
                        <div className="grid grid-cols-2 gap-3">
                            <Select value={urgency} onValueChange={setUrgency}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="elective">Elective</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                    <SelectItem value="emergency">Emergency</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input placeholder="Theatre" value={theatre} onChange={(e) => setTheatre(e.target.value)} />
                        </div>
                        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                        <Input placeholder="Pre-op diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                    </div>
                    <Button onClick={submit} disabled={!procedure.trim() || createSurgery.isPending} className="mt-3 gap-2 bg-rose-600 hover:bg-rose-700">
                        <Plus size={14} /> Schedule
                    </Button>
                </div>
            )}

            <div className="space-y-2">
                {isLoading && <p className="text-xs text-gray-400">Loading…</p>}
                {!isLoading && surgeries.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">No surgical history.</p>
                )}
                {surgeries.map((s) => (
                    <div key={s.id} className="rounded-xl border border-gray-100 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-bold text-gray-900">{s.procedure_name}
                                    <span className="ml-2 text-[10px] font-semibold uppercase text-gray-400">{s.urgency}</span>
                                </p>
                                <p className="text-xs text-gray-500">
                                    {s.scheduled_at ? `Scheduled ${new Date(s.scheduled_at).toLocaleString("en-GB")}` : ""}
                                    {s.theatre ? ` · ${s.theatre}` : ""}
                                </p>
                            </div>
                            <Badge className={`border ${STATUS_STYLES[s.status]}`}>{s.status}</Badge>
                        </div>
                        {s.findings && <p className="mt-2 text-xs text-gray-600"><b>Findings:</b> {s.findings}</p>}
                        {s.complications && <p className="mt-1 text-xs text-red-600"><b>Complications:</b> {s.complications}</p>}
                        {canEdit && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {s.status === "scheduled" && (
                                    <Button size="sm" variant="outline" onClick={() => advance(s.id, "in-progress")}>Start surgery</Button>
                                )}
                                {s.status === "in-progress" && (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => setOpNoteId(opNoteId === s.id ? null : s.id)}>
                                            {opNoteId === s.id ? "Close op note" : "Write op note"}
                                        </Button>
                                        <Button size="sm" onClick={() => advance(s.id, "completed")}>Complete</Button>
                                    </>
                                )}
                                {s.status === "scheduled" && (
                                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => advance(s.id, "cancelled")}>Cancel</Button>
                                )}
                            </div>
                        )}
                        {opNoteId === s.id && (
                            <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3">
                                <Input placeholder="Post-op diagnosis" value={postOpDx} onChange={(e) => setPostOpDx(e.target.value)} />
                                <Textarea placeholder="Operative findings" rows={2} value={findings} onChange={(e) => setFindings(e.target.value)} />
                                <Textarea placeholder="Procedure details" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} />
                                <Textarea placeholder="Complications (if any)" rows={2} value={complications} onChange={(e) => setComplications(e.target.value)} />
                                <Button size="sm" onClick={saveOpNote}>Save op note</Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
