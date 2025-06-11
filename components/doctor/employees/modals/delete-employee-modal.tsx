import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Staff } from "@/types/appwrite.types";

interface Props {
    employee: Staff;
    onClose: () => void;
    onDelete: () => void;
}

export default function DeleteEmployeeModal({ employee, onClose, onDelete }: Props) {
    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Delete Employee</DialogTitle>
                </DialogHeader>

                <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete <strong>{employee.name}</strong>? This action cannot be undone.
                </p>

                <DialogFooter className="mt-6">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={onDelete}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
