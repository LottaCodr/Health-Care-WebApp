import React, { useReducer, createContext, useContext, useEffect } from 'react';
import { Appointment } from '@/types/appointments';
import { fetchAppointments } from '@/actions/appointments/appointment.action';
import { useQuery } from '@tanstack/react-query';

type State = {
    appointments: Appointment[]
    loading: boolean
}

type Action =
    | { type: 'SET_APPOINTMENTS', payload: Appointment[] }
    | { type: 'ADD_APPOINTMENT', payload: Appointment }
    | { type: 'UPDATE_APPOINTMENT', payload: Appointment }
    | { type: 'DELETE_APPOINTMENT', payload: string }
    | { type: 'SET_LOADING', payload: boolean }

export const initialState: State = {
    appointments: [],
    loading: false
}

export function reducer(state: State, action: Action): State {
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

const AppointmentContext = createContext<{ state: State; dispatch: React.Dispatch<Action> }>({ state: initialState, dispatch: () => null })

export const useRealTimeAppointments = () => useContext(AppointmentContext)

export const AppointmentProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(reducer, initialState)
    const realTimeAppointments = useRealTimeAppointments()
    const { data, isPending } = useQuery({
        queryKey: ['appointments'],
        queryFn: fetchAppointments
    })

    useEffect(() => {
        if (data) {
            dispatch({ type: 'SET_APPOINTMENTS', payload: data })
        }
    }, [data])

    useEffect(() => {
        if (realTimeAppointments) {
            dispatch({ type: "SET_APPOINTMENTS", payload: realTimeAppointments.state.appointments })
        }
    }, [realTimeAppointments])

    return (
        <AppointmentContext.Provider value={{ state, dispatch }}>
            {children}
        </AppointmentContext.Provider>
    )
}