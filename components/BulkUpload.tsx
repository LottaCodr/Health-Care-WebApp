"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { checkExistingRecords, bulkUploadChunk } from "@/lib/actions/bulk-upload";
import type { UploadType } from "@/lib/actions/bulk-upload";

// ─── Config ───────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 25;

const UPLOAD_TYPE_LABELS: Record<UploadType, string> = {
    patients:  "Patients",
    drug_inventory:     "Pharmacy Drugs",
    lab_test_catalog: "Lab Tests",
};

// All columns (for template download)
const EXPECTED_HEADERS: Record<UploadType, string[]> = {
    patients:  ["name", "date_of_birth", "gender", "phone", "address", "blood_group", "genotype", "next_of_kin_name", "next_of_kin_phone"],
    drug_inventory:     ["drug_name", "generic_name", "category", "unit", "reorder_level", "price", "is_active"],
    lab_test_catalog: ["test_name", "test_code", "category", "normal_range", "unit", "price"],
};

// Only these block upload
const REQUIRED_HEADERS: Record<UploadType, string[]> = {
    patients:  ["name", "date_of_birth", "gender", "phone"],
    drug_inventory:     ["drug_name", "generic_name", "category", "unit", "reorder_level", "price", "is_active"],
    lab_test_catalog: ["test_name", "test_code"],
};

const VALID_DRUG_CATEGORIES = ["TABLET", "INJECTION", "SYRUP", "TOPICAL", "CONSUMABLE"];
const DRUG_CATEGORIES_LABEL = VALID_DRUG_CATEGORIES.join(", ");

// Duplicate-check key per type
const DUPE_KEY: Record<UploadType, string> = {
    patients:  "phone",
    drug_inventory:     "drug_name",
    lab_test_catalog: "test_code",
};

// One example data row per type (for template)
const TEMPLATE_EXAMPLE: Record<UploadType, string> = {
    patients:  "Jane Doe,1990-06-15,female,+2348012345678,12 Aso Drive Abuja,A+,AA,John Doe,+2348098765432",
    drug_inventory:     "Amoxicillin 500mg,Amoxicillin,TABLET,Pack,5,0,ACTIVE",
    lab_test_catalog: "Full Blood Count (FBC),T1,Haematology,,,0",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "select" | "preview" | "uploading" | "done";

interface ValidationError { row: number; field: string; message: string }
interface FailedRow       { row: number; reason: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines   = text.trim().split("\n").filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
    const rows    = lines.slice(1).map(line => {
        // Handle quoted fields
        const vals: string[] = [];
        let cur = "", inQ = false;
        for (const ch of line + ",") {
            if (ch === '"') { inQ = !inQ; }
            else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
            else cur += ch;
        }
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
    return { headers, rows };
}

function validateRows(rows: Record<string, string>[], type: UploadType): ValidationError[] {
    const errors: ValidationError[] = [];
    rows.forEach((row, i) => {
        REQUIRED_HEADERS[type].forEach(field => {
            if (!row[field]?.trim()) errors.push({ row: i + 2, field, message: `"${field}" is required` });
        });
        if (type === "patients") {
            if (row.gender && !["male", "female"].includes(row.gender.toLowerCase()))
                errors.push({ row: i + 2, field: "gender", message: 'Must be "male" or "female"' });
            if (row.birth_date && isNaN(Date.parse(row.birth_date)))
                errors.push({ row: i + 2, field: "birth_date", message: "Invalid date — use YYYY-MM-DD" });
        }
        if (type === "drug_inventory") {
            if (row.category && !VALID_DRUG_CATEGORIES.includes(row.category.toUpperCase()))
                errors.push({ row: i + 2, field: "category", message: `Must be one of: ${DRUG_CATEGORIES_LABEL}` });
            if (row.unit_price && isNaN(Number(row.unit_price)))
                errors.push({ row: i + 2, field: "unit_price", message: "Must be a number" });
            if (row.reorder_level && isNaN(Number(row.reorder_level)))
                errors.push({ row: i + 2, field: "reorder_level", message: "Must be a number" });
            if (row.status && !["ACTIVE", "INACTIVE"].includes(row.status.toUpperCase()))
                errors.push({ row: i + 2, field: "status", message: 'Must be "ACTIVE" or "INACTIVE"' });
        }
        if (type === "lab_test_catalog" && row.price && isNaN(Number(row.price)))
            errors.push({ row: i + 2, field: "price", message: "Must be a number" });
    });
    return errors;
}

function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function downloadTemplate(type: UploadType) {
    const header  = EXPECTED_HEADERS[type].join(",");
    const example = TEMPLATE_EXAMPLE[type];
    downloadCSV(`${header}\n${example}`, `${type}_template.csv`);
}

function downloadErrorReport(errors: FailedRow[], filename: string) {
    const csv = "Row,Reason\n" + errors.map(e => `${e.row},"${e.reason.replace(/"/g, '""')}"`).join("\n");
    downloadCSV(csv, filename);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
                <span>{value} / {max} rows</span>
                <span>{pct}%</span>
            </div>
        </div>
    );
}

function ColPill({ label, required }: { label: string; required: boolean }) {
    return (
        <span className={`text-xs rounded px-2 py-0.5 font-mono border ${
            required
                ? "bg-blue-100 border-blue-200 text-blue-700 font-semibold"
                : "bg-white border-slate-200 text-slate-500"
        }`}>
            {label}{required ? " *" : ""}
        </span>
    );
}

// ─── Step: Select ─────────────────────────────────────────────────────────────

function StepSelect({
    uploadType,
    onTypeChange,
    onFile,
}: {
    uploadType: UploadType;
    onTypeChange: (t: UploadType) => void;
    onFile: (f: File) => void;
}) {
    const fileRef             = useRef<HTMLInputElement>(null);
    const [isDragging, setIs] = useState(false);

    function handleFile(file: File) {
        if (!file.name.endsWith(".csv")) { alert("Please upload a .csv file"); return; }
        onFile(file);
    }

    return (
        <div className="space-y-5">
            {/* Upload type */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Upload Type</p>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(UPLOAD_TYPE_LABELS) as UploadType[]).map(t => (
                        <button key={t} onClick={() => onTypeChange(t)}
                            className={`py-3 px-2 rounded-xl text-sm font-semibold border transition-all ${
                                uploadType === t
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                            }`}>
                            {UPLOAD_TYPE_LABELS[t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Column hints */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CSV Columns</p>
                    <button onClick={() => downloadTemplate(uploadType)}
                        className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1">
                        ↓ Download Template
                    </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {EXPECTED_HEADERS[uploadType].map(h => (
                        <ColPill key={h} label={h} required={REQUIRED_HEADERS[uploadType].includes(h)} />
                    ))}
                </div>
                <p className="text-[10px] text-slate-400">
                    <span className="text-blue-600 font-bold">*</span> Required · others optional
                    {uploadType === "drug_inventory" && <> · category: {DRUG_CATEGORIES_LABEL}</>}
                </p>
            </div>

            {/* Drop zone */}
            <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIs(true); }}
                onDragLeave={() => setIs(false)}
                onDrop={e => { e.preventDefault(); setIs(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                    isDragging
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                }`}>
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors ${
                    isDragging ? "bg-blue-100" : "bg-slate-100"
                }`}>
                    <svg className={`w-6 h-6 ${isDragging ? "text-blue-500" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                    {isDragging ? "Drop your CSV here" : "Click or drag & drop a CSV file"}
                </p>
                <p className="text-xs text-slate-400 mt-1">CSV format · UTF-8 encoded</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
        </div>
    );
}

// ─── Step: Preview ────────────────────────────────────────────────────────────

function StepPreview({
    uploadType,
    fileName,
    headers,
    allRows,
    validationErrors,
    missingColumns,
    existingCount,
    onBack,
    onUpload,
}: {
    uploadType:       UploadType;
    fileName:         string;
    headers:          string[];
    allRows:          Record<string, string>[];
    validationErrors: ValidationError[];
    missingColumns:   string[];
    existingCount:    number;
    onBack:           () => void;
    onUpload:         () => void;
}) {
    const [showAllErrors, setShowAllErrors] = useState(false);
    const PREVIEW_ROWS = 15;
    const preview      = allRows.slice(0, PREVIEW_ROWS);

    const hasBlockers  = missingColumns.length > 0 || validationErrors.length > 0;
    const netRows      = allRows.length - existingCount;

    const displayErrors = showAllErrors ? validationErrors : validationErrors.slice(0, 5);

    return (
        <div className="space-y-4">
            {/* File info bar */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">{fileName}</p>
                        <p className="text-xs text-slate-400">
                            {allRows.length} rows · {headers.length} columns
                            {existingCount > 0 && <span className="text-amber-600 font-semibold"> · {existingCount} already exist (will skip)</span>}
                        </p>
                    </div>
                </div>
                <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600 font-medium">Change file</button>
            </div>

            {/* Missing columns — hard blocker */}
            {missingColumns.length > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
                        ✕ {missingColumns.length} Required Column{missingColumns.length > 1 ? "s" : ""} Missing
                    </p>
                    <p className="text-xs text-red-600 mb-2">
                        These columns were not found in your file. Rename your CSV headers to match:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {missingColumns.map(c => (
                            <span key={c} className="text-xs bg-red-100 border border-red-300 rounded px-2 py-0.5 font-mono font-semibold text-red-700">{c}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Validation errors */}
            {validationErrors.length > 0 && (
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
                    <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-2">
                        ⚠ {validationErrors.length} Validation Error{validationErrors.length > 1 ? "s" : ""}
                    </p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                        {displayErrors.map((e, i) => (
                            <p key={i} className="text-xs text-orange-700">
                                Row {e.row} · <span className="font-mono font-semibold">{e.field}</span>: {e.message}
                            </p>
                        ))}
                    </div>
                    {validationErrors.length > 5 && (
                        <button onClick={() => setShowAllErrors(v => !v)}
                            className="text-xs text-orange-600 font-semibold hover:underline mt-2">
                            {showAllErrors ? "Show less" : `Show all ${validationErrors.length} errors`}
                        </button>
                    )}
                </div>
            )}

            {/* Preview table */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Preview · showing {Math.min(PREVIEW_ROWS, allRows.length)} of {allRows.length} rows
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                            <tr>
                                {headers.map(h => (
                                    <th key={h} className={`px-3 py-2 text-left font-semibold whitespace-nowrap border-b border-slate-100 ${
                                        REQUIRED_HEADERS[uploadType].includes(h) ? "text-blue-600" : "text-slate-500"
                                    }`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {preview.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    {headers.map(h => (
                                        <td key={h} className="px-3 py-2 text-slate-600 max-w-[160px] truncate">
                                            {row[h] || <span className="text-slate-300 italic">—</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload button */}
            <button
                onClick={onUpload}
                disabled={hasBlockers || netRows === 0}
                className="w-full py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors text-white bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed">
                {hasBlockers
                    ? "Fix errors before uploading"
                    : netRows === 0
                        ? "Nothing new to upload — all records already exist"
                        : `Upload ${netRows} ${UPLOAD_TYPE_LABELS[uploadType]}`
                }
            </button>
        </div>
    );
}

// ─── Step: Uploading ──────────────────────────────────────────────────────────

function StepUploading({ current, total, success, failed }: {
    current: number; total: number; success: number; failed: number;
}) {
    return (
        <div className="space-y-5 py-4">
            <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">Uploading records…</p>
                <p className="text-xs text-slate-400 mt-0.5">Do not close this window</p>
            </div>

            <ProgressBar value={current} max={total} />

            {(success > 0 || failed > 0) && (
                <div className="flex gap-3">
                    <div className="flex-1 bg-green-50 rounded-xl p-3 text-center border border-green-100">
                        <p className="text-lg font-bold text-green-700">{success}</p>
                        <p className="text-xs text-green-600">Inserted</p>
                    </div>
                    <div className="flex-1 bg-red-50 rounded-xl p-3 text-center border border-red-100">
                        <p className="text-lg font-bold text-red-600">{failed}</p>
                        <p className="text-xs text-red-500">Failed</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Step: Done ───────────────────────────────────────────────────────────────

function StepDone({
    uploadType,
    result,
    skipped,
    failedRows,
    onReset,
}: {
    uploadType: UploadType;
    result:     { total: number; success: number; failed: number };
    skipped:    number;
    failedRows: FailedRow[];
    onReset:    () => void;
}) {
    const allGood = result.failed === 0;

    return (
        <div className="space-y-5 py-2">
            {/* Header */}
            <div className="text-center">
                <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${allGood ? "bg-green-100" : "bg-amber-100"}`}>
                    <svg className={`w-7 h-7 ${allGood ? "text-green-600" : "text-amber-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {allGood
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        }
                    </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                    {allGood ? "Upload Complete" : "Upload Finished with Errors"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{UPLOAD_TYPE_LABELS[uploadType]}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xl font-bold text-slate-700">{result.total}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Total rows</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                    <p className="text-xl font-bold text-green-700">{result.success}</p>
                    <p className="text-xs text-green-500 mt-0.5">Inserted</p>
                </div>
                <div className={`rounded-xl p-3 border ${result.failed > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
                    <p className={`text-xl font-bold ${result.failed > 0 ? "text-red-600" : "text-slate-400"}`}>{result.failed}</p>
                    <p className={`text-xs mt-0.5 ${result.failed > 0 ? "text-red-400" : "text-slate-400"}`}>Failed</p>
                </div>
            </div>

            {skipped > 0 && (
                <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-xl py-2 border border-amber-100">
                    {skipped} record{skipped > 1 ? "s" : ""} skipped — already existed in the database
                </p>
            )}

            {/* Error report download */}
            {failedRows.length > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 space-y-2">
                    <p className="text-xs font-semibold text-red-700 mb-1">Failed rows:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                        {failedRows.slice(0, 5).map((e, i) => (
                            <p key={i} className="text-xs text-red-600">Row {e.row}: {e.reason}</p>
                        ))}
                        {failedRows.length > 5 && (
                            <p className="text-xs text-red-400 italic">+{failedRows.length - 5} more…</p>
                        )}
                    </div>
                    <button
                        onClick={() => downloadErrorReport(failedRows, `${uploadType}_upload_errors.csv`)}
                        className="w-full py-2 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                        ↓ Download Error Report CSV
                    </button>
                </div>
            )}

            {/* Upload another */}
            <button onClick={onReset}
                className="w-full py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                Upload Another {UPLOAD_TYPE_LABELS[uploadType]} File
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BulkUploadComponent() {
    const [step,             setStep]             = useState<Step>("select");
    const [uploadType,       setUploadType]       = useState<UploadType>("patients");
    const [fileName,         setFileName]         = useState("");
    const [headers,          setHeaders]          = useState<string[]>([]);
    const [allRows,          setAllRows]          = useState<Record<string, string>[]>([]);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [missingColumns,   setMissingColumns]   = useState<string[]>([]);
    const [existingCount,    setExistingCount]    = useState(0);
    const [progress,         setProgress]         = useState({ current: 0, total: 0, success: 0, failed: 0 });
    const [failedRows,       setFailedRows]       = useState<FailedRow[]>([]);
    const [result,           setResult]           = useState<{ total: number; success: number; failed: number } | null>(null);
    const [skipped,          setSkipped]          = useState(0);

    // ── File handler ────────────────────────────────────────────────────────────

    async function handleFile(file: File) {
        const text     = await file.text();
        const { headers: rawHeaders, rows } = parseCSV(text);

        // Normalise headers
        const headers  = rawHeaders.map(h => h.toLowerCase().trim().replace(/\s+/g, "_"));

        // Missing column detection
        const missing  = REQUIRED_HEADERS[uploadType].filter(h => !headers.includes(h));
        const errors   = missing.length === 0 ? validateRows(rows, uploadType) : [];

        setFileName(file.name);
        setHeaders(headers);
        setAllRows(rows);
        setMissingColumns(missing);
        setValidationErrors(errors);
        setExistingCount(0); // reset — will check below
        setStep("preview");

        // Async duplicate check
        if (missing.length === 0 && rows.length > 0) {
            const key    = DUPE_KEY[uploadType];
            const values = rows.map(r => r[key]).filter(Boolean);
            if (values.length > 0) {
                const existing = await checkExistingRecords(uploadType, values);
                setExistingCount(existing.length);
            }
        }
    }

    // ── Upload handler ──────────────────────────────────────────────────────────

    async function handleUpload() {
        setStep("uploading");
        setProgress({ current: 0, total: allRows.length, success: 0, failed: 0 });

        // Pre-filter duplicates
        const key       = DUPE_KEY[uploadType];
        const values    = allRows.map(r => r[key]).filter(Boolean);
        const existing  = values.length > 0 ? await checkExistingRecords(uploadType, values) : [];
        const existSet  = new Set(existing.map(v => v.toLowerCase().trim()));
        const uploadRows = allRows.filter(r => !existSet.has((r[key] ?? "").toLowerCase().trim()));
        const skippedN  = allRows.length - uploadRows.length;

        setSkipped(skippedN);
        setProgress(p => ({ ...p, total: uploadRows.length }));

        let totalSuccess = 0;
        let totalFailed  = 0;
        const allErrors: FailedRow[] = [];

        for (let i = 0; i < uploadRows.length; i += CHUNK_SIZE) {
            const chunk = uploadRows.slice(i, i + CHUNK_SIZE);
            const res   = await bulkUploadChunk(uploadType, chunk, i);

            totalSuccess += res.success;
            totalFailed  += res.failed;
            allErrors.push(...res.errors);

            setProgress({ current: i + chunk.length, total: uploadRows.length, success: totalSuccess, failed: totalFailed });
        }

        setFailedRows(allErrors);
        setResult({ total: uploadRows.length, success: totalSuccess, failed: totalFailed });
        setStep("done");
    }

    // ── Reset — preserves upload type ───────────────────────────────────────────

    function handleReset() {
        setStep("select");
        setFileName("");
        setHeaders([]);
        setAllRows([]);
        setValidationErrors([]);
        setMissingColumns([]);
        setExistingCount(0);
        setProgress({ current: 0, total: 0, success: 0, failed: 0 });
        setFailedRows([]);
        setResult(null);
        setSkipped(0);
        // uploadType intentionally NOT reset
    }

    // ── Progress steps indicator ─────────────────────────────────────────────

    const STEPS = [
        { key: "select",    label: "Select File" },
        { key: "preview",   label: "Review" },
        { key: "uploading", label: "Upload" },
        { key: "done",      label: "Complete" },
    ] as const;

    const stepIdx = STEPS.findIndex(s => s.key === step);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Progress header */}
            <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s.key}>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                    i < stepIdx  ? "bg-blue-600 text-white" :
                                    i === stepIdx ? "bg-blue-100 text-blue-700 ring-2 ring-blue-400" :
                                    "bg-slate-100 text-slate-400"
                                }`}>
                                    {i < stepIdx ? "✓" : i + 1}
                                </span>
                                <span className={`text-xs font-semibold hidden sm:inline ${i === stepIdx ? "text-blue-700" : "text-slate-400"}`}>
                                    {s.label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-px ${i < stepIdx ? "bg-blue-400" : "bg-slate-200"}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="px-6 py-5">
                {step === "select" && (
                    <StepSelect
                        uploadType={uploadType}
                        onTypeChange={t => { setUploadType(t); handleReset(); setUploadType(t); }}
                        onFile={handleFile}
                    />
                )}
                {step === "preview" && (
                    <StepPreview
                        uploadType={uploadType}
                        fileName={fileName}
                        headers={headers}
                        allRows={allRows}
                        validationErrors={validationErrors}
                        missingColumns={missingColumns}
                        existingCount={existingCount}
                        onBack={handleReset}
                        onUpload={handleUpload}
                    />
                )}
                {step === "uploading" && (
                    <StepUploading {...progress} />
                )}
                {step === "done" && result && (
                    <StepDone
                        uploadType={uploadType}
                        result={result}
                        skipped={skipped}
                        failedRows={failedRows}
                        onReset={handleReset}
                    />
                )}
            </div>
        </div>
    );
}