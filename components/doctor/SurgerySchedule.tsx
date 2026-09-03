"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Scissors } from "lucide-react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useSurgerySchedule, useUpdateSurgery } from "@/hooks/emr/use-clinical-modules";
import { fmtFull } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    "in-progress": "bg-amber-50 text-amber-700 border-amber-200",
};

export default function SurgerySchedule() {
    const { authorized } = useRoleProtection([UserRole.Doctor]);
    const { data: surgeries = [], isLoading } = useSurgerySchedule();
    const updateSurgery = useUpdateSurgery();

    const advance = async (id: string, next: string) => {
        try {
            const patch: Record<string, any> = { status: next };
            if (next === "in-progress") patch.started_at = new Date().toISOString();
            if (next === "completed") patch.completed_at = new Date().toISOString();
            await updateSurgery.mutateAsync({ id, updates: patch });
            toast.success(`Surgery → ${next}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Update failed.");
        }
    };

    if (!authorized) {
        return <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs text-red-700">Doctor access required.</p>;
    }

    const ordered = [...(surgeries as any[])].sort((a, b) => {
        const rank = (s: any) => (s.status === "in-progress" ? 0 : s.urgency === "emergency" ? 1 : s.urgency === "urgent" ? 2 : 3);
        return rank(a) - rank(b);
    });

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-black text-gray-900">Operating Theatre Schedule</h1>
                <p className="text-xs text-gray-500">Scheduled and in-progress surgeries, ordered by urgency.</p>
            </div>

            {isLoading && <p className="text-xs text-gray-400">Loading schedule…</p>}
            {!isLoading && ordered.length === 0 && (
                <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-400">
                    No surgeries scheduled. Add surgeries from a patient&apos;s Surgery tab.
                </p>
            )}
            <div className="space-y-2">
                {ordered.map((s) => (
                    <div key={s.id} className="rounded-xl border border-gray-100 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                    <Scissors size={15} className="text-rose-500" /> {s.procedure_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {s.patients?.name ?? s.patient_id}
                                    {s.scheduled_at ? ` · ${fmtFull(s.scheduled_at)}` : ""}
                                    {s.theatre ? ` · ${s.theatre}` : ""}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className={`border ${STATUS_STYLES[s.status] ?? ""}`}>{s.status}</Badge>
                                <Badge variant="outline">{s.urgency}</Badge>
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            {s.status === "scheduled" && (
                                <Button size="sm" variant="outline" onClick={() => advance(s.id, "in-progress")}>Start</Button>
                            )}
                            {s.status === "in-progress" && (
                                <Button size="sm" onClick={() => advance(s.id, "completed")}>Complete</Button>
                            )}
                            {s.status === "scheduled" && (
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => advance(s.id, "cancelled")}>Cancel</Button>
                            )}
                            <a className="text-xs text-blue-600 underline" href={`/doctor/patients?open=${s.patient_id}`}>
                                Open patient
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
