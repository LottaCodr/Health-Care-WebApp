import { databases } from "@/lib/appwrite.config";
import { ID, Query } from "appwrite";
import { LabTechFeedback } from "./types";
import { Patient } from "@/context/patients/types";


const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const labTechCollectionId = process.env.NEXT_PUBLIC_LAB_TECH_COLLECTION_ID!;
const patientCollectionId = process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!;


export async function assignLabTech(labTechTaskData: LabTechFeedback) {
    try {
        const response = await databases.createDocument(
            databaseId,
            labTechCollectionId,
            ID.unique(),
            labTechTaskData
        );

        console.log('Lab Tech Assigment successfully created:', response);
        return response;
    } catch (error) {
        console.error("An error occurred while creating lab tech assignment:", error);
        throw new Error("Failed to create lab tech assignment")
    }
}

export async function getLabTechTasks(labTechId: string): Promise<LabTechFeedback[]> {
    try {
        const response = await databases.listDocuments(
            databaseId,
            labTechCollectionId,
            [Query.equal('labTechId', labTechId), Query.orderDesc('$createdAt')]
        );

        const labTechTasksRaw = response.documents;

        //Get valid patient IDs
        // Ifs the patient is not found, then remove the patient from the list
        const validPatientIds = labTechTasksRaw.filter(task => task.patientId !== undefined).map(task => task.patientId.$id);

        // Fetch all patients in parallel
        const patientMap: Record<string, Patient> = {};
        await Promise.all(
            validPatientIds.map(async (pid) => {
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
                } catch (error) {
                    console.error("Error fetching patient:", error);
                    return null;
                }
            })
        );

        const labTechTasks: LabTechFeedback[] = labTechTasksRaw.map((n) => ({
            $id: n.$id,
            patientId: n.patientId,
            patient: patientMap[n.patientId],
            labTechId: n.labTechId,
            doctorInstructions: n.doctorInstructions,
            doctorMedications: n.doctorMedications,
            doctorDiagnosis: n.doctorDiagnosis,
            doctorRecommendations: n.doctorRecommendations,
            feedback: n.feedback,
            testResults: n.testResults,
            taskDate: n.taskDate,
            createdAt: n.$createdAt,
        }));

        return labTechTasks;
    } catch (error) {
        console.error("An error occurred while fetching lab tech tasks:", error);
        throw new Error("Failed to fetch lab tech tasks")
    }
}

export async function getLabRequest(labTechId: string): Promise<LabTechFeedback[]> {
    try {
        const response = await databases.listDocuments(
            databaseId,
            labTechCollectionId,
            [Query.equal('labTechId', labTechId), Query.orderDesc('$createdAt')]
        );

        const labTechTasksRaw = response.documents;

        //Get valid patient IDs
        // Ifs the patient is not found, then remove the patient from the list
        const validPatientIds = labTechTasksRaw.filter(task => task.patientId !== undefined).map(task => task.patientId.$id);

        // Fetch all patients in parallel
        const patientMap: Record<string, Patient> = {};
        await Promise.all(
            validPatientIds.map(async (pid) => {
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
                } catch (error) {
                    console.error("Error fetching patient:", error);
                    return null;
                }
            })
        );

        const labTechTasks: LabTechFeedback[] = labTechTasksRaw.map((n) => ({
            $id: n.$id,
            patientId: n.patientId,
            patient: patientMap[n.patientId],
            labTechId: n.labTechId,
            doctorInstructions: n.doctorInstructions,
            doctorMedications: n.doctorMedications,
            doctorDiagnosis: n.doctorDiagnosis,
            doctorRecommendations: n.doctorRecommendations,
            feedback: n.feedback,
            testResults: n.testResults,
            taskDate: n.taskDate,
            createdAt: n.$createdAt,
        }));

        return labTechTasks;
    } catch (error) {
        console.error("An error occurred while fetching lab tech tasks:", error);
        throw new Error("Failed to fetch lab tech tasks")
    }
}

export async function updateLabTechAction({
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
            databaseId,
            labTechCollectionId,
            documentId,
            {
                bloodPressure,
                temperature,
                pulseRate,
                respiratoryRate,
                treatmentGiven,
            }
        );

        console.log('Lab Tech Action updated successfully:', response);
        return response;
    } catch (error) {
        console.error("An error occurred while updating lab tech action:", error);
        throw new Error("Failed to update lab tech action")
    }
}
