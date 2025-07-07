
import { databases } from '@/lib/appwrite.config';
import { ID, Query } from 'appwrite';
import { NursingAction } from './types';

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const nursingActionCollectionId = process.env.NEXT_PUBLIC_NURSING_ACTIONS_COLLECTION_ID!
export async function assignNurse(nurseTaskData: NursingAction) {
    try {
        const response = await databases.createDocument(
            databaseId,
            nursingActionCollectionId,
            ID.unique(),
            nurseTaskData
        );

        console.log('Nurse Assigment successfully created:', response);
        return response;
    } catch (error) {
        console.error("An error occurred while creating nurse task:", error);
        throw new Error("Failed to create nurse assignmentq")
    }

}


export async function getNurseTasks(nurseId: string): Promise<NursingAction[]> {
    try {
        const response = await databases.listDocuments(
            databaseId,
            nursingActionCollectionId,
            [
                Query.equal('nurseId', nurseId),
                Query.orderDesc('$createdAt')
            ]
        );

        // Map each document to the full NursingAction type
        const nurseActions: NursingAction[] = response.documents.map((n) => ({
            $id: n.$id,
            patientId: n.patientId,
            nurseId: n.nurseId,
            patientName: n.patientName,
            vitals: n.vitals,
            treatmentGiven: n.treatmentGiven,
            doctorInstructions: n.doctorInstructions,
            prescribedMedication: n.prescribedMedication,
            doctorDiagnosis: n.doctorDiagnosis,
            taskDate: n.taskDate,
            createdAt: n.createdAt
        }));

        return nurseActions;
    } catch (error) {
        console.error('Error fetching nurse tasks:', error);
        throw new Error('Could not fetch nurse tasks');
    }
}


export async function updateNursingAction({
    documentId,
    vitals,
    treatmentGiven
}: {
    documentId: string;
    vitals: any;
    treatmentGiven: string;
}) {
    try {
        const response = await databases.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_NURSING_ACTIONS_COLLECTION_ID!,
            documentId,
            {
                vitals,
                treatmentGiven,
            }
        );

        return response;
    } catch (error) {
        console.error("Error updating nursing action:", error);
        throw error;
    }
}