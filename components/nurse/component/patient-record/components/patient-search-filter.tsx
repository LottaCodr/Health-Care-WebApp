'use client';


import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Props {
    filterStatus: string;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onFilterChange: (value: string) => void;
}

export default function PatientSearchFilter({ filterStatus, searchQuery, onSearchChange, onFilterChange }: Props) {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Input
                placeholder="Search by name..."
                className="w-full sm:w-1/2"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
            />

            <Select onValueChange={onFilterChange} value={filterStatus}>
                <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="Admitted">Admitted</SelectItem>
                    <SelectItem value="Under Observation">Under Observation</SelectItem>
                    <SelectItem value="Discharged">Discharged</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
