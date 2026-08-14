"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, FlaskConical, Pill, Receipt, ShieldAlert, Syringe, FileText, LogOut, Download } from "lucide-react";
import { usePortalDashboard } from "@/hooks/emr/use-clinical-modules";
import supabase from "@/utils/supabase/client";
import { useFhirExport } from "@/hooks/emr/use-clinical-modules";

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-sm font-black text-gray-900">
                <Icon size={16} className="text-emerald-600" /> {title}
            </p>
            {children}
        </section>
    );
}

function Empty({ text }: { text: string }) {
    return <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">{text}</p>;
}

export default function PortalDashboard() {
    const router = useRouter();
    const { data, isLoading, isError } = usePortalDashboard();
    const fhir = useFhirExport(data?.patient?.id ?? "");
    const [exporting, setExporting] = useState(false);

    const logout = async () => {
        await supabase.auth.signOut().catch(() => undefined);
        router.replace("/portal/login");
    };

    const exportFhir = async () => {
        if (!data?.patient?.id) return;
        setExporting(true);
        try {
            const { bundle } = await fhir.mutateAsync();
            const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "my_health_record_fhir.json";
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
        } finally {
            setExporting(false);
        }
    };

    if (isLoading) {
        return <p className="p-10 text-center text-sm text-gray-400">Loading your record…</p>;
    }
    if (isError || !data) {
        return (
            <div className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl">
                <p className="text-sm font-bold text-gray-800">Portal unavailable</p>
                <p className="mt-2 text-xs text-gray-500">
                    Your login is not linked to an enabled patient portal. Contact the hospital front desk.
                </p>
                <Button className="mt-4 w-full" onClick={logout}>Go to sign in</Button>
            </div>
        );
    }

    const p = data.patient;

    return (
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-lg">
                <div>
                    <h1 className="text-2xl font-black">Hello, {p.name} 👋</h1>
                    <p className="mt-1 text-xs text-emerald-100">
                        Nile Valley Hospital patient portal · {p.status?.replace(/-/g, " ") ?? ""}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 border-white/40 text-white hover:bg-white/10"
                        onClick={exportFhir} disabled={exporting}>
                        <Download size={14} /> {exporting ? "Exporting…" : "My record (FHIR)"}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-white/40 text-white hover:bg-white/10" onClick={logout}>
                        <LogOut size={14} /> Sign out
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Section icon={CalendarDays} title="Upcoming appointments">
                    {data.appointments.length === 0 ? <Empty text="No appointments booked." /> : (
                        <div className="space-y-2">
                            {data.appointments.slice(0, 5).map((a: any) => (
                                <div key={a.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                                    <span className="font-bold text-gray-800">{a.appointment_date}{a.appointment_time ? ` · ${a.appointment_time}` : ""}</span>
                                    <span className="text-gray-500">{a.department ?? "Visit"}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                <Section icon={FlaskConical} title="Recent lab results">
                    {data.labResults.length === 0 ? <Empty text="No lab results yet." /> : (
                        <div className="space-y-2">
                            {data.labResults.slice(0, 5).map((l: any) => (
                                <div key={l.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                                    <span className="font-bold text-gray-800">{String(l.test_type).replace(/^\[RADIOLOGY\]\s*/i, "")}</span>
                                    <Badge variant={l.status === "completed" ? "default" : "secondary"}>{l.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                <Section icon={Pill} title="Prescriptions">
                    {data.prescriptions.length === 0 ? <Empty text="No prescriptions." /> : (
                        <div className="space-y-2">
                            {data.prescriptions.slice(0, 5).map((rx: any) => (
                                <div key={rx.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                                    <span className="font-bold text-gray-800">{rx.drug_name}</span>
                                    <span className="text-gray-500">{rx.dosage}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                <Section icon={Receipt} title="Bills">
                    {data.bills.length === 0 ? <Empty text="No bills on your account." /> : (
                        <div className="space-y-2">
                            {data.bills.slice(0, 5).map((b: any) => (
                                <div key={b.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                                    <span className="font-bold text-gray-800">{b.description}</span>
                                    <span className="flex items-center gap-2">
                                        ₦{Number(b.amount).toLocaleString()}
                                        <Badge variant={["paid", "Completed"].includes(b.status) ? "default" : "secondary"}>{b.status}</Badge>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                <Section icon={ShieldAlert} title="Allergies">
                    {data.allergies.length === 0 ? <Empty text="No allergies on record." /> : (
                        <div className="flex flex-wrap gap-2">
                            {data.allergies.map((a: any) => (
                                <Badge key={a.id} variant="destructive" className="border-red-200">{a.allergen} · {a.severity}</Badge>
                            ))}
                        </div>
                    )}
                </Section>

                <Section icon={Syringe} title="Immunizations">
                    {data.immunizations.length === 0 ? <Empty text="No immunization records." /> : (
                        <div className="space-y-2">
                            {data.immunizations.slice(0, 5).map((i: any) => (
                                <div key={i.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                                    <span className="font-bold text-gray-800">{i.vaccine}</span>
                                    <span className="text-gray-500">{i.administered_date}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>
            </div>

            <Section icon={FileText} title="Documents">
                {data.documents.length === 0 ? <Empty text="No documents shared with you yet." /> : (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {data.documents.map((d: any) => (
                            <div key={d.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                                <span className="truncate font-bold text-gray-800">{d.file_name}</span>
                                <span className="shrink-0 text-gray-400">{d.document_type}</span>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            <p className="pb-4 text-center text-[10px] text-gray-400">
                Nile Valley Hospital · Your data is protected by hospital access controls and audited on every export.
            </p>
        </div>
    );
}
