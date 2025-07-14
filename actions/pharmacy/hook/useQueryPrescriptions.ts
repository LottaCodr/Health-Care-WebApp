import { useQuery } from "@tanstack/react-query";
import { getPrescriptions } from "../get.prescription";

export function useQueryPrescriptions() {
    return useQuery({
        queryKey: ["prescriptions"],
        queryFn: getPrescriptions,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}