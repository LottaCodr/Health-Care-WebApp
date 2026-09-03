"use client";

import { useEffect, useState } from "react";
import { Patient } from "@/types/models";
import { useUpdatePatient } from "@/hooks/emr/use-emr";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
    Loader2, Save, ShieldAlert, Pencil,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only demographics correction dialog.
//
// Front-desk registration is fast, manual data entry — typos happen (a
// misspelled name, a swapped digit in a phone number, the wrong sex or date
// of birth). This dialog lets an admin fix exactly those registration
// details. It deliberately exposes ONLY demographics: clinical data
// (allergies, history, medication), insurance, status and identifiers
// (hospital number, patient ID) are not editable here.
// ─────────────────────────────────────────────────────────────────────────────

const inputCls = "w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 focus:bg-white transition-all";

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            {children}
        </p>
    );
}

export default function EditDemographicsDialog({
    patient, open, onOpenChange,
}: {
    patient: Patient;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { mutate: updatePatient, isPending } = useUpdatePatient();
    const [form, setForm] = useState({
        name: "", gender: "", birth_date: "", phone: "", email: "", address: "",
        religion: "", occupation: "",
        emergency_contact_name: "", emergency_contact_number: "", emergency_contact_relationship: "",
    });

    const p = patient as any;

    // Re-seed the form from the patient record every time the dialog opens,
    // so a cancelled edit never leaks stale values into the next session.
    // (Or when the record object is replaced after a save.)
    //
    // Field-level deps are deliberately omitted: a background refetch that
    // changes one field would otherwise reset the form while the admin is
    // still typing.
    useEffect(() => {
        if (!open) return;
        setForm({
            name: p.name ?? "",
            gender: p.gender ?? "",
            birth_date: p.birth_date ? String(p.birth_date).slice(0, 10) : "",
            phone: p.phone ?? "",
            email: p.email ?? "",
            address: p.address ?? "",
            religion: p.religion ?? "",
            occupation: p.occupation ?? "",
            emergency_contact_name: p.emergency_contact_name ?? "",
            emergency_contact_number: p.emergency_contact_number ?? "",
            emergency_contact_relationship: p.emergency_contact_relationship ?? "",
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, patient]);

    const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

    function handleSave() {
        // Only send the demographics — cleanPatientPayload on the service
        // side turns blank strings into NULLs, so clearing a wrong value is
        // a legitimate correction (e.g. removing a mistyped email).
        const updates: Partial<Patient> = {
            name: form.name,
            gender: (form.gender || undefined) as Patient["gender"],
            birth_date: form.birth_date || undefined,
            phone: form.phone,
            email: form.email,
            address: form.address,
            religion: form.religion,
            occupation: form.occupation,
            emergency_contact_name: form.emergency_contact_name,
            emergency_contact_number: form.emergency_contact_number,
            emergency_contact_relationship: form.emergency_contact_relationship,
        };

        updatePatient(
            { id: patient.id, updates },
            {
                onSuccess: () => {
                    toast.success("Demographics updated.");
                    onOpenChange(false);
                },
                onError: (err: any) => {
                    toast.error(err?.message ?? "Failed to update demographics.");
                },
            }
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <Pencil size={16} className="text-blue-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-sm font-bold text-gray-900">
                                Edit Demographics
                            </DialogTitle>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Correct registration details for {p.name || "this patient"}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="pt-3 space-y-4">
                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-amber-50/60 border border-amber-100 rounded-xl">
                        <ShieldAlert size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Admins can correct <span className="font-semibold">demographics only</span> (name, sex, date of
                            birth, contact details). Clinical notes, allergies, insurance and identifiers are not editable
                            here. All changes are audit-logged.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5 sm:col-span-2">
                            <FieldLabel>Full Name</FieldLabel>
                            <input value={form.name} onChange={e => set("name", e.target.value)}
                                placeholder="Patient's full name" className={inputCls} />
                        </div>

                        <div className="space-y-1.5">
                            <FieldLabel>Gender</FieldLabel>
                            <Select value={form.gender} onValueChange={v => set("gender", v)}>
                                <SelectTrigger className="h-10 text-sm bg-gray-50 border-gray-200 rounded-xl">
                                    <SelectValue placeholder="Select…" />
                                </SelectTrigger>
                                <SelectContent className="bg-white shadow-xl rounded-xl">
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <FieldLabel>Date of Birth</FieldLabel>
                            <input type="date" value={form.birth_date}
                                onChange={e => set("birth_date", e.target.value)} className={inputCls} />
                        </div>

                        <div className="space-y-1.5">
                            <FieldLabel>Phone</FieldLabel>
                            <input value={form.phone} onChange={e => set("phone", e.target.value)}
                                placeholder="e.g. 0803 000 0000" className={inputCls} />
                        </div>

                        <div className="space-y-1.5">
                            <FieldLabel>Email</FieldLabel>
                            <input value={form.email} onChange={e => set("email", e.target.value)}
                                placeholder="name@example.com" className={inputCls} />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                            <FieldLabel>Address</FieldLabel>
                            <input value={form.address} onChange={e => set("address", e.target.value)}
                                placeholder="Residential address" className={inputCls} />
                        </div>

                        <div className="space-y-1.5">
                            <FieldLabel>Occupation</FieldLabel>
                            <input value={form.occupation} onChange={e => set("occupation", e.target.value)}
                                placeholder="e.g. Trader" className={inputCls} />
                        </div>

                        <div className="space-y-1.5">
                            <FieldLabel>Religion</FieldLabel>
                            <input value={form.religion} onChange={e => set("religion", e.target.value)}
                                placeholder="e.g. Christianity" className={inputCls} />
                        </div>
                    </div>

                    {/* Emergency contact */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Emergency Contact
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <FieldLabel>Name</FieldLabel>
                                <input value={form.emergency_contact_name}
                                    onChange={e => set("emergency_contact_name", e.target.value)}
                                    placeholder="Next of kin" className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <FieldLabel>Phone</FieldLabel>
                                <input value={form.emergency_contact_number}
                                    onChange={e => set("emergency_contact_number", e.target.value)}
                                    placeholder="e.g. 0803 000 0000" className={inputCls} />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <FieldLabel>Relationship</FieldLabel>
                                <input value={form.emergency_contact_relationship}
                                    onChange={e => set("emergency_contact_relationship", e.target.value)}
                                    placeholder="e.g. Spouse, Parent, Sibling" className={inputCls} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-1 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => onOpenChange(false)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} disabled={isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {isPending
                            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                            : <><Save size={14} /> Save changes</>}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
