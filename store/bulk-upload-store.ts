import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type UploadType = "patients" | "drugs" | "lab_tests";

export interface UploadError { row: number; field: string; message: string; }

export interface BulkUploadState {
    uploadType:    UploadType;
    file:          File | null;
    fileName:      string;
    headers:       string[];
    preview:       Record<string, string>[];   // first 5 rows
    errors:        UploadError[];
    uploading:     boolean;
    result:        { total: number; success: number; failed: number } | null;
    step:          "select" | "preview" | "done";
}

export interface BulkUploadActions {
    setUploadType: (t: UploadType) => void;
    setFile:       (file: File, headers: string[], preview: Record<string, string>[]) => void;
    setErrors:     (errors: UploadError[]) => void;
    setUploading:  (v: boolean) => void;
    setResult:     (r: BulkUploadState["result"]) => void;
    setStep:       (s: BulkUploadState["step"]) => void;
    reset:         () => void;
}

const initial: BulkUploadState = {
    uploadType: "patients",
    file:       null,
    fileName:   "",
    headers:    [],
    preview:    [],
    errors:     [],
    uploading:  false,
    result:     null,
    step:       "select",
};

export const useBulkUploadStore = create<BulkUploadState & BulkUploadActions>()(
    devtools(
        (set) => ({
            ...initial,
            setUploadType: (uploadType) => set({ uploadType }),
            setFile:       (file, headers, preview) =>
                set({ file, fileName: file.name, headers, preview, step: "preview", errors: [] }),
            setErrors:     (errors) => set({ errors }),
            setUploading:  (uploading) => set({ uploading }),
            setResult:     (result) => set({ result, step: "done", uploading: false }),
            setStep:       (step) => set({ step }),
            reset:         () => set({ ...initial }),
        }),
        { name: "bulk-upload-store" }
    )
);