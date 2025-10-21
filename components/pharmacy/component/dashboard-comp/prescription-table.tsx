import React from 'react';
import DispenseModal from './dispense-modal';
import { PharmacyRecord } from '@/actions/pharmacy/get.prescription';

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700',
    dispensed: 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700',
    cancelled: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700',
};

function StatusBadge({ status }: { status: string }) {
    const color = statusColors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color} capitalize transition-all duration-200`}>
            {status}
        </span>
    );
}

function formatDate(dateString?: string) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function PrescriptionTable({ data, isLoading }: { data: PharmacyRecord[]; isLoading: boolean }) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-gray-700 rounded-2xl w-full overflow-x-auto shadow-lg">
            <table className="min-w-full text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <thead>
                    <tr className="bg-red-50 dark:bg-gray-800 border-b border-red-100 dark:border-gray-700">
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Patient</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Doctor</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Medications</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Instructions</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Created</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Status</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 dark:text-red-200 tracking-wide uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={7} className="p-12 text-center text-red-500">
                                <div className="flex flex-col items-center gap-3">
                                    <span className="inline-block w-8 h-8 border-4 border-red-200 border-t-red-500 rounded-full animate-spin"></span>
                                    <span className="font-medium text-red-600">Loading prescriptions...</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-12 text-center text-red-300">
                                <div className="flex flex-col items-center gap-3">
                                    <svg width="40" height="40" fill="none" className="mx-auto mb-2 text-red-200" viewBox="0 0 24 24">
                                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1-7v-4h2v4h-2zm0 2h2v2h-2v-2z" fill="currentColor" />
                                    </svg>
                                    <span className="text-red-500 font-medium">No prescriptions found</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.map((prescription) => (
                        <tr
                            key={prescription.id}
                            className={`border-t group hover:bg-red-50/40 transition-colors`}
                        >
                            {/* Patient */}
                            <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    <span className="inline-block w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold uppercase shadow-sm border border-red-200">
                                        {prescription.patientName?.[0] || "?"}
                                    </span>
                                    <span className="text-base">{prescription.patientName}</span>
                                </div>
                            </td>
                            {/* Doctor */}
                            <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    <span className="inline-block w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-semibold uppercase text-xs border border-red-200">
                                        {prescription.doctorName?.[0] || "?"}
                                    </span>
                                    <span className="text-base">{prescription.doctorName}</span>
                                </div>
                            </td>
                            {/* Medications */}
                            <td className="px-6 py-4 text-gray-700 max-w-xs">
                                <div className="flex flex-col gap-1">
                                    <ul className="list-disc pl-5 space-y-1">
                                        {prescription.doctorPrescription
                                            ? prescription.doctorPrescription.split(',').map((med: string, medIdx: number) => (
                                                <li
                                                    key={`${prescription.id}-med-${medIdx}`}
                                                    className="text-xs text-gray-800 bg-red-50/60 rounded px-2 py-1 inline-block"
                                                    title={med.trim()}
                                                >
                                                    {med.trim()}
                                                </li>
                                            ))
                                            : <li className="text-xs text-gray-400 italic">No medications</li>
                                        }
                                    </ul>
                                    {/* Show full prescription in tooltip on hover if long */}
                                    {prescription.doctorPrescription && prescription.doctorPrescription.length > 40 && (
                                        <span className="text-xs text-gray-400 truncate" title={prescription.doctorPrescription}>
                                            {prescription.doctorPrescription}
                                        </span>
                                    )}
                                </div>
                            </td>
                            {/* Doctor Instructions */}
                            <td className="px-6 py-4 text-gray-700 max-w-xs">
                                <div className="relative group">
                                    <span
                                        className={`block text-xs ${prescription.doctorInstructions ? "text-gray-800" : "text-gray-400 italic"}`}
                                        title={prescription.doctorInstructions || "No instructions"}
                                    >
                                        {prescription.doctorInstructions
                                            ? prescription.doctorInstructions.length > 50
                                                ? prescription.doctorInstructions.slice(0, 50) + "..."
                                                : prescription.doctorInstructions
                                            : "No instructions"}
                                    </span>
                                    {/* Tooltip for full instructions */}
                                    {prescription.doctorInstructions && prescription.doctorInstructions.length > 50 && (
                                        <span className="absolute z-10 left-0 mt-1 w-64 p-2 bg-white border border-red-200 rounded shadow-lg text-xs text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                                            {prescription.doctorInstructions}
                                        </span>
                                    )}
                                </div>
                            </td>
                            {/* Created At */}
                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                <span className="text-xs" title={prescription.createdAt || ""}>
                                    {formatDate(prescription.createdAt)}
                                </span>
                            </td>
                            {/* Status */}
                            <td className="px-6 py-4">
                                <StatusBadge status={prescription.status} />
                            </td>
                            {/* Actions */}
                            <td className="px-6 py-4">
                                <DispenseModal prescription={prescription} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}