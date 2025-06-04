import { getUser } from "@/lib/hooks/use-auth";
import { StaffRole } from "@/types/appwrite.types";
import React, { createContext, useContext, useEffect, useState } from "react";

interface MyUser {
    $id: string;
    name: string;
    email: string;
    role: StaffRole
    // add more as needed
}

interface AuthContextType {
    user: MyUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<MyUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getUser()
            .then((user) => {
                if (user) {
                    setUser({
                        $id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    });
                } else {
                    setUser(null);
                }
            })
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
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
