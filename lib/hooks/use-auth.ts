

import { useEffect, useState } from "react";
import { account, databases } from "@/lib/appwrite.config";
import { StaffRole } from "@/types/appwrite.types";

interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: StaffRole;
}

interface UseAuthResult {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
    logout: () => Promise<void>;
}

const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID!;
const STAFF_COLLECTION_ID = process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!;

export function useAuth(): UseAuthResult {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUser = async () => {
        try {
            const session = await account.get(); // Get logged-in user
            const doc = await databases.getDocument(DATABASE_ID, STAFF_COLLECTION_ID, session.$id);

            setUser({
                id: session.$id,
                name: session.name,
                email: session.email,
                role: doc.role,
            });
        } catch (err: any) {
            setError("Not authenticated");
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await account.deleteSession("current");
        setUser(null);
    };

    useEffect(() => {
        fetchUser();
    }, []);

    return { user, loading, error, logout };
}
