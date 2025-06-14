import { databases } from "@/lib/appwrite.config";
import { Staff } from "@/types/appwrite.types";

export async function getAllStaffs() {
    const databasesId = process.env.NEXT_PUBLIC_DATABASE_ID
    const staffCollectionId = process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID

    if (!databasesId || !staffCollectionId) {
        throw new Error('Missing required environment variables: NEXT_PUBLIC_DATABASE_ID or NEXT_PUBLIC_STAFF_COLLECTION_ID');
    }

    try {

        const res = await databases.listDocuments(
            databasesId,
            staffCollectionId,
        )

        const staffs: Staff[] = res.documents as Staff[]

        return staffs;

    } catch (error) {
        console.log('failed to get staff:', error)
        throw new Error('failed to get staff: ' + String(error))

    }

} 