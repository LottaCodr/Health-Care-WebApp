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
    | "consultations"
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
    const candidates = [
        path.join(process.cwd(), "public", "assets", "icons", "nilelogo.jpeg"),
        path.join(process.cwd(), "assets", "icons", "nilelogo.jpeg"),
        path.join(process.cwd(), "src", "assets", "icons", "nilelogo.jpeg"),
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) return fs.readFileSync(p).toString("base64");
        } catch { /* continue */ }
    }
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
    fieldValue:    { fontSize: 8.5, color: C.text },

    // Section
    sectionRow:    { flexDirection: "row", alignItems: "center", marginBottom: 7, marginTop: 14 },
    sectionBar:    { width: 3.5, height: 14, borderRadius: 2, marginRight: 7 },
    sectionTitle:  { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.primary, textTransform: "uppercase", letterSpacing: 0.5 },

    // Table
    table:         { borderRadius: 4, border: `1pt solid ${C.border}`, overflow: "hidden", marginBottom: 6 },
    tHdrRow:       { flexDirection: "row", backgroundColor: C.primary, paddingVertical: 5, paddingHorizontal: 6 },
    tHdrCell:      { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.white },
    tRow:          { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottom: `0.5pt solid ${C.border}` },
    tRowAlt:       { backgroundColor: "#F9FAFB" },
    tCell:         { fontSize: 8, color: C.text, paddingRight: 4 },
    noData:        { fontSize: 8, color: C.muted, fontStyle: "italic", padding: 8, textAlign: "center" },

    // KV pairs
    kvGrid:  { flexDirection: "row", flexWrap: "wrap", border: `1pt solid ${C.border}`, borderRadius: 4, overflow: "hidden", marginBottom: 6 },
    kvItem:  { width: "50%", padding: 7, borderBottom: `0.5pt solid ${C.border}` },
    kvLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
    kvValue: { fontSize: 8.5, color: C.text },

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

// ── PDF sub-components ────────────────────────────────────────────────────────

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

function PatientCard({ patient }: { patient: any }) {
    const fields = [
        { label: "Patient ID",   value: patient.id },
        { label: "Gender",       value: patient.gender },
        { label: "Date of Birth",value: patient.birth_date ? new Date(patient.birth_date).toLocaleDateString("en-GB") : "—" },
        { label: "Blood Group",  value: patient.blood_group  || "—" },
        { label: "Genotype",     value: patient.geno_type    || "—" },
        { label: "Phone",        value: patient.phone        || "—" },
        { label: "Address",      value: patient.address      || "—" },
        { label: "Allergies",    value: patient.allergies    || "None known" },
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

interface ColDef { header: string; key: string; flex: number }

function DataTable({ columns, rows }: { columns: ColDef[]; rows: Record<string, any>[] }) {
    if (!rows.length) return <Text style={S.noData}>No records found.</Text>;
    return (
        <View style={S.table}>
            <View style={S.tHdrRow}>
                {columns.map((c) => (
                    <Text key={c.key} style={[S.tHdrCell, { flex: c.flex }]}>{c.header}</Text>
                ))}
            </View>
            {rows.map((row, i) => (
                <View key={i} style={[S.tRow, i % 2 === 1 ? S.tRowAlt : {}]}>
                    {columns.map((c) => (
                        <Text key={c.key} style={[S.tCell, { flex: c.flex }]}>
                            {String(row[c.key] ?? "—")}
                        </Text>
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

// ── Main PDF document ─────────────────────────────────────────────────────────

interface DocProps {
    patient:      any;
    sections:     RecordSection[];
    data:         Record<string, any[]>;
    includeStamp: boolean;
    logoBase64:   string | null;
    dateFrom:     string;
    dateTo:       string;
    generatedAt:  string;
}

function PatientRecordPDF({
    patient, sections, data, includeStamp,
    logoBase64, dateFrom, dateTo, generatedAt,
}: DocProps) {
    const dateRange = dateFrom || dateTo
        ? `${dateFrom || "start"} → ${dateTo || "today"}`
        : "All records";

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

                <PatientCard patient={patient} />

                {/* ── Consultations ── */}
                {sections.includes("consultations") && (
                    <Section title="Consultation History" color={C.danger}>
                        <DataTable
                            columns={[
                                { header: "Date",        key: "date",       flex: 1.5 },
                                { header: "Doctor",      key: "doctor",     flex: 2   },
                                { header: "Diagnosis",   key: "diagnosis",  flex: 3   },
                                { header: "Management",  key: "management", flex: 3   },
                                { header: "Referred To", key: "referred",   flex: 1.5 },
                            ]}
                            rows={(data.consultations ?? []).map((c: any) => ({
                                date:       c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB") : "—",
                                doctor:     c.staffs?.name ?? "—",
                                diagnosis:  c.diagnosis  ?? c.presenting_complaint ?? "—",
                                management: c.management ?? c.plan ?? "—",
                                referred:   c.referred_to ?? "—",
                            }))}
                        />
                    </Section>
                )}

                {/* ── Lab Results ── */}
                {sections.includes("lab_results") && (
                    <Section title="Laboratory Results" color={C.indigo}>
                        <DataTable
                            columns={[
                                { header: "Date",         key: "date",   flex: 1.5 },
                                { header: "Test",         key: "test",   flex: 3   },
                                { header: "Status",       key: "status", flex: 1.5 },
                                { header: "Result",       key: "result", flex: 2   },
                                { header: "Normal Range", key: "normal", flex: 2   },
                            ]}
                            rows={(data.lab_results ?? []).map((l: any) => ({
                                date:   l.created_at ? new Date(l.created_at).toLocaleDateString("en-GB") : "—",
                                test:   l.test_type ?? "—",
                                status: l.status ?? "—",
                                result: l.result ?? l.result_value ?? "Pending",
                                normal: l.normal_range ?? "—",
                            }))}
                        />
                    </Section>
                )}

                {/* ── Radiology ── */}
                {sections.includes("radiology") && (
                    <Section title="Radiology Reports" color={C.cyan}>
                        <DataTable
                            columns={[
                                { header: "Date",   key: "date",   flex: 1.5 },
                                { header: "Study",  key: "study",  flex: 3   },
                                { header: "Status", key: "status", flex: 1.5 },
                                { header: "Report", key: "report", flex: 4   },
                            ]}
                            rows={(data.radiology ?? []).map((r: any) => ({
                                date:   r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "—",
                                study:  String(r.test_type ?? "").replace("[RADIOLOGY]", "").trim(),
                                status: r.status ?? "—",
                                report: r.result ?? r.radiologist_notes ?? "Pending",
                            }))}
                        />
                    </Section>
                )}

                {/* ── Drug Chart ── */}
                {sections.includes("drug_chart") && (
                    <Section title="Drug Chart" color={C.teal}>
                        <DataTable
                            columns={[
                                { header: "Drug",      key: "drug",  flex: 2.5 },
                                { header: "Dose",      key: "dose",  flex: 1.5 },
                                { header: "Route",     key: "route", flex: 1   },
                                { header: "Frequency", key: "freq",  flex: 1   },
                                { header: "Start",     key: "start", flex: 1.5 },
                                { header: "End",       key: "end",   flex: 1.5 },
                                { header: "Status",    key: "active",flex: 1   },
                            ]}
                            rows={(data.drug_chart ?? []).map((d: any) => ({
                                drug:   `${d.drug_name}${d.generic_name ? ` (${d.generic_name})` : ""}`,
                                dose:   d.dose      ?? "—",
                                route:  d.route     ?? "—",
                                freq:   d.frequency ?? "—",
                                start:  d.start_date ?? "—",
                                end:    d.end_date   ?? "—",
                                active: d.is_active ? "Active" : "D/C",
                            }))}
                        />
                    </Section>
                )}

                {/* ── Fluid Balance ── */}
                {sections.includes("fluid_balance") && (
                    <Section title="Fluid Balance Chart" color={C.sky}>
                        <DataTable
                            columns={[
                                { header: "Date",    key: "date",    flex: 1.5 },
                                { header: "Time",    key: "time",    flex: 1   },
                                { header: "Oral",    key: "oral",    flex: 0.8 },
                                { header: "IV",      key: "iv",      flex: 0.8 },
                                { header: "Urine",   key: "urine",   flex: 0.8 },
                                { header: "Vomit",   key: "vomit",   flex: 0.8 },
                                { header: "Drain",   key: "drain",   flex: 0.8 },
                                { header: "Balance", key: "balance", flex: 1.2 },
                                { header: "Signed",  key: "signed",  flex: 1.5 },
                            ]}
                            rows={(data.fluid_balance ?? []).map((f: any) => {
                                const totalIn  = (f.oral_ml || 0) + (f.iv_ml || 0) + (f.ng_ml || 0) + (f.other_input_ml || 0);
                                const totalOut = (f.urine_ml || 0) + (f.aspirate_ml || 0) + (f.vomit_ml || 0) + (f.bowel_ml || 0) + (f.drain_ml || 0) + (f.other_output_ml || 0);
                                const bal      = totalIn - totalOut;
                                return {
                                    date:    f.record_date ?? "—",
                                    time:    (f.record_time ?? "").slice(0, 5),
                                    oral:    f.oral_ml  || 0,
                                    iv:      f.iv_ml    || 0,
                                    urine:   f.urine_ml || 0,
                                    vomit:   f.vomit_ml || 0,
                                    drain:   f.drain_ml || 0,
                                    balance: `${bal >= 0 ? "+" : ""}${bal} mL`,
                                    signed:  f.signed_by ?? "—",
                                };
                            })}
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
                                { label: "Discharge Date",            value: d.created_at ? new Date(d.created_at).toLocaleDateString("en-GB") : "—" },
                            ]} />
                        </Section>
                    );
                })()}

                {/* ── Payments ── */}
                {sections.includes("payments") && (
                    <Section title="Payment History" color={C.amber}>
                        <DataTable
                            columns={[
                                { header: "Date",        key: "date",   flex: 1.5 },
                                { header: "Description", key: "desc",   flex: 3   },
                                { header: "Category",    key: "cat",    flex: 1.5 },
                                { header: "Billed (₦)",  key: "billed", flex: 1.5 },
                                { header: "Paid (₦)",    key: "paid",   flex: 1.5 },
                                { header: "Status",      key: "status", flex: 1   },
                            ]}
                            rows={(data.payments ?? []).map((p: any) => ({
                                date:   p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-GB") : "—",
                                desc:   p.description ?? "—",
                                cat:    p.category    ?? "—",
                                billed: naira(p.amount_kobo      ?? 0),
                                paid:   naira(p.amount_paid_kobo ?? 0),
                                status: p.status ?? "—",
                            }))}
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
    includeStamp: boolean,
    generatedAt:  string,
    dateFrom:     string,
    dateTo:       string,
): string {
    const dateRange = dateFrom || dateTo
        ? `${dateFrom || "start"} → ${dateTo || "today"}`
        : "All records";

    // ── Helpers ────────────────────────────────────────────────────────────────

    function tbl(cols: { h: string; k: string }[], rows: Record<string, any>[]): string {
        if (!rows.length) return `<p class="no-data">No records found.</p>`;
        return `
        <table>
          <thead><tr>${cols.map(c => `<th>${c.h}</th>`).join("")}</tr></thead>
          <tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${r[c.k] ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>`;
    }

    function kvGrid(pairs: { label: string; value: any }[]): string {
        return `<div class="kv-grid">${pairs.map(p =>
            `<div class="kv-item"><div class="kv-label">${p.label}</div><div class="kv-value">${p.value ?? "—"}</div></div>`
        ).join("")}</div>`;
    }

    function sec(title: string, color: string, body: string): string {
        return `<div class="section">
          <div class="sec-hdr" style="border-left-color:${color}"><h2>${title}</h2></div>
          ${body}
        </div>`;
    }

    // ── Section bodies ─────────────────────────────────────────────────────────

    const consultations = !sections.includes("consultations") ? "" : sec("Consultation History", C.danger, tbl(
        [{ h: "Date", k: "date" }, { h: "Doctor", k: "doctor" }, { h: "Diagnosis", k: "diagnosis" }, { h: "Management", k: "management" }, { h: "Referred To", k: "referred" }],
        (data.consultations ?? []).map((c: any) => ({
            date:       c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB") : "—",
            doctor:     c.staffs?.name ?? "—",
            diagnosis:  c.diagnosis  ?? c.presenting_complaint ?? "—",
            management: c.management ?? c.plan ?? "—",
            referred:   c.referred_to ?? "—",
        }))
    ));

    const labResults = !sections.includes("lab_results") ? "" : sec("Laboratory Results", C.indigo, tbl(
        [{ h: "Date", k: "date" }, { h: "Test", k: "test" }, { h: "Status", k: "status" }, { h: "Result", k: "result" }, { h: "Normal Range", k: "normal" }],
        (data.lab_results ?? []).map((l: any) => ({
            date:   l.created_at ? new Date(l.created_at).toLocaleDateString("en-GB") : "—",
            test:   l.test_type ?? "—",
            status: l.status    ?? "—",
            result: l.result ?? l.result_value ?? "Pending",
            normal: l.normal_range ?? "—",
        }))
    ));

    const radiology = !sections.includes("radiology") ? "" : sec("Radiology Reports", C.cyan, tbl(
        [{ h: "Date", k: "date" }, { h: "Study", k: "study" }, { h: "Status", k: "status" }, { h: "Report", k: "report" }],
        (data.radiology ?? []).map((r: any) => ({
            date:   r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "—",
            study:  String(r.test_type ?? "").replace("[RADIOLOGY]", "").trim(),
            status: r.status ?? "—",
            report: r.result ?? r.radiologist_notes ?? "Pending",
        }))
    ));

    const drugChart = !sections.includes("drug_chart") ? "" : sec("Drug Chart", C.teal, tbl(
        [{ h: "Drug", k: "drug" }, { h: "Dose", k: "dose" }, { h: "Route", k: "route" }, { h: "Frequency", k: "freq" }, { h: "Start", k: "start" }, { h: "End", k: "end" }, { h: "Status", k: "active" }],
        (data.drug_chart ?? []).map((d: any) => ({
            drug:   `${d.drug_name}${d.generic_name ? ` (${d.generic_name})` : ""}`,
            dose:   d.dose      ?? "—",
            route:  d.route     ?? "—",
            freq:   d.frequency ?? "—",
            start:  d.start_date ?? "—",
            end:    d.end_date   ?? "—",
            active: d.is_active ? "Active" : "D/C",
        }))
    ));

    const fluidBalance = !sections.includes("fluid_balance") ? "" : sec("Fluid Balance Chart", C.sky, tbl(
        [
            { h: "Date", k: "date" }, { h: "Time", k: "time" },
            { h: "Oral (mL)", k: "oral" }, { h: "IV (mL)", k: "iv" },
            { h: "Urine (mL)", k: "urine" }, { h: "Vomit (mL)", k: "vomit" },
            { h: "Drain (mL)", k: "drain" }, { h: "Balance", k: "balance" },
            { h: "Signed By", k: "signed" },
        ],
        (data.fluid_balance ?? []).map((f: any) => {
            const totalIn  = (f.oral_ml || 0) + (f.iv_ml || 0) + (f.ng_ml || 0) + (f.other_input_ml || 0);
            const totalOut = (f.urine_ml || 0) + (f.aspirate_ml || 0) + (f.vomit_ml || 0) + (f.bowel_ml || 0) + (f.drain_ml || 0) + (f.other_output_ml || 0);
            const bal      = totalIn - totalOut;
            return {
                date:    f.record_date ?? "—",
                time:    (f.record_time ?? "").slice(0, 5),
                oral:    f.oral_ml  || 0,
                iv:      f.iv_ml    || 0,
                urine:   f.urine_ml || 0,
                vomit:   f.vomit_ml || 0,
                drain:   f.drain_ml || 0,
                balance: `${bal >= 0 ? "+" : ""}${bal} mL`,
                signed:  f.signed_by ?? "—",
            };
        })
    ));

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
        { label: "Discharge Date",            value: dn.created_at ? new Date(dn.created_at).toLocaleDateString("en-GB") : "—" },
    ]));

    const payments = !sections.includes("payments") ? "" : sec("Payment History", C.amber, tbl(
        [{ h: "Date", k: "date" }, { h: "Description", k: "desc" }, { h: "Category", k: "cat" }, { h: "Billed", k: "billed" }, { h: "Paid", k: "paid" }, { h: "Status", k: "status" }],
        (data.payments ?? []).map((p: any) => ({
            date:   p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-GB") : "—",
            desc:   p.description ?? "—",
            cat:    p.category    ?? "—",
            billed: naira(p.amount_kobo      ?? 0),
            paid:   naira(p.amount_paid_kobo ?? 0),
            status: p.status ?? "—",
        }))
    ));

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

    const patientFields: [string, string][] = [
        ["Patient ID",   patient.id],
        ["Gender",       patient.gender],
        ["Date of Birth",patient.birth_date ? new Date(patient.birth_date).toLocaleDateString("en-GB") : "—"],
        ["Blood Group",  patient.blood_group  || "—"],
        ["Genotype",     patient.geno_type    || "—"],
        ["Phone",        patient.phone        || "—"],
        ["Address",      patient.address      || "—"],
        ["Allergies",    patient.allergies    || "None known"],
        ["HMO",          patient.hmo ? (patient.hmo_name || "Yes") : "No"],
    ];

    // ── Full HTML ──────────────────────────────────────────────────────────────

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Patient Record — ${patient.name ?? ""}</title>
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
    .field-value     { font-size: 10px; color: #1F2937; }

    /* ── Sections ── */
    .section   { margin-bottom: 22px; page-break-inside: avoid; }
    .sec-hdr   { border-left: 4px solid; padding: 4px 0 4px 10px; margin-bottom: 9px; }
    .sec-hdr h2{ font-size: 11px; font-weight: 700; color: #0B3D6B; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Table ── */
    table      { width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; font-size: 9.5px; margin-bottom: 4px; }
    thead tr   { background: #0B3D6B; }
    thead th   { padding: 6px 8px; text-align: left; color: #fff; font-size: 8.5px; font-weight: 700; }
    tbody tr:nth-child(even) { background: #F9FAFB; }
    tbody td   { padding: 5px 8px; border-bottom: 1px solid #F1F5F9; }
    .no-data   { font-size: 9px; color: #9CA3AF; font-style: italic; padding: 8px; text-align: center; }

    /* ── KV grid ── */
    .kv-grid   { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; }
    .kv-item   { padding: 8px 12px; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9; }
    .kv-label  { font-size: 7.5px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; }
    .kv-value  { font-size: 9.5px; color: #1F2937; }

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
      <div class="hospital-name">${H.name}</div>
      <div class="hospital-sub">${H.address}</div>
      <div class="hospital-sub">Tel: ${H.phone}</div>
    </div>
  </div>
  <div class="header-divider"></div>

  <!-- Title -->
  <div class="title-block">
    <div class="title-main">PATIENT MEDICAL RECORD</div>
    <div class="title-meta">Period: ${dateRange}<br/>Generated: ${generatedAt}</div>
  </div>

  <!-- Patient card -->
  <div class="patient-card">
    <div class="patient-hdr">
      <span class="patient-name">${patient.name ?? "Unknown Patient"}</span>
      <span class="patient-badge">${String(patient.status ?? "").replace(/-/g, " ")}</span>
    </div>
    <div class="patient-grid">
      ${patientFields.map(([l, v]) =>
          `<div class="patient-field">
            <div class="field-label">${l}</div>
            <div class="field-value">${v ?? "—"}</div>
          </div>`
      ).join("")}
    </div>
  </div>

  ${consultations}
  ${labResults}
  ${radiology}
  ${drugChart}
  ${fluidBalance}
  ${dischargeNote}
  ${payments}
  ${stamp}

  <div class="doc-footer">
    <span>${H.name} · Generated ${generatedAt}</span>
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

async function fetchAllSections(
    sb:        Awaited<ReturnType<typeof createClient>>,
    patientId: string,
    sections:  RecordSection[],
    dateFrom:  string,
    dateTo:    string,
): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};

    await Promise.all(sections.map(async (section) => {
        switch (section) {

            case "consultations": {
                let q = sb.from("consultations")
                    .select("*, staffs(name, role)")
                    .eq("patient_id", patientId)
                    .order("created_at", { ascending: false });
                if (dateFrom) q = q.gte("created_at", dateFrom);
                if (dateTo)   q = q.lte("created_at", `${dateTo}T23:59:59`);
                const { data } = await q;
                result.consultations = data ?? [];
                break;
            }

            case "lab_results": {
                let q = sb.from("lab_requests")
                    .select("*")
                    .eq("patient_id", patientId)
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
                    .eq("patient_id", patientId)
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
                    .select("*, staffs(name)")
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

    const [patient, data] = await Promise.all([
        fetchPatient(sb, input.patientId),
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