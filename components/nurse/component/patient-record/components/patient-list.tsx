import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientCard from './patient-card';
import { PatientRecord } from './data';

interface Props {
    records: PatientRecord[];
    onViewDetails: (record: PatientRecord) => void;
}

export default function PatientList({ records, onViewDetails }: Props) {
    return (
        <Card className="border shadow-sm rounded-2xl">
            <CardHeader>
                <CardTitle className="text-2xl font-semibold">Patient Records</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {records.length === 0 ? (
                    <p className="text-center text-muted-foreground">No records found.</p>
                ) : (
                    records.map((record) => (
                        <PatientCard key={record.id} record={record} onViewDetails={onViewDetails} />
                    ))
                )}
            </CardContent>
        </Card>
    );
}
