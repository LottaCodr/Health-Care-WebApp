"use client";

import { useState } from "react";
import { X, ZoomIn, ZoomOut, Maximize2, ImageOff } from "lucide-react";
import { usePatientDocuments } from "@/hooks/emr/use-patient-document";
import { Button } from "@/components/ui/button";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/dicom", "application/dicom"];

/**
 * Imaging viewer — a lightweight study browser + lightbox for images attached
 * to the patient record (X-ray / ultrasound photos, scanned films). Full PACS
 * / DICOM tooling would plug in here (the viewer boundary is this component).
 */
export default function ImagingViewer({ patientId }: { patientId: string }) {
    const { data: documents = [] } = usePatientDocuments(patientId);
    const images = (documents as any[]).filter(
        (d) => IMAGE_TYPES.includes(d.file_type) || /\.(png|jpe?g|webp|gif)$/i.test(d.file_name ?? "")
    );

    const [active, setActive] = useState<any | null>(null);
    const [zoom, setZoom] = useState(1);

    return (
        <div className="space-y-4">
            {images.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
                    <ImageOff size={28} className="text-gray-300" />
                    <p className="text-sm font-bold text-gray-700">No imaging studies attached</p>
                    <p className="max-w-md text-xs text-gray-400">
                        Upload films, X-ray photos or ultrasound images on the <b>Documents</b> tab — they appear here as a study browser with a zoomable viewer.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {images.map((img) => (
                        <button key={img.id} onClick={() => { setActive(img); setZoom(1); }}
                            className="group overflow-hidden rounded-xl border border-gray-100 bg-white text-left shadow-sm transition hover:border-gray-300">
                            <div className="flex h-36 items-center justify-center overflow-hidden bg-black/90">
                                <img src={img.signed_url ?? undefined} alt={img.file_name}
                                    className="h-full w-full object-contain transition group-hover:scale-105" />
                            </div>
                            <div className="px-3 py-2">
                                <p className="truncate text-xs font-bold text-gray-800">{img.file_name}</p>
                                <p className="text-[10px] text-gray-400">
                                    {img.document_type ?? "Image"} · {img.description ?? new Date(img.created_at ?? "").toLocaleDateString("en-GB")}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {active && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setActive(null)}>
                    <div className="flex items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <p className="truncate text-sm font-semibold text-white">{active.file_name}</p>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
                                <ZoomOut size={16} />
                            </Button>
                            <span className="w-12 text-center text-xs text-white/70">{Math.round(zoom * 100)}%</span>
                            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.min(5, z + 0.25))}>
                                <ZoomIn size={16} />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setZoom(1)}>
                                <Maximize2 size={16} />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setActive(null)}>
                                <X size={18} />
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-1 items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={active.signed_url ?? undefined}
                            alt={active.file_name}
                            className="max-h-full max-w-full select-none transition-transform duration-150"
                            style={{ transform: `scale(${zoom})` }}
                            draggable={false}
                        />
                    </div>
                    <p className="pb-4 text-center text-[11px] text-white/50">
                        Study viewer (photos/scans). DICOM/PACS integration point — attach a proper DICOM viewer here.
                    </p>
                </div>
            )}
        </div>
    );
}
