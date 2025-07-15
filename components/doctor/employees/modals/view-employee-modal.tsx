import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { User, Mail, Briefcase, Building2, CalendarDays, BadgeCheck, Ban } from "lucide-react";
import { Staff } from "@/actions/staff/types";

interface Props {
    employee: Staff;
    onClose: () => void;
}

const fieldList = [
    {
        label: "Name",
        icon: User,
        value: (e: Staff) => e.name,
    },
    {
        label: "Email",
        icon: Mail,
        value: (e: Staff) => e.email,
    },
    {
        label: "Position",
        icon: Briefcase,
        value: (e: Staff) => e.position,
    },
    {
        label: "Department",
        icon: Building2,
        value: (e: Staff) => e.department,
    },
    {
        label: "Date of Hire",
        icon: CalendarDays,
        value: (e: Staff) => format(new Date(e.dateOfHire), "MMM dd, yyyy"),
    },
];

export default function ViewEmployeeModal({ employee, onClose }: Props) {
    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden">
                <DialogHeader className="bg-red-50 px-6 py-4 border-b border-red-100">
                    <DialogTitle className="flex items-center gap-2 text-red-700 text-lg font-bold">
                        <User className="w-5 h-5 text-red-500" />
                        Employee Details
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 py-6 space-y-5 bg-white">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl font-bold text-red-700 shadow">
                            {employee.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-foreground">{employee.name}</div>
                            <div className="text-xs text-muted-foreground">{employee.email}</div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {fieldList.map(({ label, icon: Icon, value }) => (
                            <div key={label} className="flex items-center gap-3">
                                <span className="w-5 h-5 text-red-400 flex items-center justify-center">
                                    <Icon className="w-4 h-4" />
                                </span>
                                <span className="font-medium text-foreground min-w-[90px]">{label}:</span>
                                <span className="text-sm text-muted-foreground">{value(employee)}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-3">
                            <span className="w-5 h-5 flex items-center justify-center">
                                {employee.status === "active" ? (
                                    <BadgeCheck className="w-4 h-4 text-green-500" />
                                ) : (
                                    <Ban className="w-4 h-4 text-red-400" />
                                )}
                            </span>
                            <span className="font-medium text-foreground min-w-[90px]">Status:</span>
                            <span
                                className={`inline-block px-2 py-1 rounded-full text-xs font-semibold transition-colors ${employee.status === "active"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                    }`}
                            >
                                {employee.status
                                    ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1)
                                    : "Unknown"}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-red-50 px-6 py-4 border-t border-red-100 flex justify-end">
                    <Button variant="outline" onClick={onClose} className="min-w-[80px]">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
