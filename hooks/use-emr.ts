/**
 * Custom React Hooks for Hospital EMR
 * Centralized data fetching and mutations
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Patient,
    Consultation,
    Prescription,
    LabRequest,
    Payment,
    PatientStatus,
    UserRole,
} from "@/types/models";
import {
    getPatientById,
    listPatientsByStatus,
    searchPatients,
    createConsultation,
    getConsultationById,
    listConsultationsByPatient,
    listConsultationsByDoctor,
    updateConsultation,
    createPrescription,
    getPrescriptionById,
    listPrescriptionsByPatient,
    createLabRequest,
    listLabRequestsByPatient,
    listPendingLabRequests,
    listCompletedLabRequests,
    updateLabRequest,
    createPayment,
    listPaymentsByPatient,
    listPendingPayments,
    updatePatientStatus,
    createNursingAction,
    listPendingNursingActions,
    listNursingActionsByPatient,
    updateNursingAction,
    createDrugDispensingRecord,
    listDispensingByPatient,
    listPendingPrescriptions,
    updatePrescription,
    logAction,
    getNursingActionById,
    getLabRequestById,
    getAllPatients,
    listPrescriptionsByPharmacist,
    listLabRequestsForTech,
    listNursingActionsForNurse,
    completeLabRequest,
    completeNursingAction,
    dispensePrescription,
    routePatientAfterConsultation,
} from "@/lib/appwrite-service";

// Type for hook state management
interface UseAsyncState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

/**
 * PATIENT HOOKS
 */

export function usePatient(patientId: string) {
    const [state, setState] = useState<UseAsyncState<Patient>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!patientId) return;

        const fetchPatient = async () => {
            setState({ data: null, loading: true, error: null });
            try {
                const patient = await getPatientById(patientId);
                if (patient) {
                    setState({ data: patient, loading: false, error: null });
                } else {
                    setState({ data: null, loading: false, error: new Error("Patient not found") });
                }
            } catch (error) {
                setState({ data: null, loading: false, error: error as Error });
            }
        };

        fetchPatient();
    }, [patientId]);

    return state;
}

export function usePatientsByStatus(status: PatientStatus) {
    const [state, setState] = useState<UseAsyncState<Patient[]>>({
        data: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchPatients = async () => {
            setState({ data: [], loading: true, error: null });
            try {
                const patients = await listPatientsByStatus(status);
                setState({ data: patients, loading: false, error: null });
            } catch (error) {
                setState({ data: [], loading: false, error: error as Error });
            }
        };

        fetchPatients();
    }, [status]);

    return state;
}

export function useSearchPatients(query: string) {
    const [state, setState] = useState<UseAsyncState<Patient[]>>({
        data: [],
        loading: false,
        error: null,
    });

    useEffect(() => {
        if (!query.trim()) {
            setState({ data: [], loading: false, error: null });
            return;
        }

        const fetchPatients = async () => {
            setState({ data: [], loading: true, error: null });
            try {
                const patients = await searchPatients(query);
                setState({ data: patients, loading: false, error: null });
            } catch (error) {
                setState({ data: [], loading: false, error: error as Error });
            }
        };

        // Debounce search
        const timer = setTimeout(fetchPatients, 300);
        return () => clearTimeout(timer);
    }, [query]);

    return state;
}

/**
 * CONSULTATION HOOKS
 */

export function useConsultation(consultationId: string) {
    const [state, setState] = useState<UseAsyncState<Consultation>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!consultationId) return;

        const fetchConsultation = async () => {
            setState({ data: null, loading: true, error: null });
            try {
                const consultation = await getConsultationById(consultationId);
                if (consultation) {
                    setState({ data: consultation, loading: false, error: null });
                } else {
                    setState({ data: null, loading: false, error: new Error("Consultation not found") });
                }
            } catch (error) {
                setState({ data: null, loading: false, error: error as Error });
            }
        };

        fetchConsultation();
    }, [consultationId]);

    return state;
}

export function useConsultationsByPatient(patientId: string) {
    const [state, setState] = useState<UseAsyncState<Consultation[]>>({
        data: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!patientId) return;

        const fetchConsultations = async () => {
            setState({ data: [], loading: true, error: null });
            try {
                const consultations = await listConsultationsByPatient(patientId);
                setState({ data: consultations, loading: false, error: null });
            } catch (error) {
                setState({ data: [], loading: false, error: error as Error });
            }
        };

        fetchConsultations();
    }, [patientId]);

    return state;
}

export function useConsultationsByDoctor(doctorId: string) {
    const [state, setState] = useState<UseAsyncState<Consultation[]>>({
        data: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!doctorId) return;

        const fetchConsultations = async () => {
            setState({ data: [], loading: true, error: null });
            try {
                const consultations = await listConsultationsByDoctor(doctorId);
                setState({ data: consultations, loading: false, error: null });
            } catch (error) {
                setState({ data: [], loading: false, error: error as Error });
            }
        };

        fetchConsultations();
    }, [doctorId]);

    return state;
}

/**
 * LAB REQUEST HOOKS
 */

export function usePendingLabRequests() {
    const [state, setState] = useState<UseAsyncState<LabRequest[]>>({
        data: [],
        loading: true,
        error: null,
    });

    const refetch = useCallback(async () => {
        setState({ data: [], loading: true, error: null });
        try {
            const requests = await listPendingLabRequests();
            setState({ data: requests, loading: false, error: null });
        } catch (error) {
            setState({ data: [], loading: false, error: error as Error });
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { ...state, refetch };
}

export function useLabRequestsByPatient(patientId: string) {
    const [state, setState] = useState<UseAsyncState<LabRequest[]>>({
        data: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!patientId) return;

        const fetchLabRequests = async () => {
            setState({ data: [], loading: true, error: null });
            try {
                const requests = await listLabRequestsByPatient(patientId);
                setState({ data: requests, loading: false, error: null });
            } catch (error) {
                setState({ data: [], loading: false, error: error as Error });
            }
        };

        fetchLabRequests();
    }, [patientId]);

    return state;
}

/**
 * PAYMENT HOOKS
 */

export function usePendingPayments() {
    const [state, setState] = useState<UseAsyncState<Payment[]>>({
        data: [],
        loading: true,
        error: null,
    });

    const refetch = useCallback(async () => {
        setState({ data: [], loading: true, error: null });
        try {
            const payments = await listPendingPayments();
            setState({ data: payments, loading: false, error: null });
        } catch (error) {
            setState({ data: [], loading: false, error: error as Error });
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { ...state, refetch };
}

export function usePaymentsByPatient(patientId: string) {
    const [state, setState] = useState<UseAsyncState<Payment[]>>({
        data: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!patientId) return;

        const fetchPayments = async () => {
            setState({ data: [], loading: true, error: null });
            try {
                const payments = await listPaymentsByPatient(patientId);
                setState({ data: payments, loading: false, error: null });
            } catch (error) {
                setState({ data: [], loading: false, error: error as Error });
            }
        };

        fetchPayments();
    }, [patientId]);

    return state;
}

/**
 * MUTATION HOOKS
 */

export function useCreateConsultation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (consultationData: Parameters<typeof createConsultation>[0]) => {
        setLoading(true);
        setError(null);
        try {
            const consultation = await createConsultation(consultationData);
            setLoading(false);
            return consultation;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

export function useCreatePrescription() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (prescriptionData: Parameters<typeof createPrescription>[0]) => {
        setLoading(true);
        setError(null);
        try {
            const prescription = await createPrescription(prescriptionData);
            setLoading(false);
            return prescription;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

export function useCreateLabRequest() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (labRequestData: Parameters<typeof createLabRequest>[0]) => {
        setLoading(true);
        setError(null);
        try {
            const labRequest = await createLabRequest(labRequestData);
            setLoading(false);
            return labRequest;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

export function useCreatePayment() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (paymentData: Parameters<typeof createPayment>[0]) => {
        setLoading(true);
        setError(null);
        try {
            const payment = await createPayment(paymentData);
            setLoading(false);
            return payment;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

export function useUpdatePatientStatus() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (patientId: string, status: PatientStatus) => {
        setLoading(true);
        setError(null);
        try {
            const patient = await updatePatientStatus(patientId, status);
            setLoading(false);
            return patient;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

export function useUpdateConsultation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (consultationId: string, updates: Partial<Consultation>) => {
        setLoading(true);
        setError(null);
        try {
            const consultation = await updateConsultation(consultationId, updates);
            setLoading(false);
            return consultation;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

export function useUpdateLabRequest() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (labRequestId: string, updates: Partial<LabRequest>) => {
        setLoading(true);
        setError(null);
        try {
            const labRequest = await updateLabRequest(labRequestId, updates);
            setLoading(false);
            return labRequest;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

/**
 * NURSING ACTION HOOKS
 */

export function usePendingNursingActions() {
    const [state, setState] = useState<UseAsyncState<any[]>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchActions = async () => {
            setState({ data: null, loading: true, error: null });
            try {
                const actions = await listPendingNursingActions();
                setState({ data: actions, loading: false, error: null });
            } catch (error) {
                setState({ data: null, loading: false, error: error as Error });
            }
        };

        fetchActions();
    }, []);

    return state;
}

export function useNursingActionsByPatient(patientId: string) {
    const [state, setState] = useState<UseAsyncState<any[]>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!patientId) return;

        const fetchActions = async () => {
            setState({ data: null, loading: true, error: null });
            try {
                const actions = await listNursingActionsByPatient(patientId);
                setState({ data: actions, loading: false, error: null });
            } catch (error) {
                setState({ data: null, loading: false, error: error as Error });
            }
        };

        fetchActions();
    }, [patientId]);

    return state;
}

export function useCreateNursingAction() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (actionData: any) => {
        setLoading(true);
        setError(null);
        try {
            const action = await createNursingAction(actionData);
            setLoading(false);
            return action;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

export function useUpdateNursingAction() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (actionId: string, updates: any) => {
        setLoading(true);
        setError(null);
        try {
            const action = await updateNursingAction(actionId, updates);
            setLoading(false);
            return action;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

/**
 * LAB TECHNICIAN HOOKS
 */

// usePendingLabRequests is defined earlier with a refetch helper and returned there.

export function useCompletedLabRequests() {
    const [state, setState] = useState<UseAsyncState<LabRequest[]>>({
        data: null,
        loading: true,
        error: null,
    });

    const refetch = useCallback(async () => {
        setState({ data: null, loading: true, error: null });
        try {
            const requests = await listCompletedLabRequests();
            setState({ data: requests, loading: false, error: null });
        } catch (error) {
            setState({ data: null, loading: false, error: error as Error });
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { ...state, refetch };
}

export function useLabRequest(requestId: string) {
    const [state, setState] = useState<UseAsyncState<LabRequest>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!requestId) return;

        const fetchRequest = async () => {
            setState({ data: null, loading: true, error: null });
            try {
                const request = await getLabRequestById(requestId);
                if (request) {
                    setState({ data: request, loading: false, error: null });
                } else {
                    setState({ data: null, loading: false, error: new Error("Lab request not found") });
                }
            } catch (error) {
                setState({ data: null, loading: false, error: error as Error });
            }
        };

        fetchRequest();
    }, [requestId]);

    return state;
}

/**
 * PHARMACIST HOOKS
 */

export function usePendingPrescriptions() {
    const [state, setState] = useState<UseAsyncState<Prescription[]>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchPrescriptions = async () => {
            setState({ data: null, loading: true, error: null });
            try {
                const prescriptions = await listPendingPrescriptions();
                setState({ data: prescriptions, loading: false, error: null });
            } catch (error) {
                setState({ data: null, loading: false, error: error as Error });
            }
        };

        fetchPrescriptions();
    }, []);

    return state;
}

export function usePrescription(prescriptionId: string) {
    const [state, setState] = useState<UseAsyncState<Prescription>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!prescriptionId) return;

        const fetchPrescription = async () => {
            setState({ data: null, loading: true, error: null });
            try {
                const p = await getPrescriptionById(prescriptionId);
                if (p) setState({ data: p, loading: false, error: null });
                else setState({ data: null, loading: false, error: new Error("Prescription not found") });
            } catch (error) {
                setState({ data: null, loading: false, error: error as Error });
            }
        };

        fetchPrescription();
    }, [prescriptionId]);

    return state;
}

export function useUpdatePrescription() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (prescriptionId: string, updates: Partial<Prescription>) => {
        setLoading(true);
        setError(null);
        try {
            const prescription = await updatePrescription(prescriptionId, updates);
            setLoading(false);
            return prescription;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

export function useCreateDispensingRecord() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (dispensingData: any) => {
        setLoading(true);
        setError(null);
        try {
            const record = await createDrugDispensingRecord(dispensingData);
            setLoading(false);
            return record;
        } catch (err) {
            const error = err as Error;
            setError(error);
            setLoading(false);
            throw error;
        }
    }, []);

    return { mutate, loading, error };
}

export function useDispensingRecordsByPatient(patientId: string) {
    const [state, setState] = useState<UseAsyncState<any[]>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!patientId) return;

        const fetchRecords = async () => {
            setState({ data: null, loading: true, error: null });
            try {
                const records = await listDispensingByPatient(patientId);
                setState({ data: records, loading: false, error: null });
            } catch (error) {
                setState({ data: null, loading: false, error: error as Error });
            }
        };

        fetchRecords();
    }, [patientId]);

    return state;
}

/**
 * EXTENDED HOOKS FOR COMPLETE WORKFLOW
 */

/**
 * Get all patients (for queue management)
 */
export function useAllPatients() {
    const [state, setState] = useState<UseAsyncState<Patient[]>>({
        data: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchPatients = async () => {
            setState({ data: [], loading: true, error: null });
            try {
                const patients = await getAllPatients();
                setState({ data: patients, loading: false, error: null });
            } catch (error) {
                setState({ data: [], loading: false, error: error as Error });
            }
        };

        fetchPatients();
    }, []);

    return state;
}

/**
 * Get lab requests for a technician
 */
export function useLabRequestsForTech(techId: string) {
    const [state, setState] = useState<UseAsyncState<LabRequest[]>>({
        data: [],
        loading: true,
        error: null,
    });

    const refetch = useCallback(async () => {
        setState({ data: [], loading: true, error: null });
        try {
            const requests = await listLabRequestsForTech(techId);
            setState({ data: requests, loading: false, error: null });
        } catch (error) {
            setState({ data: [], loading: false, error: error as Error });
        }
    }, [techId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { ...state, refetch };
}

/**
 * Get nursing actions for a nurse
 */
export function useNursingActionsForNurse(nurseId: string) {
    const [state, setState] = useState<UseAsyncState<any[]>>({
        data: [],
        loading: true,
        error: null,
    });

    const refetch = useCallback(async () => {
        setState({ data: [], loading: true, error: null });
        try {
            const actions = await listNursingActionsForNurse(nurseId);
            setState({ data: actions, loading: false, error: null });
        } catch (error) {
            setState({ data: [], loading: false, error: error as Error });
        }
    }, [nurseId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { ...state, refetch };
}

/**
 * Get prescriptions for a pharmacist
 */
export function usePrescriptionsForPharmacist(pharmacistId: string) {
    const [state, setState] = useState<UseAsyncState<Prescription[]>>({
        data: [],
        loading: true,
        error: null,
    });

    const refetch = useCallback(async () => {
        setState({ data: [], loading: true, error: null });
        try {
            const prescriptions = await listPrescriptionsByPharmacist(pharmacistId);
            setState({ data: prescriptions, loading: false, error: null });
        } catch (error) {
            setState({ data: [], loading: false, error: error as Error });
        }
    }, [pharmacistId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { ...state, refetch };
}

/**
 * COMPLETION HOOKS
 */

/**
 * Hook to complete a lab request
 */
export function useCompleteLabRequest() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(
        async (labRequestId: string, results: string, patientId: string) => {
            setLoading(true);
            setError(null);
            try {
                const result = await completeLabRequest(labRequestId, results, patientId);
                setLoading(false);
                return result;
            } catch (err) {
                const error = err as Error;
                setError(error);
                setLoading(false);
                throw error;
            }
        },
        []
    );

    return { mutate, loading, error };
}

/**
 * Hook to complete a nursing action
 */
export function useCompleteNursingAction() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(
        async (actionId: string, patientId: string, completionNotes?: string) => {
            setLoading(true);
            setError(null);
            try {
                const result = await completeNursingAction(actionId, patientId, completionNotes);
                setLoading(false);
                return result;
            } catch (err) {
                const error = err as Error;
                setError(error);
                setLoading(false);
                throw error;
            }
        },
        []
    );

    return { mutate, loading, error };
}

/**
 * Hook to dispense a prescription
 */
export function useDispensePrescription() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(
        async (
            prescriptionId: string,
            patientId: string,
            pharmacistId: string,
            dispensedMedications: any[]
        ) => {
            setLoading(true);
            setError(null);
            try {
                const result = await dispensePrescription(
                    prescriptionId,
                    patientId,
                    pharmacistId,
                    dispensedMedications
                );
                setLoading(false);
                return result;
            } catch (err) {
                const error = err as Error;
                setError(error);
                setLoading(false);
                throw error;
            }
        },
        []
    );

    return { mutate, loading, error };
}

/**
 * Hook to route a patient after consultation
 */
export function useRoutePatientAfterConsultation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(
        async (
            patientId: string,
            hasNursingActions: boolean,
            hasLabRequests: boolean,
            hasPrescription: boolean
        ) => {
            setLoading(true);
            setError(null);
            try {
                const result = await routePatientAfterConsultation(
                    patientId,
                    hasNursingActions,
                    hasLabRequests,
                    hasPrescription
                );
                setLoading(false);
                return result;
            } catch (err) {
                const error = err as Error;
                setError(error);
                setLoading(false);
                throw error;
            }
        },
        []
    );

    return { mutate, loading, error };
}
