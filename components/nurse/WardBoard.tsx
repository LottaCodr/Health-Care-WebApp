"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BedDouble, Plus } from "lucide-react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useUpsertWard, useWardBoard } from "@/hooks/emr/use-clinical-modules";

export default function WardBoard() {
    const { authorized } = useRoleProtection([UserRole.Nurse]);
    const { data: wards = [], isLoading } = useWardBoard();
    const upsertWard = useUpsertWard();

    const [name, setName] = useState("");
    const [beds, setBeds] = useState(10);
    const [department, setDepartment] = useState("");

    const addWard = async () => {
        if (!name.trim()) return;
        try {
            await upsertWard.mutateAsync({ name: name.trim(), total_beds: beds, department: department.trim() || undefined });
            setName(""); setDepartment("");
            toast.success("Ward added.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not add the ward.");
        }
    };

    if (!authorized) {
        return <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs text-red-700">Nurse access required.</p>;
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-gray-900">Ward & Bed Board</h1>
                    <p className="text-xs text-gray-500">Live occupancy per ward from active admissions.</p>
                </div>
                {wards.length > 0 && (
                    <Badge variant="outline">
                        {wards.reduce((s, w) => s + w.occupied, 0)} occupied · {wards.reduce((s, w) => s + w.free, 0)} free
                    </Badge>
                )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="grid gap-2 sm:grid-cols-4">
                    <Input placeholder="Ward name (e.g. Male Surgical)" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input type="number" min={1} placeholder="Total beds" value={beds} onChange={(e) => setBeds(Number(e.target.value))} />
                    <Input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
                    <Button onClick={addWard} disabled={!name.trim() || upsertWard.isPending} className="gap-2">
                        <Plus size={14} /> Add ward
                    </Button>
                </div>
            </div>

            {isLoading && <p className="text-xs text-gray-400">Loading board…</p>}
            {!isLoading && wards.length === 0 && (
                <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-400">
                    No wards defined yet. Add wards to see the live bed board.
                </p>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {wards.map((w) => (
                    <div key={w.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                <BedDouble size={16} className="text-teal-600" /> {w.name}
                            </p>
                            <Badge variant={w.occupied >= w.total_beds ? "destructive" : "secondary"}>
                                {w.occupied}/{w.total_beds}
                            </Badge>
                        </div>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            {w.department ?? "General"} · {w.free} free
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {Array.from({ length: w.total_beds }).map((_, i) => {
                                const patient = w.patients[i];
                                return (
                                    <div key={i}
                                        title={patient ? `${patient.name || "Unnamed patient"}${patient.bed_number ? ` (bed ${patient.bed_number})` : ""}` : "Free bed"}
                                        className={`flex h-9 w-9 items-center justify-center rounded-lg border text-[10px] font-black ${
                                            patient ? "border-teal-200 bg-teal-50 text-teal-700" : "border-gray-100 bg-gray-50 text-gray-300"
                                        }`}>
                                        {patient
                                            ? (patient.name ? patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "—")
                                            : i + 1}
                                    </div>
                                );
                            })}
                        </div>
                        {w.patients.length > 0 && (
                            <div className="mt-3 space-y-1 border-t border-gray-50 pt-2">
                                {w.patients.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between text-xs">
                                        <a href={`/nurse/queue/patient/${p.id}`} className="truncate font-semibold text-gray-700 hover:underline">
                                            {p.name}
                                        </a>
                                        <span className="text-gray-400">{p.bed_number ? `Bed ${p.bed_number}` : "Unassigned bed"}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
