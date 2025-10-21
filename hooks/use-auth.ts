import { StaffRole } from "@/actions/staff/types";
import { account, databases } from "@/lib/appwrite.config";
// import { cookies } from "next/headers";

const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID!;
const STAFF_COLLECTION_ID = process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!;

export async function getUser() {
    // 1. Check if session cookie exists
    // const cookie = (await cookies()).get(
    //     "a_session_" + process.env.NEXT_PUBLIC_APPWRITE_PROJECT
    // );
    // if (!cookie) {
    //     return null; // Not logged in
    // }

    try {
        // 2. Get user from Appwrite
        const user = await account.get();

        // 3. Fetch staff document
        const doc = await databases.getDocument(
            DATABASE_ID,
            STAFF_COLLECTION_ID,
            user.$id
        );

        // 4. Return merged object
        return {
            id: user.$id,
            name: user.name,
            email: user.email,
            role: doc.role as StaffRole,
        };
    } catch (err) {
        console.error("getUser error:", err);
        return null; // Fallback for guests
    }
}

export async function logout() {
    await account.deleteSession("current");
}
