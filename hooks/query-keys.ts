// ══════════════════════════════════════════════════════════════════════════════
// hooks/query-keys.ts
//
// Centralised query key factories.
// Hierarchy: domain → collection → filters | detail → id
//
// Why this matters:
//   queryClient.invalidateQueries({ queryKey: patientKeys.lists() })
//   → invalidates every patient list regardless of filters
//
//   queryClient.invalidateQueries({ queryKey: patientKeys.detail(id) })
//   → invalidates only that patient's detail — leaves lists intact
//
// Always import from here, never write raw string arrays.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Patients ─────────────────────────────────────────────────────────────────

export const patientKeys = {
    all: () => ["patients"] as const,
    lists: () => ["patients", "list"] as const,
    byStatus: (s: string) => ["patients", "list", "status", s] as const,
    search: (q: string) => ["patients", "search", q] as const,
    details: () => ["patients", "detail"] as const,
    detail: (id: string) => ["patients", "detail", id] as const,
};

// ─── Consultations ────────────────────────────────────────────────────────────

export const consultationKeys = {
    all: () => ["consultations"] as const,
    byPatient: (id: string) => ["consultations", "patient", id] as const,
    byDoctor: (id: string) => ["consultations", "doctor", id] as const,
    detail: (id: string) => ["consultations", "detail", id] as const,
};

// ─── Lab requests ─────────────────────────────────────────────────────────────

export const labKeys = {
    all: () => ["lab"] as const,
    pending: () => ["lab", "requests", "pending"] as const,
    completed: () => ["lab", "requests", "completed"] as const,
    byPatient: (id: string) => ["lab", "requests", "patient", id] as const,
    detail: (id: string) => ["lab", "requests", "detail", id] as const,
    // Catalog
    catalog: () => ["lab", "catalog"] as const,
    catalogActive: () => ["lab", "catalog", "active"] as const,
};

// ─── Nursing ──────────────────────────────────────────────────────────────────

export const nursingKeys = {
    all: () => ["nursing"] as const,
    pending: () => ["nursing", "pending"] as const,
    byPatient: (id: string) => ["nursing", "patient", id] as const,
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentKeys = {
    all: () => ["payments"] as const,
    pending: () => ["payments", "pending"] as const,
    byPatient: (id: string) => ["payments", "patient", id] as const,
};

// ─── Pharmacy ─────────────────────────────────────────────────────────────────

export const pharmacyKeys = {
    // Prescriptions
    prescriptions: () => ["pharmacy", "prescriptions"] as const,
    prescriptionsPending: () => ["pharmacy", "prescriptions", "pending"] as const,
    prescriptionsByPatient: (id: string) => ["pharmacy", "prescriptions", "patient", id] as const,
    prescription: (id: string) => ["pharmacy", "prescriptions", "detail", id] as const,
    // Drug inventory
    inventory: () => ["pharmacy", "inventory"] as const,
    inventoryActive: () => ["pharmacy", "inventory", "active"] as const,
    catalog: () => ["pharmacy", "catalog"] as const,
    // Dispensing
    dispensing: (id: string) => ["pharmacy", "dispensing", "patient", id] as const,
};

// ─── Staff ────────────────────────────────────────────────────────────────────

export const staffKeys = {
    all: () => ["staff"] as const,
    byRole: (r: string) => ["staff", "role", r] as const,
    detail: (id: string) => ["staff", "detail", id] as const,
};