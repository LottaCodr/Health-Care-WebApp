'use client';

import { Patient, SortConfig } from '@/types/patients';
import React, { useState, useMemo } from 'react';
import SearchInput from './search-input';
import PatientsTableHeader from './table-header';
import PatientsTable from './table';


interface PatientProps {
    patients: Patient[]
}

export default function PatientsComponent({ patients }: PatientProps) {
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    const sortedAndFilteredPatients = useMemo(() => {
        if (!search && !sortConfig) return patients;

        let filtered = patients.filter((p) =>
            p.name?.toLowerCase().includes(search.toLowerCase())
        );

        if (sortConfig?.key && sortConfig?.direction) {
            const { key, direction } = sortConfig;
            const isAsc = direction === 'asc';

            filtered = [...filtered].sort((a, b) => {
                const aVal = a[key] ?? '';
                const bVal = b[key] ?? '';

                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return isAsc ? aVal - bVal : bVal - aVal;
                }

                return isAsc
                    ? String(aVal).localeCompare(String(bVal))
                    : String(bVal).localeCompare(String(aVal));
            });
        }

        return filtered;
    }, [patients, search, sortConfig]);

    const handleSortChange = (key: keyof Patient) => {
        setSortConfig((prev) => {
            if (!prev || prev.key !== key) {
                return { key, direction: 'asc' };
            }

            return {
                key,
                direction: prev.direction === 'asc' ? 'desc' : 'asc',
            };
        });
    };

    return (
        <section className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Patients</h2>
                <div className="w-full max-w-md">
                    <SearchInput value={search} onChange={setSearch} />
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <PatientsTableHeader sortConfig={sortConfig} onSortChange={handleSortChange} />
                    <PatientsTable
                        patients={sortedAndFilteredPatients}
                        sortConfig={sortConfig}
                        onSortChange={handleSortChange}
                    />
                </table>
            </div>
        </section>
    );
}
