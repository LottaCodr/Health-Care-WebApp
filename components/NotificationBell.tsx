"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/use-notifications";
import { Notification } from "@/types/models";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, Zap, X, RefreshCcw } from "lucide-react";
import { fmtDate } from "@/lib/utils";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    info:    { icon: Info,          color: "text-blue-600",   bg: "bg-blue-50"   },
    alert:   { icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-50"  },
    success: { icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50"  },
    warning: { icon: Zap,           color: "text-orange-600", bg: "bg-orange-50" },
};

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    if (mins < 1)   return "Just now";
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return fmtDate(iso);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationBell() {
    const router = useRouter();
    const { notifications, loading, unreadCount, markRead, markAllRead, refetch } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref             = useRef<HTMLDivElement>(null);

    // Close on outside click or Escape.
    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleClick = (n: Notification) => {
        markRead(n.id);
        if (n.link) router.push(n.link);
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">

            {/* ── Bell button ── */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="relative w-9 h-9 rounded-xl border border-gray-100 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-200 transition-all shadow-sm"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
                aria-expanded={open}
                aria-controls="notification-panel"
            >
                <Bell size={15} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* ── Dropdown ── */}
            {open && (
                <div id="notification-panel" className="absolute right-0 top-11 z-50 w-[calc(100vw-1.5rem)] max-w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">Notifications</p>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => refetch()}
                                aria-label="Refresh notifications"
                                title="Refresh notifications"
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                <RefreshCcw size={11} />
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                    <CheckCheck size={11} /> Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                aria-label="Close notifications"
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {loading && notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                                    <RefreshCcw size={16} className="text-gray-300 animate-spin" />
                                </div>
                                <p className="text-xs text-gray-400 font-medium">Loading notifications…</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                                    <Bell size={16} className="text-gray-300" />
                                </div>
                                <p className="text-xs text-gray-400 font-medium">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const cfg  = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
                                const Icon = cfg.icon;
                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => handleClick(n)}
                                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50/60 transition-colors ${!n.read ? "bg-blue-50/30" : ""}`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                            <Icon size={13} className={cfg.color} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold text-gray-800 leading-tight ${!n.read ? "text-gray-900" : ""}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                                        </div>
                                        {!n.read && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}