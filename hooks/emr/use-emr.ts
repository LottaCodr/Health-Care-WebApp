
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

// Lab requests + lab test catalog (NON-radiology)
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

// Radiology (separate domain — own hooks, own cache keys)
export {
    useRadiologyRequest,
    useRadiologyRequestsByPatient,
    usePendingRadiologyRequests,
    useCompletedRadiologyRequests,
    useCreateRadiologyRequest,
    useSubmitRadiologyReport,
} from "./use-radiology";

// Nursing
export {
    usePendingNursingActions,
    useCompletedNursingActions,
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
    useRecordDeposit,
    useSettleAllPatientBills,
    useSettleAllPendingBills,
    usePatientDepositCredit,
} from "./use-payment";

// Doctor quick routing (no consultation required)
export { useRoutePatient } from "./use-route-patient";

// Pharmacy — prescriptions + drug catalog + inventory
export {
    usePrescription,
    usePrescriptionsByPatient,
    usePendingPrescriptions,
    useCompletedPrescriptionsToday,
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

// Care Team & Attendance
export {
    usePatientCareTeam,
    useBatchCareTeam,
} from "./use-care-team";

// Query keys — export for prefetching in server components / page.tsx
export * from "../query-keys";

// Record amendment window (24h) — amending your own record + correction notes
export {
    useAmendRecord,
    useAddRecordAddendum,
    useRecordAddenda,
    amendmentKeys,
    amendmentErrorMessage,
    isLockedError,
} from "./use-amendments";
