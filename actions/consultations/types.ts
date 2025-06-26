
export type ConsultationReferred =
    | 'nurse'
    | 'labtech'
    | 'pharmacist'

export interface Consultation {
    $id?: string;
    patientId: string;
    doctorId: string;
    symptom: string;
    diagnosis: string;
    prescription: string;
    recommendation: string;
    consultationDate: string;
    createdAt: string;
    referredTo: string;
}
