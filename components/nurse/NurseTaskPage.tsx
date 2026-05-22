"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import {
    usePendingNursingActions,
    useCompletedNursingActions,
    useUpdateNursingAction,
} from "@/hooks/emr/use-nursing";
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    RefreshCcw,
    Loader2,
    AlertTriangle,
    ClipboardList,
    ChevronDown,
    Search,
    X,
    CheckCheck,
    Play,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    Pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
    InProgress: { label: "In Progress", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
    Completed: { label: "Completed", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500" },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function TaskCard({
    task,
    onStatusChange,
    updating,
}: {
    task: any;
    onStatusChange: (id: string, status: string) => void;
    updating: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const isPending = task.status === "Pending";
    const isInProgress = task.status === "InProgress";
    const isCompleted = task.status === "Completed";
    const patientName = task.patients?.name ?? `Patient #${task.patient_id?.slice(-6) ?? "—"}`;

    return (
        <div
            className={`rounded-2xl border overflow-hidden transition-all ${
                isCompleted
                    ? "border-gray-100 bg-white opacity-70"
                    : isInProgress
                      ? "border-blue-200 bg-blue-50/30"
                      : "border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm"
            }`}
        >
            <div className="flex items-center gap-4 p-4">
                <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isCompleted ? "bg-green-400" : isInProgress ? "bg-blue-500 animate-pulse" : "bg-amber-400"
                    }`}
                />

                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isCompleted ? "bg-gray-100 text-gray-500" : "bg-teal-50 border border-teal-100 text-teal-600"
                    }`}
                >
                    {patientName[0]?.toUpperCase() ?? "P"}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {task.patient_id ? (
                            <Link
                                href={`/nurse/queue/patient/${task.patient_id}`}
                                className="text-sm font-bold text-teal-700 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {patientName}
                            </Link>
                        ) : (
                            <p className="text-sm font-bold text-gray-800">{patientName}</p>
                        )}
                        <StatusBadge status={task.status} />
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5 uppercase tracking-wide">
                        {task.action_type ?? "Nursing Care"}
                    </p>
                    {task.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {isPending && (
                        <button
                            type="button"
                            onClick={() => onStatusChange(task.id, "InProgress")}
                            disabled={updating}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-60"
                        >
                            {updating ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                            Start
                        </button>
                    )}
                    {isInProgress && (
                        <button
                            type="button"
                            onClick={() => onStatusChange(task.id, "Completed")}
                            disabled={updating}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-60"
                        >
                            {updating ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                            Done
                        </button>
                    )}
                    {isCompleted && <CheckCircle2 size={18} className="text-green-500" />}
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            expanded ? "bg-gray-200 text-gray-700" : "text-gray-400 hover:bg-gray-100"
                        }`}
                    >
                        <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="px-5 pb-4 pt-1 border-t border-gray-100 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                        {task.assigned_nurse && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Assigned Nurse</p>
                                <p className="text-xs font-semibold text-gray-700 font-mono">{task.assigned_nurse}</p>
                            </div>
                        )}
                        {task.completed_by && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Completed By</p>
                                <p className="text-xs font-semibold text-gray-700 font-mono">{task.completed_by}</p>
                            </div>
                        )}
                        {task.completion_time && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Completed At</p>
                                <p className="text-xs font-semibold text-gray-700">
                                    {new Date(task.completion_time).toLocaleString("en-GB", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Created</p>
                            <p className="text-xs font-semibold text-gray-700">
                                {new Date(task.created_at).toLocaleString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                    </div>
                    {task.description && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Notes</p>
                            <p className="text-xs text-gray-600 leading-relaxed">{task.description}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function NurseTasksPage() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);
    const {
        data: pendingTasks = [],
        isPending: loadingPending,
        isError: errorPending,
        refetch: refetchPending,
    } = usePendingNursingActions();
    const {
        data: completedTasks = [],
        isPending: loadingCompleted,
        refetch: refetchCompleted,
    } = useCompletedNursingActions();
    const { mutateAsync: updateAction } = useUpdateNursingAction();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "InProgress" | "Completed">("all");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const tasks = useMemo(
        () => [...pendingTasks, ...completedTasks],
        [pendingTasks, completedTasks]
    );

    const loading = loadingPending || loadingCompleted;
    const error = errorPending;

    const refetch = () => {
        refetchPending();
        refetchCompleted();
    };

    if (!authorized) return null;

    const pending = tasks.filter((t: any) => t.status === "Pending");
    const inProgress = tasks.filter((t: any) => t.status === "InProgress");
    const completed = tasks.filter((t: any) => t.status === "Completed");

    const filtered = useMemo(() => {
        return tasks.filter((t: any) => {
            const q = search.toLowerCase();
            const matchSearch =
                !search ||
                (t.patient_id ?? "").toLowerCase().includes(q) ||
                (t.action_type ?? "").toLowerCase().includes(q) ||
                (t.patients?.name ?? "").toLowerCase().includes(q);
            const matchStatus = statusFilter === "all" || t.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [tasks, search, statusFilter]);

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        setUpdatingId(taskId);
        try {
            await updateAction({
                id: taskId,
                updates: {
                    status: newStatus,
                    completedBy: newStatus === "Completed" ? user?.$id ?? user?.id : undefined,
                    completionTime: newStatus === "Completed" ? new Date().toISOString() : undefined,
                },
            });
            toast.success(newStatus === "Completed" ? "Task marked as completed." : "Task started.");
            refetch();
        } catch {
            toast.error("Failed to update task status.");
        } finally {
            setUpdatingId(null);
        }
    };

    const statFilterMap: Record<string, "Pending" | "InProgress" | "Completed" | "all"> = {
        Pending: "Pending",
        "In Progress": "InProgress",
        Completed: "Completed",
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Pending", value: pending.length, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                    { label: "In Progress", value: inProgress.length, icon: Clock, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                    { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
                ].map((s) => {
                    const Icon = s.icon;
                    const filterKey = statFilterMap[s.label];
                    return (
                        <button
                            key={s.label}
                            type="button"
                            onClick={() =>
                                setStatusFilter(statusFilter === filterKey ? "all" : filterKey)
                            }
                            className={`bg-white rounded-2xl border ${s.border} shadow-sm px-5 py-5 flex items-center gap-4 hover:shadow-md transition-shadow text-left w-full`}
                        >
                            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <Icon size={19} className={s.color} />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                                <p className="text-xs text-gray-400 font-medium mt-1">{s.label}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                            <ClipboardList size={16} className="text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 leading-tight">Nursing Tasks</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} tasks</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {statusFilter !== "all" && (
                            <button
                                type="button"
                                onClick={() => setStatusFilter("all")}
                                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100"
                            >
                                {statusFilter} <X size={11} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            <RefreshCcw size={13} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search patient name, ID, or task type..."
                            className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-400 focus:bg-white transition-all"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                            className="h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="InProgress">In Progress</option>
                            <option value="Completed">Completed</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="px-6 py-5 space-y-2.5">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-3">
                            <Loader2 size={18} className="text-teal-500 animate-spin" />
                            <p className="text-sm text-gray-400">Loading tasks...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                                <AlertTriangle size={20} className="text-red-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600">Failed to load tasks</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                                <CheckCircle2 size={22} className="text-green-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-600">
                                    {search || statusFilter !== "all" ? "No matching tasks" : "All tasks completed!"}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {search || statusFilter !== "all"
                                        ? "Try adjusting your filters"
                                        : "No pending nursing actions"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        filtered.map((task: any) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onStatusChange={handleStatusChange}
                                updating={updatingId === task.id}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
