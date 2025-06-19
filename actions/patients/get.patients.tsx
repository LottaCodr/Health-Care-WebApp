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
            patientCollectionId,
        );

        const patients: Patient[] = res.documents as Patient[];

        return patients;
    } catch (error) {
        console.error("Error fetching patients:", error);
        return [];
    }
}

export const getPatient = async (userId: string) => {
    try {
        const res = await databases.listDocuments(
            databaseId,
            patientCollectionId,
            [Query.equal('userId', userId)]
        );
        const patient: Patient = parseStringify(res.documents[0]) as Patient

        console.log('user detail', patient)
        return patient;

    } catch (error) {
        console.log("An error occurred while getting a user:", error);
        return null;
    }
};