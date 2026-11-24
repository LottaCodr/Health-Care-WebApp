"use server";

import { createClient } from "@/utils/supabase/server";
import type { DocumentType, PatientDocument } from "@/lib/patient-documents.types";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";

const BUCKET = "patient-documents";
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
]);

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadPatientDocument(input: {
    patientId:       string;
    fileBase64:      string;
    fileName:        string;
    mimeType:        string;
    fileSize:        number;
    description?:    string;
    sourceHospital?: string;
    documentType:    DocumentType;
    uploadedBy?:     string;
}): Promise<PatientDocument> {
    const actor = await requireStaff([UserRole.FrontDesk]);

    if (!SAFE_ID_RE.test(input.patientId)) {
        throw new Error("Invalid patient identifier.");
    }
    const mimeType = String(input.mimeType ?? "").toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new Error("Unsupported file type. Upload a PDF, PNG, JPEG, or WebP file.");
    }

    const binary = Uint8Array.from(atob(input.fileBase64), c => c.charCodeAt(0));
    if (binary.byteLength === 0 || binary.byteLength > MAX_DOCUMENT_BYTES) {
        throw new Error("File size must be between 1 byte and 20 MB.");
    }

    const sb = await createClient();
    const safe = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "") || "document";
    const path = `${input.patientId}/${Date.now()}_${safe}`;

    const { error: uploadError } = await sb.storage
        .from(BUCKET)
        .upload(path, binary, { contentType: mimeType, upsert: false });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data, error: dbError } = await sb
        .from("patient_documents")
        .insert([{
            patient_id:      input.patientId,
            file_name:       input.fileName,
            file_type:       mimeType,
            storage_path:    path,
            file_size:       binary.byteLength,
            description:     input.description     ?? null,
            source_hospital: input.sourceHospital  ?? null,
            document_type:   input.documentType,
            uploaded_by:     actor.userId,
        }])
        .select()
        .single();

    if (dbError) {
        await sb.storage.from(BUCKET).remove([path]);
        throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return data as PatientDocument;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listPatientDocuments(patientId: string): Promise<PatientDocument[]> {
    await requireStaff();
    const sb = await createClient();

    const { data, error } = await sb
        .from("patient_documents")
        .select("*, staffs!patient_documents_uploaded_by_fkey(name)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data?.length) return [];

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

export async function deletePatientDocument(id: string, _storagePath?: string): Promise<void> {
    await requireStaff([UserRole.FrontDesk]);
    if (!id || typeof id !== "string") {
        throw new Error("Document ID is required.");
    }
    const sb = await createClient();

    // Always resolve the storage path from the database row so a caller cannot
    // delete arbitrary storage objects belonging to another patient or record.
    const { data: doc, error: lookupError } = await sb
        .from("patient_documents")
        .select("id, storage_path")
        .eq("id", id)
        .single();

    if (lookupError || !doc?.storage_path) {
        throw new Error("Patient document not found.");
    }

    const { error: dbError } = await sb.from("patient_documents").delete().eq("id", id);
    if (dbError) throw new Error(`Database delete failed: ${dbError.message}`);

    const { error: storageError } = await sb.storage.from(BUCKET).remove([doc.storage_path]);
    if (storageError) {
        console.error("[patient-documents] storage cleanup failed after DB delete:", storageError);
    }
}
