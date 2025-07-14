import { Patient, PatientAction } from "@/context/patients/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dispatch } from "react";
import { registerPatient } from "../patient.actions";
import { toast } from "@/hooks/use-toast";
import { updatePatient } from "./get.patients";

export const usePatientMutations = (dispatch: Dispatch<PatientAction>) => {
    const queryClient = useQueryClient()


    const registerPatientMutation = useMutation({
        mutationFn: registerPatient,
        onSuccess: (data) => {
            dispatch({ type: "ADD_PATIENT", payload: data });
            toast({ title: "Registration Successful" })
        },


        onSettled() {
            queryClient.invalidateQueries({ queryKey: ['patients'] })
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: 'Failed to register patient.',
                variant: 'default',
            });
        }
    })

    //TODO: create update and delete mutations
    const updatePatientMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<Patient> }) => {
            // Ensure updatePatient returns a Patient, not null
            const updated = await updatePatient(id, updates);
            if (!updated) throw new Error("Update failed");
            // Convert Document to Patient safely
            // If updatePatient returns a Document, map its fields to Patient
            // Here, we assume updated has all Patient fields
            // If not, you may need to map fields explicitly
            return updated as unknown as Patient;
        },
        onSuccess: (data) => {
            if (data) {
                dispatch({ type: "UPDATE_PATIENT", payload: data });
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
            queryClient.invalidateQueries({ queryKey: ['patients'] })
        },
        onMutate: async (data) => {
            const prev = queryClient.getQueryData<Patient[]>(['patients']);
            const prevPatient = prev?.find(p => p.$id === data.id);
            const updates = data.updates;
            if (prevPatient) {
                const optimistic = {
                    ...prevPatient, ...updates
                }
                dispatch({ type: "UPDATE_PATIENT", payload: optimistic })
            } return { prevPatient }
        },

    })

    return {
        registerPatient: registerPatientMutation,
        updatePatient: updatePatientMutation
    }
}