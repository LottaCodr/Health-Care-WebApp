'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 5;

type Patient = {
    id: string;
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    arrivedAt: string;
    vitalsChecked: boolean;
};

const mockQueue: Patient[] = [
    { id: '1', name: 'John Doe', age: 45, gender: 'Male', arrivedAt: '10:15 AM', vitalsChecked: false },
    { id: '2', name: 'Jane Smith', age: 33, gender: 'Female', arrivedAt: '10:30 AM', vitalsChecked: true },
    { id: '3', name: 'Samuel Otieno', age: 27, gender: 'Male', arrivedAt: '10:40 AM', vitalsChecked: false },
    { id: '4', name: 'Grace Chen', age: 40, gender: 'Female', arrivedAt: '10:45 AM', vitalsChecked: false },
    { id: '5', name: 'Mark Twain', age: 55, gender: 'Male', arrivedAt: '11:00 AM', vitalsChecked: true },
    { id: '6', name: 'Aisha Bello', age: 29, gender: 'Female', arrivedAt: '11:15 AM', vitalsChecked: false },
];

export default function PatientQueueComponent() {
    const [patients] = useState<Patient[]>(mockQueue);
    const [filterStatus, setFilterStatus] = useState<'all' | 'checked' | 'pending'>('all');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const router = useRouter();

    const filteredPatients = useMemo(() => {
        return patients.filter((patient) => {
            const matchesSearch = patient.name.toLowerCase().includes(search.toLowerCase());
            const matchesStatus =
                filterStatus === 'all' ||
                (filterStatus === 'checked' && patient.vitalsChecked) ||
                (filterStatus === 'pending' && !patient.vitalsChecked);
            return matchesSearch && matchesStatus;
        });
    }, [patients, filterStatus, search]);

    const paginatedPatients = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredPatients.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredPatients, currentPage]);

    const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);

    const handleCheckIn = (patient: Patient) => {
        if (patient.vitalsChecked) {
            toast.info(`${patient.name}'s vitals already recorded.`);
            return;
        }
        router.push(`/nurse/vitals/${patient.id}`);
    };

    return (
        <div className="max-w-5xl mx-6 p-6 space-y-6">
            <Card className="shadow-md border rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold">Patient Queue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <Input
                            placeholder="Search by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val as typeof filterStatus)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="checked">Vitals Checked</SelectItem>
                                <SelectItem value="pending">Pending Vitals</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {paginatedPatients.length === 0 ? (
                        <p className="text-center text-muted-foreground">No patients found.</p>
                    ) : (
                        paginatedPatients.map((patient) => (
                            <div
                                key={patient.id}
                                className={cn(
                                    'flex items-center justify-between p-4 rounded-xl border',
                                    patient.vitalsChecked ? 'bg-green-50' : 'bg-white'
                                )}
                            >
                                <div className="space-y-1">
                                    <h4 className="font-medium text-lg">{patient.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {patient.gender}, Age {patient.age}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Arrived at: {patient.arrivedAt}</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Badge
                                        variant={patient.vitalsChecked ? 'secondary' : 'destructive'}
                                        className="text-xs px-3 py-1"
                                    >
                                        {patient.vitalsChecked ? 'Vitals Checked' : 'Pending Vitals'}
                                    </Badge>
                                    <Button
                                        onClick={() => handleCheckIn(patient)}
                                        variant={patient.vitalsChecked ? 'secondary' : 'default'}
                                    >
                                        {patient.vitalsChecked ? 'View' : 'Check-In'}
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-4">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <Button
                                    key={i}
                                    variant={currentPage === i + 1 ? 'default' : 'outline'}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className="px-4"
                                >
                                    {i + 1}
                                </Button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
