"use server";

import React from "react";
import {
    Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import { createClient } from "@/utils/supabase/server";
import fs   from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecordSection =
    | "demographics"
    | "vitals"
    | "consultations"
    | "prescriptions"
    | "lab_results"
    | "radiology"
    | "drug_chart"
    | "fluid_balance"
    | "discharge_note"
    | "payments";

export interface GenerateRecordInput {
    patientId:    string;
    sections:     RecordSection[];
    dateFrom:     string;
    dateTo:       string;
    format:       "pdf" | "print";
    includeStamp: boolean;
}

export type GenerateRecordResult =
    | { type: "pdf";   base64: string; filename: string }
    | { type: "print"; html: string };

// ─── Hospital constants ───────────────────────────────────────────────────────

const H = {
    name:    "NILE VALLEY MOTHER & CHILD HOSPITAL",
    address: "Plot 602, David Jemibewon Crescent, Off Oladipo Diya Road, Gudu District, Abuja.",
    phone:   "+234 813 006 4451",
} as const;

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
    primary:  "#0B3D6B",
    teal:     "#0D9488",
    text:     "#1F2937",
    muted:    "#6B7280",
    light:    "#F8FAFC",
    border:   "#E2E8F0",
    white:    "#FFFFFF",
    danger:   "#DC2626",
    success:  "#059669",
    amber:    "#D97706",
    indigo:   "#6366F1",
    cyan:     "#0891B2",
    sky:      "#0284C7",
} as const;

// ─── Logo loader ──────────────────────────────────────────────────────────────

function loadLogoBase64(): string | null {
    try {
        const logoPath = path.join(process.cwd(), "public/assets/icons/nilelogo.jpeg");
        if (fs.existsSync(logoPath)) {
            return fs.readFileSync(logoPath).toString("base64");
        }
    } catch { /* continue */ }
    return null;
}

// ─── Naira formatter ──────────────────────────────────────────────────────────

function naira(kobo: number): string {
    return (kobo / 100).toLocaleString("en-NG", {
        style:                 "currency",
        currency:              "NGN",
        minimumFractionDigits: 2,
    });
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtDate(v?: string): string {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString("en-GB");
}

function fmtDateTime(v?: string): string {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Pulls a labelled block out of the free-text consultation sections. */
function extractLabeledSection(text: string, label: string): string {
    if (!text) return "";
    const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z]|$)`, "i");
    const match = text.match(regex);
    return match?.[1]?.trim() ?? "";
}

function firstBlock(text?: string): string {
    return (text ?? "").split("\n\n")[0]?.trim() ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
//  PDF DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    // Page
    page: {
        fontFamily:      "Helvetica",
        fontSize:        9,
        color:           C.text,
        backgroundColor: C.white,
        paddingTop:      36,
        paddingBottom:   56,
        paddingLeft:     40,
        paddingRight:    40,
    },

    // Header
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    logo:      { width: 52, height: 52, marginRight: 14, borderRadius: 4 },
    headerText: { flex: 1 },
    hospitalName: {
        fontSize: 11, fontFamily: "Helvetica-Bold",
        color: C.primary, marginBottom: 3,
    },
    hospitalSub: { fontSize: 8, color: C.muted, lineHeight: 1.5 },
    headerDivider: {
        height: 2.5, backgroundColor: C.teal,
        borderRadius: 2, marginBottom: 14,
    },

    // Title block
    titleBlock: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        backgroundColor: C.light, borderRadius: 6,
        padding: 10, marginBottom: 14,
    },
    titleText: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.primary },
    titleMeta: { fontSize: 7.5, color: C.muted, lineHeight: 1.6, textAlign: "right" },

    // Patient card
    patientCard:   { borderRadius: 6, border: `1pt solid ${C.border}`, marginBottom: 16, overflow: "hidden" },
    patientCardHdr:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.primary, padding: 10 },
    patientCardName:{ fontSize: 13, fontFamily: "Helvetica-Bold", color: C.white },
    patientCardBadge:{
        fontSize: 7.5, fontFamily: "Helvetica-Bold",
        color: C.primary, backgroundColor: C.white,
        paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10,
    },
    patientGrid:   { flexDirection: "row", flexWrap: "wrap", padding: 8 },
    patientField:  { width: "33.33%", paddingRight: 6, marginBottom: 7 },
    fieldLabel:    { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
    fieldValue:    { fontSize: 8.5, color: C.text, lineHeight: 1.4 },

    // Section
    sectionRow:    { flexDirection: "row", alignItems: "center", marginBottom: 7, marginTop: 14 },
    sectionBar:    { width: 3.5, height: 14, borderRadius: 2, marginRight: 7 },
    sectionTitle:  { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.primary, textTransform: "uppercase", letterSpacing: 0.5 },

    // Table — every column gets an explicit percentage width so long values
    // wrap inside their column and rows stay aligned like a proper table.
    table:         { borderRadius: 4, border: `1pt solid ${C.border}`, overflow: "hidden", marginBottom: 6 },
    tHdrRow:       { flexDirection: "row", backgroundColor: C.primary, paddingVertical: 5, paddingHorizontal: 6 },
    tHdrCell:      { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.white },
    tRow:          { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottom: `0.5pt solid ${C.border}` },
    tRowAlt:       { backgroundColor: "#F9FAFB" },
    tCell:         { fontSize: 8, color: C.text, lineHeight: 1.45 },
    tFootRow:      { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, backgroundColor: "#EDF2F7", borderTop: `1pt solid ${C.border}` },
    noData:        { fontSize: 8, color: C.muted, fontStyle: "italic", padding: 8, textAlign: "center" },

    // KV pairs
    kvGrid:  { flexDirection: "row", flexWrap: "wrap", border: `1pt solid ${C.border}`, borderRadius: 4, overflow: "hidden", marginBottom: 6 },
    kvItem:  { width: "50%", padding: 7, borderBottom: `0.5pt solid ${C.border}` },
    kvLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
    kvValue: { fontSize: 8.5, color: C.text, lineHeight: 1.45 },

    // Stamp
    stampSection: { marginTop: 24, borderTop: `1pt solid ${C.border}`, paddingTop: 16 },
    stampLabel:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
    stampGrid:    { flexDirection: "row", gap: 20 },
    stampBox:     { flex: 1, borderTop: `1pt solid ${C.text}`, paddingTop: 5, height: 56 },
    stampBoxSub:  { fontSize: 7.5, color: C.muted },

    // Footer (fixed, every page)
    footer: {
        position: "absolute", bottom: 18, left: 40, right: 40,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        borderTop: `0.5pt solid ${C.border}`, paddingTop: 5,
    },
    footerText:         { fontSize: 7, color: C.muted },
    footerConfidential: { fontSize: 7, color: C.danger, fontFamily: "Helvetica-Bold" },
});

// ─── PDF sub-components ────────────────────────────────────────────────────────

function PDFHeader({ logoBase64 }: { logoBase64: string | null }) {
    return (
        <>
            <View style={S.headerRow}>
                {logoBase64 && (
                    <Image src={`data:image/jpeg;base64,${logoBase64}`} style={S.logo} />
                )}
                <View style={S.headerText}>
                    <Text style={S.hospitalName}>{H.name}</Text>
                    <Text style={S.hospitalSub}>{H.address}</Text>
                    <Text style={S.hospitalSub}>Tel: {H.phone}</Text>
                </View>
            </View>
            <View style={S.headerDivider} />
        </>
    );
}

function PatientCard({ patient, allergies }: { patient: any; allergies: string }) {
    const allergyValue = [allergies, patient.allergies]
        .map((v) => (v ?? "").trim())
        .filter(Boolean)
        .join(" · ") || "None known";

    const fields = [
        { label: "Patient ID",   value: patient.id },
        { label: "Gender",       value: patient.gender },
        { label: "Date of Birth",value: patient.birth_date ? fmtDate(patient.birth_date) : "—" },
        { label: "Blood Group",  value: patient.blood_group  || "—" },
        { label: "Genotype",     value: patient.geno_type    || "—" },
        { label: "Phone",        value: patient.phone        || "—" },
        { label: "Address",      value: patient.address      || "—" },
        { label: "Allergies",    value: allergyValue },
        { label: "HMO",          value: patient.hmo ? (patient.hmo_name || "Yes") : "No" },
    ];
    return (
        <View style={S.patientCard}>
            <View style={S.patientCardHdr}>
                <Text style={S.patientCardName}>{patient.name ?? "Unknown Patient"}</Text>
                <Text style={S.patientCardBadge}>
                    {String(patient.status ?? "").replace(/-/g, " ").toUpperCase()}
                </Text>
            </View>
            <View style={S.patientGrid}>
                {fields.map((f) => (
                    <View key={f.label} style={S.patientField}>
                        <Text style={S.fieldLabel}>{f.label}</Text>
                        <Text style={S.fieldValue}>{f.value || "—"}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// Column definitions: each column has an explicit percentage width so the
// table renders as a proper aligned grid and long text wraps inside its cell.
interface ColDef { header: string; key: string; w: number; align?: "left" | "center" | "right" }

function DataTable({
    columns, rows, footer,
}: {
    columns: ColDef[];
    rows: Record<string, any>[];
    footer?: Record<string, any>[];
}) {
    if (!rows.length) return <Text style={S.noData}>No records found.</Text>;

    const alignStyle = (a?: ColDef["align"]): { textAlign: "left" | "center" | "right" } =>
        ({ textAlign: a ?? "left" });

    return (
        <View style={S.table}>
            <View style={S.tHdrRow}>
                {columns.map((c) => (
                    <View key={c.key} style={{ width: `${c.w}%`, paddingRight: 5 }}>
                        <Text style={[S.tHdrCell, alignStyle(c.align)]}>{c.header}</Text>
                    </View>
                ))}
            </View>
            {rows.map((row, i) => (
                <View key={i} style={[S.tRow, i % 2 === 1 ? S.tRowAlt : {}]} wrap={false}>
                    {columns.map((c) => (
                        <View key={c.key} style={{ width: `${c.w}%`, paddingRight: 5 }}>
                            <Text style={[S.tCell, alignStyle(c.align)]}>{String(row[c.key] ?? "—")}</Text>
                        </View>
                    ))}
                </View>
            ))}
            {footer?.map((frow, i) => (
                <View key={`f${i}`} style={S.tFootRow}>
                    {columns.map((c) => (
                        <View key={c.key} style={{ width: `${c.w}%`, paddingRight: 5 }}>
                            <Text style={[S.tCell, { fontFamily: "Helvetica-Bold" }, alignStyle(c.align)]}>
                                {String(frow[c.key] ?? "")}
                            </Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

function KVPairs({ pairs }: { pairs: { label: string; value: any }[] }) {
    return (
        <View style={S.kvGrid}>
            {pairs.map((p) => (
                <View key={p.label} style={S.kvItem}>
                    <Text style={S.kvLabel}>{p.label}</Text>
                    <Text style={S.kvValue}>{String(p.value ?? "—")}</Text>
                </View>
            ))}
        </View>
    );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
    return (
        <View>
            <View style={S.sectionRow}>
                <View style={[S.sectionBar, { backgroundColor: color }]} />
                <Text style={S.sectionTitle}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

function StampBlock() {
    return (
        <View style={S.stampSection}>
            <Text style={S.stampLabel}>Authorization & Hospital Stamp</Text>
            <View style={S.stampGrid}>
                {["Prepared By", "Authorized By (Medical Director)", "Hospital Stamp"].map((l) => (
                    <View key={l} style={S.stampBox}>
                        <Text style={S.stampBoxSub}>{l}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Main PDF document ─────────────────────────────────────────────────────────

interface DocProps {
    patient:      any;
    sections:     RecordSection[];
    data:         Record<string, any[]>;
    allergies:    string;
    includeStamp: boolean;
    logoBase64:   string | null;
    dateFrom:     string;
    dateTo:       string;
    generatedAt:  string;
}

function PatientRecordPDF({
    patient, sections, data, allergies, includeStamp,
    logoBase64, dateFrom, dateTo, generatedAt,
}: DocProps) {
    const dateRange = dateFrom || dateTo
        ? `${dateFrom || "start"} → ${dateTo || "today"}`
        : "All records";

    // Fluid totals (shared between the table and its footer row)
    const fluidTotals = (() => {
        const rows = data.fluid_balance ?? [];
        const inTotal = rows.reduce((acc, f) =>
            acc + (f.oral_ml || 0) + (f.iv_ml || 0) + (f.ng_ml || 0) + (f.other_input_ml || 0), 0);
        const outTotal = rows.reduce((acc, f) =>
            acc + (f.urine_ml || 0) + (f.aspirate_ml || 0) + (f.vomit_ml || 0) + (f.bowel_ml || 0) + (f.drain_ml || 0) + (f.other_output_ml || 0), 0);
        return { inTotal, outTotal, balance: inTotal - outTotal };
    })();

    const paymentTotals = (() => {
        const rows = data.payments ?? [];
        return {
            billed: rows.reduce((acc, p) => acc + (p.amount_kobo ?? 0), 0),
            paid:   rows.reduce((acc, p) => acc + (p.amount_paid_kobo ?? 0), 0),
        };
    })();

    return (
        <Document>
            <Page size="A4" style={S.page}>

                {/* Fixed footer on every page */}
                <View style={S.footer} fixed>
                    <Text style={S.footerText}>{H.name} · Generated {generatedAt}</Text>
                    <Text style={S.footerConfidential}>CONFIDENTIAL – MEDICAL RECORD</Text>
                    <Text
                        style={S.footerText}
                        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
                    />
                </View>

                <PDFHeader logoBase64={logoBase64} />

                {/* Title */}
                <View style={S.titleBlock}>
                    <Text style={S.titleText}>PATIENT MEDICAL RECORD</Text>
                    <View>
                        <Text style={S.titleMeta}>Period: {dateRange}</Text>
                        <Text style={S.titleMeta}>Generated: {generatedAt}</Text>
                    </View>
                </View>

                <PatientCard patient={patient} allergies={allergies} />

                {/* ── Vitals / Nursing ── */}
                {sections.includes("vitals") && (
                    <Section title="Vital Signs & Nursing Observations" color={C.sky}>
                        <DataTable
                            columns={[
                                { header: "Date & Time", key: "date",        w: 16 },
                                { header: "Type",        key: "type",        w: 12 },
                                { header: "Details",     key: "description", w: 44 },
                                { header: "Nurse",       key: "nurse",       w: 16 },
                                { header: "Status",      key: "status",      w: 12, align: "center" },
                            ]}
                            rows={(data.vitals ?? []).map((v: any) => ({
                                date:        fmtDateTime(v.created_at),
                                type:        v.action_type ?? "Vitals",
                                description: v.description ?? "—",
                                nurse:       v.assigned_nurse ?? v.completed_by ?? "—",
                                status:      v.status ?? "Completed",
                            }))}
                        />
                    </Section>
                )}

                {/* ── Consultations — structured rows for every part of the note ── */}
                {sections.includes("consultations") && (
                    <Section title="Consultation History" color={C.danger}>
                        <DataTable
                            columns={[
                                { header: "Date & Time",      key: "date",       w: 13 },
                                { header: "Doctor",           key: "doctor",     w: 13 },
                                { header: "Presenting Complaint", key: "complaint",  w: 22 },
                                { header: "Assessment / Diagnosis", key: "diagnosis",  w: 20 },
                                { header: "Management Plan",  key: "management", w: 20 },
                                { header: "Referred To",      key: "referred",   w: 12, align: "center" },
                            ]}
                            rows={(data.consultations ?? []).map((c: any) => ({
                                date:       fmtDateTime(c.created_at),
                                doctor:     c.staffs?.name ?? "—",
                                complaint:  extractLabeledSection(c.symptoms ?? "", "Presenting Complaint") ||
                                            firstBlock(c.symptoms)?.replace("Presenting Complaint:", "").trim() || "—",
                                diagnosis:  extractLabeledSection(c.recommendations ?? "", "Assessment") ||
                                            extractLabeledSection(c.diagnosis ?? "", "Summary") ||
                                            firstBlock(c.diagnosis)?.replace("General Examination:", "").trim() || "—",
                                management: extractLabeledSection(c.recommendations ?? "", "Recommendations") ||
                                            firstBlock(c.recommendations) || "—",
                                referred:   c.referred_to ?? "—",
                            }))}
                        />
                    </Section>
                )}

                {/* ── Prescriptions ── */}
                {(sections.includes("prescriptions") || sections.includes("drug_chart")) && (
                    <Section title="Prescriptions & Medications" color={C.teal}>
                        <DataTable
                            columns={[
                                { header: "Date",     key: "date",     w: 15 },
                                { header: "Drug",     key: "drug",     w: 30 },
                                { header: "Dosage",   key: "dose",     w: 20 },
                                { header: "Duration", key: "duration", w: 15 },
                                { header: "Status",   key: "status",   w: 20, align: "center" },
                            ]}
                            rows={(data.prescriptions ?? []).map((p: any) => ({
                                date:     fmtDate(p.created_at),
                                drug:     p.drug_name ?? "—",
                                dose:     p.dosage ?? "—",
                                duration: p.duration ?? "—",
                                status:   p.dispensed ? "Dispensed" : (p.status ?? "Active"),
                            }))}
                        />
                    </Section>
                )}

                {/* ── Lab Results ── */}
                {sections.includes("lab_results") && (
                    <Section title="Laboratory Results" color={C.indigo}>
                        <DataTable
                            columns={[
                                { header: "Date",         key: "date",   w: 15 },
                                { header: "Test",         key: "test",   w: 35 },
                                { header: "Status",       key: "status", w: 15, align: "center" },
                                { header: "Result",       key: "result", w: 35 },
                            ]}
                            rows={(data.lab_results ?? []).map((l: any) => ({
                                date:   fmtDate(l.created_at),
                                test:   l.test_type ?? "—",
                                status: l.status ?? "—",
                                result: l.result ?? l.result_value ?? (l.status === "completed" ? "Completed" : "Pending"),
                            }))}
                        />
                    </Section>
                )}

                {/* ── Radiology ── */}
                {sections.includes("radiology") && (
                    <Section title="Radiology Reports" color={C.cyan}>
                        <DataTable
                            columns={[
                                { header: "Date",   key: "date",   w: 15 },
                                { header: "Study",  key: "study",  w: 30 },
                                { header: "Status", key: "status", w: 15, align: "center" },
                                { header: "Report", key: "report", w: 40 },
                            ]}
                            rows={(data.radiology ?? []).map((r: any) => ({
                                date:   fmtDate(r.created_at),
                                study:  String(r.test_type ?? "").replace("[RADIOLOGY]", "").trim(),
                                status: r.status ?? "—",
                                report: r.result ?? r.radiologist_notes ?? (r.status === "completed" ? "Completed" : "Pending"),
                            }))}
                        />
                    </Section>
                )}

                {/* ── Inpatient Drug Chart ── */}
                {sections.includes("drug_chart") && (data.drug_chart ?? []).length > 0 && (
                    <Section title="Inpatient Drug Administration Chart" color={C.teal}>
                        <DataTable
                            columns={[
                                { header: "Drug",      key: "drug",  w: 22 },
                                { header: "Dose",      key: "dose",  w: 13 },
                                { header: "Route",     key: "route", w: 10 },
                                { header: "Frequency", key: "freq",  w: 10 },
                                { header: "Start",     key: "start", w: 13 },
                                { header: "End",       key: "end",   w: 13 },
                                { header: "Given",     key: "given", w: 11, align: "center" },
                                { header: "Status",    key: "active",w: 8,  align: "center" },
                            ]}
                            rows={(data.drug_chart ?? []).map((d: any) => {
                                const admins = d.drug_administration_records ?? [];
                                const given = admins.filter((r: any) => r.status === "given").length;
                                return {
                                    drug:   `${d.drug_name}${d.generic_name ? ` (${d.generic_name})` : ""}`,
                                    dose:   d.dose      ?? "—",
                                    route:  d.route     ?? "—",
                                    freq:   d.frequency ?? "—",
                                    start:  fmtDate(d.start_date),
                                    end:    d.end_date ? fmtDate(d.end_date) : "Ongoing",
                                    given:  admins.length ? `${given}/${admins.length}` : "—",
                                    active: d.is_active ? "Active" : "D/C",
                                };
                            })}
                        />
                    </Section>
                )}

                {/* ── Fluid Balance ── */}
                {sections.includes("fluid_balance") && (
                    <Section title="Fluid Balance Chart" color={C.sky}>
                        <DataTable
                            columns={[
                                { header: "Date",         key: "date",    w: 12 },
                                { header: "Time",         key: "time",    w: 8,  align: "center" },
                                { header: "Fluid / Solution", key: "fluid",w: 26 },
                                { header: "Intake (mL)",  key: "in",      w: 12, align: "right" },
                                { header: "Output (mL)",  key: "out",     w: 12, align: "right" },
                                { header: "Balance",      key: "balance", w: 12, align: "right" },
                                { header: "Notes",        key: "notes",   w: 12 },
                                { header: "Signed By",    key: "signed",  w: 6 },
                            ]}
                            rows={(data.fluid_balance ?? []).map((f: any) => {
                                const inTotal  = (f.oral_ml || 0) + (f.iv_ml || 0) + (f.ng_ml || 0) + (f.other_input_ml || 0);
                                const outTotal = (f.urine_ml || 0) + (f.aspirate_ml || 0) + (f.vomit_ml || 0) + (f.bowel_ml || 0) + (f.drain_ml || 0) + (f.other_output_ml || 0);
                                const bal = inTotal - outTotal;
                                return {
                                    date:    f.record_date ?? "—",
                                    time:    (f.record_time ?? "").slice(0, 5) || "—",
                                    fluid:   f.input_fluid_type ?? f.other_input_type ?? "—",
                                    in:      inTotal,
                                    out:     outTotal,
                                    balance: `${bal >= 0 ? "+" : ""}${bal} mL`,
                                    notes:   f.notes ?? "—",
                                    signed:  f.signed_by ?? "—",
                                };
                            })}
                            footer={[
                                {
                                    date: "Totals", time: "", fluid: "",
                                    in: fluidTotals.inTotal, out: fluidTotals.outTotal,
                                    balance: `${fluidTotals.balance >= 0 ? "+" : ""}${fluidTotals.balance} mL`,
                                    notes: "", signed: "",
                                },
                            ]}
                        />
                    </Section>
                )}

                {/* ── Discharge Note ── */}
                {sections.includes("discharge_note") && data.discharge_note?.[0] && (() => {
                    const d = data.discharge_note[0];
                    return (
                        <Section title="Discharge Summary" color={C.success}>
                            <KVPairs pairs={[
                                { label: "Discharge Type",            value: d.discharge_type },
                                { label: "Condition on Discharge",    value: d.condition_on_discharge },
                                { label: "Final Diagnosis",           value: d.final_diagnosis },
                                { label: "Hospital Course",           value: d.hospital_course },
                                { label: "Medications on Discharge",  value: d.medications_on_discharge },
                                { label: "Follow-up Date",            value: d.follow_up_date },
                                { label: "Follow-up Instructions",    value: d.follow_up_instructions },
                                { label: "Activity Restrictions",     value: d.activity_restrictions },
                                { label: "Diet Instructions",         value: d.diet_instructions },
                                { label: "Emergency Return Criteria", value: d.emergency_return_criteria },
                                { label: "Discharged By",             value: d.staffs?.name ?? d.discharged_by },
                                { label: "Discharge Date",            value: d.created_at ? fmtDate(d.created_at) : "—" },
                            ]} />
                        </Section>
                    );
                })()}

                {/* ── Payments ── */}
                {sections.includes("payments") && (
                    <Section title="Payment History" color={C.amber}>
                        <DataTable
                            columns={[
                                { header: "Date",        key: "date",   w: 13 },
                                { header: "Description", key: "desc",   w: 28 },
                                { header: "Category",    key: "cat",    w: 12 },
                                { header: "Billed (₦)",  key: "billed", w: 13, align: "right" },
                                { header: "Paid (₦)",    key: "paid",   w: 13, align: "right" },
                                { header: "Method",      key: "method", w: 11, align: "center" },
                                { header: "Status",      key: "status", w: 10, align: "center" },
                            ]}
                            rows={(data.payments ?? []).map((p: any) => ({
                                date:   p.payment_date ? fmtDate(p.payment_date) : "—",
                                desc:   p.description ?? "—",
                                cat:    p.category    ?? "—",
                                billed: naira(p.amount_kobo      ?? 0),
                                paid:   naira(p.amount_paid_kobo ?? 0),
                                method: p.method ?? p.payment_method ?? "—",
                                status: p.status ?? "—",
                            }))}
                            footer={[
                                {
                                    date: "Totals", desc: "", cat: "",
                                    billed: naira(paymentTotals.billed),
                                    paid:   naira(paymentTotals.paid),
                                    method: "", status: "",
                                },
                            ]}
                        />
                    </Section>
                )}

                {includeStamp && <StampBlock />}
            </Page>
        </Document>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  HTML PRINT TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

function buildPrintHTML(
    patient:      any,
    sections:     RecordSection[],
    data:         Record<string, any[]>,
    allergies:    string,
    includeStamp: boolean,
    generatedAt:  string,
    dateFrom:     string,
    dateTo:       string,
): string {
    const dateRange = dateFrom || dateTo
        ? `${dateFrom || "start"} → ${dateTo || "today"}`
        : "All records";

    // ── Escaping helpers (PHI must never break the HTML document) ────────────
    function esc(v: any): string {
        return String(v ?? "—")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
    function escNL(v: any): string {
        return esc(v).replace(/\n/g, "<br/>");
    }

    // ── Table helper: explicit column widths, zebra rows, optional totals ────
    function tbl(
        cols: { h: string; k: string; w: number; align?: "left" | "center" | "right" }[],
        rows: Record<string, any>[],
        footer?: Record<string, any>[],
    ): string {
        if (!rows.length) return `<p class="no-data">No records found.</p>`;
        const colgroup = `<colgroup>${cols.map(c => `<col style="width:${c.w}%">`).join("")}</colgroup>`;
        const thead = `<thead><tr>${cols.map(c =>
            `<th style="text-align:${c.align ?? "left"}">${esc(c.h)}</th>`).join("")}</tr></thead>`;
        const tbody = `<tbody>${rows.map(r =>
            `<tr>${cols.map(c =>
                `<td style="text-align:${c.align ?? "left"}">${escNL(r[c.k])}</td>`).join("")}</tr>`
        ).join("")}</tbody>`;
        const tfoot = footer?.length
            ? `<tfoot>${footer.map(f =>
                `<tr>${cols.map(c =>
                    `<td style="text-align:${c.align ?? "left"};font-weight:700">${escNL(f[c.k])}</td>`).join("")}</tr>`
            ).join("")}</tfoot>`
            : "";
        return `<table>${colgroup}${thead}${tbody}${tfoot}</table>`;
    }

    function kvGrid(pairs: { label: string; value: any }[]): string {
        return `<div class="kv-grid">${pairs.map(p =>
            `<div class="kv-item"><div class="kv-label">${esc(p.label)}</div><div class="kv-value">${escNL(p.value)}</div></div>`
        ).join("")}</div>`;
    }

    function sec(title: string, color: string, body: string): string {
        return `<div class="section">
          <div class="sec-hdr" style="border-left-color:${color}"><h2>${esc(title)}</h2></div>
          ${body}
        </div>`;
    }

    // ── Section bodies ─────────────────────────────────────────────────────────

    const vitals = !sections.includes("vitals") ? "" : sec("Vital Signs & Nursing Observations", C.sky, tbl(
        [
            { h: "Date & Time", k: "date", w: 16 },
            { h: "Type", k: "type", w: 12 },
            { h: "Details", k: "description", w: 44 },
            { h: "Nurse", k: "nurse", w: 16 },
            { h: "Status", k: "status", w: 12, align: "center" },
        ],
        (data.vitals ?? []).map((v: any) => ({
            date:        fmtDateTime(v.created_at),
            type:        v.action_type ?? "Vitals",
            description: v.description ?? "—",
            nurse:       v.assigned_nurse ?? v.completed_by ?? "—",
            status:      v.status ?? "Completed",
        }))
    ));

    const consultations = !sections.includes("consultations") ? "" : sec("Consultation History", C.danger, tbl(
        [
            { h: "Date & Time", k: "date", w: 13 },
            { h: "Doctor", k: "doctor", w: 13 },
            { h: "Presenting Complaint", k: "complaint", w: 22 },
            { h: "Assessment / Diagnosis", k: "diagnosis", w: 20 },
            { h: "Management Plan", k: "management", w: 20 },
            { h: "Referred To", k: "referred", w: 12, align: "center" },
        ],
        (data.consultations ?? []).map((c: any) => ({
            date:       fmtDateTime(c.created_at),
            doctor:     c.staffs?.name ?? "—",
            complaint:  extractLabeledSection(c.symptoms ?? "", "Presenting Complaint") ||
                        firstBlock(c.symptoms)?.replace("Presenting Complaint:", "").trim() || "—",
            diagnosis:  extractLabeledSection(c.recommendations ?? "", "Assessment") ||
                        extractLabeledSection(c.diagnosis ?? "", "Summary") ||
                        firstBlock(c.diagnosis)?.replace("General Examination:", "").trim() || "—",
            management: extractLabeledSection(c.recommendations ?? "", "Recommendations") ||
                        firstBlock(c.recommendations) || "—",
            referred:   c.referred_to ?? "—",
        }))
    ));

    const prescriptions = !(sections.includes("prescriptions") || sections.includes("drug_chart")) ? "" : sec("Prescriptions & Medications", C.teal, tbl(
        [
            { h: "Date", k: "date", w: 15 },
            { h: "Drug", k: "drug", w: 30 },
            { h: "Dosage", k: "dose", w: 20 },
            { h: "Duration", k: "duration", w: 15 },
            { h: "Status", k: "status", w: 20, align: "center" },
        ],
        (data.prescriptions ?? []).map((p: any) => ({
            date:     fmtDate(p.created_at),
            drug:     p.drug_name ?? "—",
            dose:     p.dosage ?? "—",
            duration: p.duration ?? "—",
            status:   p.dispensed ? "Dispensed" : (p.status ?? "Active"),
        }))
    ));

    const labResults = !sections.includes("lab_results") ? "" : sec("Laboratory Results", C.indigo, tbl(
        [
            { h: "Date", k: "date", w: 15 },
            { h: "Test", k: "test", w: 35 },
            { h: "Status", k: "status", w: 15, align: "center" },
            { h: "Result", k: "result", w: 35 },
        ],
        (data.lab_results ?? []).map((l: any) => ({
            date:   fmtDate(l.created_at),
            test:   l.test_type ?? "—",
            status: l.status    ?? "—",
            result: l.result ?? l.result_value ?? (l.status === "completed" ? "Completed" : "Pending"),
        }))
    ));

    const radiology = !sections.includes("radiology") ? "" : sec("Radiology Reports", C.cyan, tbl(
        [
            { h: "Date", k: "date", w: 15 },
            { h: "Study", k: "study", w: 30 },
            { h: "Status", k: "status", w: 15, align: "center" },
            { h: "Report", k: "report", w: 40 },
        ],
        (data.radiology ?? []).map((r: any) => ({
            date:   fmtDate(r.created_at),
            study:  String(r.test_type ?? "").replace("[RADIOLOGY]", "").trim(),
            status: r.status ?? "—",
            report: r.result ?? r.radiologist_notes ?? (r.status === "completed" ? "Completed" : "Pending"),
        }))
    ));

    const drugChart = !sections.includes("drug_chart") || !(data.drug_chart ?? []).length ? "" : sec("Inpatient Drug Administration Chart", C.teal, tbl(
        [
            { h: "Drug", k: "drug", w: 22 },
            { h: "Dose", k: "dose", w: 13 },
            { h: "Route", k: "route", w: 10 },
            { h: "Frequency", k: "freq", w: 10 },
            { h: "Start", k: "start", w: 13 },
            { h: "End", k: "end", w: 13 },
            { h: "Given", k: "given", w: 11, align: "center" },
            { h: "Status", k: "active", w: 8, align: "center" },
        ],
        (data.drug_chart ?? []).map((d: any) => {
            const admins = d.drug_administration_records ?? [];
            const given = admins.filter((r: any) => r.status === "given").length;
            return {
                drug:   `${d.drug_name}${d.generic_name ? ` (${d.generic_name})` : ""}`,
                dose:   d.dose      ?? "—",
                route:  d.route     ?? "—",
                freq:   d.frequency ?? "—",
                start:  fmtDate(d.start_date),
                end:    d.end_date ? fmtDate(d.end_date) : "Ongoing",
                given:  admins.length ? `${given}/${admins.length}` : "—",
                active: d.is_active ? "Active" : "D/C",
            };
        })
    ));

    const fluidBalance = (() => {
        if (!sections.includes("fluid_balance")) return "";
        const rows = data.fluid_balance ?? [];
        const inTotal = rows.reduce((acc, f) =>
            acc + (f.oral_ml || 0) + (f.iv_ml || 0) + (f.ng_ml || 0) + (f.other_input_ml || 0), 0);
        const outTotal = rows.reduce((acc, f) =>
            acc + (f.urine_ml || 0) + (f.aspirate_ml || 0) + (f.vomit_ml || 0) + (f.bowel_ml || 0) + (f.drain_ml || 0) + (f.other_output_ml || 0), 0);
        const bal = inTotal - outTotal;
        return sec("Fluid Balance Chart", C.sky, tbl(
            [
                { h: "Date", k: "date", w: 12 },
                { h: "Time", k: "time", w: 8, align: "center" },
                { h: "Fluid / Solution", k: "fluid", w: 26 },
                { h: "Intake (mL)", k: "in", w: 12, align: "right" },
                { h: "Output (mL)", k: "out", w: 12, align: "right" },
                { h: "Balance", k: "balance", w: 12, align: "right" },
                { h: "Notes", k: "notes", w: 12 },
                { h: "Signed By", k: "signed", w: 6 },
            ],
            rows.map((f: any) => {
                const fIn  = (f.oral_ml || 0) + (f.iv_ml || 0) + (f.ng_ml || 0) + (f.other_input_ml || 0);
                const fOut = (f.urine_ml || 0) + (f.aspirate_ml || 0) + (f.vomit_ml || 0) + (f.bowel_ml || 0) + (f.drain_ml || 0) + (f.other_output_ml || 0);
                const fBal = fIn - fOut;
                return {
                    date:    f.record_date ?? "—",
                    time:    (f.record_time ?? "").slice(0, 5) || "—",
                    fluid:   f.input_fluid_type ?? f.other_input_type ?? "—",
                    in:      fIn,
                    out:     fOut,
                    balance: `${fBal >= 0 ? "+" : ""}${fBal} mL`,
                    notes:   f.notes ?? "—",
                    signed:  f.signed_by ?? "—",
                };
            }),
            [
                {
                    date: "Totals", time: "", fluid: "",
                    in: inTotal, out: outTotal,
                    balance: `${bal >= 0 ? "+" : ""}${bal} mL`,
                    notes: "", signed: "",
                },
            ]
        ));
    })();

    const dn = data.discharge_note?.[0];
    const dischargeNote = (!sections.includes("discharge_note") || !dn) ? "" : sec("Discharge Summary", C.success, kvGrid([
        { label: "Discharge Type",            value: dn.discharge_type },
        { label: "Condition on Discharge",    value: dn.condition_on_discharge },
        { label: "Final Diagnosis",           value: dn.final_diagnosis },
        { label: "Hospital Course",           value: dn.hospital_course },
        { label: "Medications on Discharge",  value: dn.medications_on_discharge },
        { label: "Follow-up Date",            value: dn.follow_up_date },
        { label: "Follow-up Instructions",    value: dn.follow_up_instructions },
        { label: "Activity Restrictions",     value: dn.activity_restrictions },
        { label: "Diet Instructions",         value: dn.diet_instructions },
        { label: "Emergency Return Criteria", value: dn.emergency_return_criteria },
        { label: "Discharged By",             value: dn.staffs?.name ?? dn.discharged_by },
        { label: "Discharge Date",            value: dn.created_at ? fmtDate(dn.created_at) : "—" },
    ]));

    const payments = (() => {
        if (!sections.includes("payments")) return "";
        const rows = data.payments ?? [];
        const billed = rows.reduce((acc, p) => acc + (p.amount_kobo ?? 0), 0);
        const paid   = rows.reduce((acc, p) => acc + (p.amount_paid_kobo ?? 0), 0);
        return sec("Payment History", C.amber, tbl(
            [
                { h: "Date", k: "date", w: 13 },
                { h: "Description", k: "desc", w: 28 },
                { h: "Category", k: "cat", w: 12 },
                { h: "Billed (₦)", k: "billed", w: 13, align: "right" },
                { h: "Paid (₦)", k: "paid", w: 13, align: "right" },
                { h: "Method", k: "method", w: 11, align: "center" },
                { h: "Status", k: "status", w: 10, align: "center" },
            ],
            rows.map((p: any) => ({
                date:   p.payment_date ? fmtDate(p.payment_date) : "—",
                desc:   p.description ?? "—",
                cat:    p.category    ?? "—",
                billed: naira(p.amount_kobo      ?? 0),
                paid:   naira(p.amount_paid_kobo ?? 0),
                method: p.method ?? p.payment_method ?? "—",
                status: p.status ?? "—",
            })),
            [
                { date: "Totals", desc: "", cat: "", billed: naira(billed), paid: naira(paid), method: "", status: "" },
            ]
        ));
    })();

    const stamp = !includeStamp ? "" : `
    <div class="stamp-section">
      <p class="stamp-title">Authorization &amp; Hospital Stamp</p>
      <div class="stamp-grid">
        <div class="stamp-box"><span>Prepared By</span></div>
        <div class="stamp-box"><span>Authorized By (Medical Director)</span></div>
        <div class="stamp-box"><span>Hospital Stamp</span></div>
      </div>
    </div>`;

    // ── Patient fields grid ────────────────────────────────────────────────────
    const allergyValue = [allergies, patient.allergies]
        .map((v) => (v ?? "").trim())
        .filter(Boolean)
        .join(" · ") || "None known";

    const patientFields: [string, string][] = [
        ["Patient ID",   patient.id],
        ["Gender",       patient.gender],
        ["Date of Birth",patient.birth_date ? fmtDate(patient.birth_date) : "—"],
        ["Blood Group",  patient.blood_group  || "—"],
        ["Genotype",     patient.geno_type    || "—"],
        ["Phone",        patient.phone        || "—"],
        ["Address",      patient.address      || "—"],
        ["Allergies",    allergyValue],
        ["HMO",          patient.hmo ? (patient.hmo_name || "Yes") : "No"],
    ];

    // ── Full HTML ──────────────────────────────────────────────────────────────

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Patient Record — ${esc(patient.name ?? "")}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1F2937; background: #fff; padding: 36px 40px; }

    /* ── Print toolbar ── */
    .toolbar { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; z-index: 100; }
    .toolbar button { padding: 8px 18px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-print { background: #0B3D6B; color: #fff; }
    .btn-close { background: #F1F5F9; color: #374151; }

    /* ── Header ── */
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .hospital-name { font-size: 15px; font-weight: 700; color: #0B3D6B; margin-bottom: 3px; }
    .hospital-sub  { font-size: 9px; color: #6B7280; line-height: 1.6; }
    .header-divider { height: 3px; background: #0D9488; border-radius: 2px; margin-bottom: 18px; }

    /* ── Title block ── */
    .title-block { display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border-radius: 8px; padding: 12px 18px; margin-bottom: 18px; }
    .title-main  { font-size: 17px; font-weight: 700; color: #0B3D6B; }
    .title-meta  { font-size: 9px; color: #6B7280; text-align: right; line-height: 1.7; }

    /* ── Patient card ── */
    .patient-card    { border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 22px; }
    .patient-hdr     { display: flex; justify-content: space-between; align-items: center; background: #0B3D6B; padding: 11px 16px; }
    .patient-name    { font-size: 16px; font-weight: 700; color: #fff; }
    .patient-badge   { font-size: 9px; font-weight: 700; color: #0B3D6B; background: #fff; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; }
    .patient-grid    { display: grid; grid-template-columns: repeat(3, 1fr); }
    .patient-field   { padding: 8px 12px; border-right: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9; }
    .field-label     { font-size: 7.5px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .field-value     { font-size: 10px; color: #1F2937; overflow-wrap: anywhere; }

    /* ── Sections ── */
    .section   { margin-bottom: 22px; page-break-inside: avoid; }
    .sec-hdr   { border-left: 4px solid; padding: 4px 0 4px 10px; margin-bottom: 9px; }
    .sec-hdr h2{ font-size: 11px; font-weight: 700; color: #0B3D6B; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Tables: fixed layout + explicit column widths keeps every report
          in a clean, aligned tabular format; long text wraps in its cell ── */
    table      { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; font-size: 9.5px; margin-bottom: 4px; }
    thead      { display: table-header-group; }
    thead tr   { background: #0B3D6B; }
    thead th   { padding: 6px 8px; text-align: left; color: #fff; font-size: 8.5px; font-weight: 700; overflow-wrap: anywhere; }
    tbody tr:nth-child(even) { background: #F9FAFB; }
    tbody td   { padding: 5px 8px; border-bottom: 1px solid #F1F5F9; vertical-align: top; overflow-wrap: anywhere; word-wrap: break-word; }
    tbody tr   { break-inside: avoid; page-break-inside: avoid; }
    tfoot      { display: table-footer-group; }
    tfoot td   { padding: 6px 8px; background: #EDF2F7; border-top: 1px solid #CBD5E1; font-weight: 700; overflow-wrap: anywhere; }
    .no-data   { font-size: 9px; color: #9CA3AF; font-style: italic; padding: 8px; text-align: center; }

    /* ── KV grid ── */
    .kv-grid   { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; }
    .kv-item   { padding: 8px 12px; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9; }
    .kv-label  { font-size: 7.5px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; }
    .kv-value  { font-size: 9.5px; color: #1F2937; overflow-wrap: anywhere; }

    /* ── Stamp ── */
    .stamp-section { margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 20px; }
    .stamp-title   { font-size: 8.5px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 18px; }
    .stamp-grid    { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 28px; }
    .stamp-box     { border-top: 1px solid #1F2937; padding-top: 6px; min-height: 64px; }
    .stamp-box span{ font-size: 8.5px; color: #6B7280; }

    /* ── Footer ── */
    .doc-footer    { margin-top: 28px; border-top: 1px solid #E2E8F0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8px; color: #9CA3AF; }
    .confidential  { color: #DC2626; font-weight: 700; }

    /* ── Print overrides ── */
    @media print {
      body        { padding: 0; }
      .toolbar    { display: none !important; }
      @page       { margin: 18mm 20mm; }
    }
  </style>
</head>
<body>

  <div class="toolbar no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="hospital-name">${esc(H.name)}</div>
      <div class="hospital-sub">${esc(H.address)}</div>
      <div class="hospital-sub">Tel: ${esc(H.phone)}</div>
    </div>
  </div>
  <div class="header-divider"></div>

  <!-- Title -->
  <div class="title-block">
    <div class="title-main">PATIENT MEDICAL RECORD</div>
    <div class="title-meta">Period: ${esc(dateRange)}<br/>Generated: ${esc(generatedAt)}</div>
  </div>

  <!-- Patient card -->
  <div class="patient-card">
    <div class="patient-hdr">
      <span class="patient-name">${esc(patient.name ?? "Unknown Patient")}</span>
      <span class="patient-badge">${esc(String(patient.status ?? "").replace(/-/g, " "))}</span>
    </div>
    <div class="patient-grid">
      ${patientFields.map(([l, v]) =>
          `<div class="patient-field">
            <div class="field-label">${esc(l)}</div>
            <div class="field-value">${escNL(v)}</div>
          </div>`
      ).join("")}
    </div>
  </div>

  ${vitals}
  ${consultations}
  ${prescriptions}
  ${labResults}
  ${radiology}
  ${drugChart}
  ${fluidBalance}
  ${dischargeNote}
  ${payments}
  ${stamp}

  <div class="doc-footer">
    <span>${esc(H.name)} · Generated ${esc(generatedAt)}</span>
    <span class="confidential">CONFIDENTIAL – MEDICAL RECORD</span>
  </div>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  DATA FETCHING
// ─────────────────────────────────────────────────────────────────────────────

async function fetchPatient(sb: Awaited<ReturnType<typeof createClient>>, patientId: string) {
    const { data, error } = await sb
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();
    if (error) throw new Error(`Failed to fetch patient: ${error.message}`);
    return data;
}

/** Structured allergies are always included in the demographics summary. */
async function fetchActiveAllergies(
    sb: Awaited<ReturnType<typeof createClient>>,
    patientId: string,
): Promise<string> {
    try {
        const { data } = await sb
            .from("patient_allergies")
            .select("*")
            .eq("patient_id", patientId)
            .eq("status", "active")
            .order("created_at", { ascending: false });
        if (!data?.length) return "";
        return data
            .map((a: any) =>
                `${a.allergen} (${a.severity ?? "unspecified"})${a.reaction ? ` — ${a.reaction}` : ""}`
            )
            .join("; ");
    } catch {
        return "";
    }
}

async function fetchAllSections(
    sb:        Awaited<ReturnType<typeof createClient>>,
    patientId: string,
    sections:  RecordSection[],
    dateFrom:  string,
    dateTo:    string,
): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};

    await Promise.all(sections.map(async (section) => {
        try {
            switch (section) {

                case "vitals": {
                    let q = sb.from("nursing_actions")
                        .select("*")
                        .eq("patient_id", patientId)
                        .order("created_at", { ascending: false });
                    if (dateFrom) q = q.gte("created_at", dateFrom);
                    if (dateTo)   q = q.lte("created_at", `${dateTo}T23:59:59`);
                    const { data } = await q;
                    result.vitals = data ?? [];
                    break;
                }

                case "consultations": {
                    let q = sb.from("consultations")
                        .select("*, staffs:doctor_id(name)")
                        .eq("patient_id", patientId)
                        .order("created_at", { ascending: false });
                    if (dateFrom) q = q.gte("created_at", dateFrom);
                    if (dateTo)   q = q.lte("created_at", `${dateTo}T23:59:59`);
                    const { data } = await q;
                    result.consultations = data ?? [];
                    break;
                }

                case "prescriptions": {
                    let q = sb.from("prescriptions")
                        .select("*")
                        .eq("patient_id", patientId)
                        .order("created_at", { ascending: false });
                    if (dateFrom) q = q.gte("created_at", dateFrom);
                    if (dateTo)   q = q.lte("created_at", `${dateTo}T23:59:59`);
                    const { data } = await q;
                    result.prescriptions = data ?? [];
                    break;
                }

                case "lab_results": {
                    let q = sb.from("lab_requests")
                        .select("*")
                        .eq("visit_id", patientId)
                        .not("test_type", "like", "[RADIOLOGY]%")
                        .order("created_at", { ascending: false });
                    if (dateFrom) q = q.gte("created_at", dateFrom);
                    if (dateTo)   q = q.lte("created_at", `${dateTo}T23:59:59`);
                    const { data } = await q;
                    result.lab_results = data ?? [];
                    break;
                }

                case "radiology": {
                    let q = sb.from("lab_requests")
                        .select("*")
                        .eq("visit_id", patientId)
                        .like("test_type", "[RADIOLOGY]%")
                        .order("created_at", { ascending: false });
                    if (dateFrom) q = q.gte("created_at", dateFrom);
                    if (dateTo)   q = q.lte("created_at", `${dateTo}T23:59:59`);
                    const { data } = await q;
                    result.radiology = data ?? [];
                    break;
                }

                case "drug_chart": {
                    const { data } = await sb.from("nurse_drug_chart")
                        .select("*, drug_administration_records(*)")
                        .eq("patient_id", patientId)
                        .order("created_at", { ascending: false });
                    result.drug_chart = data ?? [];
                    break;
                }

                case "fluid_balance": {
                    let q = sb.from("fluid_balance")
                        .select("*")
                        .eq("patient_id", patientId)
                        .order("record_date", { ascending: false })
                        .order("record_time", { ascending: false });
                    if (dateFrom) q = q.gte("record_date", dateFrom);
                    if (dateTo)   q = q.lte("record_date", dateTo);
                    const { data } = await q;
                    result.fluid_balance = data ?? [];
                    break;
                }

                case "discharge_note": {
                    const { data } = await sb.from("discharge_notes")
                        .select("*, staffs:doctor_id(name)")
                        .eq("patient_id", patientId)
                        .order("created_at", { ascending: false })
                        .limit(1);
                    result.discharge_note = data ?? [];
                    break;
                }

                case "payments": {
                    let q = sb.from("payments")
                        .select("*")
                        .eq("patient_id", patientId)
                        .order("created_at", { ascending: false });
                    if (dateFrom) q = q.gte("created_at", dateFrom);
                    if (dateTo)   q = q.lte("created_at", `${dateTo}T23:59:59`);
                    const { data } = await q;
                    result.payments = data ?? [];
                    break;
                }

                // demographics = patient record itself — no extra query needed
                case "demographics":
                default:
                    break;
            }
        } catch (err) {
            console.error(`[generatePatientRecord] error fetching section ${section}:`, err);
            result[section] = [];
        }
    }));

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function generatePatientRecord(
    input: GenerateRecordInput,
): Promise<GenerateRecordResult> {
    const sb          = await createClient();
    const generatedAt = new Date().toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    const [patient, allergies, data] = await Promise.all([
        fetchPatient(sb, input.patientId),
        fetchActiveAllergies(sb, input.patientId),
        fetchAllSections(sb, input.patientId, input.sections, input.dateFrom, input.dateTo),
    ]);

    // ── Print ────────────────────────────────────────────────────────────────
    if (input.format === "print") {
        return {
            type: "print",
            html: buildPrintHTML(
                patient,
                input.sections,
                data,
                allergies,
                input.includeStamp,
                generatedAt,
                input.dateFrom,
                input.dateTo,
            ),
        };
    }

    // ── PDF ──────────────────────────────────────────────────────────────────
    const logoBase64 = loadLogoBase64();

    const buffer = await renderToBuffer(
        PatientRecordPDF({
            patient,
            sections:     input.sections,
            data,
            allergies,
            includeStamp: input.includeStamp,
            logoBase64,
            dateFrom:     input.dateFrom,
            dateTo:       input.dateTo,
            generatedAt,
        })
    );

    const safeName = (patient.name ?? "patient")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");

    return {
        type:     "pdf",
        base64:   buffer.toString("base64"),
        filename: `${safeName}_medical_record_${new Date().toISOString().slice(0, 10)}.pdf`,
    };
}
