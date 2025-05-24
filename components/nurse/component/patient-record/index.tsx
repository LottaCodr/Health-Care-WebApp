'use client';

import { useMemo, useState } from 'react';
import PatientSearchFilter from './components/patient-search-filter';
import { mockRecords, PatientRecord, RECORDS_PER_PAGE } from './components/data';
import PatientList from './components/patient-list';
import PaginationControls from './components/pagination-control';
import PatientDialog from './components/patient-dialog';


export default function PatientRecordsComponent() {
    const [selectedRecord, setSelectedRecord] = useState<PatientRecord | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const filteredRecords = useMemo(() => {
        return mockRecords.filter(
            (record) =>
                (!filterStatus || record.status === filterStatus) &&
                record.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [filterStatus, searchQuery]);

    const totalPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE);
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * RECORDS_PER_PAGE;
        return filteredRecords.slice(start, start + RECORDS_PER_PAGE);
    }, [filteredRecords, currentPage]);

    return (
        <div className="max-w-6xl mx-6 px-6 py-8 space-y-6">
            <PatientSearchFilter
                filterStatus={filterStatus}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onFilterChange={setFilterStatus}
            />

            <PatientList
                records={paginatedRecords}
                onViewDetails={(record) => {
                    setSelectedRecord(record);
                    setIsModalOpen(true);
                }}
            />

            {totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            )}

            <PatientDialog
                record={selectedRecord}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
