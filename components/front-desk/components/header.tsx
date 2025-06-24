"use client"

import React from 'react'
import { useAuth } from "@/context/auth-provider";


const HeaderComponent = () => {
    const { user } = useAuth();



    return (
        <header className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-blue-900">Welcome, <span className="capitalize">{user?.full_name}</span> </h1>
                <p className="text-sm text-muted-foreground">Here’s a snapshot of today’s operations.</p>
            </div>
        </header>
    )
}

export default HeaderComponent