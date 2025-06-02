import { account } from '@/lib/appwrite.config'
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import type { Models } from 'appwrite'

interface AuthContextType {
    user: any | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null)


export function AuthProvider({ children }: { children: ReactNode }) {


    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    useEffect(() => {
        account.get()
            .then((user) => setUser(user))
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false))
    }, [])

    return (

        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading }}>
            {children}

        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}