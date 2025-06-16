'use client';

import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Appointment, } from '@/types/appwrite.types';
import { AppointmentStatus } from '@/types/appointments';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Appointment) => void;
    initialData?: Appointment | null;
}

const defaultAppointment = (): Appointment => ({
    $id: uuidv4(), // Required by Appwrite type
    $collectionId: '',
    $databaseId: '',
    $createdAt: new Date().toISOString(),
    $updatedAt: '',
    $permissions: [],

    id: uuidv4(),
    patientId: '',
    doctor: '',
    patientName: '',
    doctorId: '',
    doctorName: '',
    date: '',
    time: '',
    status: 'upcoming',
    createdAt: new Date().toISOString(),
});


const AppointmentModal: React.FC<AppointmentModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}) => {
    const [formData, setFormData] = useState<Appointment>(defaultAppointment);

    useEffect(() => {
        setFormData(initialData ?? defaultAppointment());
    }, [initialData, isOpen]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        const { patientName, doctor, date, time } = formData;

        if (!patientName || !doctor || !date || !time) {
            alert('Please fill in all required fields.');
            return;
        }

        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="bg-white p-6 rounded shadow-md w-full max-w-md space-y-4">
                <h2 id="modal-title" className="text-xl font-bold">
                    {initialData ? 'Edit' : 'New'} Appointment
                </h2>

                <input
                    name="patientName"
                    placeholder="Patient Name"
                    value={formData.patientName}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded"
                />
                <input
                    name="doctor"
                    placeholder="Doctor"
                    value={formData.doctor}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded"
                />
                <input
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded"
                />
                <input
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded"
                />
                <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded"
                >
                    {(['upcoming', 'completed', 'cancelled'] as AppointmentStatus[]).map(
                        (status) => (
                            <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                        )
                    )}
                </select>

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="text-gray-600 hover:underline">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentModal;
