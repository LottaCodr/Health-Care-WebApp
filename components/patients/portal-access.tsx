"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MonitorSmartphone, KeyRound } from "lucide-react";
import { useDisablePortal, useEnablePortal } from "@/hooks/emr/use-clinical-modules";
import type { Patient } from "@/types/models";

/**
 * Front Desk manages the patient's portal access (patient-facing web login
 * to their own records: appointments, results, prescriptions, bills).
 */
export default function PortalAccess({ patient }: { patient: Patient }) {
    const enablePortal = useEnablePortal();
    const disablePortal = useDisablePortal();
    const [email, setEmail] = useState(patient.email ?? "");
    const [password, setPassword] = useState("");
    const enabled = Boolean(patient.portal_enabled && patient.portal_user_id);

    const submit = async () => {
        if (!email.trim() || !password) {
            toast.error("Enter the patient's email and a temporary password (8+ characters).");
            return;
        }
        try {
            const result = await enablePortal.mutateAsync({
                patientId: patient.id,
                email: email.trim(),
                temporaryPassword: password,
            });
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
            setPassword("");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not enable portal access.");
        }
    };

    const disable = async () => {
        try {
            const result = await disablePortal.mutateAsync(patient.id);
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not disable portal access.");
        }
    };

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-900">
                <MonitorSmartphone size={16} className="text-sky-600" /> Patient portal
            </p>
            <p className="mb-3 text-xs text-gray-500">
                Lets the patient log in at <code className="rounded bg-gray-100 px-1">/portal</code> to see appointments,
                lab results, prescriptions and bills.
            </p>
            {enabled ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-gray-600">
                        <Badge className="mr-2 bg-green-50 text-green-700 border-green-200">Active</Badge>
                        Portal login enabled for this patient.
                    </div>
                    <Button size="sm" variant="destructive" onClick={disable} disabled={disablePortal.isPending}>
                        Disable portal
                    </Button>
                </div>
            ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                    <Input type="email" placeholder="Patient's email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <Input type="text" placeholder="Temporary password (8+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button onClick={submit} disabled={enablePortal.isPending} className="gap-2">
                        <KeyRound size={14} /> Enable portal
                    </Button>
                </div>
            )}
        </div>
    );
}
