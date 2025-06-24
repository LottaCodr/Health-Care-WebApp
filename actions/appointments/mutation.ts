import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dispatch } from "react";
import { createAppointment, deleteAppointment, updateAppointment } from "./appointment.action";
import { AppointmentAction } from "@/context/appointments/appointment.reducer";
import { Appointment } from "./types";
import { toast } from "@/hooks/use-toast";

export const useAppointmentMutations = (dispatch: Dispatch<AppointmentAction>) => {
    const queryClient = useQueryClient()

    const createAppointmentMutation = useMutation({
        mutationFn: createAppointment,
        onSuccess: (data) => {
            dispatch({ type: 'ADD_APPOINTMENT', payload: data });
            toast({ title: "Appointment Created" })

        },

        onSettled() {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
            // toast({ title: "Failed to create appointment", variant: "destructive" })

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
            toast({ title: "Appointment Updated Successfully" })

        },

        onError: (err, _, context) => {
            if (context?.prevAppointment) {
                dispatch({ type: 'UPDATE_APPOINTMENT', payload: context?.prevAppointment });
                toast({ title: "Failed to Update Appointment", variant: "destructive" })
            }
        },
        onSettled() {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
        }
    })

    const deleteAppointmentMutation = useMutation({
        mutationFn: (id: string) => deleteAppointment(id),
        onMutate: async (id: string) => {
            const prev = queryClient.getQueryData<Appointment[]>(['appointments']);
            const deleted = prev?.find(a => a.id === id)
            dispatch({ type: 'DELETE_APPOINTMENT', payload: id })
            return { deleted }
        },

        onError: (err, id, context) => {
            if (context?.deleted) {
                dispatch({ type: 'ADD_APPOINTMENT', payload: context.deleted })
                toast({
                    title: "Failed to delete appointment", description: "Something went wrong",
                    variant: "destructive"
                })
            }
        },
        onSuccess: (_, id) => {
            dispatch({ type: 'DELETE_APPOINTMENT', payload: id });
            toast({ title: "Appointment Deleted" })

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