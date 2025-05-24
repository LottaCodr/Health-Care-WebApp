'use client';


import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PatientRecord } from './data';

export default function PatientCard({ record, onViewDetails }: { record: PatientRecord, onViewDetails: (r: PatientRecord) => void }) {
    return (
        <div className="flex items-center justify-between border p-4 rounded-xl bg-white shadow-sm">
            <div className="space-y-1">
                <h4 className="font-medium text-lg">{record.name}</h4>
                <p className="text-sm text-muted-foreground">{record.gender}, Age {record.age}</p>
                <p className="text-sm text-muted-foreground">Admitted: {record.admittedAt}</p>
            </div>
            <div className="flex items-center gap-4">
                <Badge
                    variant={
                        record.status === 'Discharged'
                            ? 'secondary'
                            : record.status === 'Under Observation'
                                ? 'outline'
                                : 'default'
                    }
                >
                    {record.status}
                </Badge>
                <Button variant="outline" onClick={() => onViewDetails(record)}>
                    View Details
                </Button>
            </div>
        </div>
    );
}
