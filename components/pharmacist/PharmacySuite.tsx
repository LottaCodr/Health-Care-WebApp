"use client";

import React, { useState, useMemo } from "react";
import {
    usePendingPrescriptions,
    usePrescriptionsByPatient,
    useUpdatePrescription,
    useCreateDispensingRecord,
    useDrugInventory,
    useActiveDrugs,
    useRestockDrug,
} from "@/hooks/emr/use-pharmacy";
import { useSearchPatients } from "@/hooks/emr/use-patients";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";
import {
    Pill, Search, X, CheckCircle2, Loader2, AlertTriangle,
    RefreshCcw, User, Phone, Clock, Package, ArrowUpCircle,
    ClipboardList, ChevronRight, AlertCircle, Layers,
    TrendingDown, ShieldAlert, History, Inbox,
} from "lucide-react";
import { usePharmacyStore, PharmacyTab } from "@/store/pharmacy-store";

const fmtNaira = (n?: number) => n !== undefined ? `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}` : "—";
const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// ─── Pending Prescription Card ─────────────────────────────────────────────────

function PrescriptionCard({
    prescription,
    onDispense,
    dispensing,
}: {
    prescription: any;
    onDispense: (id: string) => void;
    dispensing: boolean;
}) {
    const hasAllergy = prescription.patients?.allergies &&
        prescription.drug_name &&
        prescription.patients.allergies.toLowerCase().includes(
            prescription.drug_name.split(" ")[0].toLowerCase()
        );

    return (
        <div className={`bg-white rounded-2xl border shadow-sm p-5 space-y-4 transition-all hover:shadow-md
            ${hasAllergy ? "border-red-200 bg-red-50/30" : "border-gray-100"}`}>

            {/* Patient info */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center font-black text-violet-600 text-sm shrink-0">
                        {(prescription.patients?.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">{prescription.patients?.name ?? "Unknown Patient"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            {prescription.patients?.phone && (
                                <div className="flex items-center gap-1">
                                    <Phone size={10} className="text-gray-400" />
                                    <p className="text-[10px] text-gray-400">{prescription.patients.phone}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                    <Clock size={11} />
                    {fmtDate(prescription.created_at)}
                </div>
            </div>

            {/* Drug info */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Pill size={13} className="text-violet-600 shrink-0" />
                    <p className="text-sm font-bold text-gray-900">{prescription.drug_name}</p>
                    {prescription.requires_prescription && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                            <ShieldAlert size={8} className="inline mr-0.5" />Rx
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <p className="text-gray-400 font-medium">Dosage</p>
                        <p className="font-bold text-gray-700">{prescription.dosage ?? "—"}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 font-medium">Duration</p>
                        <p className="font-bold text-gray-700">{prescription.duration ?? "—"}</p>
                    </div>
                    {prescription.price > 0 && (
                        <div>
                            <p className="text-gray-400 font-medium">Price</p>
                            <p className="font-bold text-gray-900">{fmtNaira(prescription.price)}</p>
                        </div>
                    )}
                </div>
                {prescription.notes && (
                    <p className="text-[11px] text-gray-500 italic border-t border-gray-100 pt-2">{prescription.notes}</p>
                )}
            </div>

            {/* Allergy warning */}
            {hasAllergy && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle size={13} className="text-red-600 shrink-0" />
                    <p className="text-xs font-bold text-red-700">
                        ⚠ Potential allergy: patient is allergic to {prescription.patients.allergies}
                    </p>
                </div>
            )}

            {/* Action */}
            <button
                onClick={() => onDispense(prescription.id)}
                disabled={dispensing || prescription.dispensed}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-sm shadow-violet-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {dispensing
                    ? <><Loader2 size={13} className="animate-spin" /> Dispensing...</>
                    : <><CheckCircle2 size={13} /> Dispense Drug</>
                }
            </button>
        </div>
    );
}

// ─── Prescription History Tab ─────────────────────────────────────────────────

function PrescriptionHistoryTab() {
    const { query, patientId, setField } = usePharmacyStore();
    const { data: results, isLoading: searching } = useSearchPatients(query);
    const { data: history, isLoading: hLoading } = usePrescriptionsByPatient(patientId ?? "");

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <p className="text-sm font-bold text-gray-900">Search Patient</p>
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input value={query} onChange={e => { setField("query", e.target.value); setField("patientId", null); }}
                        placeholder="Search by name, phone, or email..."
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 focus:bg-white transition-all" />
                    {query && <button onClick={() => { setField("query", ""); setField("patientId", null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
                </div>

                {/* Search results */}
                {query && !patientId && (
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                        {searching ? (
                            <div className="flex items-center gap-2 p-4"><Loader2 size={14} className="text-violet-500 animate-spin" /><p className="text-sm text-gray-400">Searching...</p></div>
                        ) : results && results.length > 0 ? (
                            (results as any[]).map(p => (
                                <button key={p.id} onClick={() => { setField("patientId", p.id); setField("query", p.name); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors border-b border-gray-50 last:border-0 text-left">
                                    <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center font-bold text-violet-600 text-xs shrink-0">
                                        {p.name[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                                        <p className="text-[10px] text-gray-400">{p.phone}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 shrink-0" />
                                </button>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 p-4 text-center">No patients found</p>
                        )}
                    </div>
                )}
            </div>

            {/* History */}
            {patientId && (
                <div className="space-y-3">
                    {hLoading ? (
                        <div className="flex items-center justify-center py-10 gap-3">
                            <Loader2 size={16} className="text-violet-500 animate-spin" />
                            <p className="text-sm text-gray-400">Loading history...</p>
                        </div>
                    ) : !history?.length ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <History size={20} className="text-gray-300" />
                            <p className="text-sm font-semibold text-gray-500">No prescription history</p>
                        </div>
                    ) : (
                        (history as any[]).map(p => (
                            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Pill size={13} className="text-violet-600" />
                                            <p className="text-sm font-bold text-gray-900">{p.drug_name}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{p.dosage} · {p.duration ?? "—"}</p>
                                        {p.notes && <p className="text-[10px] text-gray-400 italic mt-1">{p.notes}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                                            ${p.dispensed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                                            {p.dispensed ? "Dispensed" : "Pending"}
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-1">{fmtDate(p.created_at)}</p>
                                        {p.price > 0 && <p className="text-xs font-bold text-gray-700 mt-0.5">{fmtNaira(p.price)}</p>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Inventory Tab ─────────────────────────────────────────────────────────────

function InventoryTab() {
    const { data: drugs, isLoading, refetch } = useDrugInventory();
    const { mutate: restock } = useRestockDrug();
    const { restockId, restockQty, restocking, search, setField } = usePharmacyStore();

    const filtered = useMemo(() => {
        if (!drugs) return [];
        return (drugs as any[]).filter(d =>
            !search || d.drug_name?.toLowerCase().includes(search.toLowerCase())
        );
    }, [drugs, search]);

    const lowStock = (drugs as any[] ?? []).filter(d => d.quantity <= (d.reorder_level ?? 10) && d.quantity > 0).length;
    const outOfStk = (drugs as any[] ?? []).filter(d => d.quantity === 0).length;

    const handleRestock = async () => {
        if (!restockId) return;
        const qty = parseInt(restockQty);
        if (isNaN(qty) || qty <= 0) { toast.error("Enter a valid quantity."); return; }
        setField("restocking", true);
        try {
            restock({
                id: restockId,
                qty,

            });
            toast.success("Stock updated.");
            setField("restockId", null); setField("restockQty", ""); refetch();
        } catch { toast.error("Restock failed."); }
        finally { setField("restocking", false); }
    };

    return (
        <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Total Drugs", value: drugs?.length ?? 0, icon: Package, color: "text-violet-600", bg: "bg-violet-50" },
                    { label: "Low Stock", value: lowStock, icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Out of Stock", value: outOfStk, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                            <Icon size={16} className={color} />
                        </div>
                        <div>
                            <p className="text-xl font-extrabold text-gray-900 leading-none">{value}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Restock modal (inline) */}
            {restockId && (
                <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 space-y-3">
                    <p className="text-sm font-bold text-gray-900">Restock Drug</p>
                    <div className="flex items-center gap-3">
                        <input type="number" min="1" value={restockQty} onChange={e => setField("restockQty", e.target.value)}
                            placeholder="Add quantity..."
                            className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400/25 focus:border-green-400 focus:bg-white transition-all" />
                        <button onClick={handleRestock} disabled={restocking}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-60 transition-colors">
                            {restocking ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpCircle size={13} />}
                            Restock
                        </button>
                        <button onClick={() => { setField("restockId", null); setField("restockQty", ""); }}
                            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Drug list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input value={search} onChange={e => setField("search", e.target.value)} placeholder="Search drugs..."
                            className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 focus:bg-white transition-all" />
                    </div>
                    <button onClick={() => refetch()} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                        <RefreshCcw size={13} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-10 gap-3">
                        <Loader2 size={16} className="text-violet-500 animate-spin" />
                        <p className="text-sm text-gray-400">Loading inventory...</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map((d: any) => {
                            const outStk = d.quantity === 0;
                            const lowStk = d.quantity <= (d.reorder_level ?? 10) && !outStk;
                            return (
                                <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{d.drug_name}</p>
                                        <p className="text-[10px] text-gray-400">{d.category ?? "—"} · {d.dosage_form ?? ""} {d.strength ?? ""}</p>
                                    </div>
                                    <div className="text-right shrink-0 mr-2">
                                        <p className={`text-sm font-bold ${outStk ? "text-red-600" : lowStk ? "text-amber-600" : "text-gray-800"}`}>
                                            {d.quantity} {d.unit}
                                        </p>
                                        {outStk && <p className="text-[10px] text-red-500 font-bold">Out of stock</p>}
                                        {lowStk && <p className="text-[10px] text-amber-500 font-bold">Low stock</p>}
                                    </div>
                                    <div className="text-right shrink-0 mr-2">
                                        <p className="text-sm font-bold text-gray-900">{fmtNaira(d.price)}</p>
                                        <p className="text-[10px] text-gray-400">per {d.unit?.toLowerCase()}</p>
                                    </div>
                                    <button onClick={() => { setField("restockId", d.id); setField("restockQty", ""); }}
                                        className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-200 transition-colors shrink-0">
                                        <ArrowUpCircle size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main PharmacySuite ────────────────────────────────────────────────────────

export default function PharmacySuite() {
    const { user } = useAuth();
    const { activeTab, dispensingId, setField } = usePharmacyStore();

    const { data: pending, isLoading: qLoading, refetch } = usePendingPrescriptions();
    const { mutate: updatePx } = useUpdatePrescription();
    const { mutate: logDispense } = useCreateDispensingRecord();

    const handleDispense = async (prescriptionId: string) => {
        setField("dispensingId", prescriptionId);
        try {
            // 1. Mark prescription as dispensed
            updatePx({
                id: prescriptionId,
                updates: {

                    updated_at: new Date().toISOString(),
                    status: "Dispensed",
                }
            });

            // 2. Log dispensing record
            logDispense({
                prescription_id: prescriptionId,
                dispensed_by: user?.id ?? null,
                dispensed_at: new Date().toISOString(),
            });

            toast.success("Drug dispensed successfully. Payment record created.");
            refetch();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to dispense. Please try again.");
        } finally {
            setField("dispensingId", null);
        }
    };

    const tabs: { id: PharmacyTab; label: string; icon: React.ElementType; count?: number }[] = [
        { id: "queue", label: "Prescription Queue", icon: Inbox, count: pending?.length ?? 0 },
        { id: "dispense", label: "Patient History", icon: History, },
        { id: "inventory", label: "Inventory", icon: Layers, },
    ];

    return (
        <div className="space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-xl font-black text-gray-900">Pharmacy</h1>
                <p className="text-xs text-gray-400 mt-0.5">Dispense medications, manage stock</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setField("activeTab", tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all
                                ${isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                            <Icon size={13} />
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black
                                    ${isActive ? "bg-violet-100 text-violet-700" : "bg-gray-200 text-gray-500"}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}

            {/* ── Queue ── */}
            {activeTab === "queue" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-600">
                            {pending?.length ?? 0} prescription{(pending?.length ?? 0) !== 1 ? "s" : ""} awaiting dispensing
                        </p>
                        <button onClick={() => refetch()} className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                            <RefreshCcw size={13} />
                        </button>
                    </div>

                    {qLoading ? (
                        <div className="flex items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <Loader2 size={18} className="text-violet-500 animate-spin" />
                            <p className="text-sm text-gray-400">Loading prescriptions...</p>
                        </div>
                    ) : !pending?.length ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <CheckCircle2 size={24} className="text-green-500" />
                            <p className="text-sm font-semibold text-gray-500">Queue is clear</p>
                            <p className="text-xs text-gray-400">All prescriptions have been dispensed.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {(pending as any[]).map(p => (
                                <PrescriptionCard
                                    key={p.id}
                                    prescription={p}
                                    onDispense={handleDispense}
                                    dispensing={dispensingId === p.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Patient History ── */}
            {activeTab === "dispense" && <PrescriptionHistoryTab />}

            {/* ── Inventory ── */}
            {activeTab === "inventory" && <InventoryTab />}
        </div>
    );
}