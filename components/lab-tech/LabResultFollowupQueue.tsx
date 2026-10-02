"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, CheckCircle2, Loader2, MessageCircle, Phone, RefreshCw } from "lucide-react";
import { displayHospitalNumber } from "@/lib/hospital-number";
import {
    useLabResultFollowups,
    useMarkLabResultDelivered,
} from "@/hooks/emr/use-lab";
import type { LabResultDeliveryMethod } from "@/lib/services/lab.service";

const CONTACT_METHODS: Array<{ value: LabResultDeliveryMethod; label: string }> = [
    { value: "phone", label: "Phone call" },
    { value: "sms_whatsapp", label: "SMS / WhatsApp" },
    { value: "in_person", label: "In person" },
];

export default function LabResultFollowupQueue() {
    const { data: followups = [], isLoading, isError, refetch, isFetching } = useLabResultFollowups();
    const delivery = useMarkLabResultDelivered();
    const [methods, setMethods] = useState<Record<string, LabResultDeliveryMethod>>({});

    const confirmDelivery = async (requestId: string, testName: string) => {
        const method = methods[requestId] ?? "phone";
        const methodLabel = CONTACT_METHODS.find((item) => item.value === method)?.label ?? "the selected method";
        if (!window.confirm(`Confirm that you have contacted the patient about the ${testName} result using ${methodLabel}?`)) return;

        try {
            await delivery.mutateAsync({ requestId, method });
            toast.success("Patient result contact recorded.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not record patient contact.");
        }
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/70 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <BellRing size={15} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-gray-900">Deferred result patient follow-up</h2>
                        <p className="text-[10px] text-gray-500">Results are saved to the chart; confirm contact for patients without a successful portal alert.</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                        {followups.length}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => void refetch()}
                    disabled={isFetching}
                    aria-label="Refresh deferred-result follow-ups"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                    <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="p-4 sm:p-5">
                {isLoading ? (
                    <p className="py-5 text-center text-xs text-gray-400">Loading patient follow-ups…</p>
                ) : isError ? (
                    <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                        Could not load deferred-result follow-ups. Do not assume patient contact has been completed.
                    </p>
                ) : followups.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-emerald-700">
                        <CheckCircle2 size={15} /> No deferred-result patient contact is waiting.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {followups.map((item) => {
                            const patient = item.patients;
                            const testName = String(item.test_type ?? "Lab result").replace(/^\[RADIOLOGY\]\s*/i, "");
                            return (
                                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-bold text-gray-900">{patient?.name ?? "Patient"}</p>
                                            <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 font-mono text-[10px] text-gray-500">
                                                HN {displayHospitalNumber(patient?.hospital_number)}
                                            </span>
                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                                Contact pending
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs font-semibold text-gray-700">{testName}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
                                            <span>Result filed {item.completed_at ? new Date(item.completed_at).toLocaleString() : ""}</span>
                                            {patient?.phone && (
                                                <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline">
                                                    <Phone size={10} /> {patient.phone}
                                                </a>
                                            )}
                                            {patient?.portal_enabled && (
                                                <span className="inline-flex items-center gap-1 text-indigo-700">
                                                    <MessageCircle size={10} /> Portal enabled; verify the alert or contact manually
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2 sm:w-52">
                                        <select
                                            value={methods[item.id] ?? "phone"}
                                            onChange={(event) => setMethods((current) => ({
                                                ...current,
                                                [item.id]: event.target.value as LabResultDeliveryMethod,
                                            }))}
                                            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs"
                                            aria-label={`Patient contact method for ${testName}`}
                                        >
                                            {CONTACT_METHODS.map((method) => (
                                                <option key={method.value} value={method.value}>{method.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => void confirmDelivery(item.id, testName)}
                                            disabled={delivery.isPending}
                                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {delivery.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                            Confirm contact sent
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
                    Only confirm after the patient has actually been contacted. Portal-enabled patients are notified automatically when the result is filed; the result itself remains in their health record.
                </p>
            </div>
        </section>
    );
}
