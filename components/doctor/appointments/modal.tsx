'use client';

import { Appointment } from '@/types/appointments';
import React, { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Appointment) => void;
    initialData?: Appointment | null;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = React.useState<Appointment>(() => initialData ?? {
        id: uuidv4(),
        patientName: '',
        patientId: '',
        doctor: '',
        doctorId: '',
        doctorName: '',
        date: '',
        time: '',
        status: 'upcoming',
        createdAt: new Date().toISOString(),
    });

    // Sync with prop updates
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                id: uuidv4(),
                patientName: '',
                patientId: '',
                doctor: '',
                doctorId: '',
                doctorName: '',
                date: '',
                time: '',
                status: 'upcoming',
                createdAt: new Date().toISOString(),
            });
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-md w-full max-w-md space-y-4">
                <h2 className="text-xl font-bold">{initialData ? 'Edit' : 'New'} Appointment</h2>
                <input name="patientName" placeholder="Patient Name" value={formData.patientName} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
                <input name="doctor" placeholder="Doctor" value={formData.doctor} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
                <input name="date" type="date" value={formData.date} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
                <input name="time" type="time" value={formData.time} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
                <select name="status" value={formData.status} onChange={handleChange} className="w-full border px-3 py-2 rounded">
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="text-gray-600">Cancel</button>
                    <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentModal;
