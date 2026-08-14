"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileHeart, FileText, Printer, Plus } from "lucide-react";
import {
    useBirthCertificates, useCreateBirthCertificate,
    useCreateDeathCertificate, useDeathCertificates,
} from "@/hooks/emr/use-clinical-modules";
import { COMMON_ICD10 } from "@/lib/clinical/icd10";
import type { Patient } from "@/types/models";

export default function CertificatesTab({ patient, canEdit, role }: { patient: Patient; canEdit: boolean; role: string }) {
    const { data: deathCerts = [] } = useDeathCertificates(patient.id);
    const { data: birthCerts = [] } = useBirthCertificates(patient.id);
    const createDeath = useCreateDeathCertificate();
    const createBirth = useCreateBirthCertificate();

    // death form
    const [dod, setDod] = useState(() => new Date().toISOString().slice(0, 10));
    const [tod, setTod] = useState("");
    const [place, setPlace] = useState("");
    const [immediate, setImmediate] = useState("");
    const [icd10, setIcd10] = useState("");
    const [manner, setManner] = useState<string>("natural");

    // birth form
    const [childName, setChildName] = useState("");
    const [sex, setSex] = useState<string>("male");
    const [dob, setDob] = useState(() => new Date().toISOString().slice(0, 10));
    const [tob, setTob] = useState("");
    const [weight, setWeight] = useState("");
    const [father, setFather] = useState("");

    const submitDeath = async () => {
        if (!immediate.trim()) { toast.error("Immediate cause of death is required."); return; }
        try {
            await createDeath.mutateAsync({
                patient_id: patient.id,
                date_of_death: dod,
                time_of_death: tod || undefined,
                place_of_death: place.trim() || undefined,
                immediate_cause: immediate.trim(),
                icd10_immediate: icd10 || undefined,
                manner_of_death: manner as any,
            });
            setImmediate(""); setIcd10(""); setPlace("");
            toast.success("Death certificate issued.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not issue the certificate.");
        }
    };

    const submitBirth = async () => {
        if (!childName.trim()) { toast.error("Child name is required."); return; }
        try {
            await createBirth.mutateAsync({
                child_name: childName.trim(),
                sex: sex as any,
                date_of_birth: dob,
                time_of_birth: tob || undefined,
                weight_kg: weight ? parseFloat(weight) : undefined,
                mother_patient_id: patient.gender === "Female" ? patient.id : undefined,
                father_name: father.trim() || undefined,
            });
            setChildName(""); setWeight(""); setFather("");
            toast.success("Birth certificate issued.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not issue the certificate.");
        }
    };

    const printCert = (title: string, lines: Array<[string, string]>) => {
        const win = window.open("", "_blank", "width=700,height=800");
        if (!win) return;
        const rows = lines.map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:bold;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 12px">${v ?? "—"}</td></tr>`).join("");
        win.document.write(`
            <html><head><title>${title}</title>
            <style>body{font-family:Georgia,serif;padding:48px;color:#111} h1{text-align:center;font-size:22px;letter-spacing:2px} .sub{text-align:center;font-size:11px;color:#555;margin-bottom:24px} table{border-collapse:collapse;width:100%} tr{border-bottom:1px solid #ddd} .sig{margin-top:48px;display:flex;justify-content:space-between;font-size:13px}</style>
            </head><body>
            <h1>NILE VALLEY HOSPITAL</h1>
            <div class="sub">${title.toUpperCase()} — OFFICIAL COPY</div>
            <table>${rows}</table>
            <div class="sig"><div>Certifying staff: ____________________</div><div>Date: ${new Date().toLocaleDateString("en-GB")}</div></div>
            <div class="sub" style="margin-top:24px">This is an EMR-generated draft. Affix the hospital seal and authorised signature before release.</div>
            </body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
    };

    return (
        <div className="grid gap-5 xl:grid-cols-2">
            {/* ── Death certificates ── */}
            <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <FileHeart size={16} className="text-gray-500" /> Death certificates
                </p>
                {canEdit && role === "Doctor" && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Input type="date" value={dod} onChange={(e) => setDod(e.target.value)} />
                            <Input type="time" value={tod} onChange={(e) => setTod(e.target.value)} />
                            <Input placeholder="Place of death" value={place} onChange={(e) => setPlace(e.target.value)} />
                            <select className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm" value={manner}
                                onChange={(e) => setManner(e.target.value)}>
                                <option value="natural">Natural</option>
                                <option value="accident">Accident</option>
                                <option value="suicide">Suicide</option>
                                <option value="homicide">Homicide</option>
                                <option value="undetermined">Undetermined</option>
                            </select>
                            <Input placeholder="Immediate cause of death" value={immediate} onChange={(e) => setImmediate(e.target.value)} />
                            <Input list="icd10-list" placeholder="ICD-10 code (e.g. B54)" value={icd10} onChange={(e) => setIcd10(e.target.value)} />
                            <datalist id="icd10-list">
                                {COMMON_ICD10.map((c) => <option key={c.code} value={c.code}>{c.description}</option>)}
                            </datalist>
                        </div>
                        <Button onClick={submitDeath} disabled={!immediate.trim() || createDeath.isPending} className="mt-3 gap-2 bg-gray-800 hover:bg-gray-900">
                            <Plus size={14} /> Issue death certificate
                        </Button>
                    </div>
                )}
                {deathCerts.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div className="text-xs">
                            <p className="font-bold text-gray-900">{d.date_of_death} — {d.immediate_cause ?? "Cause unspecified"}</p>
                            <p className="text-gray-500">{d.icd10_immediate ? `ICD-10 ${d.icd10_immediate} · ` : ""}{d.manner_of_death}</p>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1.5"
                            onClick={() => printCert("Death Certificate", [
                                ["Patient", patient.name],
                                ["Date of death", `${d.date_of_death}${d.time_of_death ? ` ${d.time_of_death}` : ""}`],
                                ["Place of death", d.place_of_death ?? ""],
                                ["Immediate cause", d.immediate_cause ?? ""],
                                ["ICD-10", d.icd10_immediate ?? ""],
                                ["Manner", d.manner_of_death],
                            ])}>
                            <Printer size={13} /> Print
                        </Button>
                    </div>
                ))}
            </div>

            {/* ── Birth certificates ── */}
            <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <FileText size={16} className="text-pink-500" /> Birth certificates
                </p>
                {canEdit && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Input placeholder="Child's full name" value={childName} onChange={(e) => setChildName(e.target.value)} />
                            <select className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm" value={sex}
                                onChange={(e) => setSex(e.target.value)}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                            <Input type="time" value={tob} onChange={(e) => setTob(e.target.value)} />
                            <Input type="number" step="0.01" placeholder="Birth weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} />
                            <Input placeholder="Father's name" value={father} onChange={(e) => setFather(e.target.value)} />
                        </div>
                        <Button onClick={submitBirth} disabled={!childName.trim() || createBirth.isPending} className="mt-3 gap-2 bg-pink-600 hover:bg-pink-700">
                            <Plus size={14} /> Issue birth certificate
                        </Button>
                    </div>
                )}
                {birthCerts.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div className="text-xs">
                            <p className="font-bold text-gray-900">{b.child_name} ({b.sex ?? "—"})</p>
                            <p className="text-gray-500">{b.date_of_birth}{b.weight_kg ? ` · ${b.weight_kg} kg` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">issued</Badge>
                            <Button size="sm" variant="outline" className="gap-1.5"
                                onClick={() => printCert("Birth Certificate", [
                                    ["Child's name", b.child_name],
                                    ["Sex", b.sex ?? ""],
                                    ["Date of birth", `${b.date_of_birth}${b.time_of_birth ? ` ${b.time_of_birth}` : ""}`],
                                    ["Birth weight", b.weight_kg ? `${b.weight_kg} kg` : ""],
                                    ["Mother", patient.name],
                                    ["Father", b.father_name ?? ""],
                                ])}>
                                <Printer size={13} /> Print
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
