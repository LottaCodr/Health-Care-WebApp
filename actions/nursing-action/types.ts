interface NursingAction {
    $id: string;
    patientId: string; // Relation to Patients
    nurseId: string;   // Relation to Users
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
