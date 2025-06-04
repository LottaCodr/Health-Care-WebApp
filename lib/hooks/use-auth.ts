

import { account, databases } from "@/lib/appwrite.config";
import { StaffRole } from "@/types/appwrite.types";



const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID!;
const STAFF_COLLECTION_ID = process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!;


export async function getUser() {
    const session = await account.get();
    const doc = await databases.getDocument(DATABASE_ID, STAFF_COLLECTION_ID, session.$id);

    return {
        id: session.$id,
        name: session.name,
        email: session.email,
        role: doc.role as StaffRole,
    };
}

export async function logout() {
    await account.deleteSession("current");
};

