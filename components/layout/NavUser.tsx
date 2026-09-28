"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, ChevronDown, Loader2, LogOut, Settings } from "lucide-react";
import { getRoleLabel, getRoleSettingsRoute } from "@/lib/roles";

function initials(name?: string) {
    const parts = (name ?? "Staff").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

export function NavUser() {
    const { user, logout, isLoggingOut } = useAuth();
    const settingsRoute = getRoleSettingsRoute(user?.role);
    const roleLabel = getRoleLabel(user?.role);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Open account menu"
                    className="group flex max-w-[12rem] items-center gap-2 rounded-full border border-gray-100 bg-white p-1 pr-2 shadow-sm transition-all hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 sm:gap-3 sm:pr-3"
                >
                    <Avatar className="h-8 w-8 border-2 border-white shadow-sm transition-transform group-hover:scale-105 sm:h-9 sm:w-9">
                        {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
                        <AvatarFallback className="bg-blue-600 text-xs font-bold text-white">
                            {initials(user?.name ?? user?.full_name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="hidden min-w-0 text-left sm:block">
                        <p className="truncate text-xs font-black leading-none text-gray-900">
                            {user?.name ?? user?.full_name ?? "Staff"}
                        </p>
                        <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-widest text-blue-600">
                            {roleLabel}
                        </p>
                    </div>
                    <ChevronDown size={13} className="hidden shrink-0 text-gray-400 sm:block" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[calc(100vw-2rem)] max-w-72 rounded-2xl border-gray-100 bg-white/95 p-2 shadow-premium backdrop-blur-xl"
            >
                <DropdownMenuLabel className="p-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">
                            {initials(user?.name ?? user?.full_name)}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black text-gray-900">
                                {user?.name ?? user?.full_name ?? "Staff"}
                            </p>
                            <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{user?.email}</p>
                        </div>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="mx-2 bg-gray-100" />

                <DropdownMenuItem asChild className="cursor-pointer rounded-xl p-3 font-bold text-gray-700 focus:bg-blue-50 focus:text-blue-700">
                    <Link href={settingsRoute}>
                        <Settings size={17} />
                        Account &amp; security settings
                    </Link>
                </DropdownMenuItem>

                <div className="mx-1 my-1 flex items-center gap-3 rounded-xl bg-emerald-50/70 px-3 py-2.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>Authenticated staff session</span>
                </div>

                <DropdownMenuSeparator className="mx-2 bg-gray-100" />

                <DropdownMenuItem
                    onSelect={() => {
                        if (!isLoggingOut) void logout();
                    }}
                    disabled={isLoggingOut}
                    className="mt-1 cursor-pointer rounded-xl p-3 font-bold text-red-600 focus:bg-red-50 focus:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLoggingOut ? (
                        <><Loader2 size={17} className="animate-spin" /> Signing out...</>
                    ) : (
                        <><LogOut size={17} /> Sign out</>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
