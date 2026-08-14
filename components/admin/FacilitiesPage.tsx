"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Building2, Plus } from "lucide-react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useCreateFacility, useFacilities, useUpdateFacility } from "@/hooks/emr/use-clinical-modules";

export default function FacilitiesPage() {
    const { authorized } = useRoleProtection([UserRole.Admin]);
    const { data: facilities = [], isLoading } = useFacilities();
    const createFacility = useCreateFacility();
    const updateFacility = useUpdateFacility();

    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [phone, setPhone] = useState("");

    const add = async () => {
        if (!name.trim() || !code.trim()) { toast.error("Name and code are required."); return; }
        try {
            await createFacility.mutateAsync({ name: name.trim(), code: code.trim().toUpperCase(), city: city.trim() || undefined, state: state.trim() || undefined, phone: phone.trim() || undefined, is_active: true });
            setName(""); setCode(""); setCity(""); setState(""); setPhone("");
            toast.success("Facility added.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not add the facility.");
        }
    };

    const toggle = async (id: string, current: boolean) => {
        try {
            await updateFacility.mutateAsync({ id, updates: { is_active: !current } });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Update failed.");
        }
    };

    if (!authorized) {
        return <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs text-red-700">Admin access required.</p>;
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-black text-gray-900">Facilities</h1>
                <p className="text-xs text-gray-500">
                    Multi-facility support: staff and patients can be assigned to a facility; key lists are scoped per facility.
                </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Building2 size={16} className="text-sky-600" /> Add facility
                </p>
                <div className="grid gap-2 sm:grid-cols-5">
                    <Input placeholder="Name (e.g. Nile Valley — Garki)" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="Code (e.g. NV-GRK)" value={code} onChange={(e) => setCode(e.target.value)} />
                    <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                    <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
                    <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <Button onClick={add} disabled={createFacility.isPending} className="mt-3 gap-2 bg-sky-600 hover:bg-sky-700">
                    <Plus size={14} /> Add facility
                </Button>
            </div>

            {isLoading && <p className="text-xs text-gray-400">Loading…</p>}
            <div className="space-y-2">
                {!isLoading && facilities.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-400">
                        No facilities defined — the EMR operates as a single facility.
                    </p>
                )}
                {facilities.map((f) => (
                    <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-gray-900">{f.name}
                                <span className="ml-2 font-mono text-[10px] text-gray-400">{f.code}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                                {[f.city, f.state].filter(Boolean).join(", ")}{f.phone ? ` · ${f.phone}` : ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={f.is_active ? "default" : "secondary"}>{f.is_active ? "Active" : "Inactive"}</Badge>
                            <Button size="sm" variant="ghost" className="text-xs" onClick={() => toggle(f.id, f.is_active)}>
                                {f.is_active ? "Deactivate" : "Activate"}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
