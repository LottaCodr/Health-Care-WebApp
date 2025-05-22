import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ViewEmployeeModal({
    employee,
    onClose,
}: {
    employee: any;
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Employee Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {employee.name}</p>
                    <p><strong>Email:</strong> {employee.email}</p>
                    <p><strong>Position:</strong> {employee.position}</p>
                    <p><strong>Department:</strong> {employee.department}</p>
                    <p><strong>Date of Hire:</strong> {new Date(employee.dateOfHire).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> {employee.status}</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
