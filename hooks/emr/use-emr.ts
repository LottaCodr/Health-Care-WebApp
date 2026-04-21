

// Patients
export {
    usePatient,
    usePatientsByStatus,
    useSearchPatients,
    useAllPatients,
    useUpdatePatientStatus,
    useCreatePatient,
} from "./use-patients";

// Consultations
export {
    useConsultationsByPatient,
    useConsultationsByDoctor,
    useCreateConsultation,
    useUpdateConsultation,
    useDeleteConsultation,
} from "./use-consultations";

// Lab + Lab Test Catalog
export {
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

// Pharmacy + Drug Catalog
export {
    
    usePrescriptionsByPatient,
    usePendingPrescriptions,
    useCreatePrescription,
    useUpdatePrescription,
    useCreateDispensingRecord,
    useDispensingRecordsByPatient,
    useDrugInventory,
    useDrugCatalog,
    useActiveDrugs,
    useUpsertDrug,
    useDeleteDrug,
    useRestockDrug,
    useToggleDrugActive,
} from "./use-pharmacy";

// Nursing + Payments + Staff (split from one file for brevity)
export {
    usePendingNursingActions,
    useNursingActionsByPatient,
    useCreateNursingAction,
    useUpdateNursingAction,
} from "./use-nursing";

// Staff
export {
    useAllStaff,
    useStaffByRole,
    useCreateStaff,
    useUpdateStaff,
    useDeleteStaff,
} from "./use-staff";

//payment
export {
    usePendingPayments,
    usePaymentsByPatient,
    useCreatePayment,
    useConfirmPayment,
} from "./use-payment";