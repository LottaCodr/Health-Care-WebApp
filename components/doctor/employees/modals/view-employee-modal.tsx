import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Staff } from "@/types/appwrite.types";

interface Props {
    employee: Staff
    onClose: () => void;
}

export default function ViewEmployeeModal({ employee, onClose }: Props) {
    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Employee Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 text-sm text-muted-foreground">
                    <div>
                        <strong className="text-foreground">Name:</strong> {employee.name}
                    </div>
                    <div>
                        <strong className="text-foreground">Email:</strong> {employee.email}
                    </div>
                    <div>
                        <strong className="text-foreground">Position:</strong> {employee.position}
                    </div>
                    <div>
                        <strong className="text-foreground">Department:</strong> {employee.department}
                    </div>
                    <div>
                        <strong className="text-foreground">Date of Hire:</strong>{" "}
                        {format(new Date(employee.dateOfHire), "MMM dd, yyyy")}
                    </div>
                    <div>
                        <strong className="text-foreground">Status:</strong>{" "}
                        <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${employee.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                                }`}
                        >
                            {employee.status}
                        </span>
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
