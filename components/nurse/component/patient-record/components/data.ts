export const RECORDS_PER_PAGE = 5;

export interface PatientRecord {
    id: string;
    name: string;
    age: number;
    gender: string;
    status: string;
    admittedAt: string;
    diagnosis: string;
    notes: string;
}

export const mockRecords: PatientRecord[] = [
    {
        id: '101',
        name: 'John Doe',
        age: 58,
        gender: 'Male',
        status: 'Admitted',
        admittedAt: '2025-05-18 09:00',
        diagnosis: 'Hypertension',
        notes: 'Requires daily monitoring.',
    },
    {
        id: '102',
        name: 'Jane Smith',
        age: 43,
        gender: 'Female',
        status: 'Under Observation',
        admittedAt: '2025-05-19 13:45',
        diagnosis: 'Chest pain',
        notes: 'Scheduled for further testing.',
    },
    {
        id: '103',
        name: 'Samuel Otieno',
        age: 33,
        gender: 'Male',
        status: 'Discharged',
        admittedAt: '2025-05-15 16:20',
        diagnosis: 'Malaria',
        notes: 'Recovered and discharged.',
    },
];
