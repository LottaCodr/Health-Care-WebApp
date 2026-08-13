"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-provider";
import { useRoutePatient } from "@/hooks/emr/use-route-patient";
import { useLabTestCatalog, useDrugInventory, useConsultationsByPatient } from "@/hooks/emr/use-emr";
import {
    FlaskConical, Radio, Pill, Building2, UserCog, Send,
    Loader2, ChevronDown, Check, Route,
} from "lucide-react";
import { Patient } from "@/types/models";
import type { RouteDestination, RouteLabTest } from "@/lib/services/patient-routing.service";
import { cn } from "@/lib/utils";

// ─── Destination config ───────────────────────────────────────────────────────

const DESTINATIONS: { value: RouteDestination; label: string; desc: string; icon: React.ElementType; active: string }[] = [
    { value: "lab", label: "Lab", desc: "Order tests", icon: FlaskConical, active: "border-indigo-300 bg-indigo-50" },
    { value: "radiology", label: "Radiology", desc: "Imaging", icon: Radio, active: "border-cyan-300 bg-cyan-50" },
    { value: "pharmacist", label: "Pharmacist", desc: "Prescribe", icon: Pill, active: "border-pink-300 bg-pink-50" },
    { value: "front-desk", label: "Front Desk", desc: "Admit / bill", icon: Building2, active: "border-slate-300 bg-slate-100" },
    { value: "nurse", label: "Nurse", desc: "Nursing care", icon: UserCog, active: "border-teal-300 bg-teal-50" },
];

const RADIOLOGY_KEYWORDS = ["radiology", "x-ray", "ct", "mri", "ultrasound", "scan", "imaging"];

function MultiPicker({ options, selected, onChange, placeholder }: {
    options: string[];
    selected: string[];
    onChange: (s: string[]) => void;
    placeholder: string;
}) {
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState("");

    const filtered = term.trim()
        ? options.filter((o) => o.toLowerCase().includes(term.toLowerCase()))
        : options;

    const toggle = (v: string) =>
        onChange(selected.includes(v) ? selected.filter((i) => i !== v) : [...selected, v]);

    return (
        <div className="relative w-full">
            <button type="button" onClick={() => setOpen((v) => !v)}
                className="w-full h-10 px-3 flex justify-between items-center rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/20">
                <span className={selected.length === 0 ? "text-gray-400" : "text-gray-900 truncate"}>
                    {selected.length === 0 ? placeholder : `${selected.length} selected`}
                </span>
                <ChevronDown size={16} className="text-gray-400 ml-2 shrink-0" />
            </button>
            {open && (
                <div className="absolute z-40 mt-1 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100">
                        <input autoFocus value={term} onChange={(e) => setTerm(e.target.value)}
                            placeholder="Search…"
                            className="w-full h-8 px-2.5 text-xs rounded-lg bg-gray-50 border border-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                    </div>
                    <ul className="p-2 space-y-0.5 overflow-y-auto">
                        {filtered.length === 0 && (
                            <li className="text-xs text-gray-400 px-2 py-1.5 italic">No matching options</li>
                        )}
                        {filtered.map((opt) => (
                            <li key={opt} onClick={() => toggle(opt)}
                                className={cn("flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 text-sm",
                                    selected.includes(opt) && "bg-indigo-50 font-semibold")}>
                                <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                                    selected.includes(opt) ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white"
                                )}>
                                    {selected.includes(opt) && <Check size={10} className="text-white" strokeWidth={3} />}
                                </div>
                                <span className="truncate">{opt}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">{children}</p>;
}

const inputCls = "w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20";

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function QuickRoutePanel({ patient, consultationId }: { patient: Patient; consultationId?: string }) {
    const { user } = useAuth();
    const { mutateAsync: routePatient, isPending } = useRoutePatient();
    const { data: catalog = [] } = useLabTestCatalog();
    const { data: inventory = [] } = useDrugInventory();
    const { data: consultations } = useConsultationsByPatient(patient.id ?? "");

    const [destination, setDestination] = useState<RouteDestination | "">("");
    const [labTests, setLabTests] = useState<string[]>([]);
    const [radTests, setRadTests] = useState<string[]>([]);
    const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
    const [notes, setNotes] = useState("");
    const [drugName, setDrugName] = useState("");
    const [dosage, setDosage] = useState("");
    const [duration, setDuration] = useState("");
    const [frontDeskAction, setFrontDeskAction] = useState<"admission" | "billing">("billing");
    const [admissionType, setAdmissionType] = useState("ward");
    const [admissionUrgency, setAdmissionUrgency] = useState("routine");
    const [ward, setWard] = useState("");
    const [indication, setIndication] = useState("");

    const labOptions = useMemo(
        () => (catalog as any[])
            .filter((t) => !RADIOLOGY_KEYWORDS.some((k) =>
                (t.category ?? "").toLowerCase().includes(k) || (t.test_name ?? "").toLowerCase().includes(k)))
            .map((t) => t.test_name),
        [catalog]
    );

    const radOptions = useMemo(
        () => (catalog as any[])
            .filter((t) => RADIOLOGY_KEYWORDS.some((k) =>
                (t.category ?? "").toLowerCase().includes(k) || (t.test_name ?? "").toLowerCase().includes(k)))
            .map((t) => t.test_name),
        [catalog]
    );

    const drugOptions = useMemo(
        () => (inventory as any[]).map((d) => d.drug_name).filter(Boolean),
        [inventory]
    );

    // When routing from an already existing consultation, link the latest one
    // so its referral record stays coherent.
    const linkedConsultationId = useMemo(() => {
        if (consultationId) return consultationId;
        const list = (consultations ?? []) as any[];
        if (!list.length) return undefined;
        const active = list.find((c) => String(c.status).toLowerCase() === "underconsultation");
        return (active ?? list[0]).id as string | undefined;
    }, [consultationId, consultations]);

    const canSubmit =
        !!destination &&
        (destination !== "lab" || labTests.length > 0) &&
        (destination !== "radiology" || radTests.length > 0) &&
        (destination !== "pharmacist" || drugName.trim().length > 0) &&
        (destination !== "front-desk" || frontDeskAction === "billing" || (admissionType && indication.trim()));

    function reset() {
        setDestination("");
        setLabTests([]);
        setRadTests([]);
        setNotes("");
        setDrugName("");
        setDosage("");
        setDuration("");
        setFrontDeskAction("billing");
        setIndication("");
        setWard("");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!destination || !canSubmit || isPending) return;

        const labPayload: RouteLabTest[] = labTests.map((t) => ({ testType: t, priority }));
        const radPayload: RouteLabTest[] = radTests.map((t) => ({ testType: t, priority }));

        try {
            const result = await routePatient({
                patientId: patient.id!,
                routedBy: user?.$id ?? user?.id ?? "",
                destination,
                consultationId: linkedConsultationId,
                labTests: destination === "lab" ? labPayload : undefined,
                labNotes: destination === "lab" ? notes.trim() || undefined : undefined,
                radiologyTests: destination === "radiology" ? radPayload : undefined,
                radiologyNotes: destination === "radiology" ? notes.trim() || undefined : undefined,
                prescription: destination === "pharmacist"
                    ? { drugName: drugName.trim(), dosage: dosage.trim() || undefined, duration: duration.trim() || undefined, notes: notes.trim() || undefined }
                    : undefined,
                frontDeskAction: destination === "front-desk" ? frontDeskAction : undefined,
                admission: destination === "front-desk" && frontDeskAction === "admission"
                    ? {
                          admissionType: admissionType as any,
                          urgency: admissionUrgency as any,
                          wardName: ward.trim() || undefined,
                          indication: indication.trim(),
                          notes: notes.trim() || undefined,
                      }
                    : undefined,
                note: notes.trim() || undefined,
            });

            const statusLabel = result.patientStatus.replace(/-/g, " ");
            toast.success(
                `Patient routed to ${destination === "front-desk" ? "Front Desk" : destination === "pharmacist" ? "Pharmacy" : destination === "radiology" ? "Radiology" : destination === "lab" ? "Lab" : "Nurse"} — status “${statusLabel}”.` +
                (result.labRequestsCreated ? ` ${result.labRequestsCreated} lab request(s) created.` : "") +
                (result.radiologyRequestsCreated ? ` ${result.radiologyRequestsCreated} imaging request(s) created.` : "") +
                (result.prescriptionCreated ? " Prescription sent to the pharmacist queue." : "") +
                (result.admissionCreated ? " Admission record created." : "")
            );
            reset();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to route the patient.");
        }
    }

    return (
        <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <Route size={14} className="text-indigo-600" />
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-700">Quick Route — no consultation required</p>
                    <p className="text-[10px] text-gray-400">Send this patient straight to a department, with or without an existing consultation.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Destination chips */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {DESTINATIONS.map((d) => {
                        const Icon = d.icon;
                        const active = destination === d.value;
                        return (
                            <button key={d.value} type="button"
                                onClick={() => setDestination(active ? "" : d.value)}
                                className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border-2 text-left transition-all duration-150 ${
                                    active ? d.active : "border-gray-100 bg-white hover:border-gray-200"
                                }`}>
                                <Icon size={14} className={active ? "text-indigo-600" : "text-gray-400"} />
                                <span className={`text-[11px] font-bold ${active ? "text-gray-900" : "text-gray-600"}`}>{d.label}</span>
                                <span className="text-[9px] text-gray-400 leading-snug">{d.desc}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Lab */}
                {destination === "lab" && (
                    <div className="rounded-xl border border-indigo-200 bg-white p-3 space-y-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Lab tests</p>
                        <MultiPicker options={labOptions} selected={labTests} onChange={setLabTests} placeholder="Select test(s)…" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <FieldLabel>Priority</FieldLabel>
                                <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className={inputCls}>
                                    <option value="routine">Routine</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="stat">STAT</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <FieldLabel>Notes for lab</FieldLabel>
                            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Fasting sample, clinical suspicion…"
                                className={`${inputCls} h-auto py-2 resize-none`} />
                        </div>
                    </div>
                )}

                {/* Radiology */}
                {destination === "radiology" && (
                    <div className="rounded-xl border border-cyan-200 bg-white p-3 space-y-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Imaging investigations</p>
                        <MultiPicker options={radOptions} selected={radTests} onChange={setRadTests} placeholder="Select investigation(s)…" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <FieldLabel>Priority</FieldLabel>
                                <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className={inputCls}>
                                    <option value="routine">Routine</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="stat">STAT</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <FieldLabel>Clinical indication</FieldLabel>
                            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Suspected fracture — left wrist X-ray…"
                                className={`${inputCls} h-auto py-2 resize-none`} />
                        </div>
                    </div>
                )}

                {/* Pharmacist */}
                {destination === "pharmacist" && (
                    <div className="rounded-xl border border-pink-200 bg-white p-3 space-y-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Prescription (sent to pharmacist queue)</p>
                        <div>
                            <FieldLabel>Drug name</FieldLabel>
                            <MultiPicker options={drugOptions} selected={drugName ? [drugName] : []}
                                onChange={(s) => setDrugName(s[s.length - 1] ?? "")} placeholder="Search drug…" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <FieldLabel>Dosage</FieldLabel>
                                <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 500mg BD" className={inputCls} />
                            </div>
                            <div>
                                <FieldLabel>Duration</FieldLabel>
                                <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 5 days" className={inputCls} />
                            </div>
                        </div>
                        <div>
                            <FieldLabel>Instructions</FieldLabel>
                            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Take after meals…"
                                className={`${inputCls} h-auto py-2 resize-none`} />
                        </div>
                    </div>
                )}

                {/* Front desk */}
                {destination === "front-desk" && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setFrontDeskAction("billing")}
                                className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${frontDeskAction === "billing" ? "border-slate-300 bg-slate-100 text-slate-800" : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"}`}>
                                💳 Billing / Checkout
                            </button>
                            <button type="button" onClick={() => setFrontDeskAction("admission")}
                                className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${frontDeskAction === "admission" ? "border-slate-300 bg-slate-100 text-slate-800" : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"}`}>
                                🛏 Admission
                            </button>
                        </div>

                        {frontDeskAction === "admission" ? (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <FieldLabel>Admission type</FieldLabel>
                                        <select value={admissionType} onChange={(e) => setAdmissionType(e.target.value)} className={inputCls}>
                                            <option value="ward">Ward</option>
                                            <option value="surgical">Surgical</option>
                                            <option value="icu">ICU / HDU</option>
                                            <option value="maternity">Maternity</option>
                                        </select>
                                    </div>
                                    <div>
                                        <FieldLabel>Urgency</FieldLabel>
                                        <select value={admissionUrgency} onChange={(e) => setAdmissionUrgency(e.target.value)} className={inputCls}>
                                            <option value="routine">Routine</option>
                                            <option value="urgent">Urgent</option>
                                            <option value="emergency">Emergency</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <FieldLabel>Ward / unit (optional)</FieldLabel>
                                    <input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Maternity Ward B" className={inputCls} />
                                </div>
                                <div>
                                    <FieldLabel>Clinical indication *</FieldLabel>
                                    <textarea rows={2} value={indication} onChange={(e) => setIndication(e.target.value)}
                                        placeholder="Reason for admission…"
                                        className={`${inputCls} h-auto py-2 resize-none`} />
                                </div>
                            </>
                        ) : (
                            <p className="text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                                The patient will be moved to <strong>awaiting payment</strong> — front desk handles checkout & billing.
                            </p>
                        )}

                        <div>
                            <FieldLabel>Notes for front desk</FieldLabel>
                            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                                placeholder="Special instructions…"
                                className={`${inputCls} h-auto py-2 resize-none`} />
                        </div>
                    </div>
                )}

                {/* Nurse */}
                {destination === "nurse" && (
                    <div className="rounded-xl border border-teal-200 bg-white p-3 space-y-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Nursing instructions</p>
                        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. IV fluids, wound dressing, observations…"
                            className={`${inputCls} h-auto py-2 resize-none`} />
                    </div>
                )}

                {destination && (
                    <button type="submit" disabled={!canSubmit || isPending}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl py-3 transition-colors">
                        {isPending ? <><Loader2 size={14} className="animate-spin" /> Routing…</>
                            : <><Send size={13} /> Route Patient Now</>}
                    </button>
                )}
            </form>
        </div>
    );
}
