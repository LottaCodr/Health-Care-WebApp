
import React, { useReducer, createContext, useContext, useEffect, useMemo } from 'react';
import { fetchAppointments } from '@/actions/appointments/appointment.action';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Appointment, AppointmentStatus } from '@/actions/appointments/types';



type State = {
    appointments: Appointment[]
    loading: boolean
}

export type AppointmentAction =
    | { type: 'SET_APPOINTMENTS', payload: Appointment[] }
    | { type: 'ADD_APPOINTMENT', payload: Appointment }
    | { type: 'UPDATE_APPOINTMENT', payload: Appointment }
    | { type: 'DELETE_APPOINTMENT', payload: string }
    | { type: 'SET_LOADING', payload: boolean }

export const initialState: State = {
    appointments: [],
    loading: false
}

export function reducer(state: State, action: AppointmentAction): State {
    switch (action.type) {

        case 'SET_APPOINTMENTS':
            return { ...state, appointments: action.payload }
        case 'ADD_APPOINTMENT':
            return { ...state, appointments: [...state.appointments, action.payload] }
        case 'UPDATE_APPOINTMENT':
            return { ...state, appointments: state.appointments.map(a => a.id == action.payload.id ? action.payload : a) }
        case 'DELETE_APPOINTMENT':
            return { ...state, appointments: state.appointments.filter((a) => a.id !== action.payload) }
        case 'SET_LOADING':
            return { ...state, loading: action.payload }
        default:
            return state
    }

}

const AppointmentContext = createContext<{ state: State; dispatch: React.Dispatch<AppointmentAction> }>({ state: initialState, dispatch: () => null })

export const useRealTimeAppointments = () => {
    const context = useContext(AppointmentContext);
    if (!context) throw new Error("useRealTimeAppointments must be used within AppointmentProvider");
    return context;
}

export const AppointmentProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(reducer, initialState)

    const { data, isPending, isError, error } = useQuery({
        queryKey: ['appointments'],
        queryFn: fetchAppointments
    })

    useEffect(() => {
        dispatch({ type: 'SET_LOADING', payload: isPending })

        if (isError) {
            toast({
                title: "Error fetching appointments",
                description: String(error),
                variant: "destructive",
            });
        }
        function normalizeAppointment(a: Appointment): Appointment {
            return {
                id: a.id,
                patientId: a.patient?.$id || '',
                doctor: a.patient?.primaryPhysician || '',
                doctorId: a.patient?.$izd ?? "",
                doctorName: a.patient?.primaryPhysician || '',
                patientName: a.patient?.name || "Unknown Patient",
                patient: a.patient,
                date: a.createdAt,
                time: a.createdAt,
                status: a.status as AppointmentStatus,
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
                notes: a.notes || "",
                reason: a.reason || "",
                durationMinutes: a.durationMinutes ?? undefined, // optional
            };
        }

        if (data) {
            dispatch({ type: 'SET_APPOINTMENTS', payload: data?.map(normalizeAppointment) })
        }

        console.log('the appointments:', normalizeAppointment)
        console.log('the loading appointments:', isPending)
    }, [data, isPending, isError])

    const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

    return (
        <AppointmentContext.Provider value={value}>
            {children}
        </AppointmentContext.Provider>
    )
}