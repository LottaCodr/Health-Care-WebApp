"use client"

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import useDebounce from "@/hooks/useDebouce";
import EditEmployeeModal from "./modals/edit-employee-modal";
import ViewEmployeeModal from "./modals/view-employee-modal";
import DeleteEmployeeModal from "./modals/delete-employee-modal";
import StatusBadge from "./status-badge";
import { useQuery } from "@tanstack/react-query";
import { getAllStaffs } from "@/actions/appointments/staff/get.staff";
import { Staff } from "@/types/appwrite.types";
import Loading from "@/app/useloading";

const EmployeeRow = React.memo(
    ({ employee, onEdit, onDelete, onView }: {
        employee: Staff;
        onEdit: () => void;
        onDelete: () => void;
        onView: () => void;
    }) => {
        const formattedDate = useMemo(() => {
            const date = new Date(employee?.$createdAt);
            return isNaN(date.getTime()) ? "N/A" : format(date, "MMM dd, yyyy");
        }, [employee?.$createdAt]);

        return (
            <tr className="hover:bg-muted transition-colors">

                {["name", "email", "position", "department", "dateOfHire", "status"].map((field) => (
                    <>

                        <td
                            key={field}
                            className="px-4 py-3 border-b text-sm text-gray-700 cursor-pointer"
                            onClick={onView}
                        >
                            {field === "dateOfHire"
                                ? formattedDate :
                                field === "name" ? employee.full_name : field === "position" ? employee.role
                                    : field === "status"
                                        ? <StatusBadge status={employee?.status || "active"} />
                                        : (employee as Staff)[field]}
                        </td>
                    </>
                ))}
                <td className="px-4 py-3 border-b text-sm text-gray-700 space-x-2">
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={onEdit}>
                        Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={onDelete}>
                        Delete
                    </Button>
                </td>
            </tr>
        );
    }
);
EmployeeRow.displayName = "EmployeeRow";

export default function EmployeesComponent() {
    const [selectedEmployee, setSelectedEmployee] = useState<Staff | null>(null);
    const [modalType, setModalType] = useState<"edit" | "delete" | "view" | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const { data: employees = [], isPending, isError } = useQuery({
        queryKey: ['staff'],
        queryFn: getAllStaffs,
    });

    const departments = useMemo(() => [...new Set(employees.map((e) => e.department))], [employees]);

    const filteredEmployees = useMemo(() => {
        return employees
            .filter((e: Staff) =>
                e.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                e.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
            )
            .filter((e) => (departmentFilter ? e.department === departmentFilter : true))
            .filter((e) => (statusFilter ? e.status === statusFilter : true));
    }, [employees, debouncedSearch, departmentFilter, statusFilter]);

    const paginatedEmployees = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredEmployees.slice(start, start + pageSize);
    }, [filteredEmployees, currentPage]);

    const totalPages = useMemo(
        () => Math.ceil(filteredEmployees.length / pageSize),
        [filteredEmployees.length]
    );

    const openModal = (employee: Staff, type: typeof modalType) => {
        setSelectedEmployee(employee);
        setModalType(type);
    };

    const closeModal = () => {
        setSelectedEmployee(null);
        setModalType(null);
    };

    const handleSave = (updatedEmployee: Staff) => {
        // You'd normally send a mutation and refetch or optimistically update
        closeModal();
    };

    const handleDelete = () => {
        // You'd normally send a mutation and refetch or optimistically update
        closeModal();
    };

    if (isPending) return <div className="p-6 w-full min-h-screen text-center justify-center items-center flex gap-4 text-gray-600"> <Loading /> Loading employees...</div>;
    if (isError) return <div className="p-6 text-red-600">Error loading employees.</div>;

    return (
        <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Employee Directory</h2>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <Input
                        placeholder="Search name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="md:w-1/3"
                    />
                    <select
                        className="border px-3 py-2 rounded-md text-sm text-gray-600 focus:outline-none"
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                            <option key={dept} value={dept}>
                                {dept}
                            </option>
                        ))}
                    </select>
                    <select
                        className="border px-3 py-2 rounded-md text-sm text-gray-600 focus:outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Name', 'Email', 'Position', 'Department', 'Date of Hire', 'Status', 'Actions'].map((header) => (
                                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {paginatedEmployees.map((employee) => (
                                <EmployeeRow
                                    key={employee.$id}
                                    employee={employee}
                                    onEdit={() => openModal(employee, "edit")}
                                    onDelete={() => openModal(employee, "delete")}
                                    onView={() => openModal(employee, "view")}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <Button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                    >
                        Next
                    </Button>
                </div>
            </CardContent>

            {selectedEmployee && modalType === "edit" && (
                <EditEmployeeModal
                    key={selectedEmployee.id}
                    employee={selectedEmployee}
                    onClose={closeModal}
                    onSave={handleSave}
                />
            )}

            {selectedEmployee && modalType === "view" && (
                <ViewEmployeeModal
                    key={selectedEmployee.id}
                    employee={selectedEmployee}
                    onClose={closeModal}
                />
            )}

            {selectedEmployee && modalType === "delete" && (
                <DeleteEmployeeModal
                    key={selectedEmployee.id}
                    employee={selectedEmployee}
                    onClose={closeModal}
                    onDelete={handleDelete}
                />
            )}
        </Card>
    );
}
