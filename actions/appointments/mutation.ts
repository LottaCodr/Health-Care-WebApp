import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dispatch } from "react";
import { createAppointment, deleteAppointment, updateAppointment } from "./appointment.action";
import { AppointmentAction } from "@/context/appointments/appointment.reducer";
import { Appointment } from "./types";

export const useAppointmentMutations = (dispatch: Dispatch<AppointmentAction>) => {
    const queryClient = useQueryClient()

    const createAppointmentMutation = useMutation({
        mutationFn: createAppointment,
        onSuccess: (data) => {
            dispatch({ type: 'ADD_APPOINTMENT', payload: data })
        },

        onSettled() {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
        }
    })

    const updateAppointmentMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string, updates: Partial<Appointment> }) => updateAppointment(id, updates),

        onMutate: async ({ id, updates }) => {

            //save previous state incase of rollback needed
            const prev = queryClient.getQueryData<Appointment[]>(['appointments']);
            const prevAppointment = prev?.find(a => a.id === id);

            if (prevAppointment) {
                const optimistic = {
                    ...prevAppointment, ...updates
                }
                dispatch({ type: 'UPDATE_APPOINTMENT', payload: optimistic })
            } return { prevAppointment }
        },

        onSuccess: (data) => {
            dispatch({ type: 'UPDATE_APPOINTMENT', payload: data });
        },

        onError: (err, _, context) => {
            if (context?.prevAppointment) {
                dispatch({ type: 'UPDATE_APPOINTMENT', payload: context?.prevAppointment })
            }
        },
        onSettled() {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
        }
    })

    const deleteAppointmentMutation = useMutation({
        mutationFn: (id: string) => deleteAppointment(id),
        onSuccess: (_, id) => {
            dispatch({ type: 'DELETE_APPOINTMENT', payload: id })
        },
        onSettled() {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
        }

    })

    return {
        createAppointment: createAppointmentMutation,
        updateAppointment: updateAppointmentMutation,
        deleteAppointment: deleteAppointmentMutation
    }
}