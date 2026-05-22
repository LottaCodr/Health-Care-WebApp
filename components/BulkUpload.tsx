"use client";

import React, { useRef } from "react";
import { useBulkUploadStore } from "@/store/bulk-upload-store";
import type { UploadType } from "@/store/bulk-upload-store";

// ─── Expected CSV headers per upload type ────────────────────────────────────

const EXPECTED_HEADERS: Record<UploadType, string[]> = {
    patients:  ["name", "date_of_birth", "gender", "phone", "address", "blood_group", "genotype", "next_of_kin_name", "next_of_kin_phone"],
    drugs:     ["drug_name", "generic_name", "category", "unit", "reorder_level", "unit_price"],
    lab_tests: ["test_name", "test_code", "category", "normal_range", "unit", "price"],
};

const UPLOAD_TYPE_LABELS: Record<UploadType, string> = {
    patients:  "Patients",
    drugs:     "Pharmacy Drugs",
    lab_tests: "Lab Tests",
};

// ─── Validate CSV rows ────────────────────────────────────────────────────────

function validateRows(rows: Record<string, string>[], type: UploadType) {
    const required = EXPECTED_HEADERS[type];
    const errors: { row: number; field: string; message: string }[] = [];

    rows.forEach((row, i) => {
        required.forEach((field) => {
            if (!row[field]?.trim()) {
                errors.push({ row: i + 2, field, message: `"${field}" is required` });
            }
        });

        // Type-specific validations
        if (type === "patients") {
            if (row.gender && !["male", "female"].includes(row.gender.toLowerCase())) {
                errors.push({ row: i + 2, field: "gender", message: `Must be "male" or "female"` });
            }
            if (row.date_of_birth && isNaN(Date.parse(row.date_of_birth))) {
                errors.push({ row: i + 2, field: "date_of_birth", message: "Invalid date format (use YYYY-MM-DD)" });
            }
        }

        if (type === "drugs" && row.unit_price && isNaN(Number(row.unit_price))) {
            errors.push({ row: i + 2, field: "unit_price", message: "Must be a number" });
        }

        if (type === "lab_tests" && row.price && isNaN(Number(row.price))) {
            errors.push({ row: i + 2, field: "price", message: "Must be a number" });
        }
    });

    return errors;
}

// ─── Parse CSV ────────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines   = text.trim().split("\n").filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const rows    = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
    return { headers, rows };
}

// ─── Step: Select ─────────────────────────────────────────────────────────────

function StepSelect() {
    const store    = useBulkUploadStore();
    const fileRef  = useRef<HTMLInputElement>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text    = ev.target?.result as string;
            const { headers, rows } = parseCSV(text);
            const preview = rows.slice(0, 5);
            store.setFile(file, headers, preview);
            const errors = validateRows(rows, store.uploadType);
            store.setErrors(errors);
        };
        reader.readAsText(file);
    }

    return (
        <div className="space-y-6">
            {/* Upload type */}
            <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Upload Type</label>
                <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(UPLOAD_TYPE_LABELS) as UploadType[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => store.setUploadType(t)}
                            className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                                store.uploadType === t
                                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                            }`}
                        >
                            {UPLOAD_TYPE_LABELS[t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Expected headers hint */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Required CSV Columns</p>
                <div className="flex flex-wrap gap-1.5">
                    {EXPECTED_HEADERS[store.uploadType].map((h) => (
                        <span key={h} className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-600 font-mono">
                            {h}
                        </span>
                    ))}
                </div>
            </div>

            {/* Drop zone */}
            <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-2xl p-10 text-center cursor-pointer transition-colors group"
            >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 group-hover:bg-teal-50 flex items-center justify-center transition-colors">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-teal-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">Click to upload CSV file</p>
                <p className="text-xs text-slate-400 mt-1">CSV format, UTF-8 encoded</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            </div>
        </div>
    );
}

// ─── Step: Preview ────────────────────────────────────────────────────────────

interface UploadAction {
    onUpload: (rows: Record<string, string>[]) => Promise<void>;
}

function StepPreview({ onUpload }: UploadAction) {
    const store = useBulkUploadStore();

    async function handleUpload() {
        if (!store.file) return;
        store.setUploading(true);
        const text = await store.file.text();
        const { rows } = parseCSV(text);
        await onUpload(rows);
    }

    const hasErrors = store.errors.length > 0;

    return (
        <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-700">{store.fileName}</p>
                        <p className="text-xs text-slate-400">{store.headers.length} columns · {store.preview.length}+ rows detected</p>
                    </div>
                </div>
                <button onClick={() => store.reset()} className="text-xs text-slate-400 hover:text-slate-600">Change file</button>
            </div>

            {/* Validation errors */}
            {hasErrors && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-1.5 max-h-40 overflow-y-auto">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                        {store.errors.length} Validation {store.errors.length === 1 ? "Error" : "Errors"}
                    </p>
                    {store.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-500">
                            Row {e.row} · <span className="font-mono font-medium">{e.field}</span>: {e.message}
                        </p>
                    ))}
                </div>
            )}

            {/* Preview table */}
            <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Preview (first 5 rows)</p>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50">
                                {store.headers.map((h) => (
                                    <th key={h} className="px-3 py-2 text-left font-medium text-slate-500 whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {store.preview.map((row, i) => (
                                <tr key={i} className="bg-white hover:bg-slate-50">
                                    {store.headers.map((h) => (
                                        <td key={h} className="px-3 py-2 text-slate-600 max-w-[140px] truncate whitespace-nowrap">
                                            {row[h] || <span className="text-slate-300 italic">empty</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <button
                onClick={handleUpload}
                disabled={hasErrors || store.uploading}
                className="w-full py-2.5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-50 transition-colors"
            >
                {store.uploading ? "Uploading…" : hasErrors ? "Fix errors before uploading" : `Upload ${UPLOAD_TYPE_LABELS[store.uploadType]}`}
            </button>
        </div>
    );
}

// ─── Step: Done ───────────────────────────────────────────────────────────────

function StepDone() {
    const store  = useBulkUploadStore();
    const result = store.result!;

    return (
        <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <div>
                <h3 className="text-base font-semibold text-slate-800">Upload Complete</h3>
                <p className="text-sm text-slate-500 mt-1">
                    {result.success} of {result.total} records uploaded successfully
                </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 rounded-xl py-3 px-2">
                    <p className="text-xl font-bold text-slate-700">{result.total}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Total</p>
                </div>
                <div className="bg-green-50 rounded-xl py-3 px-2">
                    <p className="text-xl font-bold text-green-700">{result.success}</p>
                    <p className="text-xs text-green-500 mt-0.5">Success</p>
                </div>
                <div className="bg-red-50 rounded-xl py-3 px-2">
                    <p className="text-xl font-bold text-red-600">{result.failed}</p>
                    <p className="text-xs text-red-400 mt-0.5">Failed</p>
                </div>
            </div>

            <button
                onClick={() => store.reset()}
                className="px-6 py-2.5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
            >
                Upload Another File
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BulkUploadComponentProps {
    onUpload: (type: UploadType, rows: Record<string, string>[]) => Promise<{ total: number; success: number; failed: number }>;
}

export default function BulkUploadComponent({ onUpload }: BulkUploadComponentProps) {
    const store = useBulkUploadStore();

    const STEPS = ["select", "preview", "done"] as const;
    const stepIdx = STEPS.indexOf(store.step);

    async function handleUpload(rows: Record<string, string>[]) {
        const result = await onUpload(store.uploadType, rows);
        store.setResult(result);
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Progress header */}
            <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800 mb-3">Bulk Upload</h2>
                <div className="flex items-center gap-2">
                    {[
                        { key: "select",  label: "Select File" },
                        { key: "preview", label: "Review" },
                        { key: "done",    label: "Complete" },
                    ].map((s, i) => (
                        <React.Fragment key={s.key}>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                    i < stepIdx  ? "bg-teal-600 text-white" :
                                    i === stepIdx ? "bg-teal-100 text-teal-700 ring-2 ring-teal-400" :
                                    "bg-slate-100 text-slate-400"
                                }`}>
                                    {i < stepIdx ? "✓" : i + 1}
                                </span>
                                <span className={`text-xs font-medium ${i === stepIdx ? "text-teal-700" : "text-slate-400"}`}>
                                    {s.label}
                                </span>
                            </div>
                            {i < 2 && <div className={`flex-1 h-px ${i < stepIdx ? "bg-teal-400" : "bg-slate-200"}`} />}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="px-6 py-5">
                {store.step === "select"  && <StepSelect />}
                {store.step === "preview" && <StepPreview onUpload={handleUpload} />}
                {store.step === "done"    && <StepDone />}
            </div>
        </div>
    );
}