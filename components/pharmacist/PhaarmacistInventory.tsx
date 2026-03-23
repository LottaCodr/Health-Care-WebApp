"use client";

import React, { useState, useMemo } from "react";
import { useDrugInventory, useCreateDrugInventoryItem, useUpdateDrugInventoryItem } from "@/hooks/use-emr";
import { useAuth } from "@/context/auth-provider";
import {
    Package, Plus, Search, AlertTriangle, CheckCircle2,
    RefreshCcw, X, Loader2, ChevronDown, Edit3,
    BadgeDollarSign, CalendarDays, MapPin, Layers,
    Filter, TrendingDown, ArrowUpCircle, FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { DrugInventoryItem } from "@/types/models";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
    "All",
    "Analgesic", "Antibiotic", "Antimalarial", "Antihypertensive",
    "Antidiabetic", "Antihistamine", "Antifungal", "Antiviral",
    "Vitamin/Supplement", "IV Fluid", "Rehydration", "Other",
];

const UNITS = ["tablets", "capsules", "ml", "vials", "sachets", "ampoules", "syrup (ml)", "cream (g)", "drops"];

// ─── Stock status ─────────────────────────────────────────────────────────────

function getStockStatus(quantity: number, reorderLevel: number) {
    if (quantity === 0) return { label: "Out of Stock", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500", border: "border-red-200" };
    if (quantity <= reorderLevel) return { label: "Low Stock", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", border: "border-amber-200" };
    return { label: "In Stock", color: "text-green-700", bg: "bg-green-50", dot: "bg-green-500", border: "border-green-200" };
}

function getExpiryStatus(expiryDate?: string) {
    if (!expiryDate) return null;
    const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return { label: "Expired", color: "text-red-700", bg: "bg-red-50" };
    if (days <= 30) return { label: `${days}d left`, color: "text-amber-700", bg: "bg-amber-50" };
    if (days <= 90) return { label: `${days}d left`, color: "text-orange-700", bg: "bg-orange-50" };
    return null;
}

// ─── Restock modal ────────────────────────────────────────────────────────────

function RestockModal({ item, onClose, onSuccess }: {
    item: DrugInventoryItem; onClose: () => void; onSuccess: () => void;
}) {
    const { mutate: updateItem } = useUpdateDrugInventoryItem();
    const [qty, setQty] = useState("");
    const [saving, setSaving] = useState(false);

    const handleRestock = async () => {
        const add = parseInt(qty);
        if (isNaN(add) || add <= 0) { toast.error("Enter a valid quantity."); return; }
        setSaving(true);
        try {
            await updateItem(item.id, { quantity: item.quantity + add });
            toast.success(`Restocked ${item.drug_name} with ${add} ${item.unit}.`);
            onSuccess();
            onClose();
        } catch {
            toast.error("Failed to restock. Please try again.");
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
                            <ArrowUpCircle size={15} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">Restock Drug</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{item.drug_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <X size={14} />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium">Current stock</p>
                        <p className="text-sm font-extrabold text-gray-900">{item.quantity} {item.unit}</p>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Add Quantity ({item.unit})
                        </p>
                        <input
                            type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
                            placeholder="e.g. 100"
                            className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400/25 focus:border-green-400 focus:bg-white transition-all"
                        />
                    </div>
                    {qty && !isNaN(parseInt(qty)) && parseInt(qty) > 0 && (
                        <div className="px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
                            <p className="text-xs text-green-700 font-medium">
                                New stock: <span className="font-extrabold">{item.quantity + parseInt(qty)} {item.unit}</span>
                            </p>
                        </div>
                    )}
                    <div className="flex gap-2 pt-1">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleRestock} disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold shadow-sm shadow-green-200 transition-all disabled:opacity-60">
                            {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><ArrowUpCircle size={13} /> Restock</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Add drug modal ───────────────────────────────────────────────────────────

function AddDrugModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const { user } = useAuth();
    const { mutate: createItem } = useCreateDrugInventoryItem();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        drugName: "", genericName: "", category: "", unit: "tablets",
        quantity: "", reorderLevel: "10", unitPrice: "",
        supplier: "", expiryDate: "", batchNumber: "", location: "", notes: "",
    });

    const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.drugName.trim()) { toast.error("Drug name is required."); return; }
        if (!form.quantity || isNaN(Number(form.quantity))) { toast.error("Valid quantity is required."); return; }
        if (!form.unitPrice || isNaN(Number(form.unitPrice))) { toast.error("Valid unit price is required."); return; }

        setSaving(true);
        try {
            await createItem({
                drugName: form.drugName,
                genericName: form.genericName || undefined,
                category: form.category || undefined,
                unit: form.unit,
                quantity: parseInt(form.quantity),
                reorderLevel: parseInt(form.reorderLevel) || 10,
                unitPrice: parseFloat(form.unitPrice),
                supplier: form.supplier || undefined,
                expiryDate: form.expiryDate || undefined,
                batchNumber: form.batchNumber || undefined,
                location: form.location || undefined,
                notes: form.notes || undefined,
                createdBy: user?.$id,
            });
            toast.success(`${form.drugName} added to inventory.`);
            onSuccess();
            onClose();
        } catch {
            toast.error("Failed to add drug. Please try again.");
        } finally { setSaving(false); }
    };

    const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
        <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </p>
            {children}
        </div>
    );

    const inputCls = "w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-400 focus:bg-white transition-all";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                            <Plus size={15} className="text-violet-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">Add Drug to Inventory</p>
                            <p className="text-xs text-gray-400 mt-0.5">Fill in the drug details below</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <X size={14} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <Field label="Drug Name" required>
                                <input className={inputCls} placeholder="e.g. Paracetamol 500mg" value={form.drugName} onChange={(e) => set("drugName", e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Generic Name">
                            <input className={inputCls} placeholder="e.g. Acetaminophen" value={form.genericName} onChange={(e) => set("genericName", e.target.value)} />
                        </Field>
                        <Field label="Category">
                            <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
                                <option value="">Select...</option>
                                {CATEGORIES.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                        <Field label="Unit" required>
                            <select className={inputCls} value={form.unit} onChange={(e) => set("unit", e.target.value)}>
                                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </Field>
                        <Field label="Quantity in Stock" required>
                            <input className={inputCls} type="number" min="0" placeholder="e.g. 200" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
                        </Field>
                        <Field label="Unit Price (₦)" required>
                            <input className={inputCls} type="number" min="0" step="0.01" placeholder="e.g. 50" value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} />
                        </Field>
                        <Field label="Reorder Level">
                            <input className={inputCls} type="number" min="0" placeholder="e.g. 20" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} />
                        </Field>
                        <Field label="Expiry Date">
                            <input className={inputCls} type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
                        </Field>
                        <Field label="Batch Number">
                            <input className={inputCls} placeholder="e.g. BTH-2025-001" value={form.batchNumber} onChange={(e) => set("batchNumber", e.target.value)} />
                        </Field>
                        <Field label="Supplier">
                            <input className={inputCls} placeholder="e.g. Emzor Pharma" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} />
                        </Field>
                        <Field label="Shelf Location">
                            <input className={inputCls} placeholder="e.g. A-Shelf-3" value={form.location} onChange={(e) => set("location", e.target.value)} />
                        </Field>
                        <div className="col-span-2">
                            <Field label="Notes">
                                <textarea className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-400 focus:bg-white transition-all resize-none" rows={2} placeholder="Any additional notes..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
                            </Field>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-50 shrink-0 flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" onClick={handleSubmit} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-sm shadow-violet-200 transition-all disabled:opacity-60">
                        {saving ? <><Loader2 size={13} className="animate-spin" /> Adding...</> : <><Plus size={13} /> Add Drug</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Drug row ─────────────────────────────────────────────────────────────────

function DrugRow({ item, onRestock }: { item: DrugInventoryItem; onRestock: (item: DrugInventoryItem) => void }) {
    const status = getStockStatus(item.quantity, item.reorder_level);
    const expiry = getExpiryStatus(item.expiry_date);
    const isLow = item.quantity <= item.reorder_level;

    return (
        <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm
            ${item.quantity === 0 ? "border-red-100 bg-red-50/30" : isLow ? "border-amber-100 bg-amber-50/20" : "border-gray-100 bg-gray-50/50 hover:bg-white"}`}>

            {/* Drug icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm
                ${item.quantity === 0 ? "bg-red-100 text-red-600" : isLow ? "bg-amber-100 text-amber-700" : "bg-violet-50 border border-violet-100 text-violet-600"}`}>
                {item.drug_name[0]?.toUpperCase()}
            </div>

            {/* Drug info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.drug_name}</p>
                    {item.category && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {item.category}
                        </span>
                    )}
                    {expiry && (
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${expiry.bg} ${expiry.color}`}>
                            {expiry.label}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {item.generic_name && <span className="text-[11px] text-gray-400">{item.generic_name}</span>}
                    {item.location && (
                        <div className="flex items-center gap-1">
                            <MapPin size={10} className="text-gray-400" />
                            <span className="text-[11px] text-gray-400">{item.location}</span>
                        </div>
                    )}
                    {item.supplier && <span className="text-[11px] text-gray-400">· {item.supplier}</span>}
                </div>
            </div>

            {/* Stock quantity */}
            <div className="text-center shrink-0 hidden sm:block">
                <p className={`text-lg font-extrabold leading-none ${item.quantity === 0 ? "text-red-600" : isLow ? "text-amber-700" : "text-gray-900"}`}>
                    {item.quantity}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.unit}</p>
            </div>

            {/* Price */}
            <div className="text-right shrink-0 hidden md:block">
                <p className="text-sm font-bold text-gray-800">₦{Number(item.unit_price).toLocaleString("en-NG")}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">per {item.unit.replace(/s$/, "")}</p>
            </div>

            {/* Status + action */}
            <div className="flex items-center gap-2 shrink-0">
                <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.bg} ${status.color} ${status.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                </span>
                <button onClick={() => onRestock(item)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 text-xs font-bold text-gray-600 transition-all">
                    <ArrowUpCircle size={13} />
                    <span className="hidden sm:inline">Restock</span>
                </button>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PharmacistInventory() {
    const { data: inventory, loading, error, refetch } = useDrugInventory();
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [filterLowStock, setFilterLowStock] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [restockItem, setRestockItem] = useState<DrugInventoryItem | null>(null);

    const filtered = useMemo(() => {
        if (!inventory) return [];
        return inventory.filter((item) => {
            const matchSearch = !search || item.drug_name.toLowerCase().includes(search.toLowerCase()) || (item.generic_name ?? "").toLowerCase().includes(search.toLowerCase());
            const matchCategory = category === "All" || item.category === category;
            const matchLow = !filterLowStock || item.quantity <= item.reorder_level;
            return matchSearch && matchCategory && matchLow;
        });
    }, [inventory, search, category, filterLowStock]);

    // Summary stats
    const totalItems = inventory?.length ?? 0;
    const lowStockCount = inventory?.filter((i) => i.quantity > 0 && i.quantity <= i.reorder_level).length ?? 0;
    const outOfStock = inventory?.filter((i) => i.quantity === 0).length ?? 0;
    const totalValue = inventory?.reduce((s, i) => s + (i.quantity * Number(i.unit_price)), 0) ?? 0;

    return (
        <div className="space-y-6">

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Drugs", value: totalItems, icon: Package, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
                    { label: "Low Stock", value: lowStockCount, icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                    { label: "Out of Stock", value: outOfStock, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
                    { label: "Inventory Value", value: `₦${(totalValue / 1000).toFixed(0)}k`, icon: BadgeDollarSign, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
                ].map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm px-5 py-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
                            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <Icon size={19} className={s.color} />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                                <p className="text-xs text-gray-400 font-medium mt-1">{s.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Main card ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                            <FlaskConical size={16} className="text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 leading-tight">Drug Inventory</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {totalItems} drugs</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => refetch()}
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                            <RefreshCcw size={13} />
                        </button>
                        <button onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-sm shadow-violet-200 transition-colors">
                            <Plus size={13} /> Add Drug
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search drugs..."
                            className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-400 focus:bg-white transition-all"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Category filter */}
                    <div className="relative">
                        <select value={category} onChange={(e) => setCategory(e.target.value)}
                            className="h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-400 appearance-none cursor-pointer">
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Low stock filter */}
                    <button
                        onClick={() => setFilterLowStock((v) => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all
                            ${filterLowStock ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-200 hover:text-amber-600"}`}
                    >
                        <Filter size={11} />
                        Low Stock Only
                        {filterLowStock && <X size={11} />}
                    </button>
                </div>

                {/* List */}
                <div className="px-6 py-5 space-y-2.5">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-3">
                            <Loader2 size={18} className="text-violet-500 animate-spin" />
                            <p className="text-sm text-gray-400">Loading inventory...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                                <AlertTriangle size={20} className="text-red-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600">Failed to load inventory</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                <Package size={20} className="text-gray-300" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-600">
                                    {search || category !== "All" || filterLowStock ? "No matching drugs" : "No drugs in inventory"}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {search || category !== "All" || filterLowStock ? "Try adjusting your filters" : "Click \"Add Drug\" to get started"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        filtered.map((item) => (
                            <DrugRow key={item.id} item={item} onRestock={setRestockItem} />
                        ))
                    )}
                </div>

                {/* Low stock alert footer */}
                {lowStockCount > 0 && !filterLowStock && (
                    <div className="flex items-center gap-3 px-6 py-4 border-t border-amber-100 bg-amber-50/50">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-700 font-medium flex-1">
                            <span className="font-bold">{lowStockCount} drug{lowStockCount !== 1 ? "s" : ""}</span> at or below reorder level.
                        </p>
                        <button onClick={() => setFilterLowStock(true)}
                            className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2">
                            View all
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddModal && <AddDrugModal onClose={() => setShowAddModal(false)} onSuccess={refetch} />}
            {restockItem && <RestockModal item={restockItem} onClose={() => setRestockItem(null)} onSuccess={refetch} />}
        </div>
    );
}