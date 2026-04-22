"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffKeys } from "../query-keys";
import * as SS from "@/lib/services/staff.service";
import type { Staff } from "@/types/models";

const STALE = 5 * 60_000;  // staff list changes rarely — 5min stale
const GC_TIME = 10 * 60_000;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAllStaff() {
    return useQuery({
        queryKey: staffKeys.all(),
        queryFn: SS.getAllStaffs,
        staleTime: STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useStaff(id: string) {
    return useQuery({
        queryKey: staffKeys.detail(id),
        queryFn: () => SS.getStaffById(id),
        enabled: !!id,
        staleTime: STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useStaffByRole(role: string) {
    return useQuery({
        queryKey: staffKeys.byRole(role),
        queryFn: () => SS.getStaffByRole(role),
        enabled: !!role,
        staleTime: STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateStaff() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof SS.createStaff>[0]) =>
            SS.createStaff(data),

        onSuccess: (staff) => {
            qc.setQueryData(staffKeys.detail(staff.id), staff);
            qc.invalidateQueries({ queryKey: staffKeys.all() });
            qc.invalidateQueries({ queryKey: staffKeys.byRole(staff.role) });
        },
    });
}

export function useUpdateStaff() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Staff> }) =>
            SS.updateStaff(id, updates),

        onMutate: async ({ id, updates }) => {
            await qc.cancelQueries({ queryKey: staffKeys.detail(id) });
            const previous = qc.getQueryData<Staff>(staffKeys.detail(id));
            if (previous) qc.setQueryData(staffKeys.detail(id), { ...previous, ...updates });
            return { previous, id };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(staffKeys.detail(ctx.id), ctx.previous);
        },

        onSuccess: (updated) => {
            qc.setQueryData(staffKeys.detail(updated.id), updated);
            qc.invalidateQueries({ queryKey: staffKeys.all() });
            qc.invalidateQueries({ queryKey: staffKeys.byRole(updated.role) });
        },
    });
}

export function useDeleteStaff() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => SS.deleteStaff(id),

        onMutate: async (id) => {
            const previous = qc.getQueryData<Staff[]>(staffKeys.all());
            qc.setQueryData<Staff[]>(staffKeys.all(), (old = []) => old.filter(s => s.id !== id));
            return { previous };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(staffKeys.all(), ctx.previous);
        },

        onSettled: () => {
            qc.invalidateQueries({ queryKey: staffKeys.all() });
        },
    });
}