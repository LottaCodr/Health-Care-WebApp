'use client';

import { useState, useMemo } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Pencil, Check, X } from 'lucide-react';

interface MedicationRequest {
    id: string;
    patientName: string;
    medication: string;
    dosage: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    dateRequested: string;
}

const mockRequests: MedicationRequest[] = [
    {
        id: '1',
        patientName: 'John Doe',
        medication: 'Paracetamol',
        dosage: '500mg',
        reason: 'Fever',
        status: 'Pending',
        dateRequested: '2025-05-23',
    },
];

export default function MedicationRequestComponent() {
    const [requests, setRequests] = useState(mockRequests);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<MedicationRequest | null>(null);
    const [formData, setFormData] = useState<Omit<MedicationRequest, 'id' | 'status' | 'dateRequested'>>({
        patientName: '',
        medication: '',
        dosage: '',
        reason: '',
    });

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSubmit = () => {
        if (editingRequest) {
            setRequests((prev) =>
                prev.map((req) =>
                    req.id === editingRequest.id ? { ...req, ...formData } : req
                )
            );
        } else {
            const newRequest: MedicationRequest = {
                id: Date.now().toString(),
                ...formData,
                status: 'Pending',
                dateRequested: new Date().toISOString().split('T')[0],
            };
            setRequests((prev) => [...prev, newRequest]);
        }
        setIsModalOpen(false);
        setEditingRequest(null);
        setFormData({ patientName: '', medication: '', dosage: '', reason: '' });
    };

    const handleEdit = (req: MedicationRequest) => {
        setEditingRequest(req);
        setFormData({
            patientName: req.patientName,
            medication: req.medication,
            dosage: req.dosage,
            reason: req.reason,
        });
        setIsModalOpen(true);
    };

    const updateStatus = (id: string, status: 'Approved' | 'Rejected') => {
        setRequests((prev) =>
            prev.map((req) => (req.id === id ? { ...req, status } : req))
        );
    };

    return (
        <div className="max-w-4xl mx-6 px-4 py-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Medication Requests</h1>
                <Button onClick={() => setIsModalOpen(true)}>New Request</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Requests List</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white shadow"
                        >
                            <div>
                                <p className="font-medium">{req.patientName}</p>
                                <p className="text-sm text-muted-foreground">
                                    {req.medication} - {req.dosage}
                                </p>
                                <p className="text-sm">Reason: {req.reason}</p>
                                <p className="text-sm text-muted-foreground">
                                    Requested on {req.dateRequested}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={
                                        req.status === 'Pending'
                                            ? 'outline'
                                            : req.status === 'Approved'
                                                ? 'default'
                                                : 'secondary'
                                    }
                                >
                                    {req.status}
                                </Badge>
                                {req.status === 'Pending' && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateStatus(req.id, 'Approved')}
                                        >
                                            <Check className="w-4 h-4 mr-1" /> Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => updateStatus(req.id, 'Rejected')}
                                        >
                                            <X className="w-4 h-4 mr-1" /> Reject
                                        </Button>
                                    </>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(req)}
                                >
                                    <Pencil className="w-4 h-4 mr-1" /> Edit
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingRequest ? 'Edit Request' : 'New Medication Request'}
                        </DialogTitle>
                        <DialogDescription>
                            Fill in the details for the medication request.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder="Patient Name"
                            value={formData.patientName}
                            onChange={(e) => handleInputChange('patientName', e.target.value)}
                        />
                        <Input
                            placeholder="Medication"
                            value={formData.medication}
                            onChange={(e) => handleInputChange('medication', e.target.value)}
                        />
                        <Input
                            placeholder="Dosage"
                            value={formData.dosage}
                            onChange={(e) => handleInputChange('dosage', e.target.value)}
                        />
                        <Textarea
                            placeholder="Reason for request"
                            value={formData.reason}
                            onChange={(e) => handleInputChange('reason', e.target.value)}
                        />
                        <div className="flex justify-end">
                            <Button onClick={handleSubmit}>
                                {editingRequest ? 'Update Request' : 'Submit Request'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
