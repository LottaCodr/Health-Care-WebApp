"use client"

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export interface HealthRecord {
    id: string;
    patientName: string;
    doctor: string;
    diagnosis: string;
    date: string; // ISO date string, e.g. "2025-05-22"
}

const HealthRecordsComponent = ({ role }: { role: 'admin' | 'doctor' | 'nurse' | 'labTech' | 'receptionist' }) => {
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;

    useEffect(() => {
        setTimeout(() => {
            setRecords([
                { id: '1', patientName: 'John Doe', doctor: 'Dr. Smith', diagnosis: 'Cold', date: '2025-05-20' },
                { id: '2', patientName: 'Jane Roe', doctor: 'Dr. Adams', diagnosis: 'Flu', date: '2025-05-21' },
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    const handleSearch = (value: string) => setSearch(value);
    const handleDateFilter = (value: string) => setDateFilter(value);
    const handleDoctorFilter = (value: string) => setDoctorFilter(value);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        autoTable(doc, {
            head: [['Patient', 'Doctor', 'Diagnosis', 'Date']],
            body: filteredRecords.map((r) => [r.patientName, r.doctor, r.diagnosis, r.date]),
        });
        doc.save('health-records.pdf');
    };

    const handleExportCSV = () => {
        const headers = ['Patient', 'Doctor', 'Diagnosis', 'Date'];
        const rows = filteredRecords.map((r) => [r.patientName, r.doctor, r.diagnosis, r.date]);
        const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'health-records.csv';
        link.click();
    };

    const filteredRecords = records.filter((r) => {
        return (
            r.patientName.toLowerCase().includes(search.toLowerCase()) &&
            (!dateFilter || r.date === dateFilter) &&
            (!doctorFilter || r.doctor.toLowerCase().includes(doctorFilter.toLowerCase()))
        );
    });

    const paginatedRecords = filteredRecords.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

    const openModal = (record?: HealthRecord) => {
        setEditingRecord(record || null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingRecord(null);
    };

    const saveRecord = (record: HealthRecord) => {
        if (editingRecord) {
            setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
        } else {
            setRecords((prev) => [...prev, { ...record, id: Date.now().toString() }]);
        }
        closeModal();
    };

    const Spinner = () => (
        <div className="flex justify-center items-center h-40">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const SkeletonRow = () => (
        <div className="flex items-center space-x-4 p-4 bg-white shadow rounded-md">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
        </div>
    );

    const SearchInput = ({ value, onChange, placeholder }: any) => (
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="border border-gray-300 rounded px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    );

    const Pagination = () => (
        <div className="flex justify-center items-center space-x-2 mt-4">
            {Array.from({ length: totalPages }, (_, i) => (
                <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 rounded ${i + 1 === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                    {i + 1}
                </button>
            ))}
        </div>
    );

    const RecordsTable = ({ records }: { records: HealthRecord[] }) => (
        <div className="overflow-x-auto bg-white shadow rounded-md">
            <table className="min-w-full">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-4 py-2 text-left">Patient</th>
                        <th className="px-4 py-2 text-left">Doctor</th>
                        <th className="px-4 py-2 text-left">Diagnosis</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        {role === 'admin' && <th className="px-4 py-2 text-left">Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {records.map((r) => (
                        <tr key={r.id} className="border-t">
                            <td className="px-4 py-2">{r.patientName}</td>
                            <td className="px-4 py-2">{r.doctor}</td>
                            <td className="px-4 py-2">{r.diagnosis}</td>
                            <td className="px-4 py-2">{format(new Date(r.date), 'yyyy-MM-dd')}</td>
                            {role === 'admin' && (
                                <td className="px-4 py-2 space-x-2">
                                    <button onClick={() => openModal(r)} className="text-blue-600 hover:underline">Edit</button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const RecordModal = () => {
        const [form, setForm] = useState(editingRecord || {
            id: '', patientName: '', doctor: '', diagnosis: '', date: ''
        });

        const handleChange = (field: keyof HealthRecord, value: string) => {
            setForm({ ...form, [field]: value });
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded shadow-lg w-[400px] space-y-4">
                    <h3 className="text-lg font-semibold">{editingRecord ? 'Edit' : 'Add'} Health Record</h3>
                    <input value={form.patientName} onChange={(e) => handleChange('patientName', e.target.value)} placeholder="Patient Name" className="w-full border rounded px-3 py-2" />
                    <input value={form.doctor} onChange={(e) => handleChange('doctor', e.target.value)} placeholder="Doctor" className="w-full border rounded px-3 py-2" />
                    <input value={form.diagnosis} onChange={(e) => handleChange('diagnosis', e.target.value)} placeholder="Diagnosis" className="w-full border rounded px-3 py-2" />
                    <input value={form.date} onChange={(e) => handleChange('date', e.target.value)} type="date" className="w-full border rounded px-3 py-2" />
                    <div className="flex justify-end space-x-2">
                        <button onClick={closeModal} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
                        <button onClick={() => saveRecord(form)} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 mx-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Health Records</h2>
                <div className="flex items-center space-x-2">
                    <SearchInput value={search} onChange={handleSearch} placeholder="Search patient..." />
                    <input type="date" value={dateFilter} onChange={(e) => handleDateFilter(e.target.value)} className="border rounded px-3 py-2" />
                    <input type="text" value={doctorFilter} onChange={(e) => handleDoctorFilter(e.target.value)} placeholder="Filter by doctor" className="border rounded px-3 py-2" />
                    <button onClick={handleExportPDF} className="bg-green-600 text-white px-4 py-2 rounded">Export PDF</button>
                    <button onClick={handleExportCSV} className="bg-yellow-600 text-white px-4 py-2 rounded">Export CSV</button>
                    {role === 'admin' && <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded">Add Record</button>}
                </div>
            </div>

            {loading ? (
                <div className="space-y-2 animate-pulse">
                    {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
            ) : (
                <>
                    <RecordsTable records={paginatedRecords} />
                    <Pagination />
                </>
            )}

            {isModalOpen && <RecordModal />}
        </div>
    );
};

export default HealthRecordsComponent;
