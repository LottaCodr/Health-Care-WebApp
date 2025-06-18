import React from 'react';
import { Appointment } from '@/actions/appointments/types';
import { exportToCSV, exportToPDF } from '@/utils/export';

interface ExportButtonsProps {
    appointments: Appointment[];
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ appointments }) => (
    <div className="flex gap-2">
        <button onClick={() => exportToCSV(appointments)} className="bg-green-500 text-white px-3 py-2 rounded">Export CSV</button>
        <button onClick={() => exportToPDF(appointments)} className="bg-red-500 text-white px-3 py-2 rounded">Export PDF</button>
    </div>
);

export default ExportButtons;