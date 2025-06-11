import { databases } from "@/lib/appwrite.config";
import { Staff } from "@/types/appwrite.types";


const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
const staffCollectionId = process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!


export async function updateStaff(id: string, updates: Partial<Staff>) {
    try {
        const update = await databases.updateDocument(
            databaseId, staffCollectionId, id, updates
        )

        return update as Staff
    } catch (error) {
        throw new Error('Could not update the staff')
    }

}


export async function deleteStaff(id: string) {

    try {
        const remove = await databases.deleteDocument(databaseId, staffCollectionId, id)

        return remove as Staff
    } catch (error) {
        throw new Error('Could not delete the staff')

    }


}