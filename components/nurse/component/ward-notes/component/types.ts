export interface WardNote {
    id: string;
    patientName: string;
    date: string;
    summary: string;
    detailedNote: string;
}

export interface NoteFormData {
    patientName: string;
    date: string;
    summary: string;
    detailedNote: string;
}
  