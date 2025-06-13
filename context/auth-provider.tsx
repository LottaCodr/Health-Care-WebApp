import { getUser } from "@/hooks/use-auth";
import { account, databases } from "@/lib/appwrite.config";
import { Staff, StaffRole } from "@/types/appwrite.types";
import React, { createContext, useContext, useEffect, useState } from "react";



interface AuthContextType {
    user: Staff | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Staff | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
    const staffCollectionId = process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!


    useEffect(() => {
        const loadUser = async () => {
            try {
                const session = await account.get()
                const staff = await databases.getDocument<Staff>(
                    databaseId,
                    staffCollectionId,
                    session.$id
                )

                setUser(staff)
            } catch (error) {
                setUser(null)
            }

        }
        loadUser()
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
