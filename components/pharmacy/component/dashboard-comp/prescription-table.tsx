import React from 'react';
import DispenseModal from './dispense-modal';

export default function PrescriptionTable({ data, isLoading }: { data: any[]; isLoading: boolean }) {
    return (
        <div className="bg-white border rounded-xl overflow-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-4 py-3 text-left">Patient</th>
                        <th className="px-4 py-3 text-left">Doctor</th>
                        <th className="px-4 py-3 text-left">Medications</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                    ) : data.length === 0 ? (
                        <tr><td colSpan={5} className="p-4 text-center">No prescriptions</td></tr>
                    ) : data.map((prescription) => (
                        <tr key={prescription.id} className="border-t">
                            <td className="px-4 py-3">{prescription.patientName}</td>
                            <td className="px-4 py-3">{prescription.doctorName}</td>
                            <td className="px-4 py-3">{prescription.medications.join(', ')}</td>
                            <td className="px-4 py-3">{prescription.status}</td>
                            <td className="px-4 py-3">
                                <DispenseModal prescription={prescription} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}