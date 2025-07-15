import React from 'react';
import DispenseModal from './dispense-modal';
import { PharmacyRecord } from '@/actions/pharmacy/get.prescription';

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
    dispensed: 'bg-green-50 text-green-800 border border-green-200',
    cancelled: 'bg-red-100 text-red-800 border border-red-300',
};

function StatusBadge({ status }: { status: string }) {
    const color = statusColors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color} capitalize transition-all duration-200`}>
            {status}
        </span>
    );
}

export default function PrescriptionTable({ data, isLoading }: { data: PharmacyRecord[]; isLoading: boolean }) {
    return (
        <div className="bg-white border border-red-200 rounded-2xl w-full overflow-x-auto shadow-lg">
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="bg-red-50 border-b border-red-100">
                        <th className="px-6 py-4 text-left font-bold text-red-700 tracking-wide uppercase">Patient</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 tracking-wide uppercase">Doctor</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 tracking-wide uppercase">Medications</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 tracking-wide uppercase">Status</th>
                        <th className="px-6 py-4 text-left font-bold text-red-700 tracking-wide uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={5} className="p-12 text-center text-red-500">
                                <div className="flex flex-col items-center gap-3">
                                    <span className="inline-block w-8 h-8 border-4 border-red-200 border-t-red-500 rounded-full animate-spin"></span>
                                    <span className="font-medium text-red-600">Loading prescriptions...</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-12 text-center text-red-300">
                                <div className="flex flex-col items-center gap-3">
                                    <svg width="40" height="40" fill="none" className="mx-auto mb-2 text-red-200" viewBox="0 0 24 24">
                                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1-7v-4h2v4h-2zm0 2h2v2h-2v-2z" fill="currentColor" />
                                    </svg>
                                    <span className="text-red-500 font-medium">No prescriptions found</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.map((prescription, idx) => (
                        <tr
                            key={prescription.id}
                            className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-red-50/40'} hover:bg-red-50/80 transition`}
                        >
                            <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    <span className="inline-block w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold uppercase shadow-sm border border-red-200">
                                        {prescription.patientName?.[0] || "?"}
                                    </span>
                                    <span className="text-base">{prescription.patientName}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    <span className="inline-block w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-semibold uppercase text-xs border border-red-200">
                                        {prescription.doctorName?.[0] || "?"}
                                    </span>
                                    <span className="text-base">{prescription.doctorName}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    {prescription.doctorPrescription.split(',').map((med: string, idx: number) => (
                                        <li key={idx} className="text-xs text-gray-800 bg-red-50/60 rounded px-2 py-1 inline-block">{med.trim()}</li>
                                    ))}
                                </ul>
                            </td>
                            <td className="px-6 py-4">
                                <StatusBadge status={prescription.status} />
                            </td>
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