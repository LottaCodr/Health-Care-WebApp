"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { labKeys, radiologyKeys, pharmacyKeys, patientKeys, consultationKeys } from "../query-keys";
import * as Routing from "@/lib/services/patient-routing.service";

/**
 * Doctor quick routing — send a patient to lab / radiology / pharmacist /
 * front desk / nurse WITHOUT creating a consultation (or on top of one).
 */
export function useRoutePatient() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: Routing.RoutePatientInput) =>
            Routing.routePatientWithoutConsultation(input),

        onSuccess: (result) => {
            // Department queues + patient lists all change after routing.
            qc.invalidateQueries({ queryKey: labKeys.all() });
            qc.invalidateQueries({ queryKey: radiologyKeys.all() });
            qc.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
            qc.invalidateQueries({ queryKey: patientKeys.detail(result.patientId) });
            qc.invalidateQueries({ queryKey: consultationKeys.byPatient(result.patientId) });
            qc.invalidateQueries({ queryKey: ["payments"] });
        },
    });
}
