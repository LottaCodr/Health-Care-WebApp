"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { faker } from "@faker-js/faker";
import useDebounce from "@/lib/hooks/useDebouce";
import EditEmployeeModal from "./modals/edit-employee-modal";
import ViewEmployeeModal from "./modals/view-employee-modal";
import DeleteEmployeeModal from "./modals/delete-employee-modal";
import StatusBadge from "./status-badge";

interface Employee {
    id: string;
    name: string;
    email: string;
    position: string;
    department: string;
    dateOfHire: string;
    status: "Active" | "Inactive";
}

const generateFakeEmployees = (count: number): Employee[] => {
    return Array.from({ length: count }, () => ({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        position: faker.person.jobTitle(),
        department: faker.commerce.department(),
        dateOfHire: faker.date.past().toISOString(),
        status: faker.helpers.arrayElement(["Active", "Inactive"]),
    }));
};

const EmployeeRow = React.memo(
    ({ employee, onEdit, onDelete, onView }: {
        employee: Employee;
        onEdit: () => void;
        onDelete: () => void;
        onView: () => void;
    }) => {
        const formattedDate = useMemo(
            () => format(new Date(employee.dateOfHire), "MMM dd, yyyy"),
            [employee.dateOfHire]
        );

        return (
            <tr className="hover:bg-muted transition-colors">
                {["name", "email", "position", "department", "dateOfHire", "status"]
                    .map((field) => (
                        <td
                            key={field}
                            className="px-4 py-3 border-b text-sm text-gray-700 cursor-pointer"
                            onClick={onView}
                        >
                            {field === "dateOfHire"
                                ? formattedDate
                                : field === "status"
                                    ? <StatusBadge status={employee.status} /> // 👈 Replace raw status with component
                                    : (employee as any)[field]}

                        </td>
                    ))}
                <td className="px-4 py-3 border-b text-sm text-gray-700 space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        onClick={onEdit}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={onDelete}
                    >
                        Delete
                    </Button>
                </td>
            </tr>
        );
    }
);

export default function EmployeesComponent() {
    const [employees, setEmployees] = useState<Employee[]>(() => generateFakeEmployees(50));
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [modalType, setModalType] = useState<"edit" | "delete" | "view" | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const departments = useMemo(
        () => [...new Set(employees.map((e) => e.department))],
        [employees]
    );

    const filteredEmployees = useMemo(() => {
        return employees
            .filter((e) =>
                e.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                e.email.toLowerCase().includes(debouncedSearch.toLowerCase())
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

    const openModal = (employee: Employee, type: typeof modalType) => {
        setSelectedEmployee(employee);
        setModalType(type);
    };

    const closeModal = () => {
        setSelectedEmployee(null);
        setModalType(null);
    };

    const handleSave = (updatedEmployee: Employee) => {
        setEmployees((prev) =>
            prev.map((e) => (e.id === updatedEmployee.id ? updatedEmployee : e))
        );
        closeModal();
    };

    const handleDelete = () => {
        if (selectedEmployee) {
            setEmployees((prev) => prev.filter((e) => e.id !== selectedEmployee.id));
            closeModal();
        }
    };

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
                                    key={employee.id}
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
