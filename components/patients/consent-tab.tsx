"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileSignature, Plus, Printer } from "lucide-react";
import { useConsents, useRecordConsent, useWithdrawConsent } from "@/hooks/emr/use-clinical-modules";
import type { Patient } from "@/types/models";

const TYPE_LABELS: Record<string, string> = {
    treatment: "General treatment consent",
    procedure: "Procedure consent",
    data_privacy: "Data privacy & records",
    research: "Research participation",
    photography: "Photography / imaging",
};

export default function ConsentTab({ patient, canEdit }: { patient: Patient; canEdit: boolean }) {
    const { data: consents = [] } = useConsents(patient.id);
    const recordConsent = useRecordConsent();
    const withdrawConsent = useWithdrawConsent();

    const [type, setType] = useState<string>("treatment");
    const [status, setStatus] = useState<string>("signed");
    const [signedByPatient, setSignedByPatient] = useState(true);
    const [notes, setNotes] = useState("");

    const submit = async () => {
        try {
            await recordConsent.mutateAsync({
                patient_id: patient.id,
                consent_type: type as any,
                status: status as any,
                signed_by_patient: signedByPatient,
                notes: notes.trim() || undefined,
            });
            setNotes("");
            toast.success("Consent recorded (versioned).");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not record consent.");
        }
    };

    const printForm = (c: any) => {
        const win = window.open("", "_blank", "width=700,height=800");
        if (!win) return;
        win.document.write(`
            <html><head><title>Consent Form</title>
            <style>body{font-family:Georgia,serif;padding:48px;color:#111} h1{font-size:20px} .line{border-top:2px solid #000;margin:16px 0} p{line-height:1.7;font-size:14px} .sig{margin-top:48px;display:flex;justify-content:space-between}</style>
            </head><body>
            <h1>NILE VALLEY HOSPITAL — ${TYPE_LABELS[c.consent_type]?.toUpperCase() ?? c.consent_type.toUpperCase()}</h1>
            <div class="line"></div>
            <p>I, <b>${patient.name}</b>, hereby give informed consent for the above-named procedure/care, having been informed of its nature, benefits, risks and alternatives, and having had the opportunity to ask questions.</p>
            <p>Status: <b>${c.status.toUpperCase()}</b> · Version ${c.version} · ${c.signed_at ? new Date(c.signed_at).toLocaleString("en-GB") : ""}</p>
            ${c.notes ? `<p>Notes: ${c.notes}</p>` : ""}
            <div class="sig">
              <div>Patient signature: ____________________</div>
              <div>Witness (staff): ____________________</div>
            </div>
            <div class="line"></div>
            <p style="font-size:12px;color:#444">Generated ${new Date().toLocaleString("en-GB")} · Nile Valley Hospital EMR</p>
            </body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
    };

    return (
        <div className="space-y-5">
            {canEdit && (
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                        <FileSignature size={16} className="text-emerald-600" /> Record consent
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="signed">Signed</SelectItem>
                                <SelectItem value="declined">Declined</SelectItem>
                            </SelectContent>
                        </Select>
                        <select
                            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                            value={signedByPatient ? "patient" : "guardian"}
                            onChange={(e) => setSignedByPatient(e.target.value === "patient")}
                        >
                            <option value="patient">Signed by patient</option>
                            <option value="guardian">Signed by guardian / next of kin</option>
                        </select>
                        <Textarea placeholder="Notes (procedure details, risks discussed…)" rows={2} className="sm:col-span-3"
                            value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    <Button onClick={submit} disabled={recordConsent.isPending} className="mt-3 gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <Plus size={14} /> Record consent (new version)
                    </Button>
                </div>
            )}

            <div className="space-y-2">
                {consents.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                        No consents on record. Consent entries are versioned — recording a new one never overwrites history.
                    </p>
                )}
                {consents.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-gray-900">
                                {TYPE_LABELS[c.consent_type] ?? c.consent_type}
                                <span className="ml-2 text-[10px] font-semibold text-gray-400">v{c.version}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                                {c.signed_at ? new Date(c.signed_at).toLocaleString("en-GB") : ""}
                                {c.signed_by_patient ? " · by patient" : " · by guardian"}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={c.status === "signed" ? "default" : c.status === "withdrawn" ? "destructive" : "secondary"}>{c.status}</Badge>
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printForm(c)}>
                                <Printer size={13} /> Print
                            </Button>
                            {canEdit && c.status === "signed" && (
                                <Button size="sm" variant="ghost" className="text-red-500"
                                    onClick={async () => {
                                        try {
                                            await withdrawConsent.mutateAsync({ id: c.id });
                                            toast.success("Consent withdrawn.");
                                        } catch (e) {
                                            toast.error(e instanceof Error ? e.message : "Update failed.");
                                        }
                                    }}>
                                    Withdraw
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
