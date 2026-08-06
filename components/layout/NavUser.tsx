"use client";

import React from "react";
import { useAuth } from "@/context/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User, ShieldCheck, Loader2 } from "lucide-react";

export function NavUser() {
    const { user, logout, isLoggingOut } = useAuth();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-white shadow-sm border border-gray-100 hover:border-blue-200 transition-all cursor-pointer group">
                    <Avatar className="w-9 h-9 border-2 border-white shadow-md group-hover:scale-105 transition-transform">
                        <AvatarImage src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${user?.name}`} />
                        <AvatarFallback className="bg-blue-600 text-white font-bold">{user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                        <p className="text-xs font-black text-gray-900 leading-none">{user?.name}</p>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{user?.role}</p>
                    </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-3xl p-3 shadow-premium border-gray-100 mt-2 backdrop-blur-xl bg-white/90">
                <DropdownMenuLabel className="p-4">
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-black text-gray-900">{user?.name}</p>
                        <p className="text-xs font-medium text-gray-500">{user?.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-50 mx-2" />
                <DropdownMenuItem className="rounded-2xl p-3 gap-3 font-bold text-gray-700 focus:bg-blue-50 focus:text-blue-600 cursor-pointer">
                    <User size={18} /> Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-2xl p-3 gap-3 font-bold text-gray-700 focus:bg-blue-50 focus:text-blue-600 cursor-pointer">
                    <ShieldCheck size={18} /> Identity Verification
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-50 mx-2" />
                <DropdownMenuItem
                    onClick={(e) => { e.preventDefault(); logout(); }}
                    disabled={isLoggingOut}
                    className="rounded-2xl p-3 gap-3 font-bold text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoggingOut ? (
                        <><Loader2 size={18} className="animate-spin" /> Signing out...</>
                    ) : (
                        <><LogOut size={18} /> Terminate Session</>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
