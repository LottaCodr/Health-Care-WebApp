'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Appointment, AppointmentStatus } from '@/actions/appointments/types';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Appointment) => void;
    initialData?: Appointment | null;
    existingAppointments: Appointment[];
}

const STATUS_OPTIONS: readonly AppointmentStatus[] = [
    'pending',
    'completed',
    'cancelled',
    'rescheduled',
    'scheduled',
    'no-show',
] as const;

const appointmentSchema = z.object({
    patientName: z.string().min(1, 'Patient name is required'),
    doctor: z.string().min(1, 'Doctor name is required'),
    date: z.string().min(1, 'Date is required'),
    time: z.string().min(1, 'Time is required'),
    status: z.enum(STATUS_OPTIONS),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

const defaultValues: AppointmentForm = {
    patientName: '',
    doctor: '',
    date: '',
    time: '',
    status: 'pending',
};

export default function AppointmentModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    existingAppointments,
}: AppointmentModalProps) {
    const [conflict, setConflict] = useState(false);
    const firstInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<AppointmentForm>({
        resolver: zodResolver(appointmentSchema),
        defaultValues,
        mode: 'onBlur',
    });

    const {
        handleSubmit,
        reset,
        control,
        setValue,
        watch,
        getValues,
        formState: { errors, isValid },
    } = form;

    const watchedDate = watch('date');
    const watchedTime = watch('time');

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!watchedDate || !watchedTime) {
            setConflict(false);
            return;
        }
        const hasConflict = existingAppointments.some(
            (appt) => appt.date === watchedDate && appt.time === watchedTime && appt.id !== initialData?.id
        );
        setConflict(hasConflict);
    }, [watchedDate, watchedTime, existingAppointments, initialData?.id]);

    useEffect(() => {
        if (initialData) {
            reset({
                patientName: initialData.patientName,
                doctor: initialData.doctor,
                date: initialData.date,
                time: initialData.time,
                status: initialData.status,
            });
        } else {
            reset(defaultValues);
        }
        setConflict(false);
    }, [initialData, isOpen, reset]);

    const onSubmit = (data: AppointmentForm) => {
        if (conflict || !isValid) return;

        const appointment: Appointment = {
            ...data,
            id: initialData?.id || uuidv4(),
            patientId: initialData?.patientId || uuidv4(),
            doctorId: initialData?.doctorId || uuidv4(),
            doctorName: data.doctor,
            createdAt: initialData?.createdAt || new Date().toISOString(),
            status: initialData?.status || 'pending'
        };

        onSave(appointment);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md rounded-lg shadow-lg bg-white">
                <FormProvider {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold text-gray-900">
                                {initialData ? 'Edit Appointment' : 'New Appointment'}
                            </DialogTitle>
                        </DialogHeader>

                        {/* Patient Name */}
                        <Controller
                            control={control}
                            name="patientName"
                            render={({ field }) => (
                                <div>
                                    <Label htmlFor="patientName">Patient Name</Label>
                                    <input
                                        {...field}
                                        id="patientName"
                                        type="text"
                                        placeholder="Enter patient name"
                                        ref={(node) => {
                                            field.ref(node);
                                            if (!initialData && node) {
                                                firstInputRef.current = node;
                                            }
                                        }}
                                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.patientName ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.patientName && (
                                        <p className="mt-1 text-xs text-red-600">{errors.patientName.message}</p>
                                    )}
                                </div>
                            )}
                        />

                        {/* Doctor */}
                        <Controller
                            control={control}
                            name="doctor"
                            render={({ field }) => (
                                <div>
                                    <Label htmlFor="doctor">Doctor</Label>
                                    <input
                                        {...field}
                                        id="doctor"
                                        type="text"
                                        placeholder="Enter doctor name"
                                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.doctor ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.doctor && (
                                        <p className="mt-1 text-xs text-red-600">{errors.doctor.message}</p>
                                    )}
                                </div>
                            )}
                        />

                        {/* Date and Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                control={control}
                                name="date"
                                render={({ field }) => (
                                    <div>
                                        <Label htmlFor="date">Date</Label>
                                        <input
                                            {...field}
                                            id="date"
                                            type="date"
                                            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.date ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        />
                                        {errors.date && (
                                            <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>
                                        )}
                                    </div>
                                )}
                            />
                            <Controller
                                control={control}
                                name="time"
                                render={({ field }) => (
                                    <div>
                                        <Label htmlFor="time">Time</Label>
                                        <input
                                            {...field}
                                            id="time"
                                            type="time"
                                            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.time ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        />
                                        {errors.time && (
                                            <p className="mt-1 text-xs text-red-600">{errors.time.message}</p>
                                        )}
                                    </div>
                                )}
                            />
                        </div>

                        {/* Conflict Message */}
                        {conflict && (
                            <p className="text-sm text-red-600 flex items-center" role="alert">
                                ⚠ An appointment already exists for this date and time.
                            </p>
                        )}

                        {/* Status */}
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <Controller
                                control={control}
                                name="status"
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={(val) => field.onChange(val as AppointmentStatus)}
                                    >
                                        <SelectTrigger id="status" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status
                                                        .replace('-', ' ')
                                                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        {/* Footer */}
                        <DialogFooter className="flex justify-end space-x-2 pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={conflict || !isValid}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}
