import { databases } from "@/lib/appwrite.config";
import { Query } from "appwrite";

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const pharmacyRecordsCollectionId = process.env.NEXT_PUBLIC_PHARMACY_RECORD_COLLECTION_ID!;

export async function getPrescriptions() {
    const response = await databases.listDocuments(
        databaseId,
        pharmacyRecordsCollectionId,
        [Query.orderDesc("$createdAt")]
    );

    return response.documents;
}