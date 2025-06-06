import React, { useReducer, createContext, useContext, Dispatch, useEffect } from 'react';
import { Appointment } from '@/types/appointments';
import { fetchAppointments } from '@/actions/appointments/get.appointment';

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
            return { ...state, appointments: [action.payload] }
        case 'UPDATE_APPOINTMENT':
            return { ...state, appointments: [action.payload] }
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

    useEffect(() => {
        dispatch({ type: 'SET_LOADING', payload: true })
        fetchAppointments().then((data) => {
            dispatch({ type: 'SET_APPOINTMENTS', payload: data })
        }).finally(() => {
            dispatch({ type: 'SET_LOADING', payload: false })
        })
    }, [])

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