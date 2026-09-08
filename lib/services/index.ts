export * from "./patient.service";
export * from "./consultation.service";
export * from "./lab.service";
export * from "./nursing.service";
export * from "./payment.service";
export * from "./pharmacy.service";
export * from "./staff.service";
export * from "./audit.service";
export * from "./appointment.service";
export * from "./discharge.service";
export * from "./nurse-charts.service";
export * from "./patient-routing.service";
export * from "./care-team.service";
// 24-hour amendment window + append-only correction notes (amendRecord,
// addRecordAddendum, listRecordAddenda). The enforcement helper itself
// (record-lock.ts) is intentionally NOT re-exported: it imports the server
// Supabase client and must never reach a client bundle.
export * from "./amendment.service";