
import { databases } from '@/lib/appwrite.config';
import { ID, Query } from 'appwrite';
import { NursingAction } from './types';

export async function getNurseTasks(nurseId: string) {
    try {
        const response = await databases.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_NURSING_ACTIONS_COLLECTION_ID!,
            [
                Query.equal('nurseId', nurseId),
                Query.orderDesc('$createdAt')
            ]
        );

        return response.documents.map;
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