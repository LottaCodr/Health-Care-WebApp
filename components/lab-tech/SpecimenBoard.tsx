"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtFull } from "@/lib/utils";
import { TestTube2, Plus, Printer } from "lucide-react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useCreateSpecimen, useSpecimens, useUpdateSpecimen } from "@/hooks/emr/use-clinical-modules";
import { usePendingLabRequests } from "@/hooks/emr/use-lab";
import { code39Svg, generateSpecimenBarcode } from "@/lib/clinical/barcode";

const STATUS_STYLES: Record<string, string> = {
    collected: "bg-blue-50 text-blue-700 border-blue-200",
    received: "bg-violet-50 text-violet-700 border-violet-200",
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function SpecimenBoard() {
    const { authorized } = useRoleProtection([UserRole.LabTechnician]);
    const { data: specimens = [], isLoading } = useSpecimens();
    const { data: pendingRequests = [] } = usePendingLabRequests();
    const createSpecimen = useCreateSpecimen();
    const updateSpecimen = useUpdateSpecimen();

    const [patientId, setPatientId] = useState("");
    const [requestId, setRequestId] = useState("");
    const [type, setType] = useState("Blood");
    const [container, setContainer] = useState("EDTA tube");

    const addSpecimen = async () => {
        if (!patientId.trim()) { toast.error("Select a patient first."); return; }
        try {
            const barcode = generateSpecimenBarcode(patientId);
            await createSpecimen.mutateAsync({
                patient_id: patientId,
                lab_request_id: requestId || undefined,
                specimen_type: type,
                container: container.trim() || undefined,
                barcode,
                collection_at: new Date().toISOString(),
            });
            toast.success("Specimen collected — label ready to print.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not create the specimen.");
        }
    };

    const advance = async (id: string, status: string) => {
        try {
            await updateSpecimen.mutateAsync({ id, updates: { status } as any });
            toast.success(`Specimen → ${status}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Update failed.");
        }
    };

    const printLabel = (s: any) => {
        const win = window.open("", "_blank", "width=420,height=320");
        if (!win) return;
        win.document.write(`
            <html><head><title>Specimen label</title>
            <style>body{font-family:Arial,sans-serif;padding:20px;text-align:center} .box{border:2px dashed #000;padding:16px;max-width:340px;margin:0 auto} img{max-width:300px} .t{font-size:13px;font-weight:bold;margin:4px 0}</style>
            </head><body>
            <div class="box">
                <div class="t">NILE VALLEY HOSPITAL — LAB SPECIMEN</div>
                <img src="${code39Svg(s.barcode)}" />
                <div class="t">${s.specimen_type} · ${s.container ?? ""}</div>
                <div>${s.barcode} · ${fmtFull(new Date().toISOString())}</div>
            </div>
            <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
            </body></html>`);
        win.document.close();
    };

    if (!authorized) {
        return <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs text-red-700">Lab scientist access required.</p>;
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-black text-gray-900">Specimen Tracking</h1>
                <p className="text-xs text-gray-500">Chain-of-custody for samples: collect → receive → process → result.</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <TestTube2 size={16} className="text-indigo-600" /> Collect specimen
                </p>
                <div className="grid gap-2 sm:grid-cols-4">
                    <select className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm" value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}>
                        <option value="">— Select patient (pending lab requests) —</option>
                        {(pendingRequests as any[]).map((r) => (
                            <option key={r.id} value={r.visit_id ?? r.patient_id}>
                                {r.patients?.name ?? r.visit_id} — {String(r.test_type).replace(/^\[RADIOLOGY\]\s*/i, "")}
                            </option>
                        ))}
                    </select>
                    <select className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm" value={requestId}
                        onChange={(e) => setRequestId(e.target.value)}>
                        <option value="">— Link lab request (optional) —</option>
                        {(pendingRequests as any[])
                            .filter((r) => !patientId || r.visit_id === patientId || r.patient_id === patientId)
                            .map((r) => <option key={r.id} value={r.id}>{String(r.test_type).replace(/^\[RADIOLOGY\]\s*/i, "")}</option>)}
                    </select>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Blood">Blood</SelectItem>
                            <SelectItem value="Urine">Urine</SelectItem>
                            <SelectItem value="Stool">Stool</SelectItem>
                            <SelectItem value="Sputum">Sputum</SelectItem>
                            <SelectItem value="Swab">Swab</SelectItem>
                            <SelectItem value="Biopsy">Biopsy</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input placeholder="Container (e.g. EDTA tube)" value={container} onChange={(e) => setContainer(e.target.value)} />
                </div>
                <Button onClick={addSpecimen} disabled={!patientId || createSpecimen.isPending} className="mt-3 gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Plus size={14} /> Collect & label
                </Button>
            </div>

            {isLoading && <p className="text-xs text-gray-400">Loading specimens…</p>}
            {!isLoading && specimens.length === 0 && (
                <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-400">
                    No specimens tracked yet.
                </p>
            )}
            <div className="space-y-2">
                {specimens.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900">
                                {s.specimen_type}{s.container ? ` · ${s.container}` : ""}
                                <span className="ml-2 font-mono text-[10px] text-gray-400">{s.barcode}</span>
                            </p>
                            <p className="truncate text-xs text-gray-500">
                                Patient: {(s as any).patients?.name ?? s.patient_id}
                                {s.collection_at ? ` · collected ${fmtFull(s.collection_at)}` : ""}
                            </p>
                            {s.rejection_reason && <p className="text-xs font-semibold text-red-600">Rejected: {s.rejection_reason}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Badge className={`border ${STATUS_STYLES[s.status]}`}>{s.status}</Badge>
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printLabel(s)}>
                                <Printer size={13} /> Label
                            </Button>
                            {s.status === "collected" && (
                                <Button size="sm" variant="outline" onClick={() => advance(s.id, "received")}>Receive</Button>
                            )}
                            {s.status === "received" && (
                                <Button size="sm" variant="outline" onClick={() => advance(s.id, "processing")}>Process</Button>
                            )}
                            {s.status === "processing" && (
                                <Button size="sm" onClick={() => advance(s.id, "completed")}>Complete</Button>
                            )}
                            {["collected", "received"].includes(s.status) && (
                                <Button size="sm" variant="ghost" className="text-red-500"
                                    onClick={async () => {
                                        const reason = window.prompt("Rejection reason:");
                                        if (!reason) return;
                                        await updateSpecimen.mutateAsync({ id: s.id, updates: { status: "rejected", rejection_reason: reason } });
                                    }}>
                                    Reject
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
