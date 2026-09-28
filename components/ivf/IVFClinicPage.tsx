"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    Check,
    ChevronRight,
    CircleDot,
    Clock3,
    Dna,
    Droplets,
    HeartPulse,
    Layers3,
    LockKeyhole,
    Plus,
    Search,
    ShieldCheck,
    Snowflake,
    Sparkles,
    TestTube2,
    UserRound,
    UsersRound,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFacilities } from "@/hooks/emr/use-clinical-modules";
import {
    useCreateIVFConsent,
    useCreateIVFCryo,
    useCreateIVFCycle,
    useCreateIVFEmbryo,
    useCreateIVFMonitoring,
    useCreateIVFOocyte,
    useCreateIVFRetrieval,
    useCreateIVFSemenSample,
    useIVFConsents,
    useIVFEmbryos,
    useIVFMonitoring,
    useIVFOocytes,
    useIVFOutcomes,
    useIVFRetrievals,
    useIVFSemenSamples,
    useIVFWorkspace,
    useIVFWitnesses,
    useUpsertIVFOutcome,
    useSearchIVFPatients,
} from "@/hooks/emr/use-ivf";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { normalizeUserRole } from "@/lib/roles";
import { displayHospitalNumber } from "@/lib/hospital-number";
import { Facility, UserRole } from "@/types/models";
import type { IVFCryoInventory, IVFCycle, IVFEmbryo, IVFOocyteRetrieval, IVFMonitoringVisit, IVFPatientSearchResult, IVFSemenSample, IVFWitness } from "@/types/ivf";

const ALLOWED_ROLES = [UserRole.Admin, UserRole.FrontDesk, UserRole.Doctor, UserRole.Nurse, UserRole.LabTechnician];

const STAGES: Array<{ key: IVFCycle["status"]; label: string; short: string }> = [
    { key: "planned", label: "Planned", short: "Plan" },
    { key: "stimulation", label: "Stimulation", short: "Stim" },
    { key: "retrieval", label: "Retrieval", short: "OPU" },
    { key: "fertilization", label: "Fertilization", short: "Fert" },
    { key: "culture", label: "Culture", short: "Culture" },
    { key: "transfer", label: "Transfer", short: "ET" },
    { key: "luteal", label: "Luteal / outcome", short: "Outcome" },
];

const ACTIVE_STATUSES: IVFCycle["status"][] = ["planned", "stimulation", "triggered", "retrieval", "fertilization", "culture", "transfer", "luteal", "paused"];

function formatDate(value?: string | null, withTime = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", withTime ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" });
}

function ageFromBirthDate(value?: string) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const monthDelta = now.getMonth() - date.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < date.getDate())) age -= 1;
    return age;
}

function statusLabel(status: IVFCycle["status"]) {
    return status === "triggered" ? "Trigger / OPU" : status === "luteal" ? "Luteal / outcome" : status.replaceAll("-", " ");
}

function statusTone(status: IVFCycle["status"]) {
    if (status === "paused") return "amber";
    if (status === "cancelled") return "gray";
    if (status === "completed") return "green";
    if (["retrieval", "fertilization", "culture", "transfer"].includes(status)) return "teal";
    return "blue";
}

function toneClasses(tone: string) {
    const tones: Record<string, string> = {
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        teal: "bg-teal-50 text-teal-700 border-teal-100",
        amber: "bg-amber-50 text-amber-800 border-amber-100",
        green: "bg-emerald-50 text-emerald-700 border-emerald-100",
        gray: "bg-gray-50 text-gray-600 border-gray-200",
        red: "bg-red-50 text-red-700 border-red-100",
    };
    return tones[tone] ?? tones.gray;
}

function IVFIdentityStrip({ cycle }: { cycle: IVFCycle }) {
    const patient = cycle.patient;
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-teal-200 ring-1 ring-white/10">{patient?.name?.[0]?.toUpperCase() ?? "P"}</div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold">{patient?.name ?? "Patient context"}</p><span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-300">{displayHospitalNumber(patient?.hospital_number)}</span></div>
                    <p className="mt-0.5 text-[11px] text-slate-400">DOB {formatDate(patient?.birth_date)}{ageFromBirthDate(patient?.birth_date) != null ? ` · ${ageFromBirthDate(patient?.birth_date)} years` : ""}{cycle.partner?.name ? ` · Partner: ${cycle.partner.name}` : ""}</p>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-teal-200"><LockKeyhole size={13} /> One patient · one cycle context</div>
        </div>
    );
}

export default function IVFClinicPage() {
    const { authorized } = useRoleProtection(ALLOWED_ROLES);
    const { user } = useAuth();
    const currentRole = normalizeUserRole(user?.role);
    const canRegisterCycle = [UserRole.Admin, UserRole.FrontDesk, UserRole.Doctor, UserRole.Nurse].includes(currentRole as UserRole);
    const canWriteCryobank = [UserRole.Admin, UserRole.LabTechnician].includes(currentRole as UserRole);
    const { data: facilities = [], isLoading: facilitiesLoading } = useFacilities();
    const ivfFacility = useMemo(() => facilities.find((facility) => facility.specialty_code === "ivf" || facility.code === "NVH-IVF"), [facilities]);
    const { data: workspace, isLoading: workspaceLoading, error: workspaceError } = useIVFWorkspace(ivfFacility?.id);
    const { data: witnesses = [] } = useIVFWitnesses(ivfFacility?.id);
    const createCycle = useCreateIVFCycle();
    const [activeTab, setActiveTab] = useState<"overview" | "cycles" | "andrology" | "embryology" | "cryobank">("overview");
    const [cycleSearch, setCycleSearch] = useState("");
    const [newCycleOpen, setNewCycleOpen] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState<IVFCycle | null>(null);

    const cycles = workspace?.cycles ?? [];
    const cryo = workspace?.cryo ?? [];
    const activeCycles = cycles.filter((cycle) => ACTIVE_STATUSES.includes(cycle.status));
    const attentionCycles = cycles.filter((cycle) => cycle.status === "paused");
    const expiringCryo = cryo.filter((item) => item.consent_until && new Date(item.consent_until).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000 && item.status === "stored");
    const filteredCycles = cycles.filter((cycle) => {
        const haystack = [cycle.patient?.name, cycle.patient?.hospital_number, cycle.partner?.name, cycle.treatment_type, cycle.status].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(cycleSearch.toLowerCase());
    });

    if (!authorized) return null;

    const onCycleCreated = (cycle: IVFCycle) => {
        setNewCycleOpen(false);
        setSelectedCycle(cycle);
        setActiveTab("cycles");
        toast.success("IVF cycle registered. Review consent and assign the next task before treatment begins.");
    };

    if (facilitiesLoading) return <PageSkeleton />;

    return (
        <div className="space-y-5 pb-8">
            <header className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
                <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-teal-100/60 blur-3xl" aria-hidden="true" />
                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-teal-700"><Dna size={14} /> Nile Valley · specialist clinic</div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">IVF & Reproductive Medicine</h1>
                        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-500 sm:text-sm">A cycle-aware workspace for patient identity, stimulation, andrology, embryology and cryostorage. General hospital history stays connected without flattening the IVF workflow.</p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-800"><CircleDot size={11} className="fill-teal-500 text-teal-500" /> {ivfFacility?.name ?? "Clinic not configured"}</span>
                            {ivfFacility?.parent_facility_id && <span className="text-[11px] text-gray-400">inside Nile Valley Hospital</span>}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                        <Button variant="outline" className="gap-2 rounded-xl border-gray-200 bg-white" onClick={() => setActiveTab("cryobank")}><Snowflake size={15} /> Cryobank</Button>
                        {canRegisterCycle && <Button className="gap-2 rounded-xl bg-slate-950 px-4 hover:bg-slate-800" onClick={() => setNewCycleOpen(true)} disabled={!ivfFacility}><Plus size={15} /> Register IVF cycle</Button>}
                    </div>
                </div>
            </header>

            {!ivfFacility && <SetupNotice facilities={facilities} />}
            {workspaceError && ivfFacility && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"><strong>IVF data is not available yet.</strong> Apply the IVF clinic migration before entering clinical data. The workspace is intentionally empty until the database is ready.</div>}

            <nav className="scrollbar-hide flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm" aria-label="IVF clinic sections">
                {(["overview", "cycles", "andrology", "embryology", "cryobank"] as const).map((tab) => {
                    const labels = { overview: "Today", cycles: "Cycles", andrology: "Andrology", embryology: "Embryology", cryobank: "Cryobank" };
                    const icons = { overview: HeartPulse, cycles: Layers3, andrology: TestTube2, embryology: Sparkles, cryobank: Snowflake };
                    const Icon = icons[tab];
                    return <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`inline-flex min-w-max items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors ${activeTab === tab ? "bg-slate-950 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}><Icon size={14} /> {labels[tab]}{tab === "cycles" && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab ? "bg-white/15 text-white" : "bg-gray-100 text-gray-500"}`}>{activeCycles.length}</span>}</button>;
                })}
            </nav>

            {activeTab === "overview" && <OverviewTab cycles={cycles} activeCycles={activeCycles} cryo={cryo} attentionCycles={attentionCycles} expiringCryo={expiringCryo} loading={workspaceLoading} onOpenCycle={setSelectedCycle} onRegister={() => setNewCycleOpen(true)} canRegister={canRegisterCycle} />}
            {activeTab === "cycles" && <CyclesTab cycles={filteredCycles} query={cycleSearch} onQueryChange={setCycleSearch} onOpenCycle={setSelectedCycle} loading={workspaceLoading} />}
            {activeTab === "andrology" && <WorkstreamTab kind="andrology" cycles={activeCycles} onOpenCycle={setSelectedCycle} />}
            {activeTab === "embryology" && <WorkstreamTab kind="embryology" cycles={activeCycles} onOpenCycle={setSelectedCycle} />}
            {activeTab === "cryobank" && <CryobankTab cryo={cryo} cycles={cycles} facility={ivfFacility} witnesses={witnesses} loading={workspaceLoading} canWrite={canWriteCryobank} />}

            <Dialog open={newCycleOpen} onOpenChange={setNewCycleOpen}>
                <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl p-0">
                    <NewCycleForm facility={ivfFacility} cycles={cycles} onCreated={onCycleCreated} onCancel={() => setNewCycleOpen(false)} createCycle={createCycle} />
                </DialogContent>
            </Dialog>

            <CycleDetailDialog cycle={selectedCycle} facility={ivfFacility} witnesses={witnesses} onClose={() => setSelectedCycle(null)} />
        </div>
    );
}

function SetupNotice({ facilities }: { facilities: Facility[] }) {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm"><AlertTriangle size={18} /></div><div><h2 className="text-sm font-black text-amber-950">Set up the IVF clinic before entering patient data</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-amber-900/75">Create a specialist clinic with code <span className="rounded bg-white/60 px-1 font-mono">NVH-IVF</span> from Admin → Facilities. It should be a child of Nile Valley Hospital. This makes the clinic boundary, permissions and cryobank location explicit.</p><p className="mt-2 text-[11px] text-amber-900/60">{facilities.length ? "A facility exists, but it is not marked as the IVF specialty." : "No facility records were returned. Apply the facility migration or create the hospital hierarchy."}</p></div></div></section>;
}

function OverviewTab({ cycles, activeCycles, cryo, attentionCycles, expiringCryo, loading, onOpenCycle, onRegister, canRegister }: { cycles: IVFCycle[]; activeCycles: IVFCycle[]; cryo: IVFCryoInventory[]; attentionCycles: IVFCycle[]; expiringCryo: IVFCryoInventory[]; loading: boolean; onOpenCycle: (cycle: IVFCycle) => void; onRegister: () => void; canRegister: boolean }) {
    const stageCounts = STAGES.map((stage) => ({ ...stage, count: activeCycles.filter((cycle) => cycle.status === stage.key || (stage.key === "retrieval" && cycle.status === "triggered")).length }));
    return <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active cycles" value={activeCycles.length} detail="Across all IVF stages" icon={Dna} tone="teal" />
            <MetricCard label="Needs attention" value={attentionCycles.length + expiringCryo.length} detail="Paused cycles or consent horizon" icon={AlertTriangle} tone={attentionCycles.length + expiringCryo.length ? "amber" : "blue"} />
            <MetricCard label="Stored units" value={cryo.filter((item) => ["stored", "reserved"].includes(item.status)).reduce((sum, item) => sum + Number(item.units || 0), 0)} detail="Sperm, oocytes and embryos" icon={Snowflake} tone="indigo" />
            <MetricCard label="Total cycles" value={cycles.length} detail="Recorded in this clinic" icon={Layers3} tone="slate" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Treatment flow</p><h2 className="mt-1 text-sm font-black text-gray-900">Where today&apos;s cycles are</h2></div><span className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-500">Live clinic view</span></div><div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-7">{stageCounts.map((stage, index) => <div key={stage.key} className="relative rounded-2xl border border-gray-100 bg-gray-50/60 p-3"><div className="mb-3 flex items-center justify-between"><span className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black ${stage.count ? "bg-teal-100 text-teal-800" : "bg-white text-gray-400"}`}>{index + 1}</span>{index < stageCounts.length - 1 && <ArrowRight size={12} className="hidden text-gray-300 xl:block" />}</div><p className="text-[11px] font-bold capitalize text-gray-700">{stage.label}</p><p className="mt-1 text-xl font-black tabular-nums text-gray-950">{stage.count}</p></div>)}</div></section>
            <section className="rounded-3xl border border-gray-100 bg-slate-950 p-5 text-white shadow-sm"><div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/15 text-teal-300"><ShieldCheck size={18} /></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">Safety context</p><h2 className="mt-1 text-sm font-black">The chart keeps the lab honest</h2><ul className="mt-4 space-y-3 text-[11px] leading-relaxed text-slate-300"><li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-teal-300" />Every cycle starts from the Nile Valley hospital number.</li><li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-teal-300" />Gamete and embryo moves require an operator and witness record.</li><li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-teal-300" />Consent horizon and cryostorage exceptions stay visible.</li></ul></div></div></section>
        </div>

        <section className="rounded-3xl border border-gray-100 bg-white shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Work queue</p><h2 className="mt-1 text-sm font-black text-gray-900">Active cycles that need a human next</h2></div>{canRegister && <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={onRegister}><Plus size={13} /> Register cycle</Button>}</div>{loading ? <ListSkeleton /> : activeCycles.length === 0 ? <EmptyWorkQueue onRegister={onRegister} canRegister={canRegister} /> : <div className="divide-y divide-gray-100">{activeCycles.slice(0, 8).map((cycle) => <CycleRow key={cycle.id} cycle={cycle} onOpen={() => onOpenCycle(cycle)} />)}</div>}</section>

        {(attentionCycles.length > 0 || expiringCryo.length > 0) && <section className="grid gap-3 md:grid-cols-2">{attentionCycles.length > 0 && <AttentionCard icon={AlertTriangle} title={`${attentionCycles.length} paused cycle${attentionCycles.length === 1 ? "" : "s"}`} body="Review the reason, assign an owner and document the next decision before the cycle moves on." tone="amber" onClick={() => onOpenCycle(attentionCycles[0])} />}{expiringCryo.length > 0 && <AttentionCard icon={Snowflake} title={`${expiringCryo.length} cryobank consent${expiringCryo.length === 1 ? "" : "s"} within 90 days`} body="Confirm the local consent workflow and contact plan. Do not rely on a hidden reminder." tone="teal" onClick={() => undefined} />}</section>}
    </div>;
}

function CyclesTab({ cycles, query, onQueryChange, onOpenCycle, loading }: { cycles: IVFCycle[]; query: string; onQueryChange: (value: string) => void; onOpenCycle: (cycle: IVFCycle) => void; loading: boolean }) {
    return <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Cycle register</p><h2 className="mt-1 text-sm font-black text-gray-900">Search by patient, hospital number or treatment</h2></div><label className="relative block w-full sm:w-72"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input aria-label="Search IVF cycles" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search cycles…" className="rounded-xl pl-9" /></label></div>{loading ? <ListSkeleton /> : cycles.length === 0 ? <div className="p-10 text-center text-xs text-gray-400">No cycles match this view.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-gray-50/70 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400"><tr><th className="px-5 py-3">Patient</th><th className="px-3 py-3">Cycle</th><th className="px-3 py-3">Treatment</th><th className="px-3 py-3">Stage</th><th className="px-3 py-3">Last update</th><th className="px-5 py-3 text-right">Open</th></tr></thead><tbody className="divide-y divide-gray-100">{cycles.map((cycle) => <tr key={cycle.id} className="group hover:bg-gray-50/70"><td className="px-5 py-3.5"><p className="font-bold text-gray-900">{cycle.patient?.name ?? "Unknown patient"}</p><p className="mt-0.5 font-mono text-[10px] text-gray-400">{displayHospitalNumber(cycle.patient?.hospital_number)}</p></td><td className="px-3 py-3.5 font-semibold text-gray-700">#{cycle.cycle_number}</td><td className="px-3 py-3.5 uppercase text-gray-600">{cycle.treatment_type}{cycle.cycle_type === "frozen" ? " · FET" : ""}</td><td className="px-3 py-3.5"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold capitalize ${toneClasses(statusTone(cycle.status))}`}>{statusLabel(cycle.status)}</span></td><td className="px-3 py-3.5 text-gray-500">{formatDate(cycle.updated_at ?? cycle.created_at, true)}</td><td className="px-5 py-3.5 text-right"><Button size="sm" variant="ghost" className="gap-1 rounded-xl text-xs" onClick={() => onOpenCycle(cycle)}>Chart <ChevronRight size={13} /></Button></td></tr>)}</tbody></table></div>}</section>;
}

function WorkstreamTab({ kind, cycles, onOpenCycle }: { kind: "andrology" | "embryology"; cycles: IVFCycle[]; onOpenCycle: (cycle: IVFCycle) => void }) {
    const isAndrology = kind === "andrology";
    return <div className="space-y-4"><section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isAndrology ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"}`}>{isAndrology ? <TestTube2 size={19} /> : <Sparkles size={19} />}</div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Specialist workstream</p><h2 className="mt-1 text-lg font-black text-gray-950">{isAndrology ? "Andrology worklist" : "Embryology worklist"}</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">{isAndrology ? "Record semen receipt, WHO-method analysis, preparation, suitability and sperm cryopreservation against the selected cycle." : "Record retrieval, individual oocytes, day 1 PN check, culture, Gardner grading, PGT, transfer and embryo cryostorage without losing provenance."}</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-3"><WorkstreamPrinciple icon={LockKeyhole} title="Identity stays visible" text="Hospital number, name and date of birth travel with the cycle." /><WorkstreamPrinciple icon={Clock3} title="Time is data" text="Collection, receipt and manipulation timestamps are not collapsed." /><WorkstreamPrinciple icon={ShieldCheck} title="Witness before movement" text="Critical material actions are recorded with an independent witness." /></div></section><section className="rounded-3xl border border-gray-100 bg-white shadow-sm"><div className="border-b border-gray-100 px-5 py-4"><h3 className="text-sm font-black text-gray-900">Open a cycle to start {isAndrology ? "andrology" : "embryology"}</h3><p className="mt-0.5 text-xs text-gray-500">The lab worklist is intentionally cycle-centered, not a disconnected specimen spreadsheet.</p></div>{cycles.length ? <div className="divide-y divide-gray-100">{cycles.slice(0, 10).map((cycle) => <CycleRow key={cycle.id} cycle={cycle} onOpen={() => onOpenCycle(cycle)} actionLabel={`Open ${isAndrology ? "andrology" : "embryology"}`} />)}</div> : <div className="p-10 text-center text-xs text-gray-400">No active cycles are ready for this workstream.</div>}</section></div>;
}

function CryobankTab({ cryo, cycles, facility, witnesses, loading, canWrite }: { cryo: IVFCryoInventory[]; cycles: IVFCycle[]; facility?: Facility; witnesses: IVFWitness[]; loading: boolean; canWrite: boolean }) {
    const create = useCreateIVFCryo();
    const [open, setOpen] = useState(false);
    const [cycleId, setCycleId] = useState("");
    const [materialType, setMaterialType] = useState<IVFCryoInventory["material_type"]>("embryo");
    const [materialId, setMaterialId] = useState("");
    const { data: cycleSamples = [] } = useIVFSemenSamples(cycleId);
    const { data: cycleOocytes = [] } = useIVFOocytes(cycleId);
    const { data: cycleEmbryos = [] } = useIVFEmbryos(cycleId);
    const [stage, setStage] = useState("");
    const [grade, setGrade] = useState("");
    const [units, setUnits] = useState("1");
    const [cryodeviceId, setCryodeviceId] = useState("");
    const [tank, setTank] = useState("");
    const [canister, setCanister] = useState("");
    const [goblet, setGoblet] = useState("");
    const [slot, setSlot] = useState("");
    const [storedAt, setStoredAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [consentUntil, setConsentUntil] = useState("");
    const [witnessId, setWitnessId] = useState("");
    const selectedCycle = cycles.find((cycle) => cycle.id === cycleId);

    const reset = () => {
        setOpen(false);
        setCycleId("");
        setMaterialId("");
        setStage("");
        setGrade("");
        setUnits("1");
        setCryodeviceId("");
        setTank("");
        setCanister("");
        setGoblet("");
        setSlot("");
        setStoredAt(new Date().toISOString().slice(0, 16));
        setConsentUntil("");
        setWitnessId("");
    };

    const save = async () => {
        if (!facility?.id || !selectedCycle) { toast.error("Choose the IVF cycle that owns this material."); return; }
        if (!materialId) { toast.error("Choose the exact semen, oocyte or embryo record being stored."); return; }
        if (!cryodeviceId.trim() || !tank.trim() || !witnessId) { toast.error("Cryodevice, tank and independent witness are required."); return; }
        try {
            await create.mutateAsync({
                facility_id: facility.id,
                cycle_id: selectedCycle.id,
                patient_id: selectedCycle.patient_id,
                material_type: materialType,
                semen_sample_id: materialType === "sperm" ? materialId : null,
                oocyte_id: materialType === "oocyte" ? materialId : null,
                embryo_id: materialType === "embryo" ? materialId : null,
                cryodevice_id: cryodeviceId.trim(),
                units: Number(units) || 0,
                stage: stage.trim() || null,
                grade: grade.trim() || null,
                method: null,
                tank: tank.trim(),
                canister: canister.trim() || null,
                goblet: goblet.trim() || null,
                slot: slot.trim() || null,
                stored_at: storedAt ? new Date(storedAt).toISOString() : new Date().toISOString(),
                consent_until: consentUntil || null,
                status: "stored",
                disposition: null,
                witness_id: witnessId,
            });
            reset();
            toast.success("Cryostorage location recorded with a witness.");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save cryostorage record."); }
    };

    return <div className="space-y-4"><section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Material inventory</p><h2 className="mt-1 text-sm font-black text-gray-900">Cryobank locations and consent horizon</h2><p className="mt-0.5 text-xs text-gray-500">Every device should resolve to a tank, position, patient, cycle and witnessed event.</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-[11px] font-bold text-teal-800"><Snowflake size={14} /> {cryo.reduce((sum, item) => sum + Number(item.units || 0), 0)} units</div><Button size="sm" className="gap-1.5 rounded-xl bg-slate-950" onClick={() => setOpen(true)} disabled={!canWrite || !facility || cycles.length === 0}><Plus size={13} /> Add storage</Button></div></div>{loading ? <ListSkeleton /> : cryo.length === 0 ? <div className="p-10 text-center"><Snowflake size={25} className="mx-auto text-gray-300" /><p className="mt-2 text-xs font-semibold text-gray-500">No cryostorage records yet.</p><p className="mt-1 text-[11px] text-gray-400">Add storage only after the material, consent and witness checks are complete.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-gray-50/70 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400"><tr><th className="px-5 py-3">Material</th><th className="px-3 py-3">Cryodevice</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Consent until</th><th className="px-3 py-3">Status</th><th className="px-5 py-3">Witness</th></tr></thead><tbody className="divide-y divide-gray-100">{cryo.map((item) => { const expiring = item.consent_until && new Date(item.consent_until).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000; return <tr key={item.id}><td className="px-5 py-3.5"><p className="font-bold capitalize text-gray-900">{item.material_type} · {item.units} unit{item.units === 1 ? "" : "s"}</p><p className="mt-0.5 text-[10px] text-gray-400">{item.stage || "Stage not captured"}{item.grade ? ` · ${item.grade}` : ""}</p></td><td className="px-3 py-3.5 font-mono text-[11px] text-gray-700">{item.cryodevice_id}</td><td className="px-3 py-3.5 text-gray-600">{[item.tank, item.canister, item.goblet, item.slot].filter(Boolean).join(" / ") || "—"}</td><td className={`px-3 py-3.5 ${expiring ? "font-bold text-amber-700" : "text-gray-600"}`}>{formatDate(item.consent_until)}{expiring && <span className="ml-1 text-[10px]">· review</span>}</td><td className="px-3 py-3.5"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold capitalize ${item.status === "stored" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}>{item.status}</span></td><td className="px-5 py-3.5 text-gray-500">{item.witness_id ? "Recorded" : <span className="font-semibold text-amber-700">Missing</span>}</td></tr>; })}</tbody></table></div>}</section><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle>Place material into cryostorage</DialogTitle><DialogDescription>Record one location and consent horizon. A critical storage movement cannot be saved without an independent witness.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><Field label="Owning cycle" required><select value={cycleId} onChange={(event) => setCycleId(event.target.value)} className="control"><option value="">Select cycle</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.patient?.name ?? "Patient"} · cycle {cycle.cycle_number} · {displayHospitalNumber(cycle.patient?.hospital_number)}</option>)}</select></Field><Field label="Material" required><select value={materialType} onChange={(event) => { setMaterialType(event.target.value as IVFCryoInventory["material_type"]); setMaterialId(""); }} className="control"><option value="embryo">Embryo</option><option value="oocyte">Oocyte</option><option value="sperm">Sperm</option></select></Field><Field label="Material record" required><select value={materialId} onChange={(event) => setMaterialId(event.target.value)} className="control"><option value="">Select exact record</option>{materialType === "embryo" && cycleEmbryos.map((embryo) => <option key={embryo.id} value={embryo.id}>Embryo {embryo.embryo_number} · D{embryo.day ?? "—"} · {embryo.stage || "stage pending"}</option>)}{materialType === "oocyte" && cycleOocytes.map((oocyte) => <option key={oocyte.id} value={oocyte.id}>Oocyte {oocyte.oocyte_number} · {oocyte.maturity || "maturity pending"}</option>)}{materialType === "sperm" && cycleSamples.map((sample) => <option key={sample.id} value={sample.id}>{sample.sample_code || `Sample ${sample.id.slice(0, 8)}`} · {sample.sample_state}</option>)}</select></Field><Field label="Stage / identifier"><Input value={stage} onChange={(event) => setStage(event.target.value)} placeholder="E3 · blastocyst or sample code" /></Field><Field label="Grade"><Input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="4AA / MII / post-wash" /></Field><Field label="Units" required><Input type="number" min="1" value={units} onChange={(event) => setUnits(event.target.value)} /></Field><Field label="Cryodevice ID" required><Input value={cryodeviceId} onChange={(event) => setCryodeviceId(event.target.value)} placeholder="Straw / vial / goblet barcode" /></Field><Field label="Stored date / time" required><Input type="datetime-local" value={storedAt} onChange={(event) => setStoredAt(event.target.value)} /></Field><Field label="Consent until"><Input type="date" value={consentUntil} onChange={(event) => setConsentUntil(event.target.value)} /></Field><Field label="Tank" required><Input value={tank} onChange={(event) => setTank(event.target.value)} placeholder="LN2 tank A" /></Field><Field label="Canister"><Input value={canister} onChange={(event) => setCanister(event.target.value)} placeholder="Canister 3" /></Field><Field label="Goblet"><Input value={goblet} onChange={(event) => setGoblet(event.target.value)} placeholder="Goblet 12" /></Field><Field label="Slot"><Input value={slot} onChange={(event) => setSlot(event.target.value)} placeholder="Slot B4" /></Field></div><WitnessSelect witnesses={witnesses} value={witnessId} onChange={setWitnessId} /><DialogFooter><Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button><Button className="rounded-xl bg-slate-950" onClick={save} disabled={create.isPending || !cycleId || !materialId || !cryodeviceId.trim() || !tank.trim() || !witnessId}>{create.isPending ? "Saving…" : "Save storage record"}</Button></DialogFooter></DialogContent></Dialog></div>;
}

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: React.ElementType; tone: "teal" | "amber" | "indigo" | "slate" | "blue" }) {
    const map = { teal: "bg-teal-50 text-teal-700", amber: "bg-amber-50 text-amber-700", indigo: "bg-indigo-50 text-indigo-700", slate: "bg-slate-100 text-slate-700", blue: "bg-blue-50 text-blue-700" };
    return <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">{label}</p><p className="mt-2 text-2xl font-black tabular-nums text-gray-950">{value}</p></div><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${map[tone]}`}><Icon size={17} /></div></div><p className="mt-2 text-[11px] text-gray-500">{detail}</p></div>;
}

function CycleRow({ cycle, onOpen, actionLabel = "Open chart" }: { cycle: IVFCycle; onOpen: () => void; actionLabel?: string }) {
    return <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><UserRound size={16} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-gray-900">{cycle.patient?.name ?? "Unknown patient"}</p><span className="font-mono text-[10px] text-gray-400">{displayHospitalNumber(cycle.patient?.hospital_number)}</span></div><p className="mt-0.5 text-xs capitalize text-gray-500">Cycle {cycle.cycle_number} · {cycle.treatment_type}{cycle.protocol ? ` · ${cycle.protocol}` : ""}</p></div></div><div className="flex items-center gap-2 sm:shrink-0"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${toneClasses(statusTone(cycle.status))}`}>{statusLabel(cycle.status)}</span><Button variant="ghost" size="sm" className="gap-1 rounded-xl text-xs" onClick={onOpen}>{actionLabel}<ChevronRight size={13} /></Button></div></div>;
}

function AttentionCard({ icon: Icon, title, body, tone, onClick }: { icon: React.ElementType; title: string; body: string; tone: "amber" | "teal"; onClick: () => void }) {
    return <button type="button" onClick={onClick} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${tone === "amber" ? "border-amber-200 bg-amber-50/70 hover:bg-amber-50" : "border-teal-100 bg-teal-50/60 hover:bg-teal-50"}`}><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white ${tone === "amber" ? "text-amber-700" : "text-teal-700"}`}><Icon size={16} /></div><div><p className={`text-xs font-black ${tone === "amber" ? "text-amber-950" : "text-teal-950"}`}>{title}</p><p className={`mt-1 text-[11px] leading-relaxed ${tone === "amber" ? "text-amber-900/70" : "text-teal-900/70"}`}>{body}</p></div></button>;
}

function WorkstreamPrinciple({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
    return <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3"><Icon size={15} className="text-gray-500" /><p className="mt-2 text-xs font-bold text-gray-800">{title}</p><p className="mt-1 text-[11px] leading-relaxed text-gray-500">{text}</p></div>;
}

function EmptyWorkQueue({ onRegister, canRegister }: { onRegister: () => void; canRegister: boolean }) {
    return <div className="p-10 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50 text-gray-400"><Dna size={21} /></div><p className="mt-3 text-sm font-bold text-gray-800">No active cycles yet</p><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-gray-400">Register a patient&apos;s IVF cycle to create the episode that connects stimulation, lab work, embryo development and storage.</p>{canRegister && <Button variant="outline" size="sm" className="mt-4 gap-1.5 rounded-xl" onClick={onRegister}><Plus size={13} /> Register first cycle</Button>}</div>;
}

function ListSkeleton() {
    return <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-gray-100" />)}</div>;
}

function PageSkeleton() {
    return <div className="space-y-5"><div className="h-48 animate-pulse rounded-3xl bg-gray-100" /><div className="grid gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-gray-100" />)}</div><div className="h-72 animate-pulse rounded-3xl bg-gray-100" /></div>;
}

function NewCycleForm({ facility, cycles, onCreated, onCancel, createCycle }: { facility?: Facility; cycles: IVFCycle[]; onCreated: (cycle: IVFCycle) => void; onCancel: () => void; createCycle: ReturnType<typeof useCreateIVFCycle> }) {
    const [patientQuery, setPatientQuery] = useState("");
    const [partnerQuery, setPartnerQuery] = useState("");
    const [patientId, setPatientId] = useState("");
    const [partnerPatientId, setPartnerPatientId] = useState("");
    const [patientLabel, setPatientLabel] = useState("");
    const [partnerLabel, setPartnerLabel] = useState("");
    const [cycleNumber, setCycleNumber] = useState("1");
    const [treatmentType, setTreatmentType] = useState<IVFCycle["treatment_type"]>("ivf");
    const [cycleType, setCycleType] = useState<IVFCycle["cycle_type"]>("fresh");
    const [indication, setIndication] = useState("");
    const [protocol, setProtocol] = useState("");
    const [plannedStartDate, setPlannedStartDate] = useState("");
    const [notes, setNotes] = useState("");
    const { data: patientResults = [], isFetching: patientFetching } = useSearchIVFPatients(patientQuery);
    const { data: partnerResults = [], isFetching: partnerFetching } = useSearchIVFPatients(partnerQuery);

    const selectPatient = (patient: IVFPatientSearchResult, partner = false) => {
        if (partner) {
            setPartnerPatientId(patient.id); setPartnerLabel(`${patient.name} · ${displayHospitalNumber(patient.hospital_number)}`); setPartnerQuery("");
        } else {
            setPatientId(patient.id); setPatientLabel(`${patient.name} · ${displayHospitalNumber(patient.hospital_number)}`); setPatientQuery("");
            const prior = cycles.filter((cycle) => cycle.patient_id === patient.id).length;
            if (prior > 0) setCycleNumber(String(prior + 1));
        }
    };
    const save = async () => {
        if (!facility?.id || !patientId) { toast.error("Choose the primary patient before saving the cycle."); return; }
        try {
            const result = await createCycle.mutateAsync({ facility_id: facility.id, patient_id: patientId, partner_patient_id: partnerPatientId || null, cycle_number: Number(cycleNumber) || 1, treatment_type: treatmentType, cycle_type: cycleType, indication: indication.trim() || null, protocol: protocol.trim() || null, planned_start_date: plannedStartDate || null, notes: notes.trim() || null });
            onCreated(result);
        } catch (error) { toast.error(error instanceof Error ? error.message : "Could not register this IVF cycle."); }
    };

    return <><DialogHeader className="border-b border-gray-100 px-5 py-5 text-left sm:px-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Dna size={19} /></div><div><DialogTitle className="text-base font-black">Register an IVF cycle</DialogTitle><DialogDescription className="mt-1 text-xs">Start from the existing Nile Valley patient record. A cycle is an episode, not a duplicate patient.</DialogDescription></div></div></DialogHeader><div className="space-y-5 px-5 py-5 sm:px-6"><div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3 text-[11px] leading-relaxed text-sky-900"><strong>Identity check:</strong> use the hospital number and date of birth in the result before choosing a patient. Partner/donor remains a separate participant record.</div><div className="grid gap-4 md:grid-cols-2"><PatientPicker label="Primary patient" value={patientLabel} query={patientQuery} setQuery={setPatientQuery} results={patientResults} fetching={patientFetching} selected={!!patientId} onSelect={(patient) => selectPatient(patient)} onClear={() => { setPatientId(""); setPatientLabel(""); }} /><PatientPicker label="Partner / sperm provider (optional)" value={partnerLabel} query={partnerQuery} setQuery={setPartnerQuery} results={partnerResults} fetching={partnerFetching} selected={!!partnerPatientId} onSelect={(patient) => selectPatient(patient, true)} onClear={() => { setPartnerPatientId(""); setPartnerLabel(""); }} /></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Cycle number"><Input type="number" min="1" value={cycleNumber} onChange={(event) => setCycleNumber(event.target.value)} /></Field><Field label="Treatment"><select value={treatmentType} onChange={(event) => setTreatmentType(event.target.value as IVFCycle["treatment_type"])} className="control"><option value="ivf">IVF</option><option value="icsi">ICSI</option><option value="fet">Frozen embryo transfer</option><option value="iui">IUI</option><option value="egg-freezing">Egg freezing</option><option value="sperm-freezing">Sperm freezing</option></select></Field><Field label="Cycle type"><select value={cycleType} onChange={(event) => setCycleType(event.target.value as IVFCycle["cycle_type"])} className="control"><option value="fresh">Fresh</option><option value="frozen">Frozen</option></select></Field><Field label="Planned start"><Input type="date" value={plannedStartDate} onChange={(event) => setPlannedStartDate(event.target.value)} /></Field></div><div className="grid gap-4 md:grid-cols-2"><Field label="Indication"><Input placeholder="Male factor, tubal factor, unexplained…" value={indication} onChange={(event) => setIndication(event.target.value)} /></Field><Field label="Protocol"><Input placeholder="Antagonist, long agonist, natural FET…" value={protocol} onChange={(event) => setProtocol(event.target.value)} /></Field></div><Field label="Registration note"><Textarea rows={3} placeholder="What does the team need to know at handover? Avoid duplicating the full consultation note." value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div><DialogFooter className="border-t border-gray-100 px-5 py-4 sm:px-6"><Button variant="ghost" className="rounded-xl" onClick={onCancel}>Cancel</Button><Button className="gap-2 rounded-xl bg-slate-950 hover:bg-slate-800" onClick={save} disabled={createCycle.isPending || !patientId}><Check size={15} /> {createCycle.isPending ? "Registering…" : "Register cycle"}</Button></DialogFooter></>;
}

function PatientPicker({ label, value, query, setQuery, results, fetching, selected, onSelect, onClear }: { label: string; value: string; query: string; setQuery: (value: string) => void; results: IVFPatientSearchResult[]; fetching: boolean; selected: boolean; onSelect: (patient: IVFPatientSearchResult) => void; onClear: () => void }) {
    return <div className="relative"><Field label={label}><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={selected ? value : query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, hospital no. or phone" className="rounded-xl pl-9 pr-9" disabled={selected} />{selected && <button type="button" onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label={`Clear ${label}`}><X size={14} /></button>}</div></Field>{!selected && query.trim().length >= 2 && <div className="absolute left-0 right-0 top-[68px] z-20 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">{fetching ? <p className="p-3 text-xs text-gray-400">Searching…</p> : results.length === 0 ? <p className="p-3 text-xs text-gray-400">No matching Nile Valley patient.</p> : <div className="max-h-48 overflow-y-auto">{results.map((patient) => <button key={patient.id} type="button" onClick={() => onSelect(patient)} className="flex w-full items-start gap-3 border-b border-gray-50 px-3 py-2.5 text-left last:border-0 hover:bg-sky-50"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-600">{patient.name?.[0]?.toUpperCase()}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-gray-900">{patient.name}</p><p className="mt-0.5 font-mono text-[10px] text-gray-400">{displayHospitalNumber(patient.hospital_number)} · DOB {formatDate(patient.birth_date)}</p></div></button>)}</div>}</div>}</div>;
}

function CycleDetailDialog({ cycle, facility, witnesses, onClose }: { cycle: IVFCycle | null; facility?: Facility; witnesses: IVFWitness[]; onClose: () => void }) {
    const [tab, setTab] = useState<"summary" | "monitoring" | "andrology" | "embryology" | "governance">("summary");
    return <Dialog open={!!cycle} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto rounded-3xl p-0">{cycle && <><DialogHeader className="border-b border-gray-100 px-5 py-4 text-left sm:px-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-teal-700"><Dna size={13} /> IVF cycle chart · {facility?.name ?? "Specialist clinic"}</div><DialogTitle className="text-lg font-black text-gray-950">Cycle {cycle.cycle_number} · {cycle.treatment_type.toUpperCase()}</DialogTitle><DialogDescription className="mt-1 text-xs">The selected cycle is the active context for every clinical and laboratory entry.</DialogDescription></div><span className={`inline-flex h-fit rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${toneClasses(statusTone(cycle.status))}`}>{statusLabel(cycle.status)}</span></div><div className="mt-4"><IVFIdentityStrip cycle={cycle} /></div></DialogHeader><div className="px-5 pt-4 sm:px-6"><div className="scrollbar-hide flex gap-1 overflow-x-auto rounded-xl bg-gray-50 p-1">{(["summary", "monitoring", "andrology", "embryology", "governance"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${tab === item ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{item === "governance" ? "Consent & outcome" : item}</button>)}</div></div><div className="px-5 pb-5 pt-4 sm:px-6">{tab === "summary" && <CycleSummary cycle={cycle} />}{tab === "monitoring" && <MonitoringPanel cycle={cycle} />}{tab === "andrology" && <AndrologyPanel cycle={cycle} witnesses={witnesses} />}{tab === "embryology" && <EmbryologyPanel cycle={cycle} witnesses={witnesses} />}{tab === "governance" && <ConsentOutcomePanel cycle={cycle} witnesses={witnesses} />}</div></>}</DialogContent></Dialog>;
}

function CycleSummary({ cycle }: { cycle: IVFCycle }) {
    const currentIndex = Math.max(0, STAGES.findIndex((stage) => stage.key === cycle.status));
    return <div className="space-y-5"><section className="rounded-2xl border border-gray-100 bg-white p-4"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Cycle journey</p><h3 className="mt-1 text-sm font-black text-gray-900">Progress is shown as a clinical handover</h3></div><p className="text-[11px] text-gray-400">Started {formatDate(cycle.created_at)}</p></div><div className="grid gap-2 sm:grid-cols-7">{STAGES.map((stage, index) => { const done = index < currentIndex; const current = index === currentIndex; return <div key={stage.key} className={`relative rounded-2xl border p-3 ${current ? "border-teal-200 bg-teal-50" : done ? "border-emerald-100 bg-emerald-50/50" : "border-gray-100 bg-gray-50/50"}`}><div className="flex items-center justify-between"><span className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black ${current ? "bg-teal-700 text-white" : done ? "bg-emerald-600 text-white" : "bg-white text-gray-400"}`}>{done ? <Check size={13} /> : index + 1}</span>{current && <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />}</div><p className={`mt-3 text-[11px] font-bold ${current ? "text-teal-950" : "text-gray-700"}`}>{stage.label}</p></div>; })}</div></section><div className="grid gap-4 md:grid-cols-3"><DetailFact label="Indication" value={cycle.indication} /><DetailFact label="Protocol" value={cycle.protocol} /><DetailFact label="Planned start" value={formatDate(cycle.planned_start_date)} /><DetailFact label="Stimulation start" value={formatDate(cycle.stimulation_start_date)} /><DetailFact label="Trigger" value={formatDate(cycle.trigger_at, true)} /><DetailFact label="Retrieval" value={formatDate(cycle.retrieval_at, true)} /></div><section className="grid gap-3 md:grid-cols-3"><SafetyTile icon={ShieldCheck} title="Consent checkpoint" text="Keep treatment, storage and participant consents visible before irreversible actions." /><SafetyTile icon={UsersRound} title="Participants" text={cycle.partner?.name ? `Linked partner: ${cycle.partner.name}` : "No partner or donor participant linked yet."} /><SafetyTile icon={Layers3} title="Hospital link" text="General hospital consultations, labs, billing and documents remain in the patient record." /></section></div>;
}

function MonitoringPanel({ cycle }: { cycle: IVFCycle }) {
    const { data: visits = [], isLoading } = useIVFMonitoring(cycle.id);
    const create = useCreateIVFMonitoring();
    const [open, setOpen] = useState(false);
    const [cycleDay, setCycleDay] = useState("");
    const [endometrium, setEndometrium] = useState("");
    const [estradiol, setEstradiol] = useState("");
    const [lh, setLh] = useState("");
    const [plan, setPlan] = useState("");
    const save = async () => { try { await create.mutateAsync({ cycle_id: cycle.id, cycle_day: cycleDay ? Number(cycleDay) : null, endometrial_thickness_mm: endometrium ? Number(endometrium) : null, estradiol_pg_ml: estradiol ? Number(estradiol) : null, lh_iu_l: lh ? Number(lh) : null, plan: plan.trim() || null }); setOpen(false); setCycleDay(""); setEndometrium(""); setEstradiol(""); setLh(""); setPlan(""); toast.success("Monitoring visit saved."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save monitoring visit."); } };
    return <div className="space-y-4"><PanelHeader eyebrow="Stimulation monitoring" title="Follicles, hormones and plan" action={<Button size="sm" className="gap-1.5 rounded-xl bg-slate-950" onClick={() => setOpen(true)}><Plus size={13} /> Record visit</Button>} /><div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3 text-[11px] leading-relaxed text-sky-900"><strong>Keep the timestamp:</strong> visit time, cycle day and medication changes make the stimulation record clinically useful. Do not replace serial observations with one summary note.</div>{isLoading ? <ListSkeleton /> : visits.length === 0 ? <EmptyPanel icon={HeartPulse} title="No monitoring visits yet" text="Record the first ultrasound and hormone review from the cycle chart." /> : <div className="space-y-2">{visits.map((visit) => <MonitoringRow key={visit.id} visit={visit} />)}</div>}<Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg rounded-3xl"><DialogHeader><DialogTitle>Record monitoring visit</DialogTitle><DialogDescription>Only record measurements actually observed at this visit.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><Field label="Cycle day"><Input type="number" min="0" value={cycleDay} onChange={(event) => setCycleDay(event.target.value)} placeholder="8" /></Field><Field label="Endometrium (mm)"><Input type="number" step="0.1" value={endometrium} onChange={(event) => setEndometrium(event.target.value)} placeholder="7.4" /></Field><Field label="Estradiol (pg/mL)"><Input type="number" step="0.1" value={estradiol} onChange={(event) => setEstradiol(event.target.value)} placeholder="—" /></Field><Field label="LH (IU/L)"><Input type="number" step="0.1" value={lh} onChange={(event) => setLh(event.target.value)} placeholder="—" /></Field></div><Field label="Plan / medication changes"><Textarea rows={3} value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="Continue dose, repeat scan, trigger decision…" /></Field><DialogFooter><Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button><Button className="rounded-xl bg-slate-950" onClick={save} disabled={create.isPending}>{create.isPending ? "Saving…" : "Save visit"}</Button></DialogFooter></DialogContent></Dialog></div>;
}

function AndrologyPanel({ cycle, witnesses }: { cycle: IVFCycle; witnesses: IVFWitness[] }) {
    const { data: samples = [], isLoading } = useIVFSemenSamples(cycle.id);
    const create = useCreateIVFSemenSample();
    const [open, setOpen] = useState(false);
    const [sampleCode, setSampleCode] = useState("");
    const [source, setSource] = useState<IVFSemenSample["source"]>("husband");
    const [state, setState] = useState<IVFSemenSample["sample_state"]>("fresh");
    const [collectedAt, setCollectedAt] = useState("");
    const [volume, setVolume] = useState("");
    const [concentration, setConcentration] = useState("");
    const [motility, setMotility] = useState("");
    const [progressive, setProgressive] = useState("");
    const [morphology, setMorphology] = useState("");
    const [prepMethod, setPrepMethod] = useState("");
    const [comments, setComments] = useState("");
    const [witnessId, setWitnessId] = useState("");
    const save = async () => { try { await create.mutateAsync({ cycle_id: cycle.id, provider_patient_id: source === "husband" ? cycle.partner_patient_id ?? null : null, sample_code: sampleCode.trim() || null, source, sample_state: state, specimen: "Semen", collected_at: collectedAt ? new Date(collectedAt).toISOString() : null, volume_ml: volume ? Number(volume) : null, concentration_million_ml: concentration ? Number(concentration) : null, total_motility_percent: motility ? Number(motility) : null, progressive_motility_percent: progressive ? Number(progressive) : null, morphology_normal_percent: morphology ? Number(morphology) : null, preparation_method: prepMethod.trim() || null, comments: comments.trim() || null, frozen: state === "frozen", witness_id: witnessId }); setOpen(false); toast.success("Andrology sample saved."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save semen sample."); } };
    return <div className="space-y-4"><PanelHeader eyebrow="Andrology" title="Semen receipt and preparation" action={<Button size="sm" className="gap-1.5 rounded-xl bg-slate-950" onClick={() => setOpen(true)}><Plus size={13} /> Record sample</Button>} /><div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 text-[11px] leading-relaxed text-indigo-950"><strong>WHO-method note:</strong> collection, abstinence, receipt and examination times should remain distinct. The fields below are a compact first entry; the full laboratory form remains available in the schema for progressive completion.</div>{isLoading ? <ListSkeleton /> : samples.length === 0 ? <EmptyPanel icon={TestTube2} title="No semen samples recorded" text="Record a husband, donor or surgically retrieved sample against this cycle." /> : <div className="space-y-2">{samples.map((sample) => <SemenRow key={sample.id} sample={sample} />)}</div>}<Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle>Record semen sample</DialogTitle><DialogDescription>Record what the lab received. Do not infer a normal result from an empty field.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><Field label="Sample code"><Input value={sampleCode} onChange={(event) => setSampleCode(event.target.value)} placeholder="NVH-IVF-2026-001" /></Field><Field label="Source"><select value={source} onChange={(event) => setSource(event.target.value as IVFSemenSample["source"])} className="control"><option value="husband">Husband / partner</option><option value="donor">Donor</option><option value="surgically-retrieved">Surgically retrieved</option><option value="other">Other</option></select></Field><Field label="Fresh or frozen"><select value={state} onChange={(event) => setState(event.target.value as IVFSemenSample["sample_state"])} className="control"><option value="fresh">Fresh</option><option value="frozen">Frozen</option></select></Field><Field label="Collection date / time"><Input type="datetime-local" value={collectedAt} onChange={(event) => setCollectedAt(event.target.value)} /></Field><Field label="Volume (mL)"><Input type="number" step="0.001" value={volume} onChange={(event) => setVolume(event.target.value)} /></Field><Field label="Concentration (million/mL)"><Input type="number" step="0.001" value={concentration} onChange={(event) => setConcentration(event.target.value)} /></Field><Field label="Total motility (%)"><Input type="number" step="0.1" min="0" max="100" value={motility} onChange={(event) => setMotility(event.target.value)} /></Field><Field label="Progressive motility (%)"><Input type="number" step="0.1" min="0" max="100" value={progressive} onChange={(event) => setProgressive(event.target.value)} /></Field><Field label="Normal morphology (%)"><Input type="number" step="0.1" min="0" max="100" value={morphology} onChange={(event) => setMorphology(event.target.value)} /></Field><Field label="Preparation method"><select value={prepMethod} onChange={(event) => setPrepMethod(event.target.value)} className="control"><option value="">Not recorded</option><option value="Density gradient">Density gradient</option><option value="Swim-up">Swim-up</option><option value="Simple wash">Simple wash</option><option value="Surgical processing">Surgical processing</option><option value="Other">Other</option></select></Field></div><WitnessSelect witnesses={witnesses} value={witnessId} onChange={setWitnessId} /><Field label="Comments"><Textarea rows={3} value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Liquefaction, viscosity, suitability, lot details or exception…" /></Field><DialogFooter><Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button><Button className="rounded-xl bg-slate-950" onClick={save} disabled={create.isPending || !witnessId}>{create.isPending ? "Saving…" : "Save sample"}</Button></DialogFooter></DialogContent></Dialog></div>;
}

function EmbryologyPanel({ cycle, witnesses }: { cycle: IVFCycle; witnesses: IVFWitness[] }) {
    const { data: retrievals = [], isLoading: retrievalsLoading } = useIVFRetrievals(cycle.id);
    const { data: oocytes = [] } = useIVFOocytes(cycle.id);
    const { data: embryos = [], isLoading: embryosLoading } = useIVFEmbryos(cycle.id);
    const createRetrieval = useCreateIVFRetrieval();
    const createOocyte = useCreateIVFOocyte();
    const createEmbryo = useCreateIVFEmbryo();
    const [retrievalOpen, setRetrievalOpen] = useState(false);
    const [embryoOpen, setEmbryoOpen] = useState(false);
    const [retrievalAt, setRetrievalAt] = useState("");
    const [retrievedCount, setRetrievedCount] = useState("");
    const [rightFollicles, setRightFollicles] = useState("");
    const [leftFollicles, setLeftFollicles] = useState("");
    const [trigger, setTrigger] = useState("");
    const [embryoNumber, setEmbryoNumber] = useState("");
    const [day, setDay] = useState("5");
    const [stage, setStage] = useState("Blastocyst");
    const [icm, setIcm] = useState("");
    const [te, setTe] = useState("");
    const [quality, setQuality] = useState("");
    const [status, setStatus] = useState<IVFEmbryo["status"]>("in-culture");
    const [transferType, setTransferType] = useState<IVFEmbryo["transfer_type"]>(null);
    const [pgtType, setPgtType] = useState<IVFEmbryo["pgt_type"]>(null);
    const [pgtStatus, setPgtStatus] = useState<IVFEmbryo["pgt_status"]>("not-tested");
    const [pgtResult, setPgtResult] = useState("");
    const [pgtLab, setPgtLab] = useState("");
    const [retrievalWitnessId, setRetrievalWitnessId] = useState("");
    const [oocyteWitnessId, setOocyteWitnessId] = useState("");
    const [embryoWitnessId, setEmbryoWitnessId] = useState("");
    const saveRetrieval = async () => { try { await createRetrieval.mutateAsync({ cycle_id: cycle.id, retrieval_at: retrievalAt ? new Date(retrievalAt).toISOString() : new Date().toISOString(), trigger_used: trigger.trim() || null, oocytes_retrieved: retrievedCount ? Number(retrievedCount) : null, right_follicle_count: rightFollicles ? Number(rightFollicles) : null, left_follicle_count: leftFollicles ? Number(leftFollicles) : null, difficult_access: false, complications: [], witness_id: retrievalWitnessId }); setRetrievalOpen(false); toast.success("Oocyte retrieval recorded."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save retrieval."); } };
    const saveEmbryo = async () => { try { await createEmbryo.mutateAsync({ cycle_id: cycle.id, embryo_number: Number(embryoNumber), day: day ? Number(day) : null, stage, icm_grade: icm.trim() || null, te_grade: te.trim() || null, quality: quality.trim() || null, status, transfer_type: transferType, pgt_type: pgtType, pgt_status: pgtStatus, pgt_result: pgtResult.trim() || null, pgt_lab: pgtLab.trim() || null, witness_id: embryoWitnessId }); setEmbryoOpen(false); toast.success("Embryo record saved."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save embryo."); } };
    const addOocyte = async () => { const retrieval = retrievals[0]; if (!retrieval) { toast.error("Record a retrieval first."); return; } try { await createOocyte.mutateAsync({ cycle_id: cycle.id, retrieval_id: retrieval.id, oocyte_number: oocytes.length + 1, maturity: "MII", status: "retrieved", witness_id: oocyteWitnessId }); toast.success("Oocyte added to the latest retrieval."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add oocyte."); } };
    return <div className="space-y-5"><PanelHeader eyebrow="Retrieval & embryology" title="Oocytes, development and embryo record" action={<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => setRetrievalOpen(true)}><Plus size={13} /> Retrieval</Button><Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={addOocyte}><Plus size={13} /> Oocyte</Button><Button size="sm" className="gap-1.5 rounded-xl bg-slate-950" onClick={() => setEmbryoOpen(true)}><Plus size={13} /> Embryo</Button></div>} /><div className="grid gap-4 md:grid-cols-3"><SummaryTile label="Retrievals" value={retrievals.length} icon={Droplets} /><SummaryTile label="Oocytes" value={oocytes.length} icon={CircleDot} /><SummaryTile label="Embryos" value={embryos.length} icon={Sparkles} /></div><section className="rounded-2xl border border-gray-100 bg-white"><div className="border-b border-gray-100 px-4 py-3"><h3 className="text-xs font-black uppercase tracking-[0.14em] text-gray-500">Retrieval log</h3></div>{retrievalsLoading ? <ListSkeleton /> : retrievals.length === 0 ? <p className="p-5 text-xs text-gray-400">No retrieval recorded.</p> : <div className="divide-y divide-gray-100">{retrievals.map((retrieval) => <RetrievalRow key={retrieval.id} retrieval={retrieval} />)}</div>}</section><section className="overflow-hidden rounded-2xl border border-gray-100 bg-white"><div className="border-b border-gray-100 px-4 py-3"><h3 className="text-xs font-black uppercase tracking-[0.14em] text-gray-500">Embryo development register</h3></div>{embryosLoading ? <ListSkeleton /> : embryos.length === 0 ? <p className="p-5 text-xs text-gray-400">No embryos recorded. Do not use a batch count when individual identity matters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-gray-50 text-[10px] uppercase tracking-[0.12em] text-gray-400"><tr><th className="px-4 py-2.5">Embryo</th><th className="px-3 py-2.5">Day / stage</th><th className="px-3 py-2.5">ICM</th><th className="px-3 py-2.5">TE</th><th className="px-3 py-2.5">Quality</th><th className="px-4 py-2.5">Status</th></tr></thead><tbody className="divide-y divide-gray-100">{embryos.map((embryo) => <tr key={embryo.id}><td className="px-4 py-3 font-bold text-gray-900">E{embryo.embryo_number}</td><td className="px-3 py-3 text-gray-600">D{embryo.day ?? "—"} · {embryo.stage ?? "—"}</td><td className="px-3 py-3 font-semibold text-gray-700">{embryo.icm_grade || "—"}</td><td className="px-3 py-3 font-semibold text-gray-700">{embryo.te_grade || "—"}</td><td className="px-3 py-3 text-gray-600">{embryo.quality || "—"}</td><td className="px-4 py-3"><span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold capitalize text-gray-600">{embryo.status.replaceAll("-", " ")}</span></td></tr>)}</tbody></table></div>}</section><Dialog open={retrievalOpen} onOpenChange={setRetrievalOpen}><DialogContent className="max-w-xl rounded-3xl"><DialogHeader><DialogTitle>Record oocyte retrieval</DialogTitle><DialogDescription>Capture the event first; add individual oocytes and embryos as the lab works.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><Field label="Retrieval date / time"><Input type="datetime-local" value={retrievalAt} onChange={(event) => setRetrievalAt(event.target.value)} /></Field><Field label="Trigger used"><Input value={trigger} onChange={(event) => setTrigger(event.target.value)} placeholder="hCG, GnRH agonist, dual" /></Field><Field label="Oocytes retrieved"><Input type="number" min="0" value={retrievedCount} onChange={(event) => setRetrievedCount(event.target.value)} /></Field><Field label="Right follicles"><Input type="number" min="0" value={rightFollicles} onChange={(event) => setRightFollicles(event.target.value)} /></Field><Field label="Left follicles"><Input type="number" min="0" value={leftFollicles} onChange={(event) => setLeftFollicles(event.target.value)} /></Field></div><WitnessSelect witnesses={witnesses} value={retrievalWitnessId} onChange={setRetrievalWitnessId} /><DialogFooter><Button variant="ghost" className="rounded-xl" onClick={() => setRetrievalOpen(false)}>Cancel</Button><Button className="rounded-xl bg-slate-950" onClick={saveRetrieval} disabled={createRetrieval.isPending || !retrievalWitnessId}>{createRetrieval.isPending ? "Saving…" : "Save retrieval"}</Button></DialogFooter></DialogContent></Dialog><Dialog open={embryoOpen} onOpenChange={setEmbryoOpen}><DialogContent className="max-w-xl rounded-3xl"><DialogHeader><DialogTitle>Add embryo record</DialogTitle><DialogDescription>One row per embryo. Gardner fields stay separate so PGT and cryostorage can link to the same identity.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><Field label="Embryo number"><Input type="number" min="1" value={embryoNumber} onChange={(event) => setEmbryoNumber(event.target.value)} placeholder={String(embryos.length + 1)} /></Field><Field label="Development day"><Input type="number" min="0" max="7" value={day} onChange={(event) => setDay(event.target.value)} /></Field><Field label="Stage"><Input value={stage} onChange={(event) => setStage(event.target.value)} placeholder="Morula / blastocyst" /></Field><Field label="ICM grade"><Input value={icm} onChange={(event) => setIcm(event.target.value)} placeholder="A / B / C" /></Field><Field label="TE grade"><Input value={te} onChange={(event) => setTe(event.target.value)} placeholder="A / B / C" /></Field><Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value as IVFEmbryo["status"])} className="control"><option value="in-culture">In culture</option><option value="biopsied">Biopsied</option><option value="frozen">Frozen</option><option value="transferred">Transferred</option><option value="arrested">Arrested</option><option value="discarded">Discarded</option></select></Field></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Transfer type"><select value={transferType ?? ""} onChange={(event) => setTransferType(event.target.value ? event.target.value as IVFEmbryo["transfer_type"] : null)} className="control"><option value="">Not transferred</option><option value="fresh">Fresh</option><option value="frozen">Frozen</option></select></Field><Field label="PGT type"><select value={pgtType ?? ""} onChange={(event) => setPgtType(event.target.value ? event.target.value as IVFEmbryo["pgt_type"] : null)} className="control"><option value="">Not biopsied</option><option value="PGT-A">PGT-A</option><option value="PGT-M">PGT-M</option><option value="PGT-SR">PGT-SR</option></select></Field><Field label="PGT status"><select value={pgtStatus ?? ""} onChange={(event) => setPgtStatus(event.target.value ? event.target.value as IVFEmbryo["pgt_status"] : null)} className="control"><option value="not-tested">Not tested</option><option value="euploid">Euploid</option><option value="aneuploid">Aneuploid</option><option value="mosaic">Mosaic</option><option value="inconclusive">Inconclusive</option></select></Field><Field label="PGT laboratory"><Input value={pgtLab} onChange={(event) => setPgtLab(event.target.value)} placeholder="Approved genetics laboratory" /></Field></div><Field label="PGT result / report reference"><Input value={pgtResult} onChange={(event) => setPgtResult(event.target.value)} placeholder="Keep the linked report identifier, not just a narrative" /></Field><Field label="Quality / comment"><Input value={quality} onChange={(event) => setQuality(event.target.value)} placeholder="Good quality, expanded, etc." /></Field><WitnessSelect witnesses={witnesses} value={embryoWitnessId} onChange={setEmbryoWitnessId} /><DialogFooter><Button variant="ghost" className="rounded-xl" onClick={() => setEmbryoOpen(false)}>Cancel</Button><Button className="rounded-xl bg-slate-950" onClick={saveEmbryo} disabled={createEmbryo.isPending || !embryoNumber || !embryoWitnessId}>{createEmbryo.isPending ? "Saving…" : "Save embryo"}</Button></DialogFooter></DialogContent></Dialog></div>;
}

function ConsentOutcomePanel({ cycle, witnesses }: { cycle: IVFCycle; witnesses: IVFWitness[] }) {
    const { data: consents = [], isLoading: consentsLoading } = useIVFConsents(cycle.id);
    const { data: outcomes = [], isLoading: outcomesLoading } = useIVFOutcomes(cycle.id);
    const createConsent = useCreateIVFConsent();
    const saveOutcome = useUpsertIVFOutcome();
    const [consentOpen, setConsentOpen] = useState(false);
    const [consentType, setConsentType] = useState("Treatment and procedure");
    const [consentVersion, setConsentVersion] = useState("");
    const [consentStatus, setConsentStatus] = useState<"pending" | "signed" | "withdrawn" | "expired">("pending");
    const [signedAt, setSignedAt] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [consentWitnessId, setConsentWitnessId] = useState("");
    const [consentNotes, setConsentNotes] = useState("");
    const [betaDate, setBetaDate] = useState("");
    const [betaResult, setBetaResult] = useState("");
    const [pregnancyDate, setPregnancyDate] = useState("");
    const [heartbeatDate, setHeartbeatDate] = useState("");
    const [pregnancyOutcome, setPregnancyOutcome] = useState("");
    const [liveBirthDate, setLiveBirthDate] = useState("");
    const [outcomeNotes, setOutcomeNotes] = useState("");
    const outcome = outcomes[0];

    useEffect(() => {
        if (!outcome) return;
        setBetaDate(outcome.beta_hcg_date ?? "");
        setBetaResult(outcome.beta_hcg_result ?? "");
        setPregnancyDate(outcome.clinical_pregnancy_date ?? "");
        setHeartbeatDate(outcome.fetal_heartbeat_date ?? "");
        setPregnancyOutcome(outcome.pregnancy_outcome ?? "");
        setLiveBirthDate(outcome.live_birth_date ?? "");
        setOutcomeNotes(outcome.notes ?? "");
    }, [outcome]);

    const saveConsent = async () => {
        if (!consentVersion.trim()) { toast.error("Record the approved consent version before saving."); return; }
        if (consentStatus === "signed" && (!signedAt || !consentWitnessId)) { toast.error("A signed consent needs its signature time and witness."); return; }
        try {
            await createConsent.mutateAsync({
                cycle_id: cycle.id,
                patient_id: cycle.patient_id,
                consent_type: consentType,
                version: consentVersion.trim(),
                status: consentStatus,
                signed_at: signedAt ? new Date(signedAt).toISOString() : null,
                expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
                document_id: null,
                witness_id: consentWitnessId || null,
                notes: consentNotes.trim() || null,
            });
            setConsentOpen(false);
            setConsentVersion("");
            setConsentStatus("pending");
            setSignedAt("");
            setExpiresAt("");
            setConsentWitnessId("");
            setConsentNotes("");
            toast.success("Consent checkpoint recorded.");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Could not record consent."); }
    };

    const saveOutcomeRecord = async () => {
        try {
            await saveOutcome.mutateAsync({
                cycle_id: cycle.id,
                beta_hcg_date: betaDate || null,
                beta_hcg_result: betaResult.trim() || null,
                clinical_pregnancy_date: pregnancyDate || null,
                fetal_heartbeat_date: heartbeatDate || null,
                pregnancy_outcome: pregnancyOutcome.trim() || null,
                live_birth_date: liveBirthDate || null,
                notes: outcomeNotes.trim() || null,
            });
            toast.success("Cycle outcome saved.");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save cycle outcome."); }
    };

    return <div className="space-y-5"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"><section className="rounded-2xl border border-gray-100 bg-white"><div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Authorization</p><h3 className="mt-1 text-sm font-black text-gray-900">Consent checkpoints</h3></div><Button size="sm" className="gap-1.5 rounded-xl bg-slate-950" onClick={() => setConsentOpen(true)}><Plus size={13} /> Record</Button></div>{consentsLoading ? <ListSkeleton /> : consents.length === 0 ? <div className="p-5"><p className="text-xs font-semibold text-amber-800">No consent record is linked to this cycle.</p><p className="mt-1 text-[11px] leading-relaxed text-gray-500">Treatment, storage and participant permissions should be checked before an irreversible lab action.</p></div> : <div className="divide-y divide-gray-100">{consents.map((consent) => <div key={consent.id} className="px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-gray-900">{consent.consent_type}</p><span className={`rounded-full border px-2 py-1 text-[10px] font-bold capitalize ${consent.status === "signed" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : consent.status === "withdrawn" || consent.status === "expired" ? "border-red-100 bg-red-50 text-red-700" : "border-amber-100 bg-amber-50 text-amber-800"}`}>{consent.status}</span></div><p className="mt-1 text-[10px] text-gray-500">Version {consent.version}{consent.signed_at ? ` · signed ${formatDate(consent.signed_at, true)}` : " · not signed"}{consent.expires_at ? ` · until ${formatDate(consent.expires_at)}` : ""}</p></div>)}</div>}</section><section className="rounded-2xl border border-gray-100 bg-white"><div className="border-b border-gray-100 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Follow-up</p><h3 className="mt-1 text-sm font-black text-gray-900">Pregnancy and birth outcome</h3></div><div className="grid gap-4 p-4 sm:grid-cols-2"><Field label="Beta-hCG date"><Input type="date" value={betaDate} onChange={(event) => setBetaDate(event.target.value)} /></Field><Field label="Beta-hCG result"><Input value={betaResult} onChange={(event) => setBetaResult(event.target.value)} placeholder="Positive, negative or numeric result" /></Field><Field label="Clinical pregnancy date"><Input type="date" value={pregnancyDate} onChange={(event) => setPregnancyDate(event.target.value)} /></Field><Field label="Fetal heartbeat date"><Input type="date" value={heartbeatDate} onChange={(event) => setHeartbeatDate(event.target.value)} /></Field><Field label="Pregnancy outcome"><select value={pregnancyOutcome} onChange={(event) => setPregnancyOutcome(event.target.value)} className="control"><option value="">Not recorded</option><option value="ongoing">Ongoing</option><option value="live-birth">Live birth</option><option value="miscarriage">Miscarriage</option><option value="ectopic">Ectopic pregnancy</option><option value="stillbirth">Stillbirth</option><option value="other">Other / review</option></select></Field><Field label="Live birth date"><Input type="date" value={liveBirthDate} onChange={(event) => setLiveBirthDate(event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Outcome note"><Textarea rows={2} value={outcomeNotes} onChange={(event) => setOutcomeNotes(event.target.value)} placeholder="Only document the follow-up information available at this point." /></Field></div></div><div className="flex justify-end border-t border-gray-100 px-4 py-3"><Button size="sm" className="rounded-xl bg-slate-950" onClick={saveOutcomeRecord} disabled={outcomesLoading || saveOutcome.isPending}>{saveOutcome.isPending ? "Saving…" : outcome ? "Update outcome" : "Save outcome"}</Button></div></section></div><div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3 text-[11px] leading-relaxed text-sky-950"><strong>Control point:</strong> this screen records the checkpoint and outcome; it does not replace the signed consent document or the clinic&apos;s approved local consent and disposition policy.</div><Dialog open={consentOpen} onOpenChange={setConsentOpen}><DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle>Record consent checkpoint</DialogTitle><DialogDescription>Link the approved version and signature status to the existing Nile Valley patient and IVF cycle.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><Field label="Consent scope" required><select value={consentType} onChange={(event) => setConsentType(event.target.value)} className="control"><option>Treatment and procedure</option><option>Embryo storage</option><option>Gamete storage</option><option>Embryo disposition</option><option>PGT / biopsy</option><option>Donor use</option><option>Data / research</option></select></Field><Field label="Approved version" required><Input value={consentVersion} onChange={(event) => setConsentVersion(event.target.value)} placeholder="IVF-CONSENT v3.1" /></Field><Field label="Status"><select value={consentStatus} onChange={(event) => setConsentStatus(event.target.value as typeof consentStatus)} className="control"><option value="pending">Pending</option><option value="signed">Signed</option><option value="withdrawn">Withdrawn</option><option value="expired">Expired</option></select></Field><Field label="Signed date / time"><Input type="datetime-local" value={signedAt} onChange={(event) => setSignedAt(event.target.value)} /></Field><Field label="Expires at"><Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></Field><div className="sm:col-span-2"><WitnessSelect witnesses={witnesses} value={consentWitnessId} onChange={setConsentWitnessId} /></div><div className="sm:col-span-2"><Field label="Record note"><Textarea rows={2} value={consentNotes} onChange={(event) => setConsentNotes(event.target.value)} placeholder="Paper fallback, document reference or withdrawal context…" /></Field></div></div><DialogFooter><Button variant="ghost" className="rounded-xl" onClick={() => setConsentOpen(false)}>Cancel</Button><Button className="rounded-xl bg-slate-950" onClick={saveConsent} disabled={createConsent.isPending || !consentVersion.trim() || (consentStatus === "signed" && (!signedAt || !consentWitnessId))}>{createConsent.isPending ? "Saving…" : "Save checkpoint"}</Button></DialogFooter></DialogContent></Dialog></div>;
}

function PanelHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) { return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">{eyebrow}</p><h2 className="mt-1 text-sm font-black text-gray-900">{title}</h2></div>{action}</div>; }
function DetailFact({ label, value }: { label: string; value?: string | null }) { return <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">{label}</p><p className="mt-1.5 text-xs font-semibold text-gray-800">{value || "Not recorded"}</p></div>; }
function SafetyTile({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) { return <div className="rounded-2xl border border-gray-100 bg-white p-4"><Icon size={16} className="text-teal-700" /><p className="mt-2 text-xs font-bold text-gray-900">{title}</p><p className="mt-1 text-[11px] leading-relaxed text-gray-500">{text}</p></div>; }
function EmptyPanel({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) { return <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center"><Icon size={22} className="mx-auto text-gray-300" /><p className="mt-2 text-xs font-bold text-gray-600">{title}</p><p className="mt-1 text-[11px] text-gray-400">{text}</p></div>; }
function SummaryTile({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) { return <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-teal-700"><Icon size={15} /></div><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">{label}</p><p className="mt-0.5 text-lg font-black tabular-nums text-gray-900">{value}</p></div></div>; }
function MonitoringRow({ visit }: { visit: IVFMonitoringVisit }) { return <div className="rounded-2xl border border-gray-100 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-800">Day {visit.cycle_day ?? "—"}</span><p className="text-xs font-bold text-gray-900">{formatDate(visit.visit_at, true)}</p></div><span className="text-[10px] text-gray-400">{visit.clinician_id ? "Clinician recorded" : "Clinician pending"}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-4"><SmallFact label="Endometrium" value={visit.endometrial_thickness_mm != null ? `${visit.endometrial_thickness_mm} mm` : "—"} /><SmallFact label="Estradiol" value={visit.estradiol_pg_ml != null ? `${visit.estradiol_pg_ml} pg/mL` : "—"} /><SmallFact label="LH" value={visit.lh_iu_l != null ? `${visit.lh_iu_l} IU/L` : "—"} /><SmallFact label="Plan" value={visit.plan || "—"} /></div></div>; }
function SmallFact({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] uppercase tracking-[0.1em] text-gray-400">{label}</p><p className="mt-0.5 truncate text-xs font-semibold text-gray-700">{value}</p></div>; }
function SemenRow({ sample }: { sample: IVFSemenSample }) { return <div className="rounded-2xl border border-gray-100 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="flex items-center gap-2"><p className="text-xs font-bold text-gray-900">{sample.sample_code || "Uncoded sample"}</p><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold capitalize text-indigo-800">{sample.source.replaceAll("-", " ")}</span></div><p className="mt-1 text-[10px] text-gray-400">{sample.sample_state} · collected {formatDate(sample.collected_at, true)}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${sample.frozen ? "border-sky-100 bg-sky-50 text-sky-800" : "border-gray-200 bg-gray-50 text-gray-600"}`}>{sample.frozen ? "Frozen" : "Fresh"}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-5"><SmallFact label="Volume" value={sample.volume_ml != null ? `${sample.volume_ml} mL` : "—"} /><SmallFact label="Concentration" value={sample.concentration_million_ml != null ? `${sample.concentration_million_ml} M/mL` : "—"} /><SmallFact label="Total motility" value={sample.total_motility_percent != null ? `${sample.total_motility_percent}%` : "—"} /><SmallFact label="Progressive" value={sample.progressive_motility_percent != null ? `${sample.progressive_motility_percent}%` : "—"} /><SmallFact label="Morphology" value={sample.morphology_normal_percent != null ? `${sample.morphology_normal_percent}%` : "—"} /></div></div>; }
function RetrievalRow({ retrieval }: { retrieval: IVFOocyteRetrieval }) { return <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Droplets size={15} /></div><div><p className="text-xs font-bold text-gray-900">{formatDate(retrieval.retrieval_at, true)}</p><p className="mt-0.5 text-[10px] text-gray-400">Trigger: {retrieval.trigger_used || "Not recorded"}</p></div></div><div className="flex items-center gap-4 text-right"><div><p className="text-[10px] text-gray-400">Retrieved</p><p className="text-sm font-black text-gray-900">{retrieval.oocytes_retrieved ?? "—"}</p></div><div><p className="text-[10px] text-gray-400">Follicles</p><p className="text-xs font-semibold text-gray-700">R {retrieval.right_follicle_count ?? "—"} · L {retrieval.left_follicle_count ?? "—"}</p></div></div></div>; }
function WitnessSelect({ witnesses, value, onChange }: { witnesses: IVFWitness[]; value: string; onChange: (value: string) => void }) {
    return <div className="space-y-1.5"><Field label="Independent witness" required><select value={value} onChange={(event) => onChange(event.target.value)} className="control"><option value="">Select a qualified witness</option>{witnesses.map((witness) => <option key={witness.id} value={witness.id}>{witness.name}{witness.role ? ` · ${witness.role}` : ""}</option>)}</select></Field>{witnesses.length === 0 && <p className="text-[10px] leading-relaxed text-amber-700">No active IVF witness is available for this clinic. Assign staff to the hospital or IVF clinic before recording a critical material event.</p>}</div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">{label}{required && <span className="text-red-500"> *</span>}</span>{children}</label>; }
