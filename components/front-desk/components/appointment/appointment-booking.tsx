"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "./table/DataTable";
import { useRealTimeAppointments } from "@/context/appointments/appointment.reducer";
import { Appointment, AppointmentStatus } from "@/actions/appointments/types";



const appointmentSchema = z.object({
    patientName: z.string().min(1, "Patient name is required"),
    phone: z.string().min(10, "Phone number is required"),
    doctor: z.string().min(1, "Doctor is required"),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
    note: z.string().optional(),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

function StatusBadge({ status }: { status: Appointment["status"] }) {
    const colors: Record<AppointmentStatus, string> = {
        upcoming: "bg-yellow-100 text-yellow-800",
        rescheduled: "bg-blue-100 text-blue-800",
        completed: "bg-green-100 text-green-800",
        cancelled: "bg-red-100 text-red-800",
        "no-show": "bg-red-100 text-red-800",
    };
    return (
        <span
            role="status"
            aria-label={`Appointment status: ${status}`}
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${colors[status]}`}>
            {status}
        </span>
    );
}

function Modal({
    isOpen,
    onClose,
    title,
    children,
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}) {

    React.useEffect(() => {
        if (!isOpen) return;
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }
        document.addEventListener("keydown", onKeyDown);

        const focusedElem = document.activeElement as HTMLElement;
        const modal = document.getElementById("modal-dialog");
        modal?.focus();

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            focusedElem?.focus();
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            id="modal-dialog"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between mb-4">
                    <h3 id="modal-title" className="text-lg font-semibold">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                        aria-label="Close modal"
                    >
                        X
                    </button>
                </header>
                <div>{children}</div>
            </div>
        </div>
    );
}

export default function AppointmentBookingComponent() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<AppointmentForm>({ resolver: zodResolver(appointmentSchema) });

    const {
        register: registerEdit,
        handleSubmit: handleSubmitEdit,
        formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
        reset: resetEdit,
        setValue: setValueEdit,
    } = useForm<AppointmentForm>({ resolver: zodResolver(appointmentSchema) });

    const { toast } = useToast();
    const { state, dispatch } = useRealTimeAppointments();

    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

    const onSubmit = (data: Appointment) => {
        const newAppointment: Appointment = {
            ...data,
            id: String(Date.now()),
            status: "upcoming",
            createdAt: new Date().toISOString(),
            doctorId: data.doctorId,
            doctorName: data.doctor,
            patientId: data.patientName,
        };

        dispatch({ type: "ADD_APPOINTMENT", payload: newAppointment });
        toast({
            title: "Appointment Booked",
            description: `${data.patientName} with ${data.doctor} on ${data.date}`,
        });
        reset();
    };

    const onSubmitEdit = (data: AppointmentForm) => {
        if (!selectedAppointment) return;
        const updated: Appointment = {
            ...selectedAppointment,
            ...data,
        };

        dispatch({ type: "UPDATE_APPOINTMENT", payload: updated });
        toast({ title: "Appointment Updated", description: `Updated ${data.patientName}` });
        closeModals();
        resetEdit();
    };

    const handleDeleteConfirm = () => {
        if (!appointmentToDelete) return;
        dispatch({ type: "DELETE_APPOINTMENT", payload: appointmentToDelete.id });
        toast({ title: "Appointment Deleted" });
        setAppointmentToDelete(null);
        setDeleteModalOpen(false);
    };

    const openViewModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setViewModalOpen(true);
    };

    const openEditModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setValueEdit("patientName", appointment.patientName);
        setValueEdit("phone", appointment.doctor);
        setValueEdit("doctor", appointment.doctor);
        setValueEdit("date", appointment.date);
        setValueEdit("time", appointment.time);
        setValueEdit("note", appointment.notes || "");
        setEditModalOpen(true);
    };

    const openDeleteModal = (appointment: Appointment) => {
        setAppointmentToDelete(appointment);
        setDeleteModalOpen(true);
    };

    const closeModals = () => {
        setViewModalOpen(false);
        setEditModalOpen(false);
        setDeleteModalOpen(false);
        setSelectedAppointment(null);
        setAppointmentToDelete(null);
    };

    const appointmentColumns: ColumnDef<Appointment>[] = [
        { accessorKey: "patientName", header: "Patient Name" },
        { accessorKey: "date", header: "Date" },
        { accessorKey: "time", header: "Time" },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ getValue }) => <StatusBadge status={getValue() as Appointment["status"]} />,
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const appointment = row.original;
                return (
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openViewModal(appointment)}>View</Button>
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(appointment)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => openDeleteModal(appointment)}>Delete</Button>
                    </div>
                );
            },
        },
    ];

    return (
        <section>
            <Card>
                <CardHeader><CardTitle>Book Appointment</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Fields */}
                            <div><Label htmlFor="patientName">Patient Name</Label><Input id="patientName" {...register("patientName")} />{errors.patientName && <p className="text-sm text-red-500">{errors.patientName.message}</p>}</div>
                            <div><Label htmlFor="phone">Phone</Label><Input id="phone" {...register("phone")} />{errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}</div>
                            <div><Label htmlFor="doctor">Doctor</Label><Input id="doctor" {...register("doctor")} />{errors.doctor && <p className="text-sm text-red-500">{errors.doctor.message}</p>}</div>
                            <div><Label htmlFor="date">Date</Label><Input id="date" type="date" {...register("date")} />{errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}</div>
                            <div><Label htmlFor="time">Time</Label><Input id="time" type="time" {...register("time")} />{errors.time && <p className="text-sm text-red-500">{errors.time.message}</p>}</div>
                        </div>
                        <div><Label htmlFor="note">Note</Label><Textarea id="note" {...register("note")} /></div>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Booking..." : "Book Appointment"}</Button>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-6">
                <Card>
                    <CardHeader><CardTitle>Appointment Overview</CardTitle></CardHeader>
                    <CardContent><DataTable columns={appointmentColumns} data={state.appointments} /></CardContent>
                </Card>
            </div>

            {/* View Modal */}
            <Modal isOpen={viewModalOpen} onClose={closeModals} title="Appointment Details">
                {selectedAppointment && (
                    <div className="space-y-2 text-sm">
                        <p><strong>Patient:</strong> {selectedAppointment.patientName}</p>
                        <p><strong>Phone:</strong> {selectedAppointment.doctor}</p>
                        <p><strong>Doctor:</strong> {selectedAppointment.doctor}</p>
                        <p><strong>Date:</strong> {selectedAppointment.date}</p>
                        <p><strong>Time:</strong> {selectedAppointment.time}</p>
                        <p><strong>Status:</strong> <StatusBadge status={selectedAppointment.status} /></p>
                        {selectedAppointment.notes && <p><strong>Note:</strong> {selectedAppointment.notes}</p>}
                    </div>
                )}
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={editModalOpen} onClose={closeModals} title="Edit Appointment">
                <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <Input {...registerEdit("patientName")} placeholder="Patient Name" />
                        {errorsEdit.patientName && <p className="text-sm text-red-500">{errorsEdit.patientName.message}</p>}
                        <Input {...registerEdit("phone")} placeholder="Phone" />
                        {errorsEdit.phone && <p className="text-sm text-red-500">{errorsEdit.phone.message}</p>}
                        <Input {...registerEdit("doctor")} placeholder="Doctor" />
                        {errorsEdit.doctor && <p className="text-sm text-red-500">{errorsEdit.doctor.message}</p>}
                        <Input type="date" {...registerEdit("date")} />
                        {errorsEdit.date && <p className="text-sm text-red-500">{errorsEdit.date.message}</p>}
                        <Input type="time" {...registerEdit("time")} />
                        {errorsEdit.time && <p className="text-sm text-red-500">{errorsEdit.time.message}</p>}
                        <Textarea {...registerEdit("note")} placeholder="Note" />
                    </div>
                    <Button type="submit" disabled={isSubmittingEdit}>
                        {isSubmittingEdit ? "Updating..." : "Update Appointment"}
                    </Button>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={deleteModalOpen} onClose={closeModals} title="Delete Appointment">
                <p className="mb-4">Are you sure you want to delete this appointment?</p>
                <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleDeleteConfirm}>Confirm Delete</Button>
                    <Button variant="outline" onClick={closeModals}>Cancel</Button>
                </div>
            </Modal>
        </section>
    );
}
