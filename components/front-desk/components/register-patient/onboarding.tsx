"use client"

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const steps = ['Basic Info', 'Contact Info', 'Medical Info', 'Emergency Contact', 'Review & Submit'];

const PatientOnboarding = () => {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({
        fullName: '',
        gender: '',
        age: '',
        dob: '',
        phone: '',
        email: '',
        address: '',
        allergies: '',
        medicalHistory: '',
        medications: '',
        emergencyName: '',
        emergencyRelationship: '',
        emergencyPhone: '',
    });

    const nextStep = () => setStep((prev) => Math.min(prev + 1, steps.length - 1));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

    interface PatientFormData {
        fullName: string;
        gender: string;
        age: string;
        dob: string;
        phone: string;
        email: string;
        address: string;
        allergies: string;
        medicalHistory: string;
        medications: string;
        emergencyName: string;
        emergencyRelationship: string;
        emergencyPhone: string;
    }

    interface HandleChangeEvent {
        target: {
            name: keyof PatientFormData;
            value: string;
        };
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: PatientFormData) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        // TODO: Submit formData to backend (Appwrite, Firebase, etc.)
        console.log('Patient Data:', formData);
    };

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <>
                        <Label>Full Name</Label>
                        <Input name="fullName" value={formData.fullName} onChange={handleChange} />
                        <Label>Gender</Label>
                        <Input name="gender" value={formData.gender} onChange={handleChange} />
                        <Label>Age</Label>
                        <Input name="age" value={formData.age} onChange={handleChange} />
                        <Label>Date of Birth</Label>
                        <Input type="date" name="dob" value={formData.dob} onChange={handleChange} />
                    </>
                );
            case 1:
                return (
                    <>
                        <Label>Phone</Label>
                        <Input name="phone" value={formData.phone} onChange={handleChange} />
                        <Label>Email</Label>
                        <Input name="email" value={formData.email} onChange={handleChange} />
                        <Label>Address</Label>
                        <Input name="address" value={formData.address} onChange={handleChange} />
                    </>
                );
            case 2:
                return (
                    <>
                        <Label>Allergies</Label>
                        <Input name="allergies" value={formData.allergies} onChange={handleChange} />
                        <Label>Medical History</Label>
                        <Input name="medicalHistory" value={formData.medicalHistory} onChange={handleChange} />
                        <Label>Medications</Label>
                        <Input name="medications" value={formData.medications} onChange={handleChange} />
                    </>
                );
            case 3:
                return (
                    <>
                        <Label>Emergency Contact Name</Label>
                        <Input name="emergencyName" value={formData.emergencyName} onChange={handleChange} />
                        <Label>Relationship</Label>
                        <Input name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleChange} />
                        <Label>Phone</Label>
                        <Input name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} />
                    </>
                );
            case 4:
                return (
                    <>
                        <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                            {JSON.stringify(formData, null, 2)}
                        </pre>
                        <Button onClick={handleSubmit} className="mt-4">Submit</Button>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-2xl mx-6 mt-10 p-4">
            <Card>
                <CardContent className="space-y-4">
                    <h2 className="text-xl font-semibold">Patient Onboarding</h2>
                    <div className="text-sm text-muted-foreground">Step {step + 1} of {steps.length}: {steps[step]}</div>
                    {renderStep()}
                    <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={prevStep} disabled={step === 0}>Back</Button>
                        {step < steps.length - 1 && (
                            <Button onClick={nextStep}>Next</Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PatientOnboarding;
