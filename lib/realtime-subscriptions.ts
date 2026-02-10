/**
 * Real-time Subscriptions Service
 * Manages Appwrite real-time event subscriptions for live updates
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { client } from "@/lib/appwrite.config";
import { PatientStatus } from "@/types/models";

const DB_ID = process.env.NEXT_PUBLIC_DATABASE_ID!;

const COLLECTIONS = {
    PATIENTS: process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!,
    CONSULTATIONS: "consultations",
    LAB_REQUESTS: "lab_requests",
    PRESCRIPTIONS: "prescriptions",
    NURSING_ACTIONS: "nursing_actions",
    PAYMENTS: "payments",
};

interface RealtimeCallbacks {
    onPatientStatusChange?: (patientId: string, newStatus: PatientStatus) => void;
    onLabRequestUpdate?: (requestId: string, data: any) => void;
    onPrescriptionDispensed?: (prescriptionId: string) => void;
    onPaymentCompleted?: (paymentId: string) => void;
    onConsultationCreated?: (consultationId: string) => void;
    onNursingActionCompleted?: (actionId: string) => void;
}

export function useRealtimeSubscriptions(callbacks: RealtimeCallbacks) {
    const subscriptionsRef = useRef<(() => void)[]>([]);

    useEffect(() => {
        const subs: (() => void)[] = [];

        // Subscribe to patient status changes
        const patientSub = client.subscribe(
            `databases.${DB_ID}.collections.${COLLECTIONS.PATIENTS}.documents`,
            (message: any) => {
                if (message.events.includes("databases.*.collections.*.documents.*.update")) {
                    const payload = message.payload as any;
                    if (payload.status && callbacks.onPatientStatusChange) {
                        callbacks.onPatientStatusChange(payload.$id, payload.status);
                    }
                }
            }
        );
        subs.push(patientSub);

        // Subscribe to lab request updates
        const labSub = client.subscribe(
            `databases.${DB_ID}.collections.${COLLECTIONS.LAB_REQUESTS}.documents`,
            (message: any) => {
                if (message.events.includes("databases.*.collections.*.documents.*.update")) {
                    const payload = message.payload as any;
                    if (payload.status === "Completed" && callbacks.onLabRequestUpdate) {
                        callbacks.onLabRequestUpdate(payload.$id, payload);
                    }
                }
            }
        );
        subs.push(labSub);

        // Subscribe to prescription updates
        const prescriptionSub = client.subscribe(
            `databases.${DB_ID}.collections.${COLLECTIONS.PRESCRIPTIONS}.documents`,
            (message: any) => {
                if (message.events.includes("databases.*.collections.*.documents.*.update")) {
                    const payload = message.payload as any;
                    if (payload.status === "Dispensed" && callbacks.onPrescriptionDispensed) {
                        callbacks.onPrescriptionDispensed(payload.$id);
                    }
                }
            }
        );
        subs.push(prescriptionSub);

        // Subscribe to payment updates
        const paymentSub = client.subscribe(
            `databases.${DB_ID}.collections.${COLLECTIONS.PAYMENTS}.documents`,
            (message: any) => {
                if (message.events.includes("databases.*.collections.*.documents.*.create")) {
                    const payload = message.payload as any;
                    if (payload.status === "Completed" && callbacks.onPaymentCompleted) {
                        callbacks.onPaymentCompleted(payload.$id);
                    }
                }
            }
        );
        subs.push(paymentSub);

        // Subscribe to consultation creation
        const consultationSub = client.subscribe(
            `databases.${DB_ID}.collections.${COLLECTIONS.CONSULTATIONS}.documents`,
            (message: any) => {
                if (message.events.includes("databases.*.collections.*.documents.*.create")) {
                    const payload = message.payload as any;
                    if (callbacks.onConsultationCreated) {
                        callbacks.onConsultationCreated(payload.$id);
                    }
                }
            }
        );
        subs.push(consultationSub);

        // Subscribe to nursing action completion
        const nursingSub = client.subscribe(
            `databases.${DB_ID}.collections.${COLLECTIONS.NURSING_ACTIONS}.documents`,
            (message: any) => {
                if (message.events.includes("databases.*.collections.*.documents.*.update")) {
                    const payload = message.payload as any;
                    if (payload.status === "Completed" && callbacks.onNursingActionCompleted) {
                        callbacks.onNursingActionCompleted(payload.$id);
                    }
                }
            }
        );
        subs.push(nursingSub);

        subscriptionsRef.current = subs;

        return () => {
            // Cleanup subscriptions on unmount
            subs.forEach((unsubscribe) => {
                unsubscribe();
            });
        };
    }, [callbacks]);
}

/**
 * Hook to refetch data when specific events occur
 */
export function useRealtimeRefresh(onUpdate: () => void, eventTypes: string[]) {
    const timerRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        const handleUpdate = () => {
            // Debounce the refresh to avoid multiple rapid updates
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                onUpdate();
            }, 500);
        };

        handleUpdate();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [onUpdate]);
}
