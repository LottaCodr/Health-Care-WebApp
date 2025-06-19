"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { Appointment } from "@/actions/appointments/types";
import { useRealTimeAppointments } from "@/context/appointments/appointment.reducer";
import { useAppointmentMutations } from "@/actions/appointments/mutation";

import { ViewAppointmentModal } from "./modals/view";
import { EditAppointmentModal } from "./modals/edit";
import { DeleteAppointmentModal } from "./modals/delete";
import { DataTable } from "./table/DataTable";
import { getAppointmentColumns } from "./table/columns";
import { formatDate, formatTime } from "@/utils/export";

const appointmentSchema = z.object({
    patientName: z.string().min(1, "Patient name is required"),
    phone: z.string().min(10, "Phone number is required"),
    doctor: z.string().min(1, "Doctor is required"),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
    note: z.string().optional(),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

export default function AppointmentBookingComponent() {
    const form = useForm<AppointmentForm>({
        resolver: zodResolver(appointmentSchema),
    });


    const { toast } = useToast();
    const { state, dispatch } = useRealTimeAppointments();
    const { createAppointment, updateAppointment, deleteAppointment } = useAppointmentMutations(dispatch);

    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

    const closeModals = () => {
        setViewModalOpen(false);
        setEditModalOpen(false);
        setDeleteModalOpen(false);
        setSelectedAppointment(null);
        setAppointmentToDelete(null);
    };

    const onSubmit = async (data: AppointmentForm) => {
        const newAppointment: Appointment = {
            id: String(Date.now()),
            patientId: data.patientName,
            patientName: data.patientName,
            doctor: data.doctor,
            doctorId: "",
            doctorName: data.doctor,
            date: data.date,
            time: data.time,
            notes: data.note,
            status: "pending",
            createdAt: new Date().toISOString(),
        };

        await createAppointment.mutateAsync(newAppointment);
        form.reset();
    };

    const onSubmitEdit = async (data: Partial<Appointment>) => {
        if (!selectedAppointment) return;

        const updated: Appointment = {
            ...selectedAppointment,
            ...data,
        };

        await updateAppointment.mutateAsync({ id: selectedAppointment.id, updates: updated });
        form.reset();
        closeModals();
    };

    const handleDeleteConfirm = async () => {
        if (!appointmentToDelete) return;

        await deleteAppointment.mutateAsync(appointmentToDelete.id)
        setDeleteModalOpen(false);
        setAppointmentToDelete(null);
    };

    return (
        <section>
            <Card>
                <CardHeader>
                    <CardTitle>Book Appointment</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="patientName">Patient Name</Label>
                                <Input id="patientName" {...form.register("patientName")} />
                                {form.formState.errors.patientName && (
                                    <p className="text-sm text-red-500">
                                        {form.formState.errors.patientName.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" {...form.register("phone")} />
                                {form.formState.errors.phone && (
                                    <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="doctor">Doctor</Label>
                                <Input id="doctor" {...form.register("doctor")} />
                                {form.formState.errors.doctor && (
                                    <p className="text-sm text-red-500">{form.formState.errors.doctor.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="date">Date</Label>
                                <Input type="date" id="date" {...form.register("date")} />
                                {form.formState.errors.date && (
                                    <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="time">Time</Label>
                                <Input type="time" id="time" {...form.register("time")} />
                                {form.formState.errors.time && (
                                    <p className="text-sm text-red-500">{form.formState.errors.time.message}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="note">Note</Label>
                            <Textarea id="note" {...form.register("note")} />
                        </div>

                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? "Booking..." : "Book Appointment"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Appointment Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={getAppointmentColumns({
                                onView: (appointment) => {
                                    setSelectedAppointment(appointment);
                                    setViewModalOpen(true);
                                },
                                onEdit: (appointment) => {
                                    setSelectedAppointment(appointment);
                                    form.setValue("patientName", appointment.patientName);
                                    form.setValue("phone", appointment.patientName); // adjust if needed
                                    form.setValue("doctor", appointment.doctor);
                                    form.setValue("date", formatDate(appointment.date));
                                    form.setValue("time", formatTime(appointment.time));
                                    form.setValue("note", appointment.notes || "");
                                    setEditModalOpen(true);
                                },
                                onDelete: (appointment) => {
                                    setAppointmentToDelete(appointment);
                                    setDeleteModalOpen(true);
                                },
                            })}
                            data={state.appointments}
                        />
                    </CardContent>
                </Card>
            </div>

            <ViewAppointmentModal
                open={viewModalOpen}
                onClose={closeModals}
                appointment={selectedAppointment}
            />

            <EditAppointmentModal
                open={editModalOpen}
                onClose={closeModals}
                form={form}
                onSubmit={onSubmitEdit}
                isSubmitting={form.formState.isSubmitting}
            />

            <DeleteAppointmentModal
                open={deleteModalOpen}
                onClose={closeModals}
                onConfirm={handleDeleteConfirm}
            />
        </section>
    );
}
