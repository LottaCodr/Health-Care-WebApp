"use client"

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Staff } from "@/types/appwrite.types";

interface Props {
    employee: Staff
    onClose: () => void;
    onSave: (employee: any) => void;
}

export default function EditEmployeeModal({ employee, onClose, onSave }: Props) {
    const [formData, setFormData] = useState(employee);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        onSave(formData);
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Input
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                    />
                    <Input
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                    />
                    <Input
                        placeholder="Position"
                        value={formData.position}
                        onChange={(e) => handleChange("position", e.target.value)}
                    />
                    <Input
                        placeholder="Department"
                        value={formData.department}
                        onChange={(e) => handleChange("department", e.target.value)}
                    />
                    <select
                        className="w-full border border-input rounded px-3 py-2 text-sm"
                        value={formData.status}
                        onChange={(e) => handleChange("status", e.target.value)}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
