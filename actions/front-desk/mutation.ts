import { Patient, PatientAction } from "@/context/patients/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dispatch } from "react";
import { toast } from "@/hooks/use-toast";
import { registerPatient, startVisit, updatePatient } from "./get.patients";
import { parseStringify } from "@/app/lib/utils";
import { RegisterUserParams } from "@/types";

import { useRouter } from "next/navigation";

export const usePatientMutations = (dispatch: Dispatch<PatientAction>) => {
    const queryClient = useQueryClient();
    const router = useRouter();

    // Utility: update the patient in cache
    const cacheAddPatient = (patient: Patient) => {
        queryClient.setQueryData<Patient[]>(['patients'], (prev) => {
            if (!prev) return [patient];
            // If patient already exists, replace
            if (prev.some(p => p.id === patient.id)) {
                return prev.map(p => (p.id === patient.id ? patient : p));
            }
            return [patient, ...prev];
        });
    };

    // Utility: update cache for patient
    const cacheUpdatePatient = (patient: Patient) => {
        queryClient.setQueryData<Patient[]>(['patients'], (prev) => {
            if (!prev) return [patient];
            return prev.map(p => (p.id === patient.id ? patient : p));
        });
    };

    const registerPatientMutation = useMutation({
        mutationFn: async (patientData: RegisterUserParams) => {
            router.push('/frontdesk/patient');
            const result = await registerPatient(patientData);
            if (!result || !result.id) {
                throw new Error("Failed to register patient.");
            }
            const { error } = await startVisit(result.id as string);

            if (!result || !result.id || error) {
                throw new Error("Failed to register patient.");
            }
            if (error) throw new Error(error);

            if (!result) {
                throw new Error("Registration Failed");
            }
            return result;
        },
        onSuccess: (data) => {
            dispatch({ type: "ADD_PATIENT", payload: data as Patient });
            cacheAddPatient(data as Patient);
            toast({
                title: "Registration Successful", description: "The visit has been successfully started.",
            });
        },
        onSettled() {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
        },
        onError: (error) => {
            toast({
                title: parseStringify(error),
                description: 'Failed to register patient.',
                variant: 'default',
            });
        }
    });

    const updatePatientMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<Patient> }) => {
            const updated = await updatePatient(id, updates);
            if (!updated) throw new Error("Update failed");
            return updated as unknown as Patient;
        },
        onSuccess: (data) => {
            if (data) {
                dispatch({ type: "UPDATE_PATIENT", payload: data });
                cacheUpdatePatient(data as Patient);
                toast({ title: "Patient updated successfully" });
            }
        },
        onError: (_error) => {
            toast({
                title: 'Error',
                description: 'Failed to update patient.',
                variant: 'default',
            });
        },
        onSettled() {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
        },
        onMutate: async (data) => {
            const prev = queryClient.getQueryData<Patient[]>(['patients']);
            const prevPatient = prev?.find(p => p.id === data.id);
            const updates = data.updates;
            if (prevPatient) {
                const optimistic = {
                    ...prevPatient, ...updates
                }
                dispatch({ type: "UPDATE_PATIENT", payload: optimistic });
                cacheUpdatePatient(optimistic as Patient);
            } 
            return { prevPatient };
        },

    });

    // To cache all mutations, just return the mutations with cache update handled inside mutations
    return {
        registerPatient: registerPatientMutation,
        updatePatient: updatePatientMutation
    };
}