// app/actions/login.ts
"use server";

import { account, databases } from "@/lib/appwrite.config";
import { ID, Query } from "appwrite";

export interface Role {
    role: "doctor" | "lab-tech" | "admin" | "nurse" | "pharmacist";
}

export const loginStaff = async (
    email: string,
    password: string
): Promise<{
    success: boolean;
    message: string;
    role?: Role;
}> => {
    try {
        const session = await account.createSession(email, password);

        const user = await account.get();

        const staffData = await databases.listDocuments(
            "your_database_id",     // replace with your actual DB ID
            "your_staff_collection", // replace with your collection ID
            [Query.equal("email", user.email)]
        );

        if (staffData.documents.length === 0) {
            throw new Error("Staff record not found.");
        }

        const doc = staffData.documents[0];
        const role = doc.role as Role["role"];

        return {
            success: true,
            message: "Login successful",
            role: { role },
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message ?? "Login failed",
        };
    }
};
