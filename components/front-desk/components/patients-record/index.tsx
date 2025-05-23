"use client";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/custom/status-badge";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PatientRecord } from "@/types";
import { Modal } from "./modal";
import { DataTable } from "./table/DataTable";

const dummyPatients: PatientRecord[] = [
    {
        id: "p001",
        name: "John Doe",
        gender: "Male",
        age: 32,
        phone: "+2348012345678",
        address: "12 Allen Avenue, Ikeja",
        dateRegistered: "2024-05-01",
        medicalNote: "Allergic to penicillin",
    },
    // Add more dummy data or fetch from backend
];

export default function PatientRecordsComponent() {
    const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const openViewModal = (patient: PatientRecord) => {
        setSelectedPatient(patient);
        setViewModalOpen(true);
    };

    const openEditModal = (patient: PatientRecord) => {
        setSelectedPatient(patient);
        setEditModalOpen(true);
    };

    const openDeleteModal = (patient: PatientRecord) => {
        setSelectedPatient(patient);
        setDeleteModalOpen(true);
    };

    const closeModals = () => {
        setViewModalOpen(false);
        setEditModalOpen(false);
        setDeleteModalOpen(false);
        setSelectedPatient(null);
    };

    const columns = [
        { accessorKey: "id", header: "Patient ID" },
        { accessorKey: "name", header: "Name" },
        { accessorKey: "gender", header: "Gender" },
        { accessorKey: "age", header: "Age" },
        { accessorKey: "phone", header: "Phone" },
        {
            id: "actions",
            cell: ({ row }: any) => {
                const patient = row.original;
                return (
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openViewModal(patient)}>
                            View
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(patient)}>
                            Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openDeleteModal(patient)}>
                            Delete
                        </Button>
                    </div>
                );
            },
        },
    ];

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PatientRecord>({
        defaultValues: selectedPatient || {}
    });

    const onSubmit = (data: PatientRecord) => {
        // Submit logic here (e.g., Appwrite update)
        console.log("Updated:", data);
        closeModals();
    };

    return (
        <section>
            <Card>
                <CardHeader>
                    <CardTitle>Patient Records</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input placeholder="Search by name, phone or ID" />
                    </div>
                    <DataTable columns={columns} data={dummyPatients} />
                </CardContent>
            </Card>

            {/* View Modal */}
            <Modal isOpen={viewModalOpen} onClose={closeModals} title="Patient Details">
                {selectedPatient && (
                    <div className="space-y-2 text-sm">
                        <p><strong>ID:</strong> {selectedPatient.id}</p>
                        <p><strong>Name:</strong> {selectedPatient.name}</p>
                        <p><strong>Gender:</strong> {selectedPatient.gender}</p>
                        <p><strong>Age:</strong> {selectedPatient.age}</p>
                        <p><strong>Phone:</strong> {selectedPatient.phone}</p>
                        <p><strong>Address:</strong> {selectedPatient.address}</p>
                        <p><strong>Note:</strong> {selectedPatient.medicalNote}</p>
                        <p><strong>Registered:</strong> {selectedPatient.dateRegistered}</p>
                    </div>
                )}
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={editModalOpen} onClose={closeModals} title="Edit Patient Record">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input {...register("name")} placeholder="Full Name" />
                    <Input {...register("age")} type="number" placeholder="Age" />
                    <Input {...register("phone")} placeholder="Phone" />
                    <Input {...register("gender")} placeholder="Gender" />
                    <Input {...register("address")} placeholder="Address" />
                    <Textarea {...register("medicalNote")} placeholder="Medical Notes" />
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={deleteModalOpen} onClose={closeModals} title="Delete Patient Record">
                <p className="mb-4">
                    Are you sure you want to delete this record?
                </p>
                <div className="flex gap-2">
                    <Button variant="destructive">
                        Confirm Delete
                    </Button>
                    <Button variant="outline" onClick={closeModals}>
                        Cancel
                    </Button>
                </div>
            </Modal>
        </section>
    );
}
