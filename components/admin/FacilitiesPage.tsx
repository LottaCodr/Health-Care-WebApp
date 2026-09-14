"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Building2,
    ChevronRight,
    CircleCheck,
    FlaskConical,
    Layers3,
    Plus,
    Stethoscope,
} from "lucide-react";
import { useRoleProtection } from "@/lib/role-utils";
import { Facility, FacilityType, UserRole } from "@/types/models";
import { useCreateFacility, useFacilities, useUpdateFacility } from "@/hooks/emr/use-clinical-modules";

const TYPE_OPTIONS: Array<{ value: FacilityType; label: string; description: string }> = [
    { value: "hospital", label: "Hospital / site", description: "A physical or legal operating location" },
    { value: "specialist_clinic", label: "Specialist clinic", description: "A focused service line inside a hospital" },
    { value: "laboratory", label: "Laboratory", description: "A lab with its own worklist and controls" },
    { value: "satellite_site", label: "Satellite site", description: "A connected branch or outreach site" },
];

const SPECIALTIES = [
    { value: "ivf", label: "IVF & Reproductive Medicine" },
    { value: "dermatology", label: "Dermatology" },
    { value: "nephrology", label: "Nephrology" },
    { value: "urology", label: "Urology" },
    { value: "other", label: "Other specialty" },
];

function typeLabel(type?: FacilityType) {
    return TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Hospital / site";
}

function SpecialtyIcon({ type }: { type?: FacilityType }) {
    if (type === "laboratory") return <FlaskConical size={17} />;
    if (type === "specialist_clinic") return <Stethoscope size={17} />;
    return <Building2 size={17} />;
}

export default function FacilitiesPage() {
    const { authorized } = useRoleProtection([UserRole.Admin]);
    const { data: facilities = [], isLoading } = useFacilities();
    const createFacility = useCreateFacility();
    const updateFacility = useUpdateFacility();

    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [facilityType, setFacilityType] = useState<FacilityType>("specialist_clinic");
    const [parentFacilityId, setParentFacilityId] = useState("");
    const [specialtyCode, setSpecialtyCode] = useState("ivf");
    const [description, setDescription] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [phone, setPhone] = useState("");

    const hospitals = useMemo(
        () => facilities.filter((facility) => (facility.facility_type ?? "hospital") === "hospital" && facility.is_active),
        [facilities]
    );
    const roots = useMemo(
        () => facilities.filter((facility) => !facility.parent_facility_id),
        [facilities]
    );
    const childrenByParent = useMemo(() => {
        const grouped = new Map<string, typeof facilities>();
        facilities.forEach((facility) => {
            if (!facility.parent_facility_id) return;
            const children = grouped.get(facility.parent_facility_id) ?? [];
            children.push(facility);
            grouped.set(facility.parent_facility_id, children);
        });
        return grouped;
    }, [facilities]);

    const reset = () => {
        setName("");
        setCode("");
        setFacilityType("specialist_clinic");
        setParentFacilityId("");
        setSpecialtyCode("ivf");
        setDescription("");
        setCity("");
        setState("");
        setPhone("");
    };

    const add = async () => {
        if (!name.trim() || !code.trim()) {
            toast.error("Name and code are required.");
            return;
        }
        if (facilityType === "specialist_clinic" && !parentFacilityId) {
            toast.error("Choose the parent hospital for this specialist clinic.");
            return;
        }
        try {
            await createFacility.mutateAsync({
                name: name.trim(),
                code: code.trim().toUpperCase(),
                facility_type: facilityType,
                parent_facility_id: parentFacilityId || undefined,
                specialty_code: facilityType === "specialist_clinic" ? specialtyCode : undefined,
                description: description.trim() || undefined,
                city: city.trim() || undefined,
                state: state.trim() || undefined,
                phone: phone.trim() || undefined,
                is_active: true,
            });
            reset();
            toast.success(facilityType === "specialist_clinic" ? "Specialist clinic added." : "Facility added.");
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
            <header className="rounded-3xl border border-gray-100 bg-white px-5 py-5 shadow-sm sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
                            <Layers3 size={13} /> Organization structure
                        </div>
                        <h1 className="text-xl font-black tracking-tight text-gray-950">Facilities & specialist clinics</h1>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500 sm:text-sm">
                            Keep one Nile Valley patient identity while giving each clinic its own worklist, records and permissions.
                            IVF is a clinic under the hospital, not a second patient database.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-800">
                        <CircleCheck size={15} /> Hierarchy ready for IVF and future specialties
                    </div>
                </div>
            </header>

            <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                        <Plus size={17} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-gray-900">Add a facility or clinic</h2>
                        <p className="mt-0.5 text-xs text-gray-500">Create the operational boundary first. Clinical modules are enabled from the specialty.</p>
                    </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-4">
                    {TYPE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setFacilityType(option.value)}
                            className={`rounded-2xl border p-3 text-left transition-colors ${facilityType === option.value ? "border-sky-300 bg-sky-50/70 ring-2 ring-sky-100" : "border-gray-100 bg-gray-50/50 hover:border-gray-200"}`}
                        >
                            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${facilityType === option.value ? "bg-white text-sky-700" : "bg-white text-gray-500"}`}>
                                <SpecialtyIcon type={option.value} />
                            </div>
                            <p className="text-xs font-bold text-gray-900">{option.label}</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{option.description}</p>
                        </button>
                    ))}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Name" required>
                        <Input placeholder={facilityType === "specialist_clinic" ? "IVF & Reproductive Medicine" : "Nile Valley — Garki"} value={name} onChange={(e) => setName(e.target.value)} />
                    </Field>
                    <Field label="Code" required hint="Short, unique identifier">
                        <Input placeholder={facilityType === "specialist_clinic" ? "NVH-IVF" : "NVH-GRK"} value={code} onChange={(e) => setCode(e.target.value)} className="font-mono uppercase" />
                    </Field>
                    {facilityType === "specialist_clinic" ? (
                        <Field label="Parent hospital" required>
                            <select value={parentFacilityId} onChange={(e) => setParentFacilityId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500">
                                <option value="">Choose a hospital…</option>
                                {hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name} · {hospital.code}</option>)}
                            </select>
                        </Field>
                    ) : (
                        <Field label="City"><Input placeholder="Abuja" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
                    )}
                    {facilityType === "specialist_clinic" ? (
                        <Field label="Specialty">
                            <select value={specialtyCode} onChange={(e) => setSpecialtyCode(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500">
                                {SPECIALTIES.map((specialty) => <option key={specialty.value} value={specialty.value}>{specialty.label}</option>)}
                            </select>
                        </Field>
                    ) : (
                        <Field label="State"><Input placeholder="FCT" value={state} onChange={(e) => setState(e.target.value)} /></Field>
                    )}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {facilityType === "specialist_clinic" && <Field label="Clinic description"><Textarea rows={2} placeholder="What this team owns, and what remains in the general hospital…" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>}
                    <Field label="Contact details"><div className="grid gap-3 sm:grid-cols-3"><Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} /><Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} /><Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div></Field>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-xl text-[11px] leading-relaxed text-gray-400">For IVF, keep patient registration in the hospital. The specialist clinic adds the cycle, embryology and cryobank context without duplicating demographics.</p>
                    <Button onClick={add} disabled={createFacility.isPending} className="gap-2 rounded-xl bg-sky-700 px-4 hover:bg-sky-800"><Plus size={14} /> {createFacility.isPending ? "Adding…" : `Add ${facilityType === "specialist_clinic" ? "clinic" : "facility"}`}</Button>
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                    <div><h2 className="text-sm font-black text-gray-900">Organization map</h2><p className="text-xs text-gray-500">{facilities.length} configured {facilities.length === 1 ? "unit" : "units"}</p></div>
                    {isLoading && <p className="text-xs text-gray-400">Loading…</p>}
                </div>
                {!isLoading && !facilities.length && <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-400">No facilities defined. The EMR is operating in single-facility mode.</p>}
                {roots.map((root) => {
                    const children = childrenByParent.get(root.id) ?? [];
                    return (
                        <div key={root.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                            <FacilityRow facility={root} onToggle={toggle} />
                            {children.length > 0 && <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-5"><div className="space-y-1 border-l border-dashed border-gray-200 pl-3 sm:pl-5">{children.map((child) => <FacilityRow key={child.id} facility={child} onToggle={toggle} child />)}</div></div>}
                        </div>
                    );
                })}
            </section>
        </div>
    );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
    return <label className="block space-y-1.5"><span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">{label}{required && <span className="text-red-500">*</span>}{hint && <span className="font-normal normal-case tracking-normal text-gray-400">· {hint}</span>}</span>{children}</label>;
}

function FacilityRow({ facility, onToggle, child = false }: { facility: Facility; onToggle: (id: string, current: boolean) => void; child?: boolean }) {
    const row = facility;
    const isIVF = row.specialty_code === "ivf";
    return <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 ${child ? "rounded-xl bg-white" : ""}`}>
        <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isIVF ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-500"}`}><SpecialtyIcon type={row.facility_type} /></div>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-gray-900">{row.name}</p><span className="font-mono text-[10px] text-gray-400">{row.code}</span><Badge variant={row.is_active ? "default" : "secondary"} className="text-[10px]">{row.is_active ? "Active" : "Inactive"}</Badge></div><p className="mt-0.5 text-xs text-gray-500">{typeLabel(row.facility_type)}{row.specialty_code ? ` · ${SPECIALTIES.find((item) => item.value === row.specialty_code)?.label ?? row.specialty_code}` : ""}{[row.city, row.state].filter(Boolean).length ? ` · ${[row.city, row.state].filter(Boolean).join(", ")}` : ""}{row.phone ? ` · ${row.phone}` : ""}</p></div>
        </div>
        <div className="flex items-center gap-1.5">{isIVF && row.is_active && <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-xl border-teal-200 text-xs text-teal-800 hover:bg-teal-50"><Link href="/doctor/ivf">Open IVF workspace <ChevronRight size={13} /></Link></Button>}<Button size="sm" variant="ghost" className="rounded-xl text-xs text-gray-500" onClick={() => onToggle(row.id, row.is_active)}>{row.is_active ? "Deactivate" : "Activate"}</Button></div>
    </div>;
}
