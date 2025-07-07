import { Patient } from "@/context/patients/types";

export interface NursingAction {
    $id?: string;
    patientId: string; // Relation to Patients
    nurseId: string;   // Relation to Users
    doctorInstructions: string;
    prescribedMedication: string;

    bloodPressure?: string;
    temperature?: string;
    pulseRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;

    treatmentGiven?: string;
    doctorDiagnosis: string
    createdAt?: string;
    taskDate: string;
    patientDetails?: Patient
}


export interface Task {
    id: string;
    patientId: string;
    patientName: string;
    status: string;
    doctorInstructions: string;
    vitals: {
        bloodPressure: string;
        temperature: string;
        pulseRate: string;
        respiratoryRate: string;
        oxygenSaturation: string;
    };
    treatmentGiven: string;
    createdAt: string;
}