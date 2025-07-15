import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle as ExclamationTriangleIcon } from "lucide-react";
import { Staff, StaffRole } from "@/actions/staff/types";

interface Props {
    employee: Staff;
    onClose: () => void;
    onDelete: () => Promise<void> | void;
}

export default function DeleteEmployeeModal({ employee, onClose, onDelete }: Props) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await onDelete();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-red-100 p-2">
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                        </span>
                        <DialogTitle className="text-red-600">Delete Employee</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="mt-2 space-y-2">
                    <p className="text-base font-medium">
                        Are you absolutely sure?
                    </p>
                    <p className="text-sm text-muted-foreground">
                        This action will permanently remove <strong className="text-red-600">{employee.name}</strong> from your staff list. <br />
                        <span className="text-red-500 font-semibold">This cannot be undone.</span>
                    </p>
                </div>

                <DialogFooter className="mt-6 flex flex-row-reverse gap-2">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading}
                        aria-label="Confirm delete employee"
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                            aria-label="Cancel delete"
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
