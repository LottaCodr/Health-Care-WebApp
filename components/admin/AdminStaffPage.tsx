"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import supabase from "@/utils/supabase/client";
import {
    Users, Plus, Search, X, Edit3, Trash2,
    Loader2, CheckCircle2, AlertTriangle, ChevronDown,
    Shield, Mail, Phone, RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Staff {
    id: string;
    name: string;
    email: string;
    role: string;
    phone_number?: string;
    is_active?: boolean;
    created_at: string;
}

const ROLES = ["Doctor", "Nurse", "Pharmacist", "Labtech", "Frontdesk", "Admin"];

const ROLE_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
    Doctor: { color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
    Nurse: { color: "text-teal-700", bg: "bg-teal-50", dot: "bg-teal-500" },
    Pharmacist: { color: "text-violet-700", bg: "bg-violet-50", dot: "bg-violet-500" },
    Labtech: { color: "text-indigo-700", bg: "bg-indigo-50", dot: "bg-indigo-500" },
    Frontdesk: { color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
    Admin: { color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
};

function RoleBadge({ role }: { role: string }) {
    const cfg = ROLE_CONFIG[role] ?? { color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {role}
        </span>
    );
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

function StaffModal({ staff, onClose, onSaved }: {
    staff?: Staff | null; onClose: () => void; onSaved: () => void;
}) {
    const isEdit = !!staff;
    const [form, setForm] = useState({
        name: staff?.name ?? "",
        email: staff?.email ?? "",
        role: staff?.role ?? "Doctor",
        phone_number: staff?.phone_number ?? "",
        password: "",
    });
    const [saving, setSaving] = useState(false);
    const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email are required."); return; }
        if (!isEdit && !form.password.trim()) { toast.error("Password is required for new staff."); return; }
        setSaving(true);

        try {

            if (isEdit) {
                // Update staffs table
                const { error } = await supabase
                    .from("staffs")
                    .update({ name: form.name, role: form.role, phone_number: form.phone_number || null })
                    .eq("id", staff!.id);
                if (error) throw error;
                toast.success("Staff member updated.");
            } else {
                // Create auth user via admin API (requires service role — use server action in production)
                // For now update staffs directly if auth user already exists
                const { error } = await supabase
                    .from("staffs")
                    .insert([{ name: form.name, email: form.email, role: form.role, phone_number: form.phone_number || null }]);
                if (error) throw error;
                toast.success("Staff member added. Ensure their auth account is created in Supabase Auth.");
            }

            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to save staff member.");
        } finally { setSaving(false); }
    };

    const inputCls = "w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/25 focus:border-blue-400 focus:bg-white transition-all";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                            {isEdit ? <Edit3 size={14} className="text-blue-600" /> : <Plus size={14} className="text-blue-600" />}
                        </div>
                        <p className="text-sm font-bold text-gray-900">{isEdit ? "Edit Staff Member" : "Add Staff Member"}</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <X size={14} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {[
                        { key: "name", label: "Full Name", placeholder: "Dr. John Doe", type: "text" },
                        { key: "email", label: "Work Email", placeholder: "john@nilevalley.com", type: "email", disabled: isEdit },
                        { key: "phone_number", label: "Phone", placeholder: "+234 800 000 0000", type: "tel" },
                        ...(!isEdit ? [{ key: "password", label: "Temporary Password", placeholder: "Min. 8 characters", type: "password" }] : []),
                    ].map(({ key, label, placeholder, type, disabled }) => (
                        <div key={key} className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                            <input type={type} placeholder={placeholder} value={(form as any)[key]}
                                onChange={(e) => set(key, e.target.value)}
                                disabled={disabled}
                                className={`${inputCls} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} />
                        </div>
                    ))}

                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Role</p>
                        <div className="relative">
                            <select value={form.role} onChange={(e) => set("role", e.target.value)}
                                className={`${inputCls} pr-8 appearance-none cursor-pointer`}>
                                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-5 flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-200 transition-all disabled:opacity-60">
                        {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={13} /> {isEdit ? "Save Changes" : "Add Staff"}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({ staff, onClose, onDeleted }: { staff: Staff; onClose: () => void; onDeleted: () => void }) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const { error } = await supabase.from("staffs").delete().eq("id", staff.id);
            if (error) throw error;
            toast.success(`${staff.name} removed from staff.`);
            onDeleted();
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to remove staff member.");
        } finally { setDeleting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="px-6 py-6 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                        <Trash2 size={20} className="text-red-600" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">Remove Staff Member?</p>
                        <p className="text-xs text-gray-500 mt-1">
                            <span className="font-bold">{staff.name}</span> ({staff.role}) will be removed from the system. Their auth account will remain in Supabase Auth.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleDelete} disabled={deleting}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all disabled:opacity-60">
                            {deleting ? <><Loader2 size={13} className="animate-spin" /> Removing...</> : <><Trash2 size={13} /> Remove</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminStaffPage() {
    const { authorized } = useRoleProtection([UserRole.Admin]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [editTarget, setEditTarget] = useState<Staff | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchStaff = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("staffs")
            .select("*")
            .order("created_at", { ascending: false });
        if (!error) setStaff(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchStaff(); }, []);

    const filtered = useMemo(() => staff.filter((s) => {
        const matchSearch = !search ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === "all" || s.role === roleFilter;
        return matchSearch && matchRole;
    }), [staff, search, roleFilter]);

    if (!authorized) return null;

    return (
        <div className="space-y-6">

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {ROLES.map((role) => {
                    const count = staff.filter((s) => s.role === role).length;
                    const cfg = ROLE_CONFIG[role];
                    return (
                        <div key={role} onClick={() => setRoleFilter(roleFilter === role ? "all" : role)}
                            className={`bg-white rounded-2xl border shadow-sm px-3 py-3 text-center cursor-pointer transition-all hover:shadow-md
                                ${roleFilter === role ? `border-2 ${cfg.bg}` : "border-gray-100"}`}>
                            <p className={`text-xl font-extrabold ${cfg.color}`}>{count}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{role}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── Main card ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <Users size={16} className="text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Staff Management</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {staff.length} staff members</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchStaff}
                            className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                            <RefreshCcw size={13} />
                        </button>
                        <button onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition-colors">
                            <Plus size={13} /> Add Staff
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name or email..."
                            className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/25 focus:border-blue-400 focus:bg-white transition-all" />
                        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                    </div>
                    <div className="relative">
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                            className="h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none appearance-none cursor-pointer">
                            <option value="all">All Roles</option>
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* List */}
                <div className="px-6 py-5 space-y-2.5">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-3">
                            <Loader2 size={18} className="text-blue-500 animate-spin" />
                            <p className="text-sm text-gray-400">Loading staff...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                <Users size={20} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500">No staff found</p>
                        </div>
                    ) : filtered.map((s) => (
                        <div key={s.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all group">
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0
                                ${ROLE_CONFIG[s.role]?.bg ?? "bg-gray-100"} ${ROLE_CONFIG[s.role]?.color ?? "text-gray-600"}`}>
                                {s.name?.[0]?.toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                                    <RoleBadge role={s.role} />
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                    <div className="flex items-center gap-1">
                                        <Mail size={10} className="text-gray-400" />
                                        <p className="text-[11px] text-gray-500">{s.email}</p>
                                    </div>
                                    {s.phone_number && (
                                        <div className="flex items-center gap-1">
                                            <Phone size={10} className="text-gray-400" />
                                            <p className="text-[11px] text-gray-500">{s.phone_number}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditTarget(s)}
                                    className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors">
                                    <Edit3 size={13} />
                                </button>
                                <button onClick={() => setDeleteTarget(s)}
                                    className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}
            {showAddModal && <StaffModal onClose={() => setShowAddModal(false)} onSaved={fetchStaff} />}
            {editTarget && <StaffModal staff={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchStaff} />}
            {deleteTarget && <DeleteModal staff={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={fetchStaff} />}
        </div>
    );
}