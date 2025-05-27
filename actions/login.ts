"use server"

import { account, DATABASE_ID, databases, STAFF_COLLECTION_ID } from "@/lib/appwrite.config"

export interface Role {
    role: "doctor" | "lab-tech" | "admin" | "nurse" | "pharmacist";

}

export const loginStaff = async (email: string, password: string): Promise<{
    role: Role, message: string, doc: any
}> => {
    try {

        //authenticate user
        await account.createEmailPasswordSession(email, password);



        // get user information
        const user = await account.get()

        //fetch user role

        const userDoc = await databases.getDocument(
            DATABASE_ID!,
            STAFF_COLLECTION_ID!,
            user.$id
        )

        console.log('user doc', userDoc)

        return { role: userDoc.role, message: "Login successful", doc: userDoc };


    } catch (error: any) {
        return { role: { role: "admin" }, message: "Login failed", doc: {} };

    }
}