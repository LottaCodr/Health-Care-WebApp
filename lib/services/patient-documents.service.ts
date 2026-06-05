"use server";

import { createClient } from "@/utils/supabase/server";

const BUCKET = "patient-documents";

export interface PatientDocument {
    id:             string;
    patient_id:     string;
    file_name:      string;
    file_type:      string;
    storage_path:   string;
    file_size:      number | null;
    description:    string | null;
    source_hospital:string | null;
    document_type:  string;
    uploaded_by:    string | null;
    created_at:     string;
    signed_url?:    string;
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

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadPatientDocument(input: {
    patientId:      string;
    fileBase64:     string;
    fileName:       string;
    mimeType:       string;
    fileSize:       number;
    description?:   string;
    sourceHospital?:string;
    documentType:   DocumentType;
    uploadedBy:     string;
}): Promise<PatientDocument> {
    const sb = await createClient();

    // Convert base64 → Uint8Array
    const binary = Uint8Array.from(atob(input.fileBase64), c => c.charCodeAt(0));

    // Storage path: patientId/timestamp_filename
    const safe    = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path    = `${input.patientId}/${Date.now()}_${safe}`;

    const { error: uploadError } = await sb.storage
        .from(BUCKET)
        .upload(path, binary, { contentType: input.mimeType, upsert: false });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Save metadata
    const { data, error: dbError } = await sb
        .from("patient_documents")
        .insert([{
            patient_id:      input.patientId,
            file_name:       input.fileName,
            file_type:       input.mimeType,
            storage_path:    path,
            file_size:       input.fileSize,
            description:     input.description    ?? null,
            source_hospital: input.sourceHospital ?? null,
            document_type:   input.documentType,
            uploaded_by:     input.uploadedBy,
        }])
        .select()
        .single();

    if (dbError) {
        // Clean up storage if DB insert fails
        await sb.storage.from(BUCKET).remove([path]);
        throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return data as PatientDocument;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listPatientDocuments(patientId: string): Promise<PatientDocument[]> {
    const sb = await createClient();

    const { data, error } = await sb
        .from("patient_documents")
        .select("*, staffs!patient_documents_uploaded_by_fkey(name)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data?.length) return [];

    // Generate signed URLs (valid 1 hour)
    const withUrls = await Promise.all(
        (data as PatientDocument[]).map(async doc => {
            const { data: urlData } = await sb.storage
                .from(BUCKET)
                .createSignedUrl(doc.storage_path, 3600);
            return { ...doc, signed_url: urlData?.signedUrl ?? null };
        })
    );

    return withUrls as PatientDocument[];
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePatientDocument(id: string, storagePath: string): Promise<void> {
    const sb = await createClient();

    const { error: storageError } = await sb.storage.from(BUCKET).remove([storagePath]);
    if (storageError) throw new Error(`Storage delete failed: ${storageError.message}`);

    const { error: dbError } = await sb.from("patient_documents").delete().eq("id", id);
    if (dbError) throw new Error(`Database delete failed: ${dbError.message}`);
}