"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import supabase from "@/utils/supabase/client";
import { toast } from "sonner";
import {
    FlaskConical, Plus, Search, X, Edit3, Trash2, Loader2,
    CheckCircle2, ChevronDown, RefreshCcw, Microscope,
    AlertTriangle, Clock, Droplets, FileText,
    ToggleLeft, ToggleRight, DollarSign,
} from "lucide-react";
import { useLabStore, type LabTest } from "@/store/lab-store";

const CATEGORIES = [
    "Haematology", "Biochemistry", "Serology", "Microbiology",
    "Urinalysis", "Hormones", "Obstetric", "Reproductive",
    "Tumour Markers", "Immunology", "Genetics", "Other",
];

const SAMPLE_TYPES = [
    "EDTA Blood", "Plain Blood", "Citrate Blood", "Urine",
    "Stool", "Sputum", "Swab", "CSF", "Tissue Biopsy",
    "Synovial Fluid", "Pleural Fluid", "Semen", "Saliva",
];

const TURNAROUND_TIMES = [
    "30 minutes", "1 hour", "2 hours", "3 hours", "4 hours",
    "Same day", "24 hours", "48 hours", "3–5 days", "1 week",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtNaira = (n?: number) => n !== undefined ? `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}` : "—";

async function fetchTests() {
    const { data, error } = await supabase.from("lab_test_catalog").select("*").order("category").order("test_name");
    if (error) throw error;
    return (data ?? []) as LabTest[];
}

async function saveTest(test: Partial<LabTest>, id?: string) {
    if (id) {
        const { error } = await supabase.from("lab_test_catalog").update(test).eq("id", id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from("lab_test_catalog").insert([test]);
        if (error) throw error;
    }
}

async function deleteTest(id: string) {
    const { error } = await supabase.from("lab_test_catalog").delete().eq("id", id);
    if (error) throw error;
}

// ─── Test modal ────────────────────────────────────────────────────────────────

const EMPTY_TEST: Partial<LabTest> = {
    test_name: "", test_code: "", category: "", description: "",
    price: 0, sample_type: "", turnaround_time: "", normal_range: "",
    instructions: "", is_active: true,
};

function TestModal({ test, onClose, onSaved }: {
    test?: LabTest | null; onClose: () => void; onSaved: () => void;
}) {
    const isEdit = !!test;
    const [form, setForm] = useState<Partial<LabTest>>(test ? { ...test } : { ...EMPTY_TEST });
    const [saving, setSaving] = useState(false);
    const set = (k: keyof LabTest, v: any) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.test_name?.trim()) { toast.error("Test name is required."); return; }
        if (!form.category?.trim()) { toast.error("Category is required."); return; }
        if (form.price === undefined || form.price < 0) { toast.error("Price is required."); return; }
        setSaving(true);
        try {
            await saveTest(form, isEdit ? test!.id : undefined);
            toast.success(isEdit ? "Test updated." : "Test added to catalog.");
            onSaved(); onClose();
        } catch (err: any) { toast.error(err?.message ?? "Failed to save."); }
        finally { setSaving(false); }
    };

    const inputCls = "w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 focus:bg-white transition-all";
    const selectCls = `${inputCls} appearance-none cursor-pointer`;
    const taCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 focus:bg-white resize-none transition-all";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <FlaskConical size={16} className="text-indigo-600" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">{isEdit ? "Edit Lab Test" : "Add Lab Test"}</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <X size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Basic */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Test Name <span className="text-red-500">*</span></p>
                            <input value={form.test_name ?? ""} onChange={e => set("test_name", e.target.value)}
                                placeholder="e.g. Full Blood Count" className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Test Code</p>
                            <input value={form.test_code ?? ""} onChange={e => set("test_code", e.target.value)}
                                placeholder="e.g. FBC-001" className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category <span className="text-red-500">*</span></p>
                            <div className="relative">
                                <select value={form.category ?? ""} onChange={e => set("category", e.target.value)} className={selectCls}>
                                    <option value="">Select category...</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sample Type</p>
                            <div className="relative">
                                <select value={form.sample_type ?? ""} onChange={e => set("sample_type", e.target.value)} className={selectCls}>
                                    <option value="">Select sample...</option>
                                    {SAMPLE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Turnaround Time</p>
                            <div className="relative">
                                <select value={form.turnaround_time ?? ""} onChange={e => set("turnaround_time", e.target.value)} className={selectCls}>
                                    <option value="">Select time...</option>
                                    {TURNAROUND_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Price */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Price (₦) <span className="text-red-500">*</span></p>
                        <div className="relative">
                            <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input type="number" min="0" step="0.01" value={form.price ?? 0} onChange={e => set("price", parseFloat(e.target.value) || 0)}
                                placeholder="0.00" className={`${inputCls} pl-8`} />
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Patient Instructions / Preparation</p>
                        <textarea rows={2} value={form.instructions ?? ""} onChange={e => set("instructions", e.target.value)}
                            placeholder="e.g. Fast for 8–10 hours before this test" className={taCls} />
                    </div>

                    {/* Normal range */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Normal Reference Range</p>
                        <textarea rows={2} value={form.normal_range ?? ""} onChange={e => set("normal_range", e.target.value)}
                            placeholder="e.g. Hb: 12–18 g/dL, WBC: 4.5–11.0 ×10⁹/L..." className={taCls} />
                    </div>

                    {/* Active toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div onClick={() => set("is_active", !form.is_active)}
                            className={`w-10 h-6 rounded-full transition-colors relative ${form.is_active ? "bg-green-500" : "bg-gray-200"}`}>
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-700">Active — available for requesting</p>
                            <p className="text-[10px] text-gray-400">Inactive tests won't appear in doctor's request dropdown</p>
                        </div>
                    </label>
                </div>

                <div className="px-6 pb-5 pt-4 border-t border-gray-50 flex gap-2 shrink-0">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm shadow-indigo-200 transition-all disabled:opacity-60">
                        {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={13} /> {isEdit ? "Save Changes" : "Add Test"}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete confirm ────────────────────────────────────────────────────────────

function DeleteModal({ test, onClose, onDeleted }: { test: LabTest; onClose: () => void; onDeleted: () => void }) {
    const [deleting, setDeleting] = useState(false);
    const handleDelete = async () => {
        setDeleting(true);
        try { await deleteTest(test.id); toast.success(`${test.test_name} removed.`); onDeleted(); onClose(); }
        catch (err: any) { toast.error(err?.message ?? "Failed."); }
        finally { setDeleting(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto"><Trash2 size={20} className="text-red-600" /></div>
                <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">Remove Test?</p>
                    <p className="text-xs text-gray-500 mt-1"><span className="font-bold">{test.test_name}</span> will be removed from the catalog and won't appear in future requests.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 transition-colors">
                        {deleting ? <><Loader2 size={13} className="animate-spin" /> Removing...</> : <><Trash2 size={13} /> Remove</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LabTestCatalogPage() {
    const { authorized } = useRoleProtection([UserRole.Admin, UserRole.LabTechnician]);
    const { data: tests, isLoading, isError, refetch } = useQuery({
        queryKey: ["lab-test-catalog"],
        queryFn: fetchTests,
    });

    const {
        catalogSearch: search, setField, catalogCategory: category,
        editTarget, deleteTarget, showAdd, togglingId: toggling
    } = useLabStore();

    const filtered = useMemo(() => {
        if (!tests) return [];
        return tests.filter(t => {
            const matchSearch = !search ||
                t.test_name.toLowerCase().includes(search.toLowerCase()) ||
                (t.test_code ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (t.category ?? "").toLowerCase().includes(search.toLowerCase());
            const matchCat = category === "all" || t.category === category;
            return matchSearch && matchCat;
        });
    }, [tests, search, category]);

    // Group filtered results by category for display
    const grouped = useMemo(() => {
        const map = new Map<string, LabTest[]>();
        filtered.forEach(t => {
            const cat = t.category || "Other";
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(t);
        });
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [filtered]);

    const handleToggle = async (test: LabTest) => {
        setField("togglingId", test.id);
        try {
            const { error } = await supabase.from("lab_test_catalog").update({ is_active: !test.is_active }).eq("id", test.id);
            if (error) throw error;
            toast.success(`${test.test_name} ${test.is_active ? "deactivated" : "activated"}.`);
            refetch();
        } catch { toast.error("Failed to update."); }
        finally { setField("togglingId", null); }
    };

    if (!authorized) return null;

    const totalRevenue = tests?.reduce((s, t) => s + t.price, 0) ?? 0;
    const activeTests = tests?.filter(t => t.is_active).length ?? 0;
    const categories = Array.from(new Set(tests?.map(t => t.category) ?? [])).filter(Boolean);

    const selectCls = "h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 focus:outline-none appearance-none cursor-pointer";

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900">Lab Test Catalog</h1>
                    <p className="text-xs text-gray-400 mt-0.5">{tests?.length ?? 0} tests across {categories.length} categories</p>
                </div>
                <button onClick={() => setField("showAdd", true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm shadow-indigo-200 transition-all">
                    <Plus size={14} /> Add Test
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Tests", value: tests?.length ?? 0, icon: Microscope, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
                    { label: "Active Tests", value: activeTests, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
                    { label: "Categories", value: categories.length, icon: FlaskConical, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                    <div key={label} className={`bg-white rounded-2xl border ${border} shadow-sm px-5 py-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
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

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input value={search} onChange={e => setField("catalogSearch", e.target.value)}
                        placeholder="Search test name, code, category..."
                        className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all shadow-sm" />
                    {search && <button onClick={() => setField("catalogSearch", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
                </div>
                <div className="relative">
                    <select value={category} onChange={e => setField("catalogCategory", e.target.value)} className={selectCls}>
                        <option value="all">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button onClick={() => refetch()} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 shadow-sm transition-colors shrink-0">
                    <RefreshCcw size={13} />
                </button>
                <p className="text-xs text-gray-400 font-medium">{filtered.length} results</p>
            </div>

            {/* Grouped test cards */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16 gap-3 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <Loader2 size={18} className="text-indigo-500 animate-spin" />
                    <p className="text-sm text-gray-400">Loading catalog...</p>
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-3xl border border-gray-100">
                    <AlertTriangle size={20} className="text-red-500" />
                    <p className="text-sm font-semibold text-gray-600">Failed to load catalog</p>
                    <button onClick={() => refetch()} className="text-xs text-red-600 hover:underline">Retry</button>
                </div>
            ) : grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <FlaskConical size={22} className="text-gray-300" />
                    <p className="text-sm font-semibold text-gray-500">No tests found</p>
                    <button onClick={() => setField("showAdd", true)} className="text-xs text-indigo-600 hover:underline font-bold">Add the first test →</button>
                </div>
            ) : (
                <div className="space-y-5">
                    {grouped.map(([cat, catTests]) => (
                        <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 bg-indigo-50/40">
                                <div className="flex items-center gap-2">
                                    <FlaskConical size={13} className="text-indigo-600" />
                                    <p className="text-xs font-black uppercase tracking-widest text-indigo-700">{cat}</p>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                                        {catTests.length}
                                    </span>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {catTests.map(t => (
                                    <div key={t.id} className={`group flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors ${!t.is_active ? "opacity-50" : ""}`}>
                                        {/* Test info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-gray-900">{t.test_name}</p>
                                                {t.test_code && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                        {t.test_code}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                {t.sample_type && (
                                                    <div className="flex items-center gap-1">
                                                        <Droplets size={10} className="text-gray-400" />
                                                        <p className="text-[10px] text-gray-500 font-medium">{t.sample_type}</p>
                                                    </div>
                                                )}
                                                {t.turnaround_time && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={10} className="text-gray-400" />
                                                        <p className="text-[10px] text-gray-500 font-medium">{t.turnaround_time}</p>
                                                    </div>
                                                )}
                                                {t.instructions && (
                                                    <p className="text-[10px] text-amber-600 italic">{t.instructions}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right shrink-0 mr-4">
                                            <p className="text-sm font-black text-indigo-700">{fmtNaira(t.price)}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">per test</p>
                                        </div>

                                        {/* Toggle + actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => handleToggle(t)} disabled={toggling === t.id}
                                                className="text-xs font-bold transition-colors">
                                                {toggling === t.id
                                                    ? <Loader2 size={14} className="animate-spin text-gray-400" />
                                                    : t.is_active
                                                        ? <ToggleRight size={18} className="text-green-500" />
                                                        : <ToggleLeft size={18} className="text-gray-300" />
                                                }
                                            </button>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setField("editTarget", t)}
                                                    className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                                                    <Edit3 size={12} />
                                                </button>
                                                <button onClick={() => setField("deleteTarget", t)}
                                                    className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAdd && <TestModal onClose={() => setField("showAdd", false)} onSaved={refetch} />}
            {editTarget && <TestModal test={editTarget} onClose={() => setField("editTarget", null)} onSaved={refetch} />}
            {deleteTarget && <DeleteModal test={deleteTarget} onClose={() => setField("deleteTarget", null)} onDeleted={refetch} />}
        </div>
    );
}