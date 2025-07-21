"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { PatientRecord } from "@/types";
import { Modal } from "./modal";
import { DataTable } from "./table/DataTable";
import { FiEye, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";

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
    const [search, setSearch] = useState("");

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

    // Improved: Add search/filter functionality
    const filteredPatients = useMemo(() => {
        if (!search.trim()) return dummyPatients;
        const s = search.toLowerCase();
        return dummyPatients.filter(
            (p) =>
                p.name.toLowerCase().includes(s) ||
                p.phone.toLowerCase().includes(s) ||
                p.id.toLowerCase().includes(s)
        );
    }, [search]);

    // Improved: Add tooltips, icons, and better button feedback
    const columns = [
        { accessorKey: "id", header: "Patient ID" },
        { accessorKey: "name", header: "Name" },
        { accessorKey: "gender", header: "Gender" },
        { accessorKey: "age", header: "Age" },
        { accessorKey: "phone", header: "Phone" },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }: any) => {
                const patient = row.original;
                return (
                    <div className="flex gap-1 md:gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="hover:bg-red-50 text-red-600 rounded-full"
                            title="View Details"
                            aria-label="View"
                            onClick={() => openViewModal(patient)}
                        >
                            <FiEye className="w-5 h-5" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="hover:bg-red-100 text-red-700 rounded-full"
                            title="Edit Record"
                            aria-label="Edit"
                            onClick={() => openEditModal(patient)}
                        >
                            <FiEdit2 className="w-5 h-5" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="hover:bg-red-200 text-red-800 rounded-full"
                            title="Delete Record"
                            aria-label="Delete"
                            onClick={() => openDeleteModal(patient)}
                        >
                            <FiTrash2 className="w-5 h-5" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    // Improved: Reset form on modal open, show errors, better field layout
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PatientRecord>({
        defaultValues: selectedPatient || {}
    });

    // Reset form when opening edit modal
    useEffect(() => {
        if (editModalOpen && selectedPatient) {
            reset(selectedPatient);
        }
    }, [editModalOpen, selectedPatient, reset]);

    const onSubmit = (data: PatientRecord) => {
        // Submit logic here (e.g., Appwrite update)
        console.log("Updated:", data);
        closeModals();
    };

    return (
        <section className="py-8 px-2 md:px-8 space-y-10 bg-gradient-to-br from-white via-red-50 to-red-100 min-h-screen rounded-3xl shadow-2xl">
            <Card className="shadow-xl border-0 bg-white rounded-3xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-red-800 flex items-center gap-3">
                        <span className="inline-block bg-red-100 rounded-full p-2">
                            <FiEye className="w-6 h-6 text-red-500" />
                        </span>
                        Patient Records
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative w-full md:w-1/2">
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name, phone or ID"
                                className="bg-white/80 border border-red-200 focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm pl-10"
                                aria-label="Search patients"
                            />
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 w-5 h-5 pointer-events-none" />
                        </div>
                        <Button
                            className="bg-gradient-to-r from-red-600 to-red-400 text-white font-semibold rounded-xl shadow hover:from-red-700 hover:to-red-500 transition"
                            onClick={() => openEditModal({
                                id: "",
                                name: "",
                                gender: "",
                                age: 0,
                                phone: "",
                                address: "",
                                dateRegistered: new Date().toISOString().slice(0, 10),
                                medicalNote: "",
                            })}
                        >
                            + Add New Patient
                        </Button>
                    </div>
                    <div className="overflow-x-auto rounded-xl shadow-inner bg-white/80">
                        <DataTable columns={columns} data={filteredPatients} />
                        {filteredPatients.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                No patients found.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* View Modal */}
            <Modal isOpen={viewModalOpen} onClose={closeModals} title="Patient Details">
                {selectedPatient && (
                    <div className="space-y-3 text-base text-gray-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="font-semibold text-gray-600">Patient ID</p>
                                <p className="text-gray-900">{selectedPatient.id}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600">Name</p>
                                <p className="text-gray-900">{selectedPatient.name}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600">Gender</p>
                                <p className="text-gray-900">{selectedPatient.gender}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600">Age</p>
                                <p className="text-gray-900">{selectedPatient.age}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600">Phone</p>
                                <p className="text-gray-900">{selectedPatient.phone}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600">Address</p>
                                <p className="text-gray-900">{selectedPatient.address}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="font-semibold text-gray-600">Medical Note</p>
                                <p className="text-gray-900">{selectedPatient.medicalNote}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-600">Registered</p>
                                <p className="text-gray-900">{selectedPatient.dateRegistered}</p>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={editModalOpen} onClose={closeModals} title={selectedPatient && selectedPatient.id ? "Edit Patient Record" : "Add New Patient"}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <Input
                                {...register("name", { required: "Name is required" })}
                                placeholder="Full Name"
                                className={`bg-white/80 border ${errors.name ? "border-red-400" : "border-red-200"} focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm`}
                                aria-invalid={!!errors.name}
                            />
                            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                            <Input
                                {...register("age", {
                                    required: "Age is required",
                                    valueAsNumber: true,
                                    min: { value: 0, message: "Age must be positive" }
                                })}
                                type="number"
                                placeholder="Age"
                                className={`bg-white/80 border ${errors.age ? "border-red-400" : "border-red-200"} focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm`}
                                aria-invalid={!!errors.age}
                            />
                            {errors.age && <span className="text-xs text-red-500">{errors.age.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <Input
                                {...register("phone", { required: "Phone is required" })}
                                placeholder="Phone"
                                className={`bg-white/80 border ${errors.phone ? "border-red-400" : "border-red-200"} focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm`}
                                aria-invalid={!!errors.phone}
                            />
                            {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <Input
                                {...register("gender", { required: "Gender is required" })}
                                placeholder="Gender"
                                className={`bg-white/80 border ${errors.gender ? "border-red-400" : "border-red-200"} focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm`}
                                aria-invalid={!!errors.gender}
                            />
                            {errors.gender && <span className="text-xs text-red-500">{errors.gender.message}</span>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <Input
                                {...register("address", { required: "Address is required" })}
                                placeholder="Address"
                                className={`bg-white/80 border ${errors.address ? "border-red-400" : "border-red-200"} focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm`}
                                aria-invalid={!!errors.address}
                            />
                            {errors.address && <span className="text-xs text-red-500">{errors.address.message}</span>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Medical Notes</label>
                            <Textarea
                                {...register("medicalNote")}
                                placeholder="Medical Notes"
                                className="bg-white/80 border border-red-200 focus:ring-2 focus:ring-red-400 rounded-xl shadow-sm"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="border-red-400 text-red-600 hover:bg-red-50 rounded-xl"
                            onClick={closeModals}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-red-600 to-red-400 text-white font-semibold rounded-xl shadow hover:from-red-700 hover:to-red-500"
                        >
                            {isSubmitting ? "Saving..." : (selectedPatient && selectedPatient.id ? "Save Changes" : "Add Patient")}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={deleteModalOpen} onClose={closeModals} title="Delete Patient Record">
                <div className="flex flex-col items-center text-center">
                    <FiTrash2 className="w-10 h-10 text-red-500 mb-2" />
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
                </div>
            </Modal>
        </section>
    );
}
