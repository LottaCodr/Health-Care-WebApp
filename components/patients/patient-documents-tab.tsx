"use client";

import React, { useState, useRef } from "react";
import { usePatientDocuments, useUploadPatientDocument, useDeletePatientDocument } from "@/hooks/emr/use-patient-document";
import { DOCUMENT_TYPE_LABELS } from "@/lib/patient-documents.types";
import type { DocumentType, PatientDocument } from "@/lib/patient-documents.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES   = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const ACCEPTED_DISPLAY = ".pdf, .png, .jpg, .jpeg";
const MAX_SIZE_MB       = 20;
const MAX_SIZE_BYTES    = MAX_SIZE_MB * 1024 * 1024;

const DOC_ICONS: Record<string, string> = {
    "application/pdf": "📄",
    "image/png":        "🖼",
    "image/jpeg":       "🖼",
    "image/jpg":        "🖼",
};

const TYPE_COLORS: Record<DocumentType, string> = {
    general:           "bg-slate-100  text-slate-600",
    lab_report:        "bg-indigo-100 text-indigo-700",
    scan:              "bg-cyan-100   text-cyan-700",
    referral_letter:   "bg-violet-100 text-violet-700",
    discharge_summary: "bg-emerald-100 text-emerald-700",
    operative_report:  "bg-orange-100 text-orange-700",
    prescription:      "bg-pink-100   text-pink-700",
    insurance:         "bg-blue-100   text-blue-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number | null): string {
    if (!bytes) return "—";
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(",")[1]);
        reader.onerror = () => rej(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

// ─── Image preview modal ──────────────────────────────────────────────────────

function ImageModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
            <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                <button onClick={onClose}
                    className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-semibold">
                    ✕ Close
                </button>
                <img src={url} alt={name} className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl" />
                <p className="text-white/60 text-xs text-center mt-3">{name}</p>
            </div>
        </div>
    );
}

// ─── Upload form ──────────────────────────────────────────────────────────────

interface UploadFormProps {
    patientId:  string;
    uploadedBy: string;
    onDone:     () => void;
}

function UploadForm({ patientId, uploadedBy, onDone }: UploadFormProps) {
    const upload       = useUploadPatientDocument();
    const fileRef      = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [file,           setFile]           = useState<File | null>(null);
    const [description,    setDescription]    = useState("");
    const [sourceHospital, setSourceHospital] = useState("");
    const [documentType,   setDocumentType]   = useState<DocumentType>("general");
    const [fileError,      setFileError]       = useState("");

    function handleFile(f: File) {
        setFileError("");
        if (!ACCEPTED_TYPES.includes(f.type)) {
            setFileError("Only PDF, PNG, and JPEG files are supported.");
            return;
        }
        if (f.size > MAX_SIZE_BYTES) {
            setFileError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
            return;
        }
        setFile(f);
    }

    async function handleSubmit() {
        if (!file) return;
        const base64 = await fileToBase64(file);
        await upload.mutateAsync({
            patientId,
            fileBase64:     base64,
            fileName:       file.name,
            mimeType:       file.type,
            fileSize:       file.size,
            description:    description     || undefined,
            sourceHospital: sourceHospital  || undefined,
            documentType,
            uploadedBy,
        });
        onDone();
    }

    return (
        <div className="space-y-4">
            {/* Drop zone */}
            {!file ? (
                <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                        isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                    }`}>
                    <div className="text-3xl mb-3">📎</div>
                    <p className="text-sm font-semibold text-gray-700">
                        {isDragging ? "Drop to upload" : "Click or drag & drop"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{ACCEPTED_DISPLAY} · max {MAX_SIZE_MB}MB</p>
                    <input ref={fileRef} type="file" accept={ACCEPTED_DISPLAY} className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </div>
            ) : (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-2xl">{DOC_ICONS[file.type] ?? "📄"}</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                    </div>
                    <button onClick={() => setFile(null)} className="text-xs text-gray-400 hover:text-red-500 font-medium">Remove</button>
                </div>
            )}

            {fileError && <p className="text-xs text-red-500 font-medium">{fileError}</p>}

            {/* Metadata */}
            <div className="space-y-3">
                <div>
                    <label className="label-xs">Document Type</label>
                    <select value={documentType} onChange={e => setDocumentType(e.target.value as DocumentType)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                        {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map(t => (
                            <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label-xs">Source Hospital / Clinic</label>
                    <input value={sourceHospital} onChange={e => setSourceHospital(e.target.value)}
                        placeholder="e.g. National Hospital Abuja, Lagos University Teaching Hospital…"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                    <label className="label-xs">Description (optional)</label>
                    <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Brief note about this document…"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
            </div>

            <div className="flex gap-3">
                <button onClick={onDone} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={handleSubmit}
                    disabled={!file || upload.isPending}
                    className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-colors">
                    {upload.isPending ? "Uploading…" : "Upload Document"}
                </button>
            </div>

            <style jsx>{`
                .label-xs { display:block; font-size:0.7rem; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem; }
            `}</style>

            
        </div>
    );
}

// ─── Document card ────────────────────────────────────────────────────────────

function DocumentCard({
    doc, canDelete, patientId, onPreviewImage,
}: {
    doc:            PatientDocument;
    canDelete:      boolean;
    patientId:      string;
    onPreviewImage: (url: string, name: string) => void;
}) {
    const del    = useDeletePatientDocument();
    const isPDF  = doc.file_type === "application/pdf";
    const isImg  = doc.file_type.startsWith("image/");
    const icon   = DOC_ICONS[doc.file_type] ?? "📄";
    const color  = TYPE_COLORS[doc.document_type as DocumentType] ?? TYPE_COLORS.general;
    const label  = DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType] ?? "General";

    function handleView() {
        if (!doc.signed_url) return;
        if (isPDF)  window.open(doc.signed_url, "_blank");
        if (isImg)  onPreviewImage(doc.signed_url, doc.file_name);
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group overflow-hidden">
            {/* Thumbnail / icon header */}
            <div className="relative h-24 bg-gray-50 flex items-center justify-center overflow-hidden">
                {isImg && doc.signed_url ? (
                    <img src={doc.signed_url} alt={doc.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <span className="text-4xl">{icon}</span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <button onClick={handleView}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white/90 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow">
                        {isPDF ? "Open PDF" : "View Image"}
                    </span>
                </button>
            </div>

            {/* Metadata */}
            <div className="p-3 space-y-2">
                <p className="text-sm font-semibold text-gray-800 truncate" title={doc.file_name}>
                    {doc.file_name}
                </p>

                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                    <span className="text-[10px] text-gray-400">{formatSize(doc.file_size)}</span>
                </div>

                {doc.source_hospital && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        🏥 <span className="truncate">{doc.source_hospital}</span>
                    </p>
                )}

                {doc.description && (
                    <p className="text-xs text-gray-400 line-clamp-2">{doc.description}</p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                    <p className="text-[10px] text-gray-400">
                        {new Date(doc.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <div className="flex items-center gap-1">
                        {doc.signed_url && (
                            <a href={doc.signed_url} download={doc.file_name} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs"
                                title="Download">
                                ⬇
                            </a>
                        )}
                        {canDelete && (
                            <button
                                onClick={() => del.mutate({ id: doc.id, storagePath: doc.storage_path, patientId })}
                                disabled={del.isPending}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs disabled:opacity-50"
                                title="Delete">
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PatientDocumentsTabProps {
    patientId:  string;
    staffId:    string;
    canUpload:  boolean;   // FrontDesk + Admin only
}

export default function PatientDocumentsTab({ patientId, staffId, canUpload }: PatientDocumentsTabProps) {
    const { data: docs = [], isLoading, isError } = usePatientDocuments(patientId);
    const [showUpload,    setShowUpload]    = useState(false);
    const [previewImg,    setPreviewImg]    = useState<{ url: string; name: string } | null>(null);
    const [typeFilter,    setTypeFilter]    = useState<DocumentType | "all">("all");

    const filtered = typeFilter === "all" ? docs : docs.filter((d: PatientDocument) => d.document_type === typeFilter);

    // Only show type filters that have at least one doc
    const usedTypes = Array.from(new Set(docs.map((d: PatientDocument) => d.document_type))) as DocumentType[];

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-800">Patient Documents</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                        External records, scans, referrals and reports
                    </p>
                </div>
                {canUpload && !showUpload && (
                    <button onClick={() => setShowUpload(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                        + Upload Document
                    </button>
                )}
            </div>

            {/* Upload form */}
            {showUpload && (
                <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-gray-800 mb-4">Upload New Document</h4>
                    <UploadForm
                        patientId={patientId}
                        uploadedBy={staffId}
                        onDone={() => setShowUpload(false)}
                    />
                </div>
            )}

            {/* Type filter tabs */}
            {docs.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={() => setTypeFilter("all")}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                            typeFilter === "all"
                                ? "bg-gray-800 text-white border-gray-800"
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        }`}>
                        All ({docs.length})
                    </button>
                    {usedTypes.map(t => (
                        <button key={t} onClick={() => setTypeFilter(t)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                                typeFilter === t
                                    ? `${TYPE_COLORS[t]} border-current`
                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                            }`}>
                            {DOCUMENT_TYPE_LABELS[t]} ({docs.filter((d: PatientDocument) => d.document_type === t).length})
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="text-sm text-gray-400 py-12 text-center">Loading documents…</div>
            ) : isError ? (
                <div className="text-sm text-red-400 py-12 text-center">Failed to load documents</div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl">📂</div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-500">No documents yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {canUpload
                                ? "Upload external records, scans, or referral letters."
                                : "Documents uploaded by front desk will appear here."}
                        </p>
                    </div>
                    {canUpload && !showUpload && (
                        <button onClick={() => setShowUpload(true)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                            + Upload First Document
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((doc: PatientDocument) => (
                        <DocumentCard
                            key={doc.id}
                            doc={doc}
                            canDelete={canUpload}
                            patientId={patientId}
                            onPreviewImage={(url, name) => setPreviewImg({ url, name })}
                        />
                    ))}
                </div>
            )}

            {/* Image preview modal */}
            {previewImg && (
                <ImageModal
                    url={previewImg.url}
                    name={previewImg.name}
                    onClose={() => setPreviewImg(null)}
                />
            )}
        </div>
    );
}