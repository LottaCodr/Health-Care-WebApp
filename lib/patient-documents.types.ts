export interface PatientDocument {
    id:              string;
    patient_id:      string;
    file_name:       string;
    file_type:       string;
    storage_path:    string;
    file_size:       number | null;
    description:     string | null;
    source_hospital: string | null;
    document_type:   string;
    uploaded_by:     string | null;
    created_at:      string;
    signed_url?:     string;
}

export type DocumentType =
    | "general"
    | "lab_report"
    | "scan"
    | "referral_letter"
    | "discharge_summary"
    | "operative_report"
    | "prescription"
    | "insurance";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    general:           "General",
    lab_report:        "Lab Report",
    scan:              "Scan / Radiology",
    referral_letter:   "Referral Letter",
    discharge_summary: "Discharge Summary",
    operative_report:  "Operative Report",
    prescription:      "Prescription",
    insurance:         "Insurance Document",
};
