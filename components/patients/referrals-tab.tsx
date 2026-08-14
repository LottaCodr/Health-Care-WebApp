"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Printer, Plus } from "lucide-react";
import { useCreateReferral, useReferrals, useUpdateReferral } from "@/hooks/emr/use-clinical-modules";
import type { Patient } from "@/types/models";

export default function ReferralsTab({ patient, canEdit }: { patient: Patient; canEdit: boolean }) {
    const { data: referrals = [] } = useReferrals(patient.id);
    const createReferral = useCreateReferral();
    const updateReferral = useUpdateReferral();

    const [facility, setFacility] = useState("");
    const [department, setDepartment] = useState("");
    const [doctor, setDoctor] = useState("");
    const [reason, setReason] = useState("");
    const [summary, setSummary] = useState("");
    const [urgency, setUrgency] = useState<string>("routine");

    const submit = async () => {
        if (!facility.trim() || !reason.trim()) return;
        try {
            await createReferral.mutateAsync({
                patient_id: patient.id,
                referred_to_facility: facility.trim(),
                referred_to_department: department.trim() || undefined,
                referred_to_doctor: doctor.trim() || undefined,
                reason: reason.trim(),
                clinical_summary: summary.trim() || undefined,
                urgency: urgency as any,
            });
            setFacility(""); setDepartment(""); setDoctor(""); setReason(""); setSummary("");
            toast.success("Referral drafted.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not create the referral.");
        }
    };

    const markSent = async (id: string) => {
        try {
            await updateReferral.mutateAsync({ id, updates: { status: "sent" } });
            toast.success("Referral marked as sent.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Update failed.");
        }
    };

    const printLetter = (r: any) => {
        const win = window.open("", "_blank", "width=700,height=800");
        if (!win) return;
        win.document.write(`
            <html><head><title>Referral Letter</title>
            <style>body{font-family:Georgia,serif;padding:48px;color:#111} h1{font-size:20px} .line{border-top:2px solid #000;margin:16px 0} p{line-height:1.6;font-size:14px} .meta{font-size:12px;color:#444}</style>
            </head><body>
            <h1>NILE VALLEY HOSPITAL — REFERRAL LETTER</h1>
            <div class="line"></div>
            <p><b>Patient:</b> ${patient.name} &nbsp;·&nbsp; <b>Sex:</b> ${patient.gender ?? "—"} &nbsp;·&nbsp; <b>DOB:</b> ${patient.birth_date ?? "—"}</p>
            <p><b>To:</b> ${r.referred_to_facility}${r.referred_to_department ? ` — ${r.referred_to_department}` : ""}${r.referred_to_doctor ? `, Dr. ${r.referred_to_doctor}` : ""}</p>
            <p><b>Urgency:</b> ${r.urgency.toUpperCase()}</p>
            <p><b>Reason for referral:</b> ${r.reason}</p>
            ${r.clinical_summary ? `<p><b>Clinical summary:</b><br/>${r.clinical_summary}</p>` : ""}
            <div class="line"></div>
            <p class="meta">Generated ${new Date().toLocaleString("en-GB")} · Nile Valley Hospital EMR</p>
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
                        <Send size={16} className="text-indigo-500" /> New referral
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input placeholder="Referred to facility / hospital" value={facility} onChange={(e) => setFacility(e.target.value)} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
                            <Select value={urgency} onValueChange={setUrgency}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="routine">Routine</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                    <SelectItem value="emergency">Emergency</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Input placeholder="Referred to doctor (optional)" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
                        <Input placeholder="Reason for referral" value={reason} onChange={(e) => setReason(e.target.value)} />
                        <Textarea placeholder="Clinical summary (diagnosis, treatment so far, results…)" rows={3} className="sm:col-span-2"
                            value={summary} onChange={(e) => setSummary(e.target.value)} />
                    </div>
                    <Button onClick={submit} disabled={!facility.trim() || !reason.trim() || createReferral.isPending}
                        className="mt-3 gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Plus size={14} /> Draft referral
                    </Button>
                </div>
            )}

            <div className="space-y-2">
                {referrals.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">No referrals on record.</p>
                )}
                {referrals.map((r) => (
                    <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-bold text-gray-900">{r.referred_to_facility}
                                    <span className="ml-2 text-[10px] font-semibold uppercase text-gray-400">{r.urgency}</span>
                                </p>
                                <p className="text-xs text-gray-500">{r.reason}</p>
                            </div>
                            <Badge variant={r.status === "pending" ? "secondary" : r.status === "completed" ? "default" : "outline"}>{r.status}</Badge>
                        </div>
                        {r.clinical_summary && <p className="mt-2 line-clamp-2 text-xs text-gray-600">{r.clinical_summary}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printLetter(r)}>
                                <Printer size={13} /> Print letter
                            </Button>
                            {r.status === "pending" && (
                                <Button size="sm" onClick={() => markSent(r.id)}>Mark as sent</Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
