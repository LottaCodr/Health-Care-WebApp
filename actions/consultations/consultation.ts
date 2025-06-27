
import { databases } from "@/lib/appwrite.config";
import { Consultation } from "./types";
import { ID } from "appwrite";
import { Query } from "node-appwrite";


const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const consultationCollectionId = process.env.NEXT_PUBLIC_CONSULTATION_COLLECTION_ID!
console.log('consultId', consultationCollectionId)


export async function createConsultation(consultationData: Consultation) {
    try {
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
        throw new Error("Failed to create consultation.");
    }
}



export async function getPatientConsultations(patientId: string): Promise<Consultation[]> {
    try {
        const response = await databases.listDocuments(
            databaseId,
            consultationCollectionId,
            [
                Query.equal("patientId", patientId),
                Query.orderDesc("consultationDate")
            ]
        );

        // Map documents to Consultation type
        const consultations = response.documents.map((doc) => ({
            $id: doc.$id, 
            patientId: doc.patientId,
            doctorId: doc.doctorId,
            symptom: doc.symptom,
            diagnosis: doc.diagnosis,
            prescription: doc.prescription,
            recommendation: doc.recommendation,
            consultationDate: doc.consultationDate,
            createdAt: doc.createdAt,
            referredTo: doc.referredTo,
        }));

        return consultations;

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
        return response;
    } catch (error) {
        console.error("Error deleting consultation:", error);
        throw new Error("Failed to delete consultation.");
    }
}