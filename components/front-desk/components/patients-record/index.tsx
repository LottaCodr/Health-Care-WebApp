"use client";

import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
                        <Button size="sm" variant="outline" className="border-red-400 text-red-600 hover:bg-red-50 rounded-xl" onClick={() => openViewModal(patient)}>
                            View
                        </Button>
                        <Button size="sm" variant="secondary" className="bg-gradient-to-r from-red-600 to-red-400 text-white rounded-xl shadow hover:from-red-700 hover:to-red-500" onClick={() => openEditModal(patient)}>
                            Edit
                        </Button>
                        <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => openDeleteModal(patient)}>
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
        <section className="py-6 px-2 md:px-8 space-y-8 bg-gradient-to-br from-white via-red-50 to-red-100 min-h-screen rounded-3xl shadow-2xl">
            <Card className="shadow-xl border-0 bg-white rounded-3xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-red-800 flex items-center gap-3">Patient Records</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input placeholder="Search by name, phone or ID" className="bg-white/80 border border-red-200 focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm" />
                    </div>
                    <div className="overflow-x-auto rounded-xl shadow-inner">
                        <DataTable columns={columns} data={dummyPatients} />
                    </div>
                </CardContent>
            </Card>

            {/* View Modal */}
            <Modal isOpen={viewModalOpen} onClose={closeModals} title="Patient Details">
                {selectedPatient && (
                    <div className="space-y-2 text-sm text-gray-800">
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
                    <Input {...register("name")} placeholder="Full Name" className="bg-white/80 border border-red-200 focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm" />
                    <Input {...register("age")} type="number" placeholder="Age" className="bg-white/80 border border-red-200 focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm" />
                    <Input {...register("phone")} placeholder="Phone" className="bg-white/80 border border-red-200 focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm" />
                    <Input {...register("gender")} placeholder="Gender" className="bg-white/80 border border-red-200 focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm" />
                    <Input {...register("address")} placeholder="Address" className="bg-white/80 border border-red-200 focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm" />
                    <Textarea {...register("medicalNote")} placeholder="Medical Notes" className="bg-white/80 border border-red-200 focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm" />
                    <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-red-600 to-red-400 text-white font-semibold rounded-xl shadow hover:from-red-700 hover:to-red-500">
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={deleteModalOpen} onClose={closeModals} title="Delete Patient Record">
                <p className="mb-4 text-red-700 font-semibold">
                    Are you sure you want to delete this record?
                </p>
                <div className="flex gap-2">
                    <Button variant="destructive" className="rounded-xl">
                        Confirm Delete
                    </Button>
                    <Button variant="outline" className="border-red-400 text-red-600 hover:bg-red-50 rounded-xl" onClick={closeModals}>
                        Cancel
                    </Button>
                </div>
            </Modal>
        </section>
    );
}
