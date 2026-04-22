
// Patients
export {
    usePatient,
    usePatientsByStatus,
    useSearchPatients,
    useAllPatients,
    useCreatePatient,
    useUpdatePatient,
    useUpdatePatientStatus,
} from "./use-patients";

// Consultations
export {
    useConsultation,
    useConsultationsByPatient,
    useConsultationsByDoctor,
    useCreateConsultation,
    useUpdateConsultation,
    useDeleteConsultation,
} from "./use-consultations";

// Lab requests + lab test catalog
export {
    useLabRequest,
    useLabRequestsByPatient,
    usePendingLabRequests,
    useCompletedLabRequests,
    useCreateLabRequest,
    useUpdateLabRequest,
    useActiveLabTests,
    useLabTestCatalog,
    useUpsertLabTest,
    useDeleteLabTest,
    useToggleLabTestActive,
} from "./use-lab";

// Nursing
export {
    usePendingNursingActions,
    useNursingActionsByPatient,
    useCreateNursingAction,
    useUpdateNursingAction,
} from "./use-nursing";

// Payments
export {
    usePendingPayments,
    usePaymentsByPatient,
    useCreatePayment,
    useConfirmPayment,
} from "./use-payment";

// Pharmacy — prescriptions + drug catalog + inventory
export {
    usePrescription,
    usePrescriptionsByPatient,
    usePendingPrescriptions,
    useCreatePrescription,
    useUpdatePrescription,
    useDispensingRecordsByPatient,
    useCreateDispensingRecord,
    useDrugInventory,
    useDrugCatalog,
    useActiveDrugs,
    useUpsertDrug,
    useDeleteDrug,
    useRestockDrug,
    useToggleDrugActive,
} from "./use-pharmacy";

// Staff
export {
    useAllStaff,
    useStaff,
    useStaffByRole,
    useCreateStaff,
    useUpdateStaff,
    useDeleteStaff,
} from "./use-staff";

// Query keys — export for prefetching in page.tsx server components
export * from "../query-keys";