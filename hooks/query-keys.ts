
// ─── Patients ─────────────────────────────────────────────────────────────────

export const patientKeys = {
    all: () => ["patients"] as const,
    lists: () => ["patients", "list"] as const,
    byStatus: (s: string) => ["patients", "list", "status", s] as const,
    search: (q: string) => ["patients", "search", q] as const,
    details: () => ["patients", "detail"] as const,
    detail: (id: string) => ["patients", "detail", id] as const,
    appointments: () => ["patients", "appointments"] as const,
    appointmentsByDate: (date: string) => ["patients", "appointments", "date", date] as const,
    appointmentsByPatient: (id: string) => ["patients", "appointments", "patient", id] as const,
    appointmentsUpcoming: () => ["patients", "appointments", "upcoming"] as const,
    appointmentsDetail: (id: string) => ["patients", "appointments", "detail", id] as const,
    appointmentsCreate: () => ["patients", "appointments", "create"] as const,
    appointmentsUpdate: () => ["patients", "appointments", "update"] as const,
    appointmentsDelete: () => ["patients", "appointments", "delete"] as const,
    appointmentsUpdateStatus: () => ["patients", "appointments", "update", "status"] as const,
    appointmentsUpdateStatusDetail: (id: string) => ["patients", "appointments", "update", "status", "detail", id] as const,
    appointmentsUpdateStatusCreate: () => ["patients", "appointments", "update", "status", "create"] as const,
    appointmentsUpdateStatusDelete: () => ["patients", "appointments", "update", "status", "delete"] as const,
    
};

export const dischargeKeys = {
    all:       ()           => ["discharge_notes"]              as const,
    byPatient: (id: string) => ["discharge_notes", "patient", id] as const,
    detail: (id: string) => ["discharge_notes", "detail", id] as const,
    create: () => ["discharge_notes", "create"] as const,
    update: () => ["discharge_notes", "update"] as const,
    delete: () => ["discharge_notes", "delete"] as const,
    updateStatus: () => ["discharge_notes", "update", "status"] as const,
    updateStatusDetail: (id: string) => ["discharge_notes", "update", "status", "detail", id] as const,
    updateStatusCreate: () => ["discharge_notes", "update", "status", "create"] as const,
    updateStatusDelete: () => ["discharge_notes", "update", "status", "delete"] as const,
};


export const appointmentKeys = {
    all:       ()           => ["appointments"]                          as const,
    upcoming:  ()           => ["appointments", "upcoming"]              as const,
    byDate:    (d: string)  => ["appointments", "date", d]               as const,
    byPatient: (id: string) => ["appointments", "patient", id]           as const,
};

// ─── Consultations ────────────────────────────────────────────────────────────

export const consultationKeys = {
    all: () => ["consultations"] as const,
    byPatient: (id: string) => ["consultations", "patient", id] as const,
    byDoctor: (id: string) => ["consultations", "doctor", id] as const,
    detail: (id: string) => ["consultations", "detail", id] as const,
};

// ─── Lab requests (NON-radiology only) ────────────────────────────────────────
// These keys cover test_type values that do NOT start with "[RADIOLOGY]".
// All lab tech dashboard data uses these keys exclusively.

export const labKeys = {
    all: () => ["lab"] as const,
    pending: () => ["lab", "requests", "pending"] as const,
    completed: () => ["lab", "requests", "completed"] as const,
    byPatient: (id: string) => ["lab", "requests", "patient", id] as const,
    detail: (id: string) => ["lab", "requests", "detail", id] as const,
    // Test catalog
    catalog: () => ["lab", "catalog"] as const,
    catalogActive: () => ["lab", "catalog", "active"] as const,
};

// ─── Radiology requests ───────────────────────────────────────────────────────
// Separate namespace for test_type values that start with "[RADIOLOGY]".
// Radiologist dashboard and patient radiology tab use these keys exclusively.
// Invalidating radiologyKeys.pending() will NEVER touch labKeys.pending() and
// vice versa — no cross-department cache pollution.

export const radiologyKeys = {
    all: () => ["radiology"] as const,
    pending: () => ["radiology", "pending"] as const,
    completed: () => ["radiology", "completed"] as const,
    byPatient: (id: string) => ["radiology", "patient", id] as const,
    detail: (id: string) => ["radiology", "detail", id] as const,
};

// ─── Nursing ──────────────────────────────────────────────────────────────────

export const nursingKeys = {
    all: () => ["nursing"] as const,
    pending: () => ["nursing", "pending"] as const,
    completed: () => ["nursing", "completed"] as const,
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
    prescriptions: () => ["pharmacy", "prescriptions"] as const,
    prescriptionsPending: () => ["pharmacy", "prescriptions", "pending"] as const,
    prescriptionsByPatient: (id: string) => ["pharmacy", "prescriptions", "patient", id] as const,
    prescription: (id: string) => ["pharmacy", "prescriptions", "detail", id] as const,
    inventory: () => ["pharmacy", "inventory"] as const,
    inventoryActive: () => ["pharmacy", "inventory", "active"] as const,
    catalog: () => ["pharmacy", "catalog"] as const,
    dispensing: (id: string) => ["pharmacy", "dispensing", "patient", id] as const,
};

// ─── Staff ────────────────────────────────────────────────────────────────────

export const staffKeys = {
    all: () => ["staff"] as const,
    byRole: (r: string) => ["staff", "role", r] as const,
    detail: (id: string) => ["staff", "detail", id] as const,
};

// ─── Admissions ────────────────────────────────────────────────────────────────────


export const admissionKeys = {
    all:       ()              => ["admissions"]                           as const,
    active:    ()              => ["admissions", "active"]                 as const,
    byPatient: (id: string)   => ["admissions", "patient", id]            as const,
};
