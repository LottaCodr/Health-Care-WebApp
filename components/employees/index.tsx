"use client"

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
    ({
        employee,
        onEdit,
        onDelete,
        onView,
    }: {
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
            <tr className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b cursor-pointer" onClick={onView}>
                    {employee.name}
                </td>
                <td className="py-2 px-4 border-b cursor-pointer" onClick={onView}>
                    {employee.email}
                </td>
                <td className="py-2 px-4 border-b cursor-pointer" onClick={onView}>
                    {employee.position}
                </td>
                <td className="py-2 px-4 border-b cursor-pointer" onClick={onView}>
                    {employee.department}
                </td>
                <td className="py-2 px-4 border-b cursor-pointer" onClick={onView}>
                    {formattedDate}
                </td>
                <td className="py-2 px-4 border-b cursor-pointer" onClick={onView}>
                    {employee.status}
                </td>
                <td className="py-2 px-4 border-b space-x-2">
                    <button onClick={onEdit} className="text-blue-600 hover:underline">
                        Edit
                    </button>
                    <button onClick={onDelete} className="text-red-600 hover:underline">
                        Delete
                    </button>
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
            .filter((e) =>
                departmentFilter ? e.department === departmentFilter : true
            )
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
        <Card>
            <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Employees</h2>
                <div className="flex gap-4 mb-4">
                    <Input
                        placeholder="Search by name or email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        className="border px-2 py-1 rounded"
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
                        className="border px-2 py-1 rounded"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="py-2 px-4 border-b text-left">Name</th>
                                <th className="py-2 px-4 border-b text-left">Email</th>
                                <th className="py-2 px-4 border-b text-left">Position</th>
                                <th className="py-2 px-4 border-b text-left">Department</th>
                                <th className="py-2 px-4 border-b text-left">Date of Hire</th>
                                <th className="py-2 px-4 border-b text-left">Status</th>
                                <th className="py-2 px-4 border-b text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
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
                <div className="mt-4 flex justify-between">
                    <Button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <span>
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        onClick={() =>
                            setCurrentPage((p) => Math.min(p + 1, totalPages))
                        }
                        disabled={currentPage === totalPages}
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
