import { PatientAction } from "@/context/patients/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dispatch } from "react";
import { registerPatient } from "../patient.actions";
import { toast } from "@/hooks/use-toast";
import { Patient } from "./types";

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
    // const updatePatientMutation = useMutation({
    //     mutationFn: ({ id, updates}: { id: string, updates: Partial<Patient>}) =>
    // })

    return {
        registerPatient: registerPatientMutation
    }
}