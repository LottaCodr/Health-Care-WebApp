// ═══════════════════════════════════════════════════════════════════════════════
// FILE 1: components/admin/AdminAuditLog.tsx
// ═══════════════════════════════════════════════════════════════════════════════
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import supabase from "@/utils/supabase/client";
import {
    ScrollText, Search, X, RefreshCcw,
    ChevronDown, Loader2, AlertTriangle,
    User, Clock, Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditEntry {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    changes: Record<string, any> | null;
    timestamp: string;
}

const ACTION_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
    CREATE: { color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    UPDATE: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    DELETE: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    LOGIN: { color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
    DISPENSE: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    DEFAULT: { color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-200" },
};

function ActionBadge({ action }: { action: string }) {
    const cfg = ACTION_CONFIG[action] ?? ACTION_CONFIG.DEFAULT;
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            {action}
        </span>
    );
}

function fmt(iso: string) {
    return new Date(iso).toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminAuditLog() {
    const { authorized } = useRoleProtection([UserRole.Admin]);
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [action, setAction] = useState("all");
    const [entity, setEntity] = useState("all");
    const [expanded, setExpanded] = useState<string | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("audit_logs")
            .select("*")
            .order("timestamp", { ascending: false })
            .limit(500);
        if (!error) setLogs(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchLogs(); }, []);

    const entityTypes = useMemo(() => ["all", ...Array.from(new Set(logs.map((l) => l.entity_type)))], [logs]);
    const actionTypes = useMemo(() => ["all", ...Array.from(new Set(logs.map((l) => l.action)))], [logs]);

    const filtered = useMemo(() => logs.filter((l) => {
        const matchSearch = !search ||
            l.action.toLowerCase().includes(search.toLowerCase()) ||
            l.entity_type.toLowerCase().includes(search.toLowerCase()) ||
            l.user_id.toLowerCase().includes(search.toLowerCase()) ||
            l.entity_id.toLowerCase().includes(search.toLowerCase());
        const matchAction = action === "all" || l.action === action;
        const matchEntity = entity === "all" || l.entity_type === entity;
        return matchSearch && matchAction && matchEntity;
    }), [logs, search, action, entity]);

    if (!authorized) return null;

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900">Audit Log</h1>
                    <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {logs.length} entries</p>
                </div>
                <button onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-xs font-bold text-gray-700 shadow-sm transition-all">
                    <RefreshCcw size={13} /> Refresh
                </button>
            </div>

            {/* ── Main card ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        <ScrollText size={15} className="text-gray-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-800">System Activity Trail</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 flex-wrap">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search action, entity, user..."
                            className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400/25 focus:border-gray-400 focus:bg-white transition-all" />
                        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
                    </div>
                    {[
                        { value: action, onChange: setAction, options: actionTypes, placeholder: "Action" },
                        { value: entity, onChange: setEntity, options: entityTypes, placeholder: "Entity" },
                    ].map(({ value, onChange, options, placeholder }) => (
                        <div key={placeholder} className="relative">
                            <select value={value} onChange={(e) => onChange(e.target.value)}
                                className="h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none appearance-none cursor-pointer capitalize">
                                {options.map((o) => <option key={o} value={o} className="capitalize">{o === "all" ? `All ${placeholder}s` : o}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    ))}
                </div>

                {/* Log entries */}
                <div className="px-6 py-5 space-y-2 max-h-[600px] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-3">
                            <Loader2 size={18} className="text-gray-400 animate-spin" />
                            <p className="text-sm text-gray-400">Loading audit log...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                <ScrollText size={20} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500">No audit entries found</p>
                        </div>
                    ) : filtered.map((log) => (
                        <div key={log.id}
                            className={`rounded-2xl border transition-all overflow-hidden
                                ${expanded === log.id ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200"}`}>
                            <button onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                className="w-full flex items-center gap-4 p-4 text-left">
                                <ActionBadge action={log.action} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-gray-800 capitalize">{log.entity_type}</p>
                                        <p className="text-xs text-gray-400 font-mono">#{log.entity_id?.slice(0, 8)}</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <div className="flex items-center gap-1">
                                            <User size={10} className="text-gray-400" />
                                            <p className="text-[10px] text-gray-400 font-mono">{log.user_id?.slice(0, 8)}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={10} className="text-gray-400" />
                                            <p className="text-[10px] text-gray-400">{fmt(log.timestamp)}</p>
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {/* Expanded changes */}
                            {expanded === log.id && log.changes && Object.keys(log.changes).length > 0 && (
                                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Changes</p>
                                    <pre className="text-xs text-gray-700 bg-white border border-gray-100 rounded-xl px-4 py-3 overflow-x-auto">
                                        {JSON.stringify(log.changes, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════════
// FILE 2: lib/role-permissions.ts
// Role-based edit/delete permissions for each staff role
// ═══════════════════════════════════════════════════════════════════════════════

export const ROLE_PERMISSIONS = {
    Doctor: {
        can_edit: ["consultations"],
        can_delete: ["consultations"],
        can_create: ["consultations", "lab_requests"],
    },
    Nurse: {
        can_edit: ["nursing_actions"],
        can_delete: [],
        can_create: ["nursing_actions"],
    },
    Pharmacist: {
        can_edit: ["prescriptions", "drug_inventory"],
        can_delete: ["prescriptions"],
        can_create: ["prescriptions", "drug_inventory"],
    },
    Labtech: {
        can_edit: ["lab_requests"],
        can_delete: [],
        can_create: [],
    },
    Frontdesk: {
        can_edit: ["patients", "payments"],
        can_delete: [],
        can_create: ["patients"],
    },
    Admin: {
        can_edit: ["*"],
        can_delete: ["*"],
        can_create: ["*"],
    },
} as const;

export function canEdit(role: string, resource: string): boolean {
    const perms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    if (!perms) return false;
    return (perms.can_edit as readonly string[]).includes("*") ||
        (perms.can_edit as readonly string[]).includes(resource);
}

export function canDelete(role: string, resource: string): boolean {
    const perms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    if (!perms) return false;
    return (perms.can_delete as readonly string[]).includes("*") ||
        (perms.can_delete as readonly string[]).includes(resource);
}

export function canCreate(role: string, resource: string): boolean {
    const perms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    if (!perms) return false;
    return (perms.can_create as readonly string[]).includes("*") ||
        (perms.can_create as readonly string[]).includes(resource);
}


// ═══════════════════════════════════════════════════════════════════════════════
// FILE 3: Usage example — how to use canEdit/canDelete in any component
// ═══════════════════════════════════════════════════════════════════════════════

// In ConsultationHistoryTable.tsx (Doctor can edit/delete consultations):
//
// import { canEdit, canDelete } from "@/lib/role-permissions";
// const { user } = useAuth();
//
// {canEdit(user?.role, "consultations") && (
//     <button onClick={() => setEditTarget(c)} className="...">
//         <Edit3 size={13} /> Edit
//     </button>
// )}
// {canDelete(user?.role, "consultations") && (
//     <button onClick={() => handleDelete(c.id)} className="...">
//         <Trash2 size={13} /> Delete
//     </button>
// )}

// In LabTechDashboard.tsx (Lab tech can edit lab_requests):
//
// {canEdit(user?.role, "lab_requests") && req.status === "completed" && (
//     <button onClick={() => setActiveId(req.id)}>
//         <Edit3 size={12} /> Edit Result
//     </button>
// )}

// In PrescriptionHistory.tsx (Pharmacist can delete prescriptions):
//
// {canDelete(user?.role, "prescriptions") && (
//     <button onClick={() => handleDeletePrescription(p.id)}>
//         <Trash2 size={12} />
//     </button>
// )}