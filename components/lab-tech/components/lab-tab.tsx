"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";
import {
    useLabRequestsByPatient,
    useUpdateLabRequest,
    useCreateLabRequest,
    useCreatePayment,
    useLabTestCatalog,
} from "@/hooks/emr/use-emr";
import {
    FlaskConical, ClipboardList, CheckCircle2,
    Clock, Loader2, AlertTriangle, FileText, Beaker,
    Hash, Calendar, User, Phone, Droplets, Activity,
    ChevronDown, ChevronUp, Stethoscope, Search,
    Plus, X, Tag, DollarSign, Send,
} from "lucide-react";
import { Patient } from "@/types/models";
import { AILabInterpretation } from "@/components/ai/AIComponents";
import TestTemplateForm from "../TestTemplateForm";
import { calculateAge } from "@/utils/export";

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
    routine: { label: "Routine", color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400", border: "border-gray-200" },
    urgent: { label: "Urgent", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", border: "border-amber-200" },
    stat: { label: "STAT", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500", border: "border-red-200" },
};

function PriorityBadge({ priority }: { priority?: string }) {
    const cfg = PRIORITY_CONFIG[priority ?? "routine"] ?? PRIORITY_CONFIG.routine;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
        </span>
    );
}

// ─── Structured result parser ──────────────────────────────────────────────────

function parseStructuredResult(result?: string) {
    if (!result) return null;
    const lines = result.split("\n");
    // Find header row
    const headerIdx = lines.findIndex(l => l.includes("TEST NAME") && l.includes("RESULT"));
    if (headerIdx === -1) {
        // Free text
        return { type: "free" as const, text: result };
    }
    const category = lines[0]?.trim() ?? "";
    const name = lines[1]?.trim() ?? "";
    const separatorIdx = headerIdx + 1;
    const rows: { label: string; value: string; ref: string; unit: string }[] = [];
    let note: string | null = null;
    for (let i = separatorIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith("Note:")) { note = line.replace("Note:", "").trim(); break; }
        if (line.startsWith("Additional Notes")) { note = lines.slice(i).join("\n"); break; }
        const parts = lines[i].split("\t");
        if (parts.length >= 2) {
            rows.push({
                label: parts[0]?.trim() ?? "",
                value: parts[1]?.trim() ?? "",
                ref: parts[2]?.trim() ?? "—",
                unit: parts[3]?.trim() ?? "",
            });
        }
    }
    // Also check for additional notes at end
    const additionalIdx = lines.findIndex(l => l.includes("Additional Notes"));
    if (additionalIdx !== -1) {
        note = (note ? note + "\n\n" : "") + lines.slice(additionalIdx).join("\n");
    }
    return { type: "structured" as const, category, name, rows, note };
}

function StructuredResultDisplay({ result }: { result?: string }) {
    const parsed = parseStructuredResult(result);
    if (!parsed) return <p className="text-xs text-gray-400 italic">No result text recorded.</p>;
    if (parsed.type === "free") {
        return (
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                {parsed.text}
            </pre>
        );
    }
    const { category, name, rows, note } = parsed;
    return (
        <div className="space-y-3">
            {(category || name) && (
                <div className="flex items-center gap-2">
                    {category && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{category}</span>}
                    {name && <span className="text-xs font-bold text-gray-800">{name}</span>}
                </div>
            )}
            {rows.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500">Test</th>
                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500">Result</th>
                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500 hidden sm:table-cell">Ref. Range</th>
                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {rows.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50/50">
                                    <td className="px-3 py-2.5 font-semibold text-gray-800">{r.label}</td>
                                    <td className="px-3 py-2.5 font-bold text-indigo-700">{r.value || "—"}</td>
                                    <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">{r.ref}</td>
                                    <td className="px-3 py-2.5 text-gray-500 font-mono text-[11px]">{r.unit || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-xs text-gray-400 italic">No structured values recorded.</p>
            )}
            {note && (
                <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed">{note}</p>
                </div>
            )}
        </div>
    );
}

// ─── Completed result card ────────────────────────────────────────────────────

function LabResultCard({ req, patient }: { req: any, patient: Patient }) {
    const age = patient?.birth_date ? calculateAge(patient.birth_date) : undefined;
    const completedDate = req.completed_at ? new Date(req.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
    const completedTime = req.completed_at ? new Date(req.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-green-50/50 to-white">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shrink-0 shadow-sm">
                            <CheckCircle2 size={16} className="text-white" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-gray-900">{req.test_type ?? "Lab Test"}</p>
                                <PriorityBadge priority={req.priority} />
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Completed
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Calendar size={11} className="text-gray-400" /> {completedDate} {completedTime && `• ${completedTime}`}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600">#{req.visit_id?.slice(-6) ?? req.id?.slice(-6)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 py-4 space-y-4">
                {req.result ? (
                    <>
                        <div className="flex items-center gap-2">
                            <ClipboardList size={12} className="text-indigo-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Structured Results</p>
                            <span className="ml-auto text-[10px] text-gray-400 flex items-center gap-1">
                                <Beaker size={10} /> {req.test_type}
                            </span>
                        </div>
                        <StructuredResultDisplay result={req.result} />
                        <AILabInterpretation testType={req.test_type} result={req.result}
                            patientAge={age} patientGender={patient?.gender} />
                    </>
                ) : (
                    <p className="text-xs text-gray-400 italic">No result text recorded.</p>
                )}

                {req.notes && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50/60 border border-blue-100/60 rounded-xl">
                        <Stethoscope size={12} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            <span className="font-bold">Doctor&apos;s note:</span> {req.notes}
                        </p>
                    </div>
                )}

                {/* Patient context footer */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-50 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1">
                        <User size={11} /> {patient.name}
                    </span>
                    {patient.gender && <span>• {patient.gender}</span>}
                    {age !== undefined && <span>• {age} yrs</span>}
                    {patient.phone && <span className="flex items-center gap-1"><Phone size={10} /> {patient.phone}</span>}
                </div>
            </div>
        </div>
    );
}

// ─── Pending row (read-only — non-lab-tech roles) ─────────────────────────────

function PendingCard({ req }: { req: any }) {
    return (
        <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <div className="h-1 w-full bg-amber-400" />
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                        <Clock size={15} className="text-amber-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                            <PriorityBadge priority={req.priority} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            <Calendar size={11} /> Requested {req.created_at ? new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            {req.notes && <span className="text-blue-600 italic hidden sm:inline">• &quot;{req.notes}&quot;</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        Awaiting Results
                    </span>
                </div>
            </div>
            {req.notes && (
                <div className="px-5 pb-4 sm:hidden">
                    <div className="px-3 py-2 bg-blue-50/60 rounded-xl border border-blue-100/60">
                        <p className="text-xs text-blue-700">
                            <span className="font-bold">Doctor&apos;s note:</span> {req.notes}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Pending row WITH inline result entry (lab-tech role) ─────────────────────

function LabTechPendingRow({ req, patientId, onSubmitted }: { req: any; patientId: string; onSubmitted: () => void }) {
    const { user } = useAuth();
    const { mutate: updateLabRequest, isPending: saving } = useUpdateLabRequest();
    const [open, setOpen] = useState(false);
    const [price, setPrice] = useState("");

    function handleSubmit(resultString: string) {
        const parsedPrice = Number(price);
        updateLabRequest(
            {
                id: req.id,
                updates: {
                    status: "completed",
                    result: resultString,
                    completed_by: user?.$id ?? user?.id,
                    completed_at: new Date().toISOString(),
                    ...(parsedPrice > 0 ? { price: parsedPrice } : {}),
                },
            },
            {
                onSuccess: () => { 
                    toast.success("Result submitted and updated in billing."); 
                    setOpen(false); 
                    setPrice("");
                    onSubmitted(); 
                },
                onError: () => toast.error("Failed to submit result."),
            }
        );
    }

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${open ? "border-indigo-300 bg-indigo-50/20 shadow-sm" : "border-amber-200 bg-white hover:border-indigo-200"}`}>
            <div className="h-1 w-full bg-amber-400" />
            <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                    <Clock size={15} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                        <PriorityBadge priority={req.priority} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar size={11} /> {req.created_at ? new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </p>
                        {req.notes && <p className="text-xs text-blue-600 italic line-clamp-1">&quot;{req.notes}&quot;</p>}
                    </div>
                </div>
                <button onClick={() => setOpen(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${open ? "bg-gray-100 hover:bg-gray-200 text-gray-600" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"}`}>
                    {open ? <><ChevronUp size={12} /> Cancel</> : <><FileText size={11} /> Enter Result</>}
                </button>
            </div>

            {open && (
                <div className="px-5 pb-5 pt-4 space-y-4 border-t border-indigo-100 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Beaker size={13} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-700">Result for {req.test_type}</p>
                            <p className="text-[11px] text-gray-400">Structured template • reference ranges • auto-reflected in billing</p>
                        </div>
                    </div>

                    {/* Optional price update → updates billing */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                            <span>Test Price (NGN)</span> <span className="text-gray-300 font-normal normal-case">(Optional • updates frontdesk billing)</span>
                        </label>
                        <div className="relative w-full sm:w-1/2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₦</span>
                            <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
                                placeholder="e.g. 5000"
                                className="w-full h-10 pl-7 pr-3 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all" />
                        </div>
                    </div>

                    {/* Structured template form */}
                    <TestTemplateForm
                        testType={req.test_type ?? ""}
                        submitting={saving}
                        onSubmit={async (resultString) => handleSubmit(resultString)}
                    />

                    <div className="flex justify-end pt-1">
                        <button onClick={() => { setOpen(false); setPrice(""); }}
                            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Modal / Form: Send Lab Request (Creates request + auto-bills frontdesk) ───

function SendLabRequestModal({
    patient,
    onClose,
    onSuccess,
}: {
    patient: Patient;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { user } = useAuth();
    const { data: catalog = [] } = useLabTestCatalog();
    const { mutate: createLabRequest, isPending } = useCreateLabRequest();

    const [selectedTestName, setSelectedTestName] = useState("");
    const [customTestName, setCustomTestName] = useState("");
    const [price, setPrice] = useState("");
    const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
    const [notes, setNotes] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Catalog items filtered by search
    const filteredCatalog = useMemo(() => {
        if (!searchTerm.trim()) return catalog;
        const term = searchTerm.toLowerCase();
        return catalog.filter(
            t => t.test_name.toLowerCase().includes(term) || (t.category && t.category.toLowerCase().includes(term))
        );
    }, [catalog, searchTerm]);

    const handleSelectCatalogItem = (test: any) => {
        setSelectedTestName(test.test_name);
        setCustomTestName("");
        if (typeof test.price === "number") {
            setPrice(String(test.price));
        }
    };

    const finalTestType = customTestName.trim() || selectedTestName;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!finalTestType) {
            toast.error("Please choose or enter a lab test name.");
            return;
        }

        const parsedPrice = price ? Number(price) : undefined;

        createLabRequest(
            {
                patientId: patient.id!,
                testType: finalTestType,
                priority,
                notes: notes.trim() || undefined,
                price: parsedPrice,
                requestedBy: user?.$id ?? user?.id,
            },
            {
                onSuccess: () => {
                    const priceLabel = parsedPrice !== undefined && parsedPrice > 0 ? ` (₦${parsedPrice.toLocaleString("en-NG")})` : "";
                    toast.success(`Lab request for ${finalTestType}${priceLabel} sent and reflected in FrontDesk/Patient Billing.`);
                    onSuccess();
                    onClose();
                },
                onError: (err) => {
                    toast.error("Failed to send lab request: " + ((err as any)?.message ?? "Unknown error"));
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/80 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                            <FlaskConical size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">Send Lab Request</h3>
                            <p className="text-xs text-gray-400">Order test for {patient.name} • Auto-billed to FrontDesk</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Body / Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
                    
                    {/* Catalog Test Quick Picker */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between mb-1.5">
                            <span>Select from Test Catalog</span>
                            {selectedTestName && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedTestName("")}
                                    className="text-indigo-600 hover:underline text-[10px] font-bold"
                                >
                                    Clear selection
                                </button>
                            )}
                        </label>

                        {/* Search catalog */}
                        <div className="relative mb-2">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search test catalog (e.g. FBC, Malaria, Widal, Urinalysis)..."
                                className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition-all"
                            />
                        </div>

                        {/* Catalog list chips */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                            {filteredCatalog.slice(0, 16).map(item => {
                                const isSelected = selectedTestName === item.test_name;
                                return (
                                    <button
                                        key={item.id ?? item.test_name}
                                        type="button"
                                        onClick={() => handleSelectCatalogItem(item)}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
                                            isSelected
                                                ? "bg-indigo-600 text-white font-bold shadow-xs"
                                                : "bg-white border border-gray-100 hover:border-indigo-200 text-gray-700"
                                        }`}
                                    >
                                        <span className="truncate flex-1 pr-1">{item.test_name}</span>
                                        {typeof item.price === "number" && item.price > 0 && (
                                            <span className={`text-[10px] font-bold shrink-0 ${isSelected ? "text-indigo-100" : "text-indigo-600 font-mono"}`}>
                                                ₦{item.price.toLocaleString("en-NG")}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                            {filteredCatalog.length === 0 && (
                                <p className="col-span-2 text-xs text-gray-400 py-2 text-center italic">No matching catalog tests</p>
                            )}
                        </div>
                    </div>

                    {/* Or Custom Test Name */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                            Or Enter Custom Test Name
                        </label>
                        <input
                            type="text"
                            value={customTestName}
                            onChange={e => {
                                setCustomTestName(e.target.value);
                                if (e.target.value) setSelectedTestName("");
                            }}
                            placeholder="e.g. Specialized Antibody Panel, Biopsy, etc."
                            className="w-full text-xs font-semibold border border-gray-200 bg-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                        />
                    </div>

                    {/* Price and Priority Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Test Price */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                Test Price (NGN) <span className="text-emerald-600 font-bold">• Billed</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₦</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="0"
                                    className="w-full h-10 pl-7 pr-3 text-xs font-bold text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                                />
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                Urgency Priority
                            </label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as any)}
                                className="w-full h-10 text-xs font-bold border border-gray-200 bg-white rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                <option value="routine">Routine (Standard)</option>
                                <option value="urgent">Urgent (Priority)</option>
                                <option value="stat">STAT (Immediate Critical)</option>
                            </select>
                        </div>
                    </div>

                    {/* Clinical Notes / Indication */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                            Clinical Indication / Doctor Notes (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. Suspected typhoid fever, check Widal titer and blood culture..."
                            className="w-full text-xs border border-gray-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
                        />
                    </div>

                    {/* Billing Notice Callout */}
                    <div className="px-3.5 py-2.5 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-start gap-2.5">
                        <DollarSign size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-indigo-900 leading-relaxed">
                            <strong>Automatic Billing:</strong> Submitting this request will instantly register the lab test and create a pending invoice of <strong>₦{Number(price || 0).toLocaleString("en-NG")}</strong> in FrontDesk Billing and the Patient Billing tab.
                        </p>
                    </div>

                    {/* Submit Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !finalTestType}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 size={13} className="animate-spin" />
                                    Sending…
                                </>
                            ) : (
                                <>
                                    <Send size={13} />
                                    Send Lab Request &amp; Bill
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    patient: Patient;
    userRole?: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LabTab({ patient, userRole }: Props) {
    const { data: labRequests, isLoading: loading, error, refetch } = useLabRequestsByPatient(patient.id ?? "");
    const [isSendRequestModalOpen, setIsSendRequestModalOpen] = useState(false);

    const isLabTech = userRole === "Labtech" || userRole === "LabTechnician" || userRole?.toLowerCase().includes("lab");
    const canSendRequest = isLabTech || userRole === "Doctor" || userRole === "Admin";
    const pendingRequests = labRequests?.filter((r: any) => r.status === "pending") ?? [];
    const completedRequests = labRequests?.filter((r: any) => r.status === "completed") ?? [];

    return (
        <div className="space-y-6">

            {/* Patient header summary - important details visible */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-4 flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-black shadow-sm shrink-0">
                    {patient.name ? patient.name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() : <User size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{patient.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-indigo-700">
                            <Hash size={10} /> {patient.id?.slice(-8).toUpperCase() ?? "—"}
                        </span>
                        {patient.gender && <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{patient.gender}</span>}
                        {patient.birth_date && <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{calculateAge(patient.birth_date)} yrs</span>}
                        {patient.phone && <span className="text-xs text-gray-600 flex items-center gap-1"><Phone size={10} className="text-gray-400" /> {patient.phone}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {pendingRequests.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            {pendingRequests.length} pending
                        </span>
                    )}
                    {completedRequests.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                            {completedRequests.length} completed
                        </span>
                    )}
                </div>
            </div>

            {/* ── Section header with Send Lab Request Action ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0 border border-sky-100">
                        <FlaskConical size={17} className="text-sky-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">Lab Investigations &amp; Results</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Laboratory orders • structured results • frontdesk billing reflection</p>
                    </div>
                </div>

                {canSendRequest && (
                    <button
                        type="button"
                        onClick={() => setIsSendRequestModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-colors shrink-0"
                    >
                        <Plus size={14} /> Send Lab Request
                    </button>
                )}
            </div>

            {/* ── Modal for Sending Lab Request ── */}
            {isSendRequestModalOpen && (
                <SendLabRequestModal
                    patient={patient}
                    onClose={() => setIsSendRequestModalOpen(false)}
                    onSuccess={() => setTimeout(() => refetch(), 0)}
                />
            )}

            {/* ── Loading ── */}
            {loading && (
                <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-gray-100 gap-3">
                    <Loader2 size={18} className="text-sky-500 animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Loading lab requests...</p>
                </div>
            )}

            {/* ── Error ── */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-100 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                        <AlertTriangle size={20} className="text-red-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Failed to load lab requests</p>
                </div>
            )}

            {/* ── Empty ── */}
            {!loading && !error && !labRequests?.length && (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-100 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <FlaskConical size={20} className="text-gray-300" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-500">No lab requests yet</p>
                        <p className="text-xs text-gray-400 mt-1">Order lab tests above or from consultation to begin analysis</p>
                    </div>
                </div>
            )}

            {/* ── Pending section ── */}
            {!loading && pendingRequests.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Clock size={12} className="text-amber-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Pending Tests {isLabTech && `(${pendingRequests.length})`}
                        </p>
                        <div className="flex-1 h-px bg-amber-100 ml-2" />
                    </div>
                    {isLabTech
                        ? pendingRequests.map((req: any) => (
                              <LabTechPendingRow key={req.id} req={req} patientId={patient.id} onSubmitted={() => setTimeout(() => refetch(), 0)} />
                          ))
                        : pendingRequests.map((req: any) => <PendingCard key={req.id} req={req} />)
                    }
                </div>
            )}

            {/* ── Completed section ── */}
            {!loading && completedRequests.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Completed Results • Structured & Arranged</p>
                        <div className="flex-1 h-px bg-green-100 ml-2" />
                    </div>
                    <div className="space-y-4">
                        {completedRequests.map((req: any) => <LabResultCard key={req.id} req={req} patient={patient} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
