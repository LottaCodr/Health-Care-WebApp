"use client"

import React from 'react'
import { useAuth } from "@/context/auth-provider";


const HeaderComponent = () => {
    const { user } = useAuth();



    return (
        <header className="flex items-center justify-between bg-gradient-to-r from-red-100 to-white rounded-2xl px-6 py-5 mb-4 shadow-md">
            <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-red-800 tracking-tight drop-shadow-sm">
                    Welcome, <span className="capitalize text-red-600">{user?.full_name}</span>
                </h1>
                <p className="text-base text-gray-500 mt-1">Here’s a snapshot of today’s operations.</p>
            </div>
        </header>
    )
}

export default HeaderComponent