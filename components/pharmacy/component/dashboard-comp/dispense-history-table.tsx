import React from 'react';

export default function DispensedHistoryTable({ data }: { data: any[] }) {
    return (
        <div className="bg-white border rounded-xl overflow-auto mt-6">
            <h2 className="text-lg font-semibold p-4">Dispensed History</h2>
            <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-4 py-3 text-left">Patient</th>
                        <th className="px-4 py-3 text-left">Medications</th>
                        <th className="px-4 py-3 text-left">Dispensed By</th>
                        <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center">No history</td></tr>
                    ) : data.map((item) => (
                        <tr key={item.id} className="border-t">
                            <td className="px-4 py-3">{item.patientName}</td>
                            <td className="px-4 py-3">{item.medications.join(', ')}</td>
                            <td className="px-4 py-3">{item.dispensedBy}</td>
                            <td className="px-4 py-3">{item.date}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}