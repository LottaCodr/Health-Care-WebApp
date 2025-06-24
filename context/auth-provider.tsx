"use client";

import { Staff } from "@/actions/staff/types";
import { account, databases } from "@/lib/appwrite.config";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
    user: Staff | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Staff | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
    const staffCollectionId = process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!;

    useEffect(() => {
        const loadUser = async () => {
            try {
                const session = await account.get();
                const staff = await databases.getDocument<Staff>(
                    databaseId,
                    staffCollectionId,
                    session.$id
                );

                setUser(staff);
            } catch (error) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    const logout = async () => {
        try {
            await account.deleteSession("current");
            setUser(null);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
