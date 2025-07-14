import { parseStringify } from "@/app/lib/utils";
import { Patient } from "@/context/patients/types";
import { databases } from "@/lib/appwrite.config";
import { Query } from "appwrite";

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const patientCollectionId = process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!;

export async function getAllPatients(): Promise<Patient[]> {
    try {
        const res = await databases.listDocuments(
            databaseId,
            patientCollectionId
        );

        // It's safer to map and explicitly type each document
        const patients: Patient[] = res.documents.map((doc: any) => ({
            ...doc,
            birthDate: new Date(doc.birthDate), // Optional: convert to Date if needed
        }));

        return patients;
    } catch (error) {
        console.error("Error fetching patients:", error);
        return [];
    }
}

export const getPatient = async (userId: string): Promise<Patient | null> => {
    if (!userId || userId.trim() === "") {
        console.error("Invalid userId provided to getPatient.");
        return null;
    }

    console.log('recieved:', userId)

    try {
        const res = await databases.listDocuments(
            databaseId,
            patientCollectionId,
            [Query.equal("userId", userId)]
        );

        if (!res.documents.length) {
            console.warn("No patient found with userId:", userId);
            return null;
        }

        const patient = parseStringify(res.documents[0]) as Patient;

        console.log("user detail", patient);
        return patient;

    } catch (error) {
        console.error("An error occurred while getting a patient:", error);
        return null;
    }
};

export const updatePatient = async (
    patientId: string,
    data: Partial<Patient>
): Promise<Patient> => {
    try {
        const res = await databases.updateDocument(
            databaseId,
            patientCollectionId,
            patientId,
            data
        );
        // Ensure the returned object matches the Patient type
        const updatedPatient = parseStringify(res) as Patient;
        return updatedPatient;
    } catch (error) {
        console.error("Error updating patient:", error);
        // Instead of returning null, throw the error to let the caller handle it,
        // or you can return a default Patient object if appropriate.
        throw error;
    }
}



