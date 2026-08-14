"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, FileJson, FileCode2, FileSpreadsheet } from "lucide-react";
import { useFhirExport, useHl7Export } from "@/hooks/emr/use-clinical-modules";
import { usePaymentsByPatient } from "@/hooks/emr/use-payment";
import { usePrescriptionsByPatient } from "@/hooks/emr/use-pharmacy";

function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function ExportTab({ patientId }: { patientId: string }) {
    const fhir = useFhirExport(patientId);
    const hl7 = useHl7Export(patientId);
    const { data: payments = [] } = usePaymentsByPatient(patientId);
    const { data: prescriptions = [] } = usePrescriptionsByPatient(patientId);
    const [busy, setBusy] = useState<string | null>(null);

    const runFhir = async () => {
        setBusy("fhir");
        try {
            const { bundle, patientName } = await fhir.mutateAsync();
            download(`${patientName.replace(/\s+/g, "_")}_fhir.json`, JSON.stringify(bundle, null, 2), "application/json");
            toast.success("FHIR R4 bundle downloaded.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "FHIR export failed.");
        } finally {
            setBusy(null);
        }
    };

    const runHl7 = async () => {
        setBusy("hl7");
        try {
            const { message, patientName } = await hl7.mutateAsync();
            download(`${patientName.replace(/\s+/g, "_")}_ADT_A01.hl7`, message, "text/plain");
            toast.success("HL7 v2.5 ADT^A01 message downloaded.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "HL7 export failed.");
        } finally {
            setBusy(null);
        }
    };

    const printPrescriptions = () => {
        // External e-prescribing: printable prescription letter for the
        // patient to take to an outside pharmacy.
        const active = (prescriptions as any[]).filter((p) => p.status === "Active" || p.dispensed !== true);
        const win = window.open("", "_blank", "width=700,height=800");
        if (!win) return;
        const rows = active.length
            ? active.map((p) => `<tr><td style="padding:6px 10px;font-weight:bold">${p.drug_name}</td><td style="padding:6px 10px">${p.dosage ?? ""}</td><td style="padding:6px 10px">${p.duration ?? ""}</td></tr>`).join("")
            : `<tr><td colspan="3" style="padding:12px">No active prescriptions.</td></tr>`;
        win.document.write(`
            <html><head><title>Prescription</title>
            <style>body{font-family:Georgia,serif;padding:48px;color:#111} h1{font-size:20px} .line{border-top:2px solid #000;margin:16px 0} table{width:100%;border-collapse:collapse} td{border-bottom:1px solid #ddd;font-size:14px} .sig{margin-top:48px;display:flex;justify-content:space-between}</style>
            </head><body>
            <h1>NILE VALLEY HOSPITAL — PRESCRIPTION</h1>
            <div class="line"></div>
            <table>${rows}</table>
            <div class="sig"><div>Prescriber: ____________________</div><div>Date: ${new Date().toLocaleDateString("en-GB")}</div></div>
            <div class="line"></div>
            <p style="font-size:12px;color:#444">E-prescription generated ${new Date().toLocaleString("en-GB")} · Nile Valley Hospital EMR</p>
            </body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
        toast.success("Prescription letter opened for printing.");
    };

    const runCsv = () => {
        const escape = (v: any) => {
            const s = v === null || v === undefined ? "" : String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const rows = (payments as any[]).map((p) => ({
            date: p.processed_date ?? p.created_at ?? "",
            description: p.description ?? "",
            amount: p.amount ?? 0,
            status: p.status ?? "",
            method: p.method ?? p.payment_method ?? "",
        }));
        const csv = ["date,description,amount,status,method",
            ...rows.map((r) => `${escape(r.date)},${escape(r.description)},${r.amount},${escape(r.status)},${escape(r.method)}`)].join("\n");
        download("billing_history.csv", csv, "text/csv");
        toast.success("Billing CSV downloaded.");
    };

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-1 text-sm font-bold text-gray-900">Interoperability exports</p>
                <p className="mb-4 text-xs text-gray-500">
                    Export this patient&apos;s record in standard healthcare exchange formats. Exports are audit-logged.
                </p>
                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="gap-2" onClick={runFhir} disabled={busy !== null}>
                        <FileJson size={15} /> {busy === "fhir" ? "Exporting…" : "FHIR R4 (JSON bundle)"}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={runHl7} disabled={busy !== null}>
                        <FileCode2 size={15} /> {busy === "hl7" ? "Exporting…" : "HL7 v2 ADT (admit message)"}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={runCsv}>
                        <FileSpreadsheet size={15} /> Billing history (CSV)
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={printPrescriptions}>
                        <Download size={15} /> Prescription letter (printable)
                    </Button>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-1 text-sm font-bold text-gray-900">What&apos;s included</p>
                <ul className="list-inside list-disc space-y-1 text-xs text-gray-500">
                    <li><b>FHIR R4:</b> Patient, Encounters, Conditions, Observations (vitals + lab), MedicationRequests, Procedures, DiagnosticReports, Immunizations, Allergies, Appointments, Documents.</li>
                    <li><b>HL7 v2.5:</b> ADT^A01 admit message (MSH, EVN, PID, PV1) for external HIS/LIS integration.</li>
                    <li><b>CSV:</b> the patient&apos;s billing history.</li>
                </ul>
            </div>
            <div className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800">
                <Download size={15} className="mt-0.5 shrink-0" />
                <p>Every export is written to the audit trail with the staff member&apos;s identity — treat exported files as PHI and store them accordingly.</p>
            </div>
        </div>
    );
}
