import { useState, useEffect, useCallback } from "react";
import * as SS from "@/lib/services/staff.service";


interface S<T> { data: T; loading: boolean; error: Error | null; }


export function useAllStaff() {
    const [s, set] = useState<S<any[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        set({ data: [], loading: true, error: null });
        SS.getAllStaffs()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function useStaffByRole(role: string) {
    const [s, set] = useState<S<any[]>>({ data: [], loading: true, error: null });
    useEffect(() => {
        if (!role) return;
        set({ data: [], loading: true, error: null });
        SS.getStaffByRole(role)
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, [role]);
    return s;
}

export function useCreateStaff() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (data: Parameters<typeof SS.createStaff>[0]) => {
        setLoading(true);
        try { return await SS.createStaff(data); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useUpdateStaff() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string, updates: Parameters<typeof SS.updateStaff>[1]) => {
        setLoading(true);
        try { return await SS.updateStaff(id, updates); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useDeleteStaff() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string) => {
        setLoading(true);
        try { return await SS.deleteStaff(id); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}