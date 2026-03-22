import { databases } from "@/lib/appwrite.config";
import { Query, ID } from "appwrite";

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const pharmacyRecordsCollectionId = process.env.NEXT_PUBLIC_PHARMACY_RECORD_COLLECTION_ID!;

export type PharmacyRecord = {
    pharmacyId?: string;
    patientId: string;
    doctorInstructions: string;
    doctorPrescription: string;
    status: "pending" | "dispensed" | "cancelled" | string;
    dispensedBy?: string;
    createdAt?: string;
    [key: string]: any;
};

/**
 * Fetch only PENDING prescriptions (not yet dispensed)
 * Used by pharmacist queue view
 */
export async function getPrescriptions(): Promise<any[]> {
    const response = await databases.listDocuments(
        databaseId,
        pharmacyRecordsCollectionId,
        [
            Query.equal("status", "pending"),
            Query.orderDesc("$createdAt"),
        ]
    );
    return response.documents;
}

/**
 * Fetch ALL prescriptions (for history/admin views)
 */
export async function getAllPrescriptions(): Promise<any[]> {
    const response = await databases.listDocuments(
        databaseId,
        pharmacyRecordsCollectionId,
        [Query.orderDesc("$createdAt")]
    );
    return response.documents;
}

/**
 * Create a new pharmacy record (assigned by doctor/nurse)
 */
export async function assignPharmacist(pharmacyRecord: PharmacyRecord): Promise<any> {
    try {
        const response = await databases.createDocument(
            databaseId,
            pharmacyRecordsCollectionId,
            ID.unique(),
            pharmacyRecord
        );
        return response;
    } catch (error: any) {
        console.error("An error occurred while creating pharmacy record:", error?.message || error);
        throw new Error(error?.message || "Failed to create pharmacy record");
    }
}

/**
 * Mark a prescription as dispensed and record who dispensed it
 */
export async function dispensePrescription(
    recordId: string,
    pharmacistId: string
): Promise<any> {
    try {
        const response = await databases.updateDocument(
            databaseId,
            pharmacyRecordsCollectionId,
            recordId,
            {
                status: "dispensed",
                dispensedBy: pharmacistId,
                dispensedAt: new Date().toISOString(),
            }
        );
        return response;
    } catch (error: any) {
        console.error("Error marking prescription as dispensed:", error?.message || error);
        throw new Error(error?.message || "Failed to dispense prescription");
    }
}

/**
 * Cancel a prescription record
 */
export async function cancelPrescription(recordId: string): Promise<any> {
    try {
        const response = await databases.updateDocument(
            databaseId,
            pharmacyRecordsCollectionId,
            recordId,
            { status: "cancelled" }
        );
        return response;
    } catch (error: any) {
        console.error("Error cancelling prescription:", error?.message || error);
        throw new Error(error?.message || "Failed to cancel prescription");
    }
}
