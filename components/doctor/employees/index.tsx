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
import { Staff, StaffRole } from "@/actions/staff/types";
import Loading from "@/app/useloading";
import { useEmployeesContext } from "@/context/employees/context";
import { useStaffMutations } from "@/context/employees/mutation";
import { Search, Users, Filter, ChevronLeft, ChevronRight } from "lucide-react";

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
            <tr className="hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group">
                {["name", "email", "position", "department", "dateOfHire", "status"].map((field) => (
                    <td
                        key={field}
                        className="px-4 py-3 border-b text-sm text-gray-700 dark:text-gray-200 cursor-pointer group-hover:text-red-700 transition-colors"
                        onClick={onView}
                    >
                        {field === "dateOfHire"
                            ? formattedDate
                            : field === "name"
                                ? employee.full_name
                                : field === "position"
                                    ? employee.role
                                    : field === "status"
                                        ? <StatusBadge status={employee?.status || "active"} />
                                        : (employee as Staff)[field]}
                    </td>
                ))}
                <td className="px-4 py-3 border-b text-sm text-gray-700 dark:text-gray-200 space-x-2 whitespace-nowrap">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-600 transition-colors"
                        onClick={onEdit}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-600 hover:bg-red-100 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-700 transition-colors"
                        onClick={onDelete}
                    >
                        Delete
                    </Button>
                </td>
            </tr>
        );
    }
);
EmployeeRow.displayName = "EmployeeRow";

export default function EmployeesComponent() {
    const { state } = useEmployeesContext();
    const { updateStaff, deleteStaff } = useStaffMutations();
    const employees = state.employees;
    const isPending = state.loading;

    const [selectedEmployee, setSelectedEmployee] = useState<Staff | null>(null);
    const [modalType, setModalType] = useState<"edit" | "delete" | "view" | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    //remove appwrite system fields
    function cleanStaffUpdate(data: Staff): Partial<Staff> {
        const { full_name, email, phone_number, role, department, status } = data;
        return { full_name, email, phone_number, role, department, status };
    }

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
        () => Math.max(1, Math.ceil(filteredEmployees.length / pageSize)),
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

    if (isPending) {
        return (
            <div className="p-6 w-full min-h-screen text-center flex flex-col justify-center items-center gap-4 text-red-600">
                <Loading />
                <span className="font-medium text-lg">Loading employees...</span>
            </div>
        );
    }

    return (
        <Card className="rounded-2xl shadow-lg border border-red-100 dark:border-red-900/30 bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-muted/40 dark:to-red-900/20">
            <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <span className="inline-flex items-center justify-center rounded-full bg-red-100 p-3 shadow border-2 border-red-200">
                        <Users className="text-2xl text-red-600" />
                    </span>
                    <h2 className="text-2xl font-bold text-red-700 tracking-tight drop-shadow-sm">
                        Employee Directory
                    </h2>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative md:w-1/3">
                        <Input
                            placeholder="Search name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 border-red-200 focus:border-red-400 focus:ring-red-300"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" size={18} />
                    </div>
                    <div className="flex gap-2 items-center">
                        <Filter className="text-red-400" size={18} />
                        <select
                            className="border border-red-200 px-3 py-2 rounded-md text-sm text-gray-700 focus:outline-none focus:border-red-400 transition-colors"
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
                            className="border border-red-200 px-3 py-2 rounded-md text-sm text-gray-700 focus:outline-none focus:border-red-400 transition-colors"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-red-100 dark:border-red-900/30 bg-white/90 dark:bg-muted/40">
                    <table className="min-w-full divide-y divide-red-100 dark:divide-red-900/20">
                        <thead className="bg-red-50 dark:bg-red-900/10">
                            <tr>
                                {['Name', 'Email', 'Position', 'Department', 'Date of Hire', 'Status', 'Actions'].map((header) => (
                                    <th
                                        key={header}
                                        className="px-4 py-3 text-left text-xs font-semibold text-red-600 dark:text-red-300 uppercase tracking-wider"
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-muted/40 divide-y divide-red-50 dark:divide-red-900/10">
                            {paginatedEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-red-400 font-medium">
                                        No employees found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedEmployees.map((employee) => (
                                    <EmployeeRow
                                        key={employee.$id}
                                        employee={employee}
                                        onEdit={() => openModal(employee, "edit")}
                                        onDelete={() => openModal(employee, "delete")}
                                        onView={() => openModal(employee, "view")}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        className="border-red-400 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                        <ChevronLeft size={18} /> Previous
                    </Button>
                    <span className="text-sm text-red-600 font-medium">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        className="border-red-400 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                        Next <ChevronRight size={18} />
                    </Button>
                </div>
            </CardContent>

            {selectedEmployee && modalType === "edit" && (
                <EditEmployeeModal
                    key={selectedEmployee.$id}
                    employee={selectedEmployee}
                    onClose={closeModal}
                    onSave={async (data) => {
                        updateStaff({
                            id: selectedEmployee.$id,
                            updates: {
                                ...data,
                                status: data.status === "Inactive" ? "inactive" : "active",
                                role: data.role as StaffRole,
                            },
                        });
                    }}
                />
            )}

            {selectedEmployee && modalType === "view" && (
                <ViewEmployeeModal
                    key={selectedEmployee.$id}
                    employee={selectedEmployee}
                    onClose={closeModal}
                />
            )}

            {selectedEmployee && modalType === "delete" && (
                <DeleteEmployeeModal
                    key={selectedEmployee.$id}
                    employee={selectedEmployee}
                    onClose={closeModal}
                    onDelete={() => deleteStaff(selectedEmployee.$id)}
                />
            )}
        </Card>
    );
}
