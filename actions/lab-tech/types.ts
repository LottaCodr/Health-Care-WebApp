import { Patient } from "@/context/patients/types";




export interface LabTechFeedback {
    $id?: string;
    patientId: string;
    patient?: Patient
    doctorInstructions: string;
    doctorMedications: string;
    doctorDiagnosis: string;
    doctorRecommendations: string;
    labTechId: string;
    testResults?: string; // Optional: details/results of the test(s)
    // createdAt: string;
    updatedAt?: string;
    status?: string; // e.g., "pending", "completed", etc.
}


