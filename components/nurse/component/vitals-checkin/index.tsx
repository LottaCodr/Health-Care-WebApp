'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

// Schema validation with Zod
const vitalsSchema = z.object({
    temperature: z.string().nonempty('Temperature is required'),
    pulse: z.string().nonempty('Pulse is required'),
    respiration: z.string().nonempty('Respiration is required'),
    bloodPressure: z.string().nonempty('Blood pressure is required'),
    spo2: z.string().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
    bmi: z.string().optional(),
    notes: z.string().optional(),
});

export default function VitalsAdCheckInComponent() {
    const router = useRouter();

    const [form, setForm] = useState({
        temperature: '',
        pulse: '',
        respiration: '',
        bloodPressure: '',
        spo2: '',
        weight: '',
        height: '',
        bmi: '',
        notes: '',
    });

    // Auto-calculate BMI when weight or height changes
    useEffect(() => {
        const weight = parseFloat(form.weight);
        const height = parseFloat(form.height);

        if (!isNaN(weight) && !isNaN(height) && height > 0) {
            const bmi = weight / ((height / 100) ** 2);
            setForm(prev => ({ ...prev, bmi: bmi.toFixed(1) }));
        } else {
            setForm(prev => ({ ...prev, bmi: '' }));
        }
    }, [form.weight, form.height]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async () => {
        const result = vitalsSchema.safeParse(form);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || 'Please fill in all required fields';
            toast.error(firstError);
            return;
        }

        try {
            // TODO: Save to your database here
            toast.success('Vitals recorded successfully');
            router.push('/nurse/dashboard');
        } catch (error) {
            toast.error('Failed to save vitals');
        }
    };

    return (
        <div className="max-w-full mx-2 p-6">

                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { id: 'temperature', label: 'Temperature (°C)', placeholder: 'e.g. 37.0', type: 'number' },
                        { id: 'pulse', label: 'Pulse Rate (bpm)', placeholder: 'e.g. 75', type: 'number' },
                        { id: 'respiration', label: 'Respiration Rate (breaths/min)', placeholder: 'e.g. 16', type: 'number' },
                        { id: 'bloodPressure', label: 'Blood Pressure (mmHg)', placeholder: 'e.g. 120/80', type: 'text' },
                        { id: 'spo2', label: 'Oxygen Saturation (SpO₂ %)', placeholder: 'e.g. 98', type: 'number' },
                        { id: 'weight', label: 'Weight (kg)', placeholder: 'e.g. 65', type: 'number' },
                        { id: 'height', label: 'Height (cm)', placeholder: 'e.g. 170', type: 'number' },
                        { id: 'bmi', label: 'BMI (auto-calculated)', placeholder: '', type: 'number', disabled: true },
                    ].map(field => (
                        <div key={field.id}>
                            <Label htmlFor={field.id}>{field.label}</Label>
                            <Input
                                id={field.id}
                                name={field.id}
                                type={field.type}
                                placeholder={field.placeholder}
                                value={form[field.id as keyof typeof form]}
                                onChange={handleChange}
                                disabled={field.disabled}
                            />
                        </div>
                    ))}

                    <div className="md:col-span-2">
                        <Label htmlFor="notes">Additional Notes</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Write any observations here..."
                            value={form.notes}
                            onChange={handleChange}
                            rows={4}
                        />
                    </div>

                    <div className="md:col-span-2 text-white text-right">
                        <Button onClick={handleSubmit}>Submit Vitals</Button>
                    </div>
                </CardContent>
        </div>
    );
}
