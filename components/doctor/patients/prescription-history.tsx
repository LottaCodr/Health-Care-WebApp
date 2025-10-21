"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreVertical, DownloadCloud, Eye } from "lucide-react";

const prescriptions = [
  {
    id: "rx001",
    date: "2024-04-10",
    medication: "Paracetamol 500mg",
    dosage: "1 tablet every 8h",
    route: "Oral",
    duration: "5 days",
    notes: "After meals",
    status: "Active",
  },
  {
    id: "rx002",
    date: "2024-03-15",
    medication: "Amoxicillin 250mg",
    dosage: "1 capsule every 12h",
    route: "Oral",
    duration: "7 days",
    notes: "Finish full course",
    status: "Completed",
  },
  {
    id: "rx003",
    date: "2024-01-21",
    medication: "Ibuprofen 200mg",
    dosage: "1 tablet every 8h",
    route: "Oral",
    duration: "3 days",
    notes: "If pain persists",
    status: "Expired",
  },
];

function statusColor(status: string) {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Completed":
      return "bg-blue-100 text-blue-800";
    case "Expired":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function PrescriptionHistory() {
  return (
    <Card className="bg-white text-black">
      <CardHeader>
        <CardTitle>Prescription History</CardTitle>
        <p className="text-muted-foreground text-sm">
          Records of all medications prescribed to the patient.
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full max-h-[330px]">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((rx) => (
                <TableRow key={rx.id}>
                  <TableCell>{rx.date}</TableCell>
                  <TableCell>{rx.medication}</TableCell>
                  <TableCell>{rx.dosage}</TableCell>
                  <TableCell>{rx.route}</TableCell>
                  <TableCell>{rx.duration}</TableCell>
                  <TableCell>{rx.notes}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${statusColor(rx.status)}`}
                    >
                      {rx.status}
                    </span>
                  </TableCell>
                  <TableCell className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" aria-label="View prescription">
                      <Eye size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Download PDF">
                      <DownloadCloud size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="More options">
                      <MoreVertical size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

