'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const vitalsSchema = z.object({
    temperature: z.string().nonempty('Temperature is required'),
    pulse: z.string().nonempty('Pulse is required'),
    respiration: z.string().nonempty('Respiration rate is required'),
    bloodPressure: z.string().nonempty('Blood pressure is required'),
    spo2: z.string().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
    bmi: z.string().optional(),
    notes: z.string().optional(),
});

type VitalsFormValues = z.infer<typeof vitalsSchema>;

export default function VitalsCheckInPage() {
    const { id } = useParams();
    const router = useRouter();

    const form = useForm<VitalsFormValues>({
        resolver: zodResolver(vitalsSchema),
        defaultValues: {
            temperature: '',
            pulse: '',
            respiration: '',
            bloodPressure: '',
            spo2: '',
            weight: '',
            height: '',
            bmi: '',
            notes: '',
        },
    });

    const { register, handleSubmit, watch, setValue, formState: { errors } } = form;

    // Auto-calculate BMI
    const weight = parseFloat(watch('weight') ?? '');
    const height = parseFloat(watch('height') ?? '');

    useEffect(() => {
        if (weight > 0 && height > 0) {
            const heightInMeters = height / 100;
            const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
            setValue('bmi', bmi);
        }
    }, [weight, height, setValue]);

    const onSubmit = async (data: VitalsFormValues) => {
        try {
            // TODO: Save vitals to database with patient id
            toast.success('Vitals successfully recorded');
            router.push('/nurse/dashboard');
        } catch (error) {
            toast.error('Failed to save vitals');
        }
    };

    return (
        <div className="max-w-4xl mx-6 p-6">
            <Card className="shadow-lg border rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold">Record Vitals for Patient #{id}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label>Temperature (°C)</Label>
                            <Input type="number" step="0.1" {...register('temperature')} />
                            {errors.temperature && <p className="text-red-500 text-sm">{errors.temperature.message}</p>}
                        </div>

                        <div>
                            <Label>Pulse (bpm)</Label>
                            <Input type="number" {...register('pulse')} />
                            {errors.pulse && <p className="text-red-500 text-sm">{errors.pulse.message}</p>}
                        </div>

                        <div>
                            <Label>Respiration Rate</Label>
                            <Input type="number" {...register('respiration')} />
                            {errors.respiration && <p className="text-red-500 text-sm">{errors.respiration.message}</p>}
                        </div>

                        <div>
                            <Label>Blood Pressure</Label>
                            <Input type="text" placeholder="e.g. 120/80" {...register('bloodPressure')} />
                            {errors.bloodPressure && <p className="text-red-500 text-sm">{errors.bloodPressure.message}</p>}
                        </div>

                        <div>
                            <Label>SpO2</Label>
                            <Input type="number" {...register('spo2')} />
                        </div>

                        <div>
                            <Label>Weight (kg)</Label>
                            <Input type="number" {...register('weight')} />
                        </div>

                        <div>
                            <Label>Height (cm)</Label>
                            <Input type="number" {...register('height')} />
                        </div>

                        <div>
                            <Label>BMI</Label>
                            <Input type="number" readOnly {...register('bmi')} />
                        </div>

                        <div className="md:col-span-2">
                            <Label>Additional Notes</Label>
                            <Textarea rows={4} {...register('notes')} />
                        </div>

                        <div className="md:col-span-2 text-right">
                            <Button type="submit">Submit</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
