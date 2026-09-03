"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";

import {
    History, ChevronLeft, ChevronRight, CalendarDays,
    Stethoscope, ClipboardList, Pill, ArrowRight,
    Trash2, CheckCircle2, Loader2, AlertTriangle,
    RefreshCcw, Lock, Eye, EyeOff, Baby, Heart, Brain,
    Activity, ChevronDown, LayoutGrid, GalleryHorizontal, Sparkles,
    Search, Table2, UserRound, X,
} from "lucide-react";
import { deleteConsultation, listConsultationsByPatient } from "@/lib/services";

type AccessLevel = "full" | "nursing" | "lab" | "radiology" | "pharmacy" | "admin" | "minimal";
type ViewMode = "results" | "cards" | "timeline";

function getAccessLevel(role?: string): AccessLevel {
    switch (role) {
        case "Doctor": return "full";
        case "Admin": return "full";
        case "Nurse": return "nursing";
        case "Labtech": return "lab";
        case "Radiologist": return "radiology";
        case "Pharmacist": return "pharmacy";
        default: return "minimal";
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getId(c: any): string { return c.id ?? c.$id ?? ""; }
function getDate(c: any): Date {
    const raw = c.created_at ?? c.consultation_date ?? c.consultationDate;
    return raw ? new Date(raw) : new Date();
}
function fmt(d: Date) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(d: Date) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function relativeDay(d: Date) {
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return null;
}

function extractSection(text: string, label: string): string {
    if (!text) return "";
    const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z]|$)`, "i");
    const match = text.match(regex);
    return match?.[1]?.trim() ?? "";
}

function getDoctorName(c: any): string {
    return (c as any).staffs?.name ?? (c as any).doctor_name ?? "";
}

/** True when the consultation's history contains obstetric data — either an
 *  LMP or an explicit pregnancy status (recorded even when LMP is absent). */
function hasObstetricHistory(symptoms?: string): boolean {
    const s = symptoms ?? "";
    return s.includes("LMP:") || s.includes("Pregnancy Status:");
}

function getComplaint(c: any): string {
    return extractSection(c.symptoms ?? "", "Presenting Complaint") ||
        (c.symptoms ?? "").split("\n\n")[0]?.replace("Presenting Complaint:", "").trim() ||
        "";
}

function getAssessment(c: any): string {
    return extractSection(c.recommendations ?? "", "Assessment") ||
        extractSection(c.diagnosis ?? "", "Summary") ||
        (c.diagnosis ?? "").split("\n\n")[0]?.replace("General Examination:", "").trim().slice(0, 120) ||
        "";
}

/** Role-relevant fields visible to non-doctor staff (shared by cards + results views). */
function getVisibleFields(consultation: any, accessLevel: AccessLevel) {
    const date = getDate(consultation);
    const symptoms = consultation.symptoms ?? "";
    const recommendations = consultation.recommendations ?? "";
    const doctor = getDoctorName(consultation);
    const base = [
        { label: "Date", value: `${fmt(date)} · ${fmtTime(date)}` },
        { label: "Doctor", value: doctor },
    ];
    switch (accessLevel) {
        case "nursing":
            return [
                ...base,
                { label: "Referred To", value: consultation.referred_to },
                { label: "Status", value: consultation.status },
                { label: "Recommendations", value: extractSection(recommendations, "Recommendations") || consultation.recommendations?.slice(0, 200) },
            ];
        case "lab":
            return [
                ...base,
                { label: "Test Requested", value: extractSection(symptoms, "Investigations") || "See lab request" },
                { label: "Clinical Notes", value: extractSection(recommendations, "Investigations") },
                { label: "Referred To", value: consultation.referred_to },
            ];
        case "radiology":
            return [
                ...base,
                { label: "Investigation", value: extractSection(symptoms, "Investigations") || "See radiology request" },
                { label: "Clinical Indication", value: extractSection(recommendations, "Investigations") },
                { label: "Referred To", value: consultation.referred_to },
            ];
        case "pharmacy":
            return [
                ...base,
                { label: "Prescriptions", value: consultation.prescriptions },
                { label: "Drug Allergies", value: extractSection(symptoms, "Drug History") },
                { label: "Referred To", value: consultation.referred_to },
            ];
        default:
            return [
                ...base,
                { label: "Status", value: consultation.status },
                { label: "Referred To", value: consultation.referred_to },
            ];
    }
}

// ─── Role access banner ────────────────────────────────────────────────────────

function AccessBanner({ level }: { level: AccessLevel }) {
    if (level === "full") return null;

    const messages: Record<string, string> = {
        nursing: "You can see routing and care-relevant information. Full clinical notes are restricted.",
        lab: "You can see test requests and clinical indications relevant to your investigations.",
        radiology: "You can see imaging requests and clinical indications relevant to your reports.",
        pharmacy: "You can see prescription and medication-relevant information.",
        minimal: "Limited consultation information is visible to your role.",
    };

    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl mb-4">
            <Lock size={13} className="text-amber-600 shrink-0" />
            <p className="text-xs font-medium text-amber-700">
                <span className="font-bold">Confidentiality: </span>{messages[level]}
            </p>
        </div>
    );
}

// ─── Latest badge ──────────────────────────────────────────────────────────────

function LatestBadge() {
    return (
        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm">
            <Sparkles size={9} /> Latest
        </span>
    );
}

// ─── Doctor full card ──────────────────────────────────────────────────────────

function DoctorConsultationCard({
    consultation, index, isLatest, isDeleting, onDelete, canDel, fullWidth,
}: {
    consultation: any; index: number; isLatest: boolean;
    isDeleting: boolean; onDelete: () => void; canDel: boolean; fullWidth?: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const date = getDate(consultation);
    const rel = relativeDay(date);
    const isPaed = consultation.consultation_type === "paediatric" ||
                    (consultation.symptoms ?? "").includes("Antenatal/Delivery History");
    const isFem = hasObstetricHistory(consultation.symptoms);

    const symptoms = consultation.symptoms ?? "";
    const diagnosis = consultation.diagnosis ?? "";
    const recommendations = consultation.recommendations ?? "";
    const prescriptions = consultation.prescriptions ?? "";
    const doctor = getDoctorName(consultation);

    const presentingComplaint = getComplaint(consultation);
    const assessment = getAssessment(consultation);

    return (
        <div className={`${fullWidth ? "w-full" : "min-w-[340px] max-w-[340px] flex-shrink-0 snap-start"} bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
            isLatest ? "border-red-200 ring-1 ring-red-100" : "border-gray-100 hover:border-red-100"
        }`}>
            <div className="flex items-center gap-0 h-1">
                <div className="flex-1 h-full bg-red-600" />
                {isPaed && <div className="w-8 h-full bg-blue-500" />}
                {isFem && <div className="w-8 h-full bg-pink-400" />}
            </div>

            <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <CalendarDays size={13} className="text-red-500 shrink-0" />
                            <span className="text-sm font-bold text-gray-800">{fmt(date)}</span>
                            <CheckCircle2 size={13} className="text-green-500" />
                            {isLatest && <LatestBadge />}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 pl-5">
                            {fmtTime(date)}{rel && <span className="text-gray-300"> · {rel}</span>}
                        </p>
                        {doctor && (
                            <p className="flex items-center gap-1 text-xs text-gray-500 mt-1 pl-5">
                                <UserRound size={11} className="text-gray-400" /> Dr. {doctor}
                            </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {isPaed && (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                    <Baby size={9} /> Paediatric
                                </span>
                            )}
                            {isFem && (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100">
                                    <Heart size={9} /> Obstetric
                                </span>
                            )}
                        </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-300 tracking-widest">#{String(index + 1).padStart(2, "0")}</span>
                </div>

                <div className="border-t border-gray-50" />

                <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Stethoscope size={10} className="text-red-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Presenting Complaint</p>
                        <p className="text-xs text-gray-700 font-medium mt-0.5 line-clamp-2 leading-relaxed">
                            {presentingComplaint || <span className="italic text-gray-300">Not provided</span>}
                        </p>
                    </div>
                </div>

                {assessment && (
                    <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Brain size={10} className="text-amber-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Assessment</p>
                            <p className="text-xs text-gray-700 font-medium mt-0.5 line-clamp-2 leading-relaxed">
                                {assessment}
                            </p>
                        </div>
                    </div>
                )}

                {consultation.referred_to && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
                        <ArrowRight size={11} className="text-blue-500 shrink-0" />
                        <p className="text-xs text-blue-700 font-medium">
                            Referred → <span className="font-bold capitalize">{consultation.referred_to}</span>
                        </p>
                    </div>
                )}

                <button type="button" onClick={() => setExpanded(v => !v)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-500 transition-colors border border-gray-100">
                    {expanded ? <><EyeOff size={12} /> Hide Full Record</> : <><Eye size={12} /> View Full Record</>}
                </button>

                {expanded && (
                    <div className="space-y-3 pt-1 border-t border-gray-50">
                        {[
                            { label: "History (A)", text: symptoms, icon: ClipboardList, color: "text-red-500", bg: "bg-red-50" },
                            { label: "Examination (B+C)", text: diagnosis, icon: Activity, color: "text-blue-500", bg: "bg-blue-50" },
                            { label: "Assessment / Mgmt (E+F)", text: recommendations, icon: Brain, color: "text-amber-500", bg: "bg-amber-50" },
                            { label: "Treatment / Rx", text: prescriptions, icon: Pill, color: "text-violet-500", bg: "bg-violet-50" },
                        ].map(({ label, text, icon: Icon, color, bg }) => text && (
                            <div key={label} className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-4 h-4 rounded ${bg} flex items-center justify-center shrink-0`}>
                                        <Icon size={9} className={color} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                                </div>
                                <pre className="text-[11px] text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-3 py-2 max-h-32 overflow-y-auto">
                                    {text}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}

                {canDel && (
                    <div className="flex items-center gap-2 pt-1">
                        <button onClick={onDelete} disabled={isDeleting}
                            className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors disabled:opacity-50 border border-red-100">
                            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Restricted role card ─────────────────────────────────────────────────────

function RestrictedConsultationCard({
    consultation, index, isLatest, accessLevel, fullWidth,
}: {
    consultation: any; index: number; isLatest: boolean; accessLevel: AccessLevel; fullWidth?: boolean;
}) {
    const date = getDate(consultation);
    const rel = relativeDay(date);

    const fields = getVisibleFields(consultation, accessLevel).filter(f => f.value?.trim());

    const accentColors: Record<string, string> = {
        nursing: "border-teal-200 bg-teal-50/30",
        lab: "border-indigo-200 bg-indigo-50/30",
        radiology: "border-cyan-200 bg-cyan-50/30",
        pharmacy: "border-violet-200 bg-violet-50/30",
        minimal: "border-gray-200 bg-gray-50/30",
    };

    return (
        <div className={`${fullWidth ? "w-full" : "min-w-[280px] max-w-[280px] flex-shrink-0 snap-start"} rounded-2xl border shadow-sm overflow-hidden transition-all ${accentColors[accessLevel]} ${isLatest ? "ring-1 ring-offset-1" : ""}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/50">
                <div className="flex items-center gap-2 flex-wrap">
                    <CalendarDays size={12} className="text-gray-500" />
                    <span className="text-xs font-bold text-gray-700">{fmt(date)}</span>
                    {rel && <span className="text-[10px] text-gray-400">· {rel}</span>}
                    {isLatest && <LatestBadge />}
                </div>
                <div className="flex items-center gap-1.5">
                    <Lock size={11} className="text-gray-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">#{String(index + 1).padStart(2, "0")}</span>
                </div>
            </div>
            <div className="p-4 space-y-3">
                {fields.map(({ label, value }) => value && (
                    <div key={label}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed line-clamp-3">{value}</p>
                    </div>
                ))}
                {!fields.length && (
                    <p className="text-xs text-gray-400 italic text-center py-2">No accessible data for this consultation.</p>
                )}
            </div>
        </div>
    );
}

// ─── Results table view (default) ─────────────────────────────────────────────

function ResultsTableView({
    data, accessLevel, deletingId, onDelete, canDel,
}: {
    data: any[]; accessLevel: AccessLevel; deletingId: string | null;
    onDelete: (id: string) => void; canDel: boolean;
}) {
    const [q, setQ] = useState("");
    const [openId, setOpenId] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return data;
        return data.filter((c) =>
            [c.symptoms, c.diagnosis, c.recommendations, c.prescriptions, c.referred_to, getDoctorName(c)]
                .filter(Boolean).join(" ").toLowerCase().includes(needle)
        );
    }, [data, q]);

    if (!filtered.length && q) {
        return (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <Search size={18} className="mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-semibold text-gray-600">No consultations match “{q}”</p>
                <button onClick={() => setQ("")} className="mt-2 text-xs font-bold text-blue-600 hover:underline">Clear search</button>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
                <p className="text-xs font-bold text-gray-600">
                    {filtered.length} {filtered.length === 1 ? "consultation" : "consultations"}
                    {accessLevel !== "full" && <span className="text-gray-400"> · limited view</span>}
                </p>
                <div className="relative w-full sm:w-60">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search complaints, diagnosis…"
                        aria-label="Search consultations"
                        className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                    {q && (
                        <button onClick={() => setQ("")} aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <th className="w-10 px-3 py-2.5">#</th>
                            <th className="px-3 py-2.5">Date</th>
                            <th className="px-3 py-2.5">Type</th>
                            <th className="px-3 py-2.5">Complaint / Details</th>
                            <th className="px-3 py-2.5">Assessment</th>
                            <th className="px-3 py-2.5">Route</th>
                            <th className="w-10 px-3 py-2.5" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.map((c: any, idx: number) => {
                            const id = getId(c);
                            const open = openId === id;
                            const date = getDate(c);
                            const rel = relativeDay(date);
                            const isLatest = idx === 0 && !q;
                            const isPaed = c.consultation_type === "paediatric" ||
                                (c.symptoms ?? "").includes("Antenatal/Delivery History");
                            const isFem = hasObstetricHistory(c.symptoms);
                            const doctor = getDoctorName(c);

                            const complaint = getComplaint(c);
                            const assessment = getAssessment(c);
                            const restricted = accessLevel !== "full"
                                ? getVisibleFields(c, accessLevel).filter(f => f.value?.trim())
                                : null;

                            const expandable = accessLevel === "full";

                            return (
                                <Fragment key={id}>
                                    <tr
                                        onClick={expandable ? () => setOpenId(open ? null : id) : undefined}
                                        className={`align-top transition-colors ${
                                            expandable ? "cursor-pointer" : "cursor-default"
                                        } ${open ? "bg-blue-50/50" : isLatest ? "bg-red-50/40 hover:bg-red-50/70" : expandable ? "hover:bg-gray-50" : ""}`}
                                    >
                                        <td className="px-3 py-3 font-black text-gray-300">#{String(idx + 1).padStart(2, "0")}</td>
                                        <td className="px-3 py-3">
                                            <p className="font-bold text-gray-800">{fmt(date)}</p>
                                            <p className="text-[10px] text-gray-400">{fmtTime(date)}{rel && <span> · {rel}</span>}</p>
                                            {doctor && accessLevel === "full" && (
                                                <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-gray-500">
                                                    <UserRound size={10} className="text-gray-400" /> Dr. {doctor}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-col items-start gap-1">
                                                {isLatest && <LatestBadge />}
                                                {isPaed && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600">
                                                        <Baby size={9} /> Paediatric
                                                    </span>
                                                )}
                                                {isFem && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-pink-100 bg-pink-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-pink-600">
                                                        <Heart size={9} /> Obstetric
                                                    </span>
                                                )}
                                                {!isLatest && !isPaed && !isFem && <span className="text-gray-300">—</span>}
                                            </div>
                                        </td>
                                        <td className="max-w-[280px] px-3 py-3">
                                            {restricted ? (
                                                <div className="space-y-0.5">
                                                    {restricted.map((f) => (
                                                        <p key={f.label} className="leading-snug text-gray-600">
                                                            <span className="font-bold text-gray-400">{f.label}:</span> {f.value}
                                                        </p>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="line-clamp-2 font-medium leading-relaxed text-gray-700">
                                                    {complaint || <span className="italic text-gray-300">Not provided</span>}
                                                </p>
                                            )}
                                        </td>
                                        <td className="max-w-[240px] px-3 py-3">
                                            {restricted ? (
                                                <span className="text-gray-300">—</span>
                                            ) : (
                                                <p className="line-clamp-2 leading-relaxed text-gray-600">
                                                    {assessment || <span className="italic text-gray-300">See full record</span>}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {c.referred_to ? (
                                                <span className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold capitalize text-blue-700">
                                                    <ArrowRight size={10} /> {c.referred_to}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {expandable && (
                                                <ChevronDown size={15}
                                                    className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180 text-blue-600" : ""}`} />
                                            )}
                                        </td>
                                    </tr>

                                    {open && (
                                        <tr className="bg-blue-50/20">
                                            <td colSpan={7} className="px-4 pb-4 pt-1">
                                                {accessLevel === "full" ? (
                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        {[
                                                            { label: "History (A)", text: c.symptoms, icon: ClipboardList, color: "text-red-500", bg: "bg-red-50" },
                                                            { label: "Examination (B+C)", text: c.diagnosis, icon: Activity, color: "text-blue-500", bg: "bg-blue-50" },
                                                            { label: "Assessment / Mgmt (E+F)", text: c.recommendations, icon: Brain, color: "text-amber-500", bg: "bg-amber-50" },
                                                            { label: "Treatment / Rx", text: c.prescriptions, icon: Pill, color: "text-violet-500", bg: "bg-violet-50" },
                                                        ].map(({ label, text, icon: Icon, color, bg }) => text && (
                                                            <div key={label} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                                                                <div className="mb-1.5 flex items-center gap-1.5">
                                                                    <div className={`flex h-5 w-5 items-center justify-center rounded-md ${bg}`}>
                                                                        <Icon size={11} className={color} />
                                                                    </div>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                                                                </div>
                                                                <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-gray-700">{text}</pre>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-700">
                                                        Full clinical notes are restricted to your role.
                                                    </p>
                                                )}

                                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Meta</span>
                                                    {doctor && accessLevel === "full" && (
                                                        <span className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-600">
                                                            <UserRound size={10} className="text-gray-400" /> Dr. {doctor}
                                                        </span>
                                                    )}
                                                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold capitalize text-gray-600">
                                                        {c.status ?? "—"}
                                                    </span>
                                                    {c.referred_to && (
                                                        <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold capitalize text-blue-700">
                                                            → {c.referred_to}
                                                        </span>
                                                    )}
                                                    {canDel && (
                                                        <button
                                                            onClick={() => onDelete(id)}
                                                            disabled={deletingId === id}
                                                            className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                                                        >
                                                            {deletingId === id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConsultationHistoryTable({ patientId }: { patientId: string }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const carouselRef = useRef<HTMLDivElement>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("results");
    const accessLevel = getAccessLevel(user?.role);

    const { data: rawData, isPending, isError } = useQuery({
        queryKey: ["consultations", patientId],
        queryFn: () => listConsultationsByPatient(patientId),
        enabled: !!patientId,
    });

    // Always guarantee most-recent-first ordering regardless of API order —
    // the "Latest" badge and timeline view both depend on this being correct.
    const data = useMemo(() => {
        if (!rawData) return rawData;
        return [...rawData].sort((a, b) => getDate(b).getTime() - getDate(a).getTime());
    }, [rawData]);

    const { mutate: deleteMutation } = useMutation({
        mutationFn: deleteConsultation,
        onMutate: async (id: string) => {
            setDeletingId(id);
            await queryClient.cancelQueries({ queryKey: ["consultations", patientId] });
            const prev = queryClient.getQueryData(["consultations", patientId]);
            queryClient.setQueryData(["consultations", patientId], (old: any[]) =>
                old ? old.filter(c => getId(c) !== id) : []
            );
            return { prev };
        },
        onError: (_, __, ctx) => { queryClient.setQueryData(["consultations", patientId], ctx?.prev); toast.error("Failed to delete."); },
        onSuccess: () => toast.success("Consultation deleted."),
        onSettled: () => { setDeletingId(null); queryClient.invalidateQueries({ queryKey: ["consultations", patientId] }); },
    });

    const scroll = (dir: "left" | "right") => {
        if (!carouselRef.current) return;
        const amt = carouselRef.current.clientWidth * 0.8;
        carouselRef.current.scrollTo({ left: carouselRef.current.scrollLeft + (dir === "right" ? amt : -amt), behavior: "smooth" });
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Delete this consultation? This cannot be undone.")) deleteMutation(id);
    };

    if (isPending) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={18} className="text-red-500 animate-spin" />
            <p className="text-sm font-medium text-gray-500">Loading consultations...</p>
        </div>
    );

    if (isError) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Failed to load consultations</p>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ["consultations", patientId] })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors">
                <RefreshCcw size={13} /> Retry
            </button>
        </div>
    );

    if (!data?.length) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <History size={22} className="text-gray-300" />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-700">No Consultation History</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    {user?.role === "Doctor" ? "Fill out the consultation form above to get started." : "No consultations have been recorded yet."}
                </p>
            </div>
        </div>
    );

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <History size={16} className="text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">Consultation History</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {data.length} {data.length === 1 ? "record" : "records"}
                            {accessLevel !== "full" && " · limited view"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* View mode toggle */}
                    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                        <button onClick={() => setViewMode("results")}
                            title="Results — tabular list with expandable rows"
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                viewMode === "results" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}>
                            <Table2 size={12} /> Results
                        </button>
                        <button onClick={() => setViewMode("cards")}
                            title="Cards — swipeable card carousel"
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                viewMode === "cards" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}>
                            <GalleryHorizontal size={12} /> Cards
                        </button>
                        <button onClick={() => setViewMode("timeline")}
                            title="Timeline — vertical chronological view"
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                viewMode === "timeline" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}>
                            <LayoutGrid size={12} /> Timeline
                        </button>
                    </div>

                    {viewMode === "cards" && data.length > 1 && (
                        <>
                            <button onClick={() => scroll("left")} className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors shadow-sm">
                                <ChevronLeft size={15} />
                            </button>
                            <button onClick={() => scroll("right")} className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors shadow-sm">
                                <ChevronRight size={15} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <AccessBanner level={accessLevel} />

            {/* Results view (default) */}
            {viewMode === "results" && (
                <ResultsTableView
                    data={data}
                    accessLevel={accessLevel}
                    deletingId={deletingId}
                    onDelete={handleDelete}
                    canDel={false}
                />
            )}

            {/* Cards view */}
            {viewMode === "cards" && (
                <div ref={carouselRef} className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-hide">
                    {data.map((c: any, idx: number) =>
                        accessLevel === "full" ? (
                            <DoctorConsultationCard
                                key={getId(c)} consultation={c} index={idx} isLatest={idx === 0}
                                isDeleting={deletingId === getId(c)} onDelete={() => handleDelete(getId(c))} canDel={false}
                            />
                        ) : (
                            <RestrictedConsultationCard
                                key={getId(c)} consultation={c} index={idx} isLatest={idx === 0} accessLevel={accessLevel}
                            />
                        )
                    )}
                </div>
            )}

            {/* Timeline view — vertical, left-aligned dots/connector, easier to scan top-to-bottom */}
            {viewMode === "timeline" && (
                <div className="relative pl-6">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />
                    <div className="space-y-5">
                        {data.map((c: any, idx: number) => (
                            <div key={getId(c)} className="relative">
                                <div className={`absolute -left-6 top-5 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${
                                    idx === 0 ? "bg-red-500" : "bg-gray-300"
                                }`} />
                                {accessLevel === "full" ? (
                                    <DoctorConsultationCard
                                        consultation={c} index={idx} isLatest={idx === 0} fullWidth
                                        isDeleting={deletingId === getId(c)} onDelete={() => handleDelete(getId(c))} canDel={false}
                                    />
                                ) : (
                                    <RestrictedConsultationCard
                                        consultation={c} index={idx} isLatest={idx === 0} accessLevel={accessLevel} fullWidth
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
