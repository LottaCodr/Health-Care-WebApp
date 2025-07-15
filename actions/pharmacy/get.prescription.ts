import { databases } from "@/lib/appwrite.config";
import { Query } from "appwrite";
import { ID } from "node-appwrite";

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const pharmacyRecordsCollectionId = process.env.NEXT_PUBLIC_PHARMACY_RECORD_COLLECTION_ID!;

export type PharmacyRecord = {
    pharmacyId: string;
    patientId: string;
    doctorInstructions: string;
    doctorPrescription: string;
    status: "pending" | "dispensed" | "cancelled" | string;
    dispensedBy?: string;
    createdAt?: string;
    [key: string]: any; // for any additional fields
};

export async function getPrescriptions() {
    const response = await databases.listDocuments(
        databaseId,
        pharmacyRecordsCollectionId,
        [Query.orderDesc("$createdAt")]
    );

    return response.documents;
}


export async function assignPharmacist(pharmacyRecord: PharmacyRecord) {
    try {


        const response = await databases.createDocument(
            databaseId,
            pharmacyRecordsCollectionId,
            ID.unique(),
            pharmacyRecord
        );

        console.log('Pharmacy record successfully created:', response);
        return response;
    } catch (error: any) {
        console.error("An error occurred while creating pharmacy record:", error?.message || error);
        throw new Error(error?.message || "Failed to create pharmacy record");
    }
}

