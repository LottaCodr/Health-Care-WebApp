"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EditEmployeeModal({
    employee,
    onClose,
    onSave,
}: {
    employee: any;
    onClose: () => void;
    onSave: (updatedEmployee: any) => void;
}) {
    const [form, setForm] = useState({ ...employee });

    const handleChange = (field: string, value: string) => {
        setForm((prev: typeof employee) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        onSave(form);
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Input
                        placeholder="Full Name"
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                    />
                    <Input
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                    />
                    <Input
                        placeholder="Position"
                        value={form.position}
                        onChange={(e) => handleChange("position", e.target.value)}
                    />
                    <Input
                        placeholder="Department"
                        value={form.department}
                        onChange={(e) => handleChange("department", e.target.value)}
                    />
                    <select
                        className="w-full border p-2 rounded"
                        value={form.status}
                        onChange={(e) => handleChange("status", e.target.value)}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <Button onClick={handleSubmit}>Save</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
