"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Siren } from "lucide-react";
import { useBreakGlass } from "@/hooks/emr/use-clinical-modules";

/**
 * Break-glass emergency access: any staff member can declare audited
 * emergency access to a patient record with a stated reason. The declaration
 * is written to the audit trail as a high-visibility event.
 */
export default function BreakGlass({ patientId }: { patientId: string }) {
    const breakGlass = useBreakGlass(patientId);
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [grant, setGrant] = useState<any | null>(null);

    const submit = async () => {
        try {
            const g = await breakGlass.mutateAsync(reason);
            setGrant(g);
            setReason("");
            toast.success(`Emergency access granted until ${new Date(g.expiresAt).toLocaleTimeString("en-GB")} — fully audited.`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Break-glass request failed.");
        }
    };

    return (
        <div>
            {!open && !grant && (
                <Button variant="outline" size="sm" className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => setOpen(true)}>
                    <Siren size={14} /> Break-glass access
                </Button>
            )}
            {open && !grant && (
                <div className="mt-2 flex w-full max-w-md flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-800">Emergency access — every use is audited</p>
                    <Input placeholder="Reason (required — e.g. unconscious patient, urgent surgery)" value={reason}
                        onChange={(e) => setReason(e.target.value)} />
                    <div className="flex gap-2">
                        <Button size="sm" disabled={reason.trim().length < 3 || breakGlass.isPending}
                            onClick={submit} className="bg-amber-600 hover:bg-amber-700">
                            Grant emergency access
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    </div>
                </div>
            )}
            {grant && (
                <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <p className="font-bold">Break-glass active — ref {grant.reference}</p>
                    <p>Expires {new Date(grant.expiresAt).toLocaleTimeString("en-GB")} · reason logged for admin review.</p>
                </div>
            )}
        </div>
    );
}
