import { databases } from "@/lib/appwrite.config";
import { Consultation } from "./types";
import { ID } from "appwrite";
import { Query } from "node-appwrite";


const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const consultationCollectionId = process.env.NEXT_PUBLIC_CONSULTATION_COLLECTION_ID!


export async function createConsultation(consultationData: Consultation) {
    try {
        console.log('consultId', consultationCollectionId)
        const response = await databases.createDocument(
            databaseId,
            consultationCollectionId,
            ID.unique(),
            consultationData
        );

        console.log("Consultation successfully created:", response);
        return response;

    } catch (error) {
        console.error("An error occurred while creating consultation:", error);
        return null;
    }
}


export async function getPatientConsultations(patientId: string) {
    try {
        const response = await databases.listDocuments(
            databaseId,
            consultationCollectionId,
            [
                Query.equal("patientId", patientId),
                Query.orderDesc("consultationDate")
            ]
        );

        return response.documents;
    } catch (error) {
        console.error("Error fetching consultations:", error);
        return [];
    }
}

export async function deleteConsultation(consultationId: string) {
    try {
        const response = await databases.deleteDocument(
            databaseId,
            consultationCollectionId,
            consultationId
        );
        return response; // Optionally return something if needed
    } catch (error) {
        console.error("Error deleting consultation:", error);
        throw new Error("Failed to delete consultation.");
    }
}