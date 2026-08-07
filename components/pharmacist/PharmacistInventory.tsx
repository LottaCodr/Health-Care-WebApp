"use client";

import React, { useState, useMemo } from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { toast } from "sonner";
import {
    Pill, Plus, Search, X, Edit3, Trash2, Loader2,
    CheckCircle2, ChevronDown, RefreshCcw, Package,
    AlertTriangle, TrendingDown, ShieldAlert,
    ToggleLeft, ToggleRight, ArrowUpCircle, Filter, Upload,
} from "lucide-react";
import {
    useDrugCatalog,
    useToggleDrugActive,
    useUpsertDrug,
    useDeleteDrug,
    useRestockDrug,
} from "@/hooks/emr/use-pharmacy";
import { usePharmacyStore, Drug, ViewMode } from "@/store/pharmacy-store";
import BulkUploadDialog from "@/components/BulkUpload";

// ─── Types ────────────────────────────────────────────────────────────────────



const CATEGORIES = [
    "Antibiotics", "Analgesics / Pain Relief", "Antipyretics", "Antimalarials",
    "Antihypertensives", "Antidiabetics", "Antihistamines", "Antifungals",
    "Antivirals", "Cardiovascular", "Gastrointestinal", "Respiratory",
    "Vitamins & Supplements", "Hormones & Endocrine", "Dermatological",
    "Ophthalmological", "Ear / Nose / Throat", "Gynaecology & Obstetric",
    "Paediatric", "Vaccines", "IV Fluids", "Surgical Supplies", "Other",
];

const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Cream", "Ointment", "Drops", "Inhaler", "Suppository", "Patch", "Lotion", "Gel", "Powder", "Solution"];
const UNITS = ["Tablet", "Capsule", "ml", "mg", "g", "Unit", "Vial", "Ampoule", "Sachet", "Pack", "Bottle", "Tube"];

const fmtNaira    = (n?: number) => n !== undefined ? `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}` : "—";
const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const isExpiringSoon = (iso?: string) => { if (!iso) return false; const d = new Date(iso).getTime() - Date.now(); return d > 0 && d < 60 * 24 * 3600 * 1000; };
const isExpired = (iso?: string) => iso ? new Date(iso).getTime() < Date.now() : false;



// ─── Add/Edit Drug Modal ───────────────────────────────────────────────────────

const EMPTY: Partial<Drug> = {
    drug_name: "", generic_name: "", category: "", dosage_form: "Tablet",
    strength: "", manufacturer: "", unit: "Tablet",
    quantity: 0, reorder_level: 10, price: 0, cost_price: 0,
    expiry_date: "", requires_prescription: false, is_active: true,
};

function DrugModal({ drug, onClose, onSaved }: {
    drug?: Drug | null; onClose: () => void; onSaved: () => void;
}) {
    const { mutateAsync: upsert, isPending: loading } = useUpsertDrug();
    const isEdit = !!drug;
    const [form, setForm] = useState<Partial<Drug>>(drug ? { ...drug } : { ...EMPTY });
    const set = (k: keyof Drug, v: any) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.drug_name?.trim()) { toast.error("Drug name is required."); return; }
        if (!form.price || form.price < 0) { toast.error("Selling price is required."); return; }
        try {
            await upsert({
                drug: form,
                id: isEdit ? drug!.id : undefined,
            });
            toast.success(isEdit ? "Drug updated." : "Drug added to catalog.");
            onSaved();
            onClose();
        } catch (err: any) { toast.error(err?.message ?? "Failed to save."); }
    };

    const iCls = "w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 focus:bg-white transition-all";
    const sCls = `${iCls} appearance-none cursor-pointer`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                            <Pill size={16} className="text-violet-600" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">{isEdit ? "Edit Drug" : "Add Drug"}</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <X size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Drug Name <span className="text-red-500">*</span></p>
                            <input value={form.drug_name ?? ""} onChange={e => set("drug_name", e.target.value)} placeholder="e.g. Amoxicillin" className={iCls} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Generic Name</p>
                            <input value={form.generic_name ?? ""} onChange={e => set("generic_name", e.target.value)} placeholder="e.g. Amoxicillin trihydrate" className={iCls} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Manufacturer</p>
                            <input value={form.manufacturer ?? ""} onChange={e => set("manufacturer", e.target.value)} placeholder="e.g. Pfizer" className={iCls} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</p>
                            <div className="relative">
                                <select value={form.category ?? ""} onChange={e => set("category", e.target.value)} className={sCls}>
                                    <option value="">Select category...</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Dosage Form</p>
                            <div className="relative">
                                <select value={form.dosage_form ?? ""} onChange={e => set("dosage_form", e.target.value)} className={sCls}>
                                    {DOSAGE_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Strength</p>
                            <input value={form.strength ?? ""} onChange={e => set("strength", e.target.value)} placeholder="e.g. 500mg" className={iCls} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Unit</p>
                            <div className="relative">
                                <select value={form.unit ?? "Tablet"} onChange={e => set("unit", e.target.value)} className={sCls}>
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Selling Price (₦) <span className="text-red-500">*</span></p>
                            <input type="number" min="0" step="0.01" value={form.price ?? 0} onChange={e => set("price", parseFloat(e.target.value) || 0)} className={iCls} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cost Price (₦)</p>
                            <input type="number" min="0" step="0.01" value={form.cost_price ?? 0} onChange={e => set("cost_price", parseFloat(e.target.value) || 0)} className={iCls} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Quantity in Stock</p>
                            <input type="number" min="0" value={form.quantity ?? 0} onChange={e => set("quantity", parseInt(e.target.value) || 0)} className={iCls} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Reorder Level</p>
                            <input type="number" min="0" value={form.reorder_level ?? 10} onChange={e => set("reorder_level", parseInt(e.target.value) || 0)} className={iCls} />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Expiry Date</p>
                            <input type="date" value={form.expiry_date ?? ""} onChange={e => set("expiry_date", e.target.value)} className={iCls} />
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div onClick={() => set("requires_prescription", !form.requires_prescription)}
                                className={`w-10 h-6 rounded-full transition-colors relative ${form.requires_prescription ? "bg-amber-500" : "bg-gray-200"}`}>
                                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.requires_prescription ? "translate-x-4" : "translate-x-0.5"}`} />
                            </div>
                            <p className="text-xs font-bold text-gray-700">Prescription Required</p>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer ml-auto">
                            <div onClick={() => set("is_active", !form.is_active)}
                                className={`w-10 h-6 rounded-full transition-colors relative ${form.is_active ? "bg-green-500" : "bg-gray-200"}`}>
                                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                            </div>
                            <p className="text-xs font-bold text-gray-700">Active</p>
                        </label>
                    </div>

                    {/* Margin preview */}
                    {(form.price ?? 0) > 0 && (form.cost_price ?? 0) > 0 && (
                        <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                            <p className="text-xs font-bold text-green-700">
                                Margin: ₦{((form.price ?? 0) - (form.cost_price ?? 0)).toLocaleString("en-NG")}
                                · {Math.round((((form.price ?? 0) - (form.cost_price ?? 0)) / (form.price ?? 1)) * 100)}%
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-5 pt-4 border-t border-gray-50 flex gap-2 shrink-0">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-sm shadow-violet-200 transition-all disabled:opacity-60">
                        {loading ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={13} /> {isEdit ? "Save" : "Add Drug"}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Restock Modal (from original PharmacistInventory) ────────────────────────

function RestockModal({ drug, onClose, onSaved }: { drug: Drug; onClose: () => void; onSaved: () => void }) {
    const { mutateAsync: restock } = useRestockDrug();
    const [qty, setQty] = useState("");
    const [saving, setSaving] = useState(false);

    const handleRestock = async () => {
        const add = parseInt(qty);
        if (isNaN(add) || add <= 0) { toast.error("Enter a valid quantity."); return; }
        setSaving(true);
        try {
            await restock({
                id: drug.id,
                qty: add,
            });
            toast.success(`Restocked ${drug.drug_name} with ${add} ${drug.unit}.`);
            onSaved();
            onClose();
        } catch { toast.error("Failed to restock."); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                        <ArrowUpCircle size={16} className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">Restock Drug</p>
                        <p className="text-xs text-gray-400">{drug.drug_name}</p>
                    </div>
                    <button onClick={onClose} className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                        <X size={14} />
                    </button>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Current stock</p>
                    <p className="text-sm font-extrabold text-gray-900">{drug.quantity} {drug.unit}</p>
                </div>
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Add Quantity ({drug.unit})</p>
                    <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 100"
                        className="w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400/25 focus:border-green-400 focus:bg-white transition-all" />
                </div>
                {qty && !isNaN(parseInt(qty)) && parseInt(qty) > 0 && (
                    <div className="px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
                        <p className="text-xs text-green-700 font-medium">New stock: <span className="font-extrabold">{drug.quantity + parseInt(qty)} {drug.unit}</span></p>
                    </div>
                )}
                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">Cancel</button>
                    <button onClick={handleRestock} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold shadow-sm shadow-green-200 transition-all disabled:opacity-60">
                        {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><ArrowUpCircle size={13} /> Restock</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete confirm ────────────────────────────────────────────────────────────

function DeleteModal({ drug, onClose, onDeleted }: { drug: Drug; onClose: () => void; onDeleted: () => void }) {
    const { mutateAsync: remove, isPending: loading } = useDeleteDrug();
    const handleDelete = async () => {
        try {
            await remove(drug.id);
            toast.success(`${drug.drug_name} removed.`);
            onDeleted();
            onClose();
        }
        catch (err: any) { toast.error(err?.message ?? "Failed."); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto"><Trash2 size={20} className="text-red-600" /></div>
                <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">Remove Drug?</p>
                    <p className="text-xs text-gray-500 mt-1"><span className="font-bold">{drug.drug_name}</span> will be removed from the catalog.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
                    <button onClick={handleDelete} disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 transition-colors">
                        {loading ? <><Loader2 size={13} className="animate-spin" /> Removing...</> : <><Trash2 size={13} /> Remove</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main — merged Catalog + Inventory ────────────────────────────────────────

export default function DrugManagementPage() {
    const { authorized } = useRoleProtection([UserRole.Admin, UserRole.Pharmacist]);
    const { data: drugs, isLoading, error: isError, refetch } = useDrugCatalog();
    const { mutate: toggleActive } = useToggleDrugActive();

    const {
        viewMode, search, category, stockFilter, editTarget, deleteTarget, restockTarget, showAdd, toggling, setField
    } = usePharmacyStore();

    const [bulkImportOpen, setBulkImportOpen] = useState(false);

    const filtered = useMemo(() => {
        if (!drugs) return [];
        return (drugs as unknown as Drug[]).filter(d => {
            const matchSearch = !search ||
                d.drug_name.toLowerCase().includes(search.toLowerCase()) ||
                (d.generic_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (d.category ?? "").toLowerCase().includes(search.toLowerCase());
            const matchCat = category === "all" || d.category === category;
            const reorder = d.reorder_level ?? 10;
            const matchStock =
                stockFilter === "all" ? true :
                    stockFilter === "low" ? (d.quantity <= reorder && d.quantity > 0) :
                        stockFilter === "out" ? d.quantity === 0 :
                            stockFilter === "expired" ? isExpired(d.expiry_date) :
                                stockFilter === "expiring" ? isExpiringSoon(d.expiry_date) :
                                    stockFilter === "inactive" ? !d.is_active : true;
            return matchSearch && matchCat && matchStock;
        });
    }, [drugs, search, category, stockFilter]);

    const handleToggle = async (d: Drug) => {
        setField("toggling", d.id);
        try { await toggleActive({ id: d.id, current: d.is_active }); toast.success(`${d.drug_name} ${d.is_active ? "deactivated" : "activated"}.`); refetch(); }
        catch { toast.error("Failed to update."); }
        finally { setField("toggling", null); }
    };

    if (!authorized) return null;

    const totalValue = (drugs as unknown as Drug[] ?? []).reduce((s, d) => s + (d.price * d.quantity), 0);
    const lowStock = (drugs as unknown as Drug[] ?? []).filter(d => d.quantity <= (d.reorder_level ?? 10) && d.quantity > 0).length;
    const outOfStock = (drugs as unknown as Drug[] ?? []).filter(d => d.quantity === 0).length;

    const selCls = "h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 focus:outline-none appearance-none cursor-pointer";

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900">Drug Management</h1>
                    <p className="text-xs text-gray-400 mt-0.5">{drugs?.length ?? 0} drugs · inventory value {fmtNaira(totalValue)}</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
                        {(["catalog", "inventory"] as ViewMode[]).map(v => (
                            <button key={v} onClick={() => setField("viewMode", v)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all
                                    ${viewMode === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                                {v}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setBulkImportOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm font-semibold transition-all"
                    >
                        <Upload size={14} /> Bulk Import
                    </button>
                    <BulkUploadDialog
                        open={bulkImportOpen}
                        onOpenChange={setBulkImportOpen}
                        uploadType="drug_inventory"
                    />
                    <button onClick={() => setField("showAdd", true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-sm shadow-violet-200 transition-all">
                        <Plus size={14} /> Add Drug
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Drugs", value: drugs?.length ?? 0, icon: Package, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
                    { label: "Low Stock", value: lowStock, icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", onClick: () => setField("stockFilter", "low") },
                    { label: "Out of Stock", value: outOfStock, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100", onClick: () => setField("stockFilter", "out") },
                ].map(({ label, value, icon: Icon, color, bg, border, onClick }) => (
                    <div key={label} onClick={onClick}
                        className={`bg-white rounded-2xl border ${border} shadow-sm px-5 py-5 flex items-center gap-4 hover:shadow-md transition-all ${onClick ? "cursor-pointer" : ""}`}>
                        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                            <Icon size={19} className={color} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
                            <p className="text-xs text-gray-400 font-medium mt-1">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Filters */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 flex-wrap">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input value={search} onChange={e => setField("search", e.target.value)} placeholder="Search drug name, generic, category..."
                            className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 focus:bg-white transition-all" />
                        {search && <button onClick={() => setField("search", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
                    </div>
                    <div className="relative">
                        <select value={category} onChange={e => setField("category", e.target.value)} className={selCls}>
                            <option value="all">All Categories</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select value={stockFilter} onChange={e => setField("stockFilter", e.target.value)} className={selCls}>
                            <option value="all">All Stock</option>
                            <option value="low">Low Stock</option>
                            <option value="out">Out of Stock</option>
                            <option value="expiring">Expiring Soon</option>
                            <option value="expired">Expired</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {(search || category !== "all" || stockFilter !== "all") && (
                        <button onClick={() => { setField("search", ""); setField("category", "all"); setField("stockFilter", "all"); }}
                            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-100">
                            <X size={11} /> Clear
                        </button>
                    )}
                    <button onClick={() => refetch()} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                        <RefreshCcw size={13} />
                    </button>
                    <p className="text-xs text-gray-400 ml-auto">{filtered.length} results</p>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16 gap-3">
                        <Loader2 size={18} className="text-violet-500 animate-spin" />
                        <p className="text-sm text-gray-400">Loading drugs...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <AlertTriangle size={20} className="text-red-500" />
                        <p className="text-sm font-semibold text-gray-600">Failed to load</p>
                        <button onClick={() => refetch()} className="text-xs text-red-600 hover:underline">Retry</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Pill size={22} className="text-gray-300" />
                        <p className="text-sm font-semibold text-gray-500">No drugs found</p>
                        <button onClick={() => setField("showAdd", true)} className="text-xs text-violet-600 font-bold hover:underline">Add first drug →</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/40">
                                    {["Drug", "Category", "Form/Strength", "Stock",
                                        ...(viewMode === "catalog" ? ["Selling Price", "Cost Price"] : ["Unit Price"]),
                                        "Expiry", "Status", ""].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((d: Drug) => {
                                    const expired = isExpired(d.expiry_date);
                                    const expiring = isExpiringSoon(d.expiry_date);
                                    const outStk = d.quantity === 0;
                                    const lowStk = d.quantity <= (d.reorder_level ?? 10) && !outStk;
                                    return (
                                        <tr key={d.id} className={`group hover:bg-gray-50/80 transition-colors ${!d.is_active ? "opacity-50" : ""}`}>
                                            <td className="px-4 py-3.5">
                                                <p className="text-sm font-bold text-gray-900">{d.drug_name}</p>
                                                {d.generic_name && <p className="text-[10px] text-gray-400 italic">{d.generic_name}</p>}
                                                {d.requires_prescription && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 mt-1">
                                                        <ShieldAlert size={8} /> Rx
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs font-medium text-gray-600">{d.category ?? "—"}</td>
                                            <td className="px-4 py-3.5">
                                                <p className="text-xs font-medium text-gray-700">{d.dosage_form ?? "—"}</p>
                                                {d.strength && <p className="text-[10px] text-gray-400">{d.strength}</p>}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`text-sm font-bold ${outStk ? "text-red-600" : lowStk ? "text-amber-600" : "text-gray-800"}`}>
                                                    {d.quantity} {d.unit}
                                                </span>
                                                {outStk && <p className="text-[10px] text-red-500 font-bold">Out of stock</p>}
                                                {lowStk && <p className="text-[10px] text-amber-500 font-bold">Low stock</p>}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <p className="text-sm font-bold text-gray-900">{fmtNaira(d.price)}</p>
                                                <p className="text-[10px] text-gray-400">per {d.unit?.toLowerCase()}</p>
                                            </td>
                                            {viewMode === "catalog" && (
                                                <td className="px-4 py-3.5 text-xs font-medium text-gray-500">{fmtNaira(d.cost_price)}</td>
                                            )}
                                            <td className="px-4 py-3.5">
                                                <p className={`text-xs font-medium ${expired ? "text-red-600 font-bold" : expiring ? "text-amber-600 font-bold" : "text-gray-500"}`}>
                                                    {d.expiry_date ? fmtDate(d.expiry_date) : "—"}
                                                </p>
                                                {expired && <p className="text-[9px] text-red-500 font-black uppercase">Expired</p>}
                                                {expiring && <p className="text-[9px] text-amber-500 font-black uppercase">Expiring</p>}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <button onClick={() => handleToggle(d)} disabled={toggling === d.id} className="text-xs font-bold">
                                                    {toggling === d.id
                                                        ? <Loader2 size={13} className="animate-spin text-gray-400" />
                                                        : d.is_active
                                                            ? <span className="flex items-center gap-1 text-green-600"><ToggleRight size={15} /> Active</span>
                                                            : <span className="flex items-center gap-1 text-gray-400"><ToggleLeft size={15} /> Inactive</span>
                                                    }
                                                </button>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setField("restockTarget", d)}
                                                        className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-200 transition-colors">
                                                        <ArrowUpCircle size={12} />
                                                    </button>
                                                    <button onClick={() => setField("editTarget", d)}
                                                        className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-violet-600 hover:border-violet-200 transition-colors">
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button onClick={() => setField("deleteTarget", d)}
                                                        className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Low stock footer */}
                {lowStock > 0 && stockFilter === "all" && (
                    <div className="flex items-center gap-3 px-6 py-4 border-t border-amber-100 bg-amber-50/50">
                        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-700 font-medium flex-1">
                            <span className="font-bold">{lowStock} drug{lowStock !== 1 ? "s" : ""}</span> at or below reorder level.
                        </p>
                        <button onClick={() => setField("stockFilter", "low")} className="text-xs font-bold text-amber-700 hover:underline">View all</button>
                    </div>
                )}
            </div>

            {showAdd && <DrugModal onClose={() => setField("showAdd", false)} onSaved={refetch} />}
            {editTarget && <DrugModal drug={editTarget} onClose={() => setField("editTarget", null)} onSaved={refetch} />}
            {restockTarget && <RestockModal drug={restockTarget} onClose={() => setField("restockTarget", null)} onSaved={refetch} />}
            {deleteTarget && <DeleteModal drug={deleteTarget} onClose={() => setField("deleteTarget", null)} onDeleted={refetch} />}
        </div>
    );
}

