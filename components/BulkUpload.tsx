"use client";

import React, { useState, useRef } from "react";
import { checkExistingRecords, bulkUploadChunk } from "@/lib/actions/bulk-upload";
import type { UploadType } from "@/lib/actions/bulk-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  Pill,
  FlaskConical,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Config ────────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 25;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const UPLOAD_TYPE_CONFIG: Record<UploadType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
  buttonText: string;
}> = {
  patients: {
    label: "Patients",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Register multiple patients at once",
    buttonText: "Import Patients",
  },
  drug_inventory: {
    label: "Pharmacy Drugs",
    icon: Pill,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    description: "Bulk add or update drug catalog",
    buttonText: "Import Drugs",
  },
  lab_test_catalog: {
    label: "Lab Tests",
    icon: FlaskConical,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    description: "Bulk add lab test catalog items",
    buttonText: "Import Tests",
  },
};

const EXPECTED_HEADERS: Record<UploadType, string[]> = {
  patients: [
    "name",
    "date_of_birth",
    "gender",
    "phone",
    "address",
    "blood_group",
    "genotype",
    "next_of_kin_name",
    "next_of_kin_phone",
  ],
  drug_inventory: [
    "drug_name",
    "generic_name",
    "category",
    "unit",
    "reorder_level",
    "price",
    "is_active",
  ],
  lab_test_catalog: [
    "test_name",
    "test_code",
    "category",
    "normal_range",
    "unit",
    "price",
  ],
};

const REQUIRED_HEADERS: Record<UploadType, string[]> = {
  patients: ["name", "date_of_birth", "gender", "phone"],
  drug_inventory: [
    "drug_name",
    "generic_name",
    "category",
    "unit",
    "reorder_level",
    "price",
    "is_active",
  ],
  lab_test_catalog: ["test_name", "test_code"],
};

const VALID_DRUG_CATEGORIES = [
  "TABLET",
  "INJECTION",
  "SYRUP",
  "TOPICAL",
  "CONSUMABLE",
];

const TEMPLATE_EXAMPLE: Record<UploadType, string> = {
  patients: "Jane Doe,1990-06-15,female,+2348012345678,12 Aso Drive Abuja,A+,AA,John Doe,+2348098765432",
  drug_inventory: "Amoxicillin 500mg,Amoxicillin,TABLET,Pack,5,0,ACTIVE",
  lab_test_catalog: "Full Blood Count (FBC),T1,Haematology,,,0",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "select" | "preview" | "uploading" | "done";

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface FailedRow {
  row: number;
  reason: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split("\n").filter(Boolean);
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const rows = lines.slice(1).map((line) => {
    const vals: string[] = [];
    let cur = "";
    let inQ = false;
    for (const ch of line + ",") {
      if (ch === '"') {
        inQ = !inQ;
      } else if (ch === "," && !inQ) {
        vals.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
  return { headers, rows };
}

function validateRows(
  rows: Record<string, string>[],
  type: UploadType
): ValidationError[] {
  const errors: ValidationError[] = [];
  rows.forEach((row, i) => {
    REQUIRED_HEADERS[type].forEach((field) => {
      if (!row[field]?.trim()) {
        errors.push({ row: i + 2, field, message: `"${field}" is required` });
      }
    });
    if (type === "patients") {
      if (row.gender && !["male", "female"].includes(row.gender.toLowerCase())) {
        errors.push({
          row: i + 2,
          field: "gender",
          message: 'Must be "male" or "female"',
        });
      }
      if (row.date_of_birth && isNaN(Date.parse(row.date_of_birth))) {
        errors.push({
          row: i + 2,
          field: "date_of_birth",
          message: "Invalid date — use YYYY-MM-DD",
        });
      }
    }
    if (type === "drug_inventory") {
      if (
        row.category &&
        !VALID_DRUG_CATEGORIES.includes(row.category.toUpperCase())
      ) {
        errors.push({
          row: i + 2,
          field: "category",
          message: `Must be one of: ${VALID_DRUG_CATEGORIES.join(", ")}`,
        });
      }
      if (row.price && isNaN(Number(row.price))) {
        errors.push({ row: i + 2, field: "price", message: "Must be a number" });
      }
      if (row.reorder_level && isNaN(Number(row.reorder_level))) {
        errors.push({
          row: i + 2,
          field: "reorder_level",
          message: "Must be a number",
        });
      }
      if (row.is_active && !["TRUE", "FALSE", "ACTIVE", "INACTIVE"].includes(row.is_active.toUpperCase())) {
        errors.push({
          row: i + 2,
          field: "is_active",
          message: 'Must be "TRUE"/"FALSE" or "ACTIVE"/"INACTIVE"',
        });
      }
    }
    if (type === "lab_test_catalog" && row.price && isNaN(Number(row.price))) {
      errors.push({ row: i + 2, field: "price", message: "Must be a number" });
    }
  });
  return errors;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate(type: UploadType) {
  const header = EXPECTED_HEADERS[type].join(",");
  const example = TEMPLATE_EXAMPLE[type];
  downloadCSV(`${header}\n${example}`, `${type}_template.csv`);
}

function downloadErrorReport(errors: FailedRow[], filename: string) {
  const csv = "Row,Reason\n" + errors.map((e) => `${e.row},"${e.reason.replace(/"/g, '""')}"`).join("\n");
  downloadCSV(csv, filename);
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { key: "select" as Step, label: "Select File" },
    { key: "preview" as Step, label: "Review" },
    { key: "uploading" as Step, label: "Upload" },
    { key: "done" as Step, label: "Complete" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                idx < currentIdx
                  ? "bg-primary text-primary-foreground"
                  : idx === currentIdx
                  ? "bg-primary/10 text-primary ring-2 ring-primary/20"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              {idx < currentIdx ? (
                <CheckCircle2 size={14} />
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={cn(
                "text-xs font-semibold hidden sm:inline",
                idx === currentIdx ? "text-primary" : "text-gray-400"
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-px mx-2",
                idx < currentIdx ? "bg-primary/30" : "bg-gray-200"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = UPLOAD_TYPE_CONFIG[uploadType];

  function handleFile(file: File) {
    setError(null);
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }
    onFile(file);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload type selector */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
          What would you like to import?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(UPLOAD_TYPE_CONFIG) as UploadType[]).map((t) => {
            const cfg = UPLOAD_TYPE_CONFIG[t];
            const Icon = cfg.icon;
            const isSelected = uploadType === t;
            return (
              <button
                key={t}
                onClick={() => onTypeChange(t)}
                className={cn(
                  "relative p-4 rounded-2xl border-2 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                    isSelected ? cfg.bgColor : "bg-gray-50"
                  )}
                >
                  <Icon
                    size={20}
                    className={cn(
                      "transition-colors",
                      isSelected ? cfg.color : "text-gray-400"
                    )}
                  />
                </div>
                <p
                  className={cn(
                    "text-sm font-bold transition-colors",
                    isSelected ? "text-gray-900" : "text-gray-600"
                  )}
                >
                  {cfg.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{cfg.description}</p>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <ArrowRight size={12} className="text-primary-foreground rotate-90" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Column hints */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            CSV Columns Required
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadTemplate(uploadType)}
            className="text-xs h-7 px-2"
          >
            <Download size={12} className="mr-1" />
            Download Template
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXPECTED_HEADERS[uploadType].map((h) => (
            <span
              key={h}
              className={cn(
                "text-xs rounded px-2 py-0.5 font-mono border",
                REQUIRED_HEADERS[uploadType].includes(h)
                  ? "bg-primary/10 border-primary/20 text-primary font-semibold"
                  : "bg-white border-gray-200 text-gray-500"
              )}
            >
              {h}
              {REQUIRED_HEADERS[uploadType].includes(h) ? " *" : ""}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          <span className="text-primary font-bold">*</span> Required columns · Others optional
          {uploadType === "drug_inventory" && (
            <> · category: {VALID_DRUG_CATEGORIES.join(", ")}</>
          )}
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
        )}
      >
        <div
          className={cn(
            "w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors",
            isDragging ? "bg-primary/10" : "bg-gray-100"
          )}
        >
          <Upload
            size={28}
            className={cn(
              "transition-colors",
              isDragging ? "text-primary" : "text-gray-400"
            )}
          />
        </div>
        <p className="text-sm font-semibold text-gray-700">
          {isDragging ? "Drop your CSV file here" : "Click or drag & drop a CSV file"}
        </p>
        <p className="text-xs text-gray-400 mt-1">CSV format · UTF-8 encoded · Max {MAX_FILE_SIZE / 1024 / 1024}MB</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
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
  uploadType: UploadType;
  fileName: string;
  headers: string[];
  allRows: Record<string, string>[];
  validationErrors: ValidationError[];
  missingColumns: string[];
  existingCount: number;
  onBack: () => void;
  onUpload: () => void;
}) {
  const [showAllErrors, setShowAllErrors] = useState(false);
  const PREVIEW_ROWS = 10;
  const preview = allRows.slice(0, PREVIEW_ROWS);
  const config = UPLOAD_TYPE_CONFIG[uploadType];
  const hasBlockers = missingColumns.length > 0 || validationErrors.length > 0;
  const netRows = allRows.length - existingCount;

  const displayErrors = showAllErrors ? validationErrors : validationErrors.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* File info bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{fileName}</p>
            <p className="text-xs text-gray-400">
              {allRows.length} rows · {headers.length} columns
              {existingCount > 0 && (
                <span className="text-amber-600 font-semibold">
                  · {existingCount} already exist (will skip)
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center gap-1"
        >
          <X size={12} />
          Change file
        </button>
      </div>

      {/* Missing columns — hard blocker */}
      {missingColumns.length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
            <AlertTriangle size={12} className="inline mr-1" />
            {missingColumns.length} Required Column{missingColumns.length > 1 ? "s" : ""} Missing
          </p>
          <p className="text-xs text-red-600 mb-2">
            These columns were not found in your file. Rename your CSV headers to match:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingColumns.map((c) => (
              <span
                key={c}
                className="text-xs bg-red-100 border border-red-300 rounded px-2 py-0.5 font-mono font-semibold text-red-700"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
            <AlertTriangle size={12} className="inline mr-1" />
            {validationErrors.length} Validation Error{validationErrors.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {displayErrors.map((e, i) => (
              <p key={i} className="text-xs text-amber-700">
                Row {e.row} · <span className="font-mono font-semibold">{e.field}</span>: {e.message}
              </p>
            ))}
          </div>
          {validationErrors.length > 5 && (
            <button
              onClick={() => setShowAllErrors((v) => !v)}
              className="text-xs text-amber-600 font-semibold hover:underline mt-2"
            >
              {showAllErrors ? "Show less" : `Show all ${validationErrors.length} errors`}
            </button>
          )}
        </div>
      )}

      {/* Preview table */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Preview · showing {Math.min(PREVIEW_ROWS, allRows.length)} of {allRows.length} rows
        </p>
        <div className="overflow-x-auto rounded-2xl border border-gray-100 max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-3 py-2.5 text-left font-semibold whitespace-nowrap border-b border-gray-100",
                      REQUIRED_HEADERS[uploadType].includes(h)
                        ? "text-primary"
                        : "text-gray-500"
                    )}
                  >
                    {h}
                    {REQUIRED_HEADERS[uploadType].includes(h) && (
                      <span className="text-[9px] text-primary/60 ml-0.5">*</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-2 text-gray-600 max-w-[160px] truncate">
                      {row[h] || <span className="text-gray-300 italic">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload button */}
      <Button
        onClick={onUpload}
        disabled={hasBlockers || netRows === 0}
        className="w-full h-11 text-sm"
      >
        {hasBlockers ? (
          "Fix errors before uploading"
        ) : netRows === 0 ? (
          "Nothing new to upload — all records already exist"
        ) : (
          <>
            Upload {netRows} {config.label}
            <ArrowRight size={14} className="ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Step: Uploading ──────────────────────────────────────────────────────────

function StepUploading({
  current,
  total,
  success,
  failed,
}: {
  current: number;
  total: number;
  success: number;
  failed: number;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Loader2 size={28} className="text-primary animate-spin" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Uploading records…</h3>
        <p className="text-xs text-gray-400 mt-1">Please wait, this may take a moment</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{current} / {total} rows</span>
          <span>{pct}% complete</span>
        </div>
      </div>

      {/* Stats */}
      {(success > 0 || failed > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-100">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{success}</p>
              <p className="text-xs text-green-600">Inserted</p>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-2xl border",
              failed > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                failed > 0 ? "bg-red-100" : "bg-gray-100"
              )}
            >
              <AlertTriangle
                size={20}
                className={failed > 0 ? "text-red-600" : "text-gray-400"}
              />
            </div>
            <div>
              <p
                className={cn(
                  "text-2xl font-bold",
                  failed > 0 ? "text-red-600" : "text-gray-400"
                )}
              >
                {failed}
              </p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
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
  result: { total: number; success: number; failed: number };
  skipped: number;
  failedRows: FailedRow[];
  onReset: () => void;
}) {
  const allGood = result.failed === 0;
  const config = UPLOAD_TYPE_CONFIG[uploadType];

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="text-center">
        <div
          className={cn(
            "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center",
            allGood ? "bg-green-100" : "bg-amber-100"
          )}
        >
          {allGood ? (
            <CheckCircle2 size={32} className="text-green-600" />
          ) : (
            <AlertTriangle size={32} className="text-amber-600" />
          )}
        </div>
        <h3 className="text-lg font-bold text-gray-900">
          {allGood ? "Upload Complete!" : "Upload Finished with Errors"}
        </h3>
        <p className="text-sm text-gray-400 mt-1">{config.label} import</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-700">{result.total}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total rows</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-center">
          <p className="text-2xl font-bold text-green-700">{result.success}</p>
          <p className="text-xs text-green-500 mt-0.5">Inserted</p>
        </div>
        <div
          className={cn(
            "rounded-2xl p-4 border text-center",
            result.failed > 0
              ? "bg-red-50 border-red-100"
              : "bg-gray-50 border-gray-100"
          )}
        >
          <p
            className={cn(
              "text-2xl font-bold",
              result.failed > 0 ? "text-red-600" : "text-gray-400"
            )}
          >
            {result.failed}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Failed</p>
        </div>
      </div>

      {/* Skipped message */}
      {skipped > 0 && (
        <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100">
          <AlertTriangle size={14} className="text-amber-600" />
          <p className="text-xs text-amber-700">
            {skipped} record{skipped > 1 ? "s" : ""} skipped — already existed in the database
          </p>
        </div>
      )}

      {/* Error report */}
      {failedRows.length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-red-700">Failed rows:</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {failedRows.slice(0, 5).map((e, i) => (
              <p key={i} className="text-xs text-red-600">
                Row {e.row}: {e.reason}
              </p>
            ))}
            {failedRows.length > 5 && (
              <p className="text-xs text-red-400 italic">
                +{failedRows.length - 5} more…
              </p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => downloadErrorReport(failedRows, `${uploadType}_upload_errors.csv`)}
            className="w-full h-9 text-xs"
          >
            <Download size={12} className="mr-1" />
            Download Error Report CSV
          </Button>
        </div>
      )}

      {/* Upload another */}
      <Button
        onClick={onReset}
        className="w-full h-11"
      >
        <Upload size={14} className="mr-2" />
        Upload Another {config.label} File
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadType: UploadType;
  onTypeChange?: (type: UploadType) => void;
  title?: string;
}

export default function BulkUploadDialog({
  open,
  onOpenChange,
  uploadType,
  onTypeChange,
  title,
}: BulkUploadDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
  });
  const [failedRows, setFailedRows] = useState<FailedRow[]>([]);
  const [result, setResult] =
    useState<{ total: number; success: number; failed: number } | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [localUploadType, setLocalUploadType] = useState<UploadType>(uploadType);

  // Sync external uploadType changes
  React.useEffect(() => {
    setLocalUploadType(uploadType);
  }, [uploadType]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      handleReset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── File handler ────────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    const text = await file.text();
    const { headers: rawHeaders, rows } = parseCSV(text);

    const normalizedHeaders = rawHeaders.map((h) =>
      h.toLowerCase().trim().replace(/\s+/g, "_")
    );

    const missing = REQUIRED_HEADERS[localUploadType].filter(
      (h) => !normalizedHeaders.includes(h)
    );
    const errors =
      missing.length === 0 ? validateRows(rows, localUploadType) : [];

    setFileName(file.name);
    setHeaders(normalizedHeaders);
    setAllRows(rows);
    setMissingColumns(missing);
    setValidationErrors(errors);
    setExistingCount(0);
    setStep("preview");

    // Async duplicate check
    if (missing.length === 0 && rows.length > 0) {
      const key = localUploadType === "patients" ? "phone" : localUploadType === "drug_inventory" ? "drug_name" : "test_code";
      const values = rows.map((r) => r[key]).filter(Boolean);
      if (values.length > 0) {
        const existing = await checkExistingRecords(localUploadType, values);
        setExistingCount(existing.length);
      }
    }
  }

  // ── Upload handler ──────────────────────────────────────────────────────────

  async function handleUpload() {
    setStep("uploading");
    setProgress({ current: 0, total: allRows.length, success: 0, failed: 0 });

    const key =
      localUploadType === "patients"
        ? "phone"
        : localUploadType === "drug_inventory"
        ? "drug_name"
        : "test_code";

    const values = allRows.map((r) => r[key]).filter(Boolean);
    const existing = values.length > 0 ? await checkExistingRecords(localUploadType, values) : [];
    const existSet = new Set(existing.map((v) => v.toLowerCase().trim()));
    const uploadRows = allRows.filter(
      (r) => !existSet.has((r[key] ?? "").toLowerCase().trim())
    );
    const skippedN = allRows.length - uploadRows.length;

    setSkipped(skippedN);
    setProgress((p) => ({ ...p, total: uploadRows.length }));

    let totalSuccess = 0;
    let totalFailed = 0;
    const allErrors: FailedRow[] = [];

    for (let i = 0; i < uploadRows.length; i += CHUNK_SIZE) {
      const chunk = uploadRows.slice(i, i + CHUNK_SIZE);
      const res = await bulkUploadChunk(localUploadType, chunk, i);

      totalSuccess += res.success;
      totalFailed += res.failed;
      allErrors.push(...res.errors);

      setProgress({
        current: i + chunk.length,
        total: uploadRows.length,
        success: totalSuccess,
        failed: totalFailed,
      });
    }

    setFailedRows(allErrors);
    setResult({ total: uploadRows.length, success: totalSuccess, failed: totalFailed });
    setStep("done");
  }

  // ── Reset ───────────────────────────────────────────────────────────────────

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
  }

  const config = UPLOAD_TYPE_CONFIG[localUploadType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center",
                config.bgColor
              )}
            >
              <config.icon size={16} className={config.color} />
            </div>
            {title || `Bulk ${config.label} Import`}
          </DialogTitle>
        </DialogHeader>

        <div className="px-1 pb-1">
          <StepIndicator currentStep={step} />

          {step === "select" && (
            <StepSelect
              uploadType={localUploadType}
              onTypeChange={(t) => {
                setLocalUploadType(t);
                handleReset();
                onTypeChange && onTypeChange(t);
              }}
              onFile={handleFile}
            />
          )}

          {step === "preview" && (
            <StepPreview
              uploadType={localUploadType}
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
              uploadType={localUploadType}
              result={result}
              skipped={skipped}
              failedRows={failedRows}
              onReset={handleReset}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
