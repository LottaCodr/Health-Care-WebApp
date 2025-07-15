
import { databases } from '@/lib/appwrite.config';
import { ID, Query } from 'appwrite';
import { NursingAction } from './types';
import { Patient } from '@/context/patients/types';

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const nursingActionCollectionId = process.env.NEXT_PUBLIC_NURSING_ACTIONS_COLLECTION_ID!
const patientCollectionId = process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!

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

        const nurseActionsRaw = response.documents;

        // Get valid patient IDs
        const patientIds = nurseActionsRaw.map(n => n.patientId.$id);

        // Fetch all patients in parallel
        const patientMap: Record<string, Patient> = {};
        await Promise.all(
            patientIds.map(async (pid) => {
                try {
                    const p = await databases.getDocument(databaseId, patientCollectionId, pid);
                    patientMap[pid] = {
                        $id: p.$id,
                        $createdAt: p.$createdAt,
                        $updatedAt: p.$updatedAt,
                        name: p.name,
                        email: p.email,
                        phone: p.phone,
                        gender: p.gender,
                        address: p.address,
                        occupation: p.occupation,
                        birthDate: p.birthDate,
                        privacyConsent: p.privacyConsent,
                        disclosureConsent: p.disclosureConsent,
                        treatmentConsent: p.treatmentConsent,
                        emergencyContactName: p.emergencyContactName,
                        emergencyContactNumber: p.emergencyContactNumber,
                        insuranceProvider: p.insuranceProvider,
                        insurancePolicyNumber: p.insurancePolicyNumber,
                        allergies: p.allergies,
                        currentMedication: p.currentMedication,
                        familyMedicalHistory: p.familyMedicalHistory,
                        pastMedicalHistory: p.pastMedicalHistory,
                        primaryPhysician: p.primaryPhysician,
                        identificationType: p.identificationType,
                        identificationNumber: p.identificationNumber,
                        identificationDocumentId: p.identificationDocumentId,
                        identificationDocumentUrl: p.identificationDocumentUrl,
                        status: p.status,
                        userId: p.userId,
                    };
                } catch (err) {
                    console.warn(`Patient not found for ID: ${pid}`);
                }
            })
        );

        const nurseActions: NursingAction[] = nurseActionsRaw.map((n) => ({
            $id: n.$id,
            patientId: n.patientId,
            nurseId: n.nurseId,
            patient: patientMap[n.patientId], // may be undefined if not found
            bloodPressure: n.bloodPressure,
            temperature: n.temperature,
            pulseRate: n.pulseRate,
            respiratoryRate: n.respiratoryRate,
            treatmentGiven: n.treatmentGiven,
            doctorInstructions: n.doctorInstructions,
            prescribedMedication: n.prescribedMedication,
            doctorDiagnosis: n.doctorDiagnosis,
            taskDate: n.taskDate,
            createdAt: n.createdAt,
        }));

        return nurseActions;
    } catch (error) {
        console.error('Error fetching nurse tasks:', error);
        throw new Error('Could not fetch nurse tasks');
    }
}


export async function updateNursingAction({
    documentId,
    bloodPressure,
    temperature,
    pulseRate,
    respiratoryRate,
    treatmentGiven
}: {
    documentId: string;
    bloodPressure: string;
    temperature: string;
    pulseRate: string;
    respiratoryRate: string;
    treatmentGiven: string;
}) {
    try {
        const response = await databases.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_NURSING_ACTIONS_COLLECTION_ID!,
            documentId,
            {
                bloodPressure,
                temperature,
                pulseRate,
                respiratoryRate,
                treatmentGiven,
            }
        );

        return response;
    } catch (error) {
        console.error("Error updating nursing action:", error);
        throw error;
    }
}