import { getAllStaffs } from '@/actions/staff/get.staff';
import { Staff } from '@/types/appwrite.types';
import { useQuery } from '@tanstack/react-query';
import React, { useReducer, createContext, useContext, useEffect } from 'react';


type State = {
    employees: Staff[]
    loading: boolean
}

type Action =
    | { type: 'SET_EMPLOYEES', payload: Staff[] }
    | { type: 'ADD_EMPLOYEE', payload: Staff }
    | { type: 'UPDATE_EMPLOYEE', payload: Staff }
    | { type: 'DELETE_EMPLOYEE', payload: string }
    | { type: 'SET_LOADING', payload: boolean }

export const initialState: State = {
    employees: [],
    loading: false
}

export function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "SET_EMPLOYEES":
            return { ...state, employees: action.payload }
        case "UPDATE_EMPLOYEE":
            return { ...state, employees: state.employees.map(e => e.$id == action.payload.$id ? action.payload : e) }
        case "DELETE_EMPLOYEE":
            return { ...state, employees: state.employees.filter((e) => e.$id !== action.payload) }
        case "ADD_EMPLOYEE":
            return { ...state, employees: [...state.employees, action.payload] }
        case "SET_LOADING":
            return { ...state, loading: action.payload }
        default:
            return state

    }
}

const EmployeeContext = createContext<{ state: State; dispatch: React.Dispatch<Action> }>({ state: initialState, dispatch: () => null })

export const useEmployeesContext = () => useContext(EmployeeContext)

export const EmployeeProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(reducer, initialState)
    const { data, isPending } = useQuery({
        queryKey: ['employees'],
        queryFn: getAllStaffs
    })
    useEffect(() => {
        dispatch({ type: 'SET_LOADING', payload: isPending })

    }, [isPending])

    useEffect(() => {
        if (data) {
            dispatch({ type: 'SET_EMPLOYEES', payload: data });
        }
    }, [data]);

    return (
        <EmployeeContext.Provider value={{ state, dispatch }}>
            {children}
        </EmployeeContext.Provider>
    )

}

