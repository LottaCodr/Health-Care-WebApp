"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
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

const doctorOptions = [
    { value: "Dr. Smith", label: "Dr. Smith" },
    { value: "Dr. Johnson", label: "Dr. Johnson" },
    { value: "Dr. Lee", label: "Dr. Lee" },
    { value: "Dr. Patel", label: "Dr. Patel" },
];

export default function AppointmentBookingComponent() {
    const form = useForm<AppointmentForm>({
        resolver: zodResolver(appointmentSchema),
        mode: "onTouched",
    });

    const { toast } = useToast();

    const { state, dispatch } = useRealTimeAppointments();
    const { createAppointment, updateAppointment, deleteAppointment } = useAppointmentMutations(dispatch);

    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

    // UX: Add search/filter for appointments
    const [search, setSearch] = useState("");
    const filteredAppointments = useMemo(() => {
        if (!search.trim()) return state.appointments;
        const s = search.toLowerCase();
        return state.appointments.filter(
            (a) =>
                a.patientName.toLowerCase().includes(s) ||
                a.doctor.toLowerCase().includes(s) ||
                (a.notes?.toLowerCase().includes(s) ?? false) ||
                a.date.includes(s) ||
                a.time.includes(s)
        );
    }, [search, state.appointments]);

    // UX: Track booking state for feedback
    const [bookingState, setBookingState] = useState<"idle" | "success" | "error">("idle");

    const closeModals = () => {
        setViewModalOpen(false);
        setEditModalOpen(false);
        setDeleteModalOpen(false);
        setSelectedAppointment(null);
        setAppointmentToDelete(null);
    };

    const onSubmit = async (data: AppointmentForm) => {
        setBookingState("idle");
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

        try {
            await createAppointment.mutateAsync(newAppointment);
            form.reset();
            setBookingState("success");
            toast({
                title: "Appointment Booked",
                description: `Appointment for ${data.patientName} has been booked.`,
                variant: "default",
            });
        } catch (e) {
            setBookingState("error");
            toast({
                title: "Booking Failed",
                description: "There was an error booking the appointment.",
                variant: "destructive",
            });
        }
    };

    const onSubmitEdit = async (data: Partial<Appointment>) => {
        if (!selectedAppointment) return;

        try {
            const updated: Appointment = {
                ...selectedAppointment,
                ...data,
            };
            await updateAppointment.mutateAsync({ id: selectedAppointment.id, updates: updated });
            form.reset();
            closeModals();
            toast({
                title: "Appointment Updated",
                description: `Appointment for ${updated.patientName} has been updated.`,
                variant: "default",
            });
        } catch (e) {
            toast({
                title: "Update Failed",
                description: "There was an error updating the appointment.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!appointmentToDelete) return;

        try {
            await deleteAppointment.mutateAsync(appointmentToDelete.id);
            setDeleteModalOpen(false);
            setAppointmentToDelete(null);
            toast({
                title: "Appointment Deleted",
                description: "The appointment has been deleted.",
                variant: "default",
            });
        } catch (e) {
            toast({
                title: "Delete Failed",
                description: "There was an error deleting the appointment.",
                variant: "destructive",
            });
        }
    };

    // Autofocus on first input for accessibility
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    // UX: Focus error field on submit
    useEffect(() => {
        if (form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0) {
            const firstError = Object.keys(form.formState.errors)[0];
            const el = document.getElementById(firstError);
            if (el) (el as HTMLElement).focus();
        }
    }, [form.formState.isSubmitted, form.formState.errors]);

    // Helper for field error
    const renderError = (field: keyof AppointmentForm) =>
        form.formState.errors[field] ? (
            <p className="text-xs text-red-500 mt-1">{form.formState.errors[field]?.message}</p>
        ) : null;

    // UX: Show success or error message below form
    const renderBookingFeedback = () => {
        if (bookingState === "success") {
            return (
                <div className="mt-2 text-green-600 text-sm flex items-center gap-2" role="status">
                    <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Appointment booked successfully!
                </div>
            );
        }
        if (bookingState === "error") {
            return (
                <div className="mt-2 text-red-600 text-sm flex items-center gap-2" role="alert">
                    <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    There was an error booking the appointment.
                </div>
            );
        }
        return null;
    };

    // UX: Keyboard shortcut for focusing search
    const searchInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    return (
        <section>
            <Card className="shadow-lg border-2 border-primary/10">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <span role="img" aria-label="calendar">📅</span>
                        Book Appointment
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                        autoComplete="off"
                        aria-label="Book Appointment Form"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="patientName" className="font-semibold">
                                    Patient Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="patientName"
                                    placeholder="Enter full name"
                                    {...form.register("patientName")}
                                    ref={inputRef}
                                    autoComplete="off"
                                    className={form.formState.errors.patientName ? "border-red-500" : ""}
                                    aria-invalid={!!form.formState.errors.patientName}
                                    aria-describedby={form.formState.errors.patientName ? "patientName-error" : undefined}
                                />
                                {renderError("patientName")}
                            </div>

                            <div>
                                <Label htmlFor="phone" className="font-semibold">
                                    Phone <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="phone"
                                    placeholder="e.g. 5551234567"
                                    {...form.register("phone")}
                                    inputMode="tel"
                                    maxLength={15}
                                    className={form.formState.errors.phone ? "border-red-500" : ""}
                                    aria-invalid={!!form.formState.errors.phone}
                                    aria-describedby={form.formState.errors.phone ? "phone-error" : undefined}
                                />
                                {renderError("phone")}
                            </div>

                            <div>
                                <Label htmlFor="doctor" className="font-semibold">
                                    Doctor <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="doctor"
                                    {...form.register("doctor")}
                                    className={`w-full rounded border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary ${form.formState.errors.doctor ? "border-red-500" : "border-gray-300"}`}
                                    aria-invalid={!!form.formState.errors.doctor}
                                    aria-describedby={form.formState.errors.doctor ? "doctor-error" : undefined}
                                >
                                    <option value="">Select doctor</option>
                                    {doctorOptions.map((doc) => (
                                        <option key={doc.value} value={doc.value}>
                                            {doc.label}
                                        </option>
                                    ))}
                                </select>
                                {renderError("doctor")}
                            </div>

                            <div>
                                <Label htmlFor="date" className="font-semibold">
                                    Date <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="date"
                                    id="date"
                                    min={new Date().toISOString().split("T")[0]}
                                    {...form.register("date")}
                                    className={form.formState.errors.date ? "border-red-500" : ""}
                                    aria-invalid={!!form.formState.errors.date}
                                    aria-describedby={form.formState.errors.date ? "date-error" : undefined}
                                />
                                {renderError("date")}
                            </div>

                            <div>
                                <Label htmlFor="time" className="font-semibold">
                                    Time <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="time"
                                    id="time"
                                    {...form.register("time")}
                                    className={form.formState.errors.time ? "border-red-500" : ""}
                                    aria-invalid={!!form.formState.errors.time}
                                    aria-describedby={form.formState.errors.time ? "time-error" : undefined}
                                />
                                {renderError("time")}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="note" className="font-semibold">
                                Note
                            </Label>
                            <Textarea
                                id="note"
                                placeholder="Add any additional notes (optional)"
                                {...form.register("note")}
                                className="resize-none"
                                rows={3}
                                maxLength={300}
                                aria-describedby="note-help"
                            />
                            <div id="note-help" className="text-xs text-gray-400 mt-1">
                                Max 300 characters.
                            </div>
                        </div>

                        {renderBookingFeedback()}

                        <div className="flex items-center gap-4">
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                                className="px-8 py-2 text-base"
                                aria-busy={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                            />
                                        </svg>
                                        Booking...
                                    </span>
                                ) : (
                                    "Book Appointment"
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    form.reset();
                                    setBookingState("idle");
                                }}
                                disabled={form.formState.isSubmitting}
                            >
                                Clear
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-10">
                <Card className="shadow-lg border-2 border-primary/10">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold flex items-center gap-2">
                            <span role="img" aria-label="list">📋</span>
                            Appointment Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                            <div className="flex-1">
                                <Input
                                    ref={searchInputRef}
                                    type="search"
                                    placeholder="Search by patient, doctor, date, or note (Ctrl+K)"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full md:w-80"
                                    aria-label="Search appointments"
                                />
                            </div>
                            <div className="text-xs text-gray-400 mt-1 md:mt-0">
                                {filteredAppointments.length} {filteredAppointments.length === 1 ? "appointment" : "appointments"}
                            </div>
                        </div>
                        {filteredAppointments.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                No appointments found. {state.appointments.length === 0 ? "Book your first appointment above!" : "Try a different search."}
                            </div>
                        ) : (
                            <DataTable
                                columns={getAppointmentColumns({
                                    onView: (appointment) => {
                                        setSelectedAppointment(appointment);
                                        setViewModalOpen(true);
                                    },
                                    onEdit: (appointment) => {
                                        setSelectedAppointment(appointment);
                                        form.setValue("patientName", appointment.patientName);
                                        // UX: If phone is not present, leave blank
                                        form.setValue("phone", (appointment as any).phone ?? "");
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
                                data={filteredAppointments}
                            />
                        )}
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
