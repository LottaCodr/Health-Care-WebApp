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
    getNursingActionById,
    getLabRequestById,
    getAllPatients,
} from "@/lib/supabase-service";

// Type for hook state management
interface UseAsyncState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

/**
 * PATIENT HOOKS
 */

export function usePatient(patientId: string, options?: { enabled?: boolean }) {
    const [state, setState] = useState<UseAsyncState<Patient>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        // FIX: respect the enabled option and guard empty patientId
        if (!patientId || options?.enabled === false) {
            setState({ data: null, loading: false, error: null });
            return;
        }

        const fetchPatient = async () => {
            setState({ data: null, loading: true, error: null });
            try {
                const patient = await getPatientById(patientId);
                if (patient) {
                    setState({ data: patient as unknown as Patient, loading: false, error: null });
                } else {
                    setState({ data: null, loading: false, error: new Error("Patient not found") });
                }
            } catch (err) {
                // FIX: was referencing imported `error` from "console" instead of the caught error
                setState({ data: null, loading: false, error: err as Error });
            }
        };

        fetchPatient();
    }, [patientId, options?.enabled]);

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

export function useNursingActionsByPatient(patientId: string, p0: { enabled: boolean; }) {
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

    const mutate = useCallback(async (actionData: Parameters<typeof createNursingAction>[0]) => {
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

    const mutate = useCallback(async (actionId: string, updates: Parameters<typeof updateNursingAction>[1]) => {
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

export function usePrescriptionsByPatient(patientId: string) {
    const [state, setState] = useState<UseAsyncState<Prescription[]>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!patientId) {
            setState({ data: null, loading: false, error: null });
            return;
        }

        const fetch = async () => {
            setState({ data: null, loading: true, error: null });
            try {
                const prescriptions = await listPrescriptionsByPatient(patientId);
                setState({ data: prescriptions, loading: false, error: null });
            } catch (err) {
                setState({ data: null, loading: false, error: err as Error });
            }
        };

        fetch();
    }, [patientId]);

    return state;
}

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