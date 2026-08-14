"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PackageX, Plus, AlertTriangle } from "lucide-react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useDrugCatalog } from "@/hooks/emr/use-pharmacy";
import { useBatches, useCreateBatch, useExpiryReport } from "@/hooks/emr/use-clinical-modules";

export default function ExpiryReport() {
    const { authorized } = useRoleProtection([UserRole.Pharmacist]);
    const { data: drugs = [] } = useDrugCatalog();
    const { data: batches = [] } = useBatches();
    const { data: report = [] } = useExpiryReport(90);
    const createBatch = useCreateBatch();

    const [drugId, setDrugId] = useState("");
    const [batchNumber, setBatchNumber] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [quantity, setQuantity] = useState(0);
    const [manufacturer, setManufacturer] = useState("");

    const addBatch = async () => {
        if (!drugId || !batchNumber.trim() || !expiryDate) {
            toast.error("Drug, batch number and expiry date are required.");
            return;
        }
        try {
            await createBatch.mutateAsync({
                drug_id: drugId,
                batch_number: batchNumber.trim(),
                expiry_date: expiryDate,
                quantity,
                manufacturer: manufacturer.trim() || undefined,
            });
            setBatchNumber(""); setQuantity(0); setManufacturer("");
            toast.success("Batch received.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save the batch.");
        }
    };

    if (!authorized) {
        return <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs text-red-700">Pharmacist access required.</p>;
    }

    const expired = report.filter((r) => r.status === "expired");
    const expiring = report.filter((r) => r.status === "expiring");

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-black text-gray-900">Batch & Expiry Tracking</h1>
                <p className="text-xs text-gray-500">Lot numbers, expiry dates and near-expiry alerts (90-day window).</p>
            </div>

            {expired.length > 0 && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <p><b>{expired.length} expired batch(es)</b> still have stock — quarantine them immediately.</p>
                </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <PackageX size={16} className="text-violet-600" /> Receive batch
                </p>
                <div className="grid gap-2 sm:grid-cols-5">
                    <select className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm" value={drugId}
                        onChange={(e) => setDrugId(e.target.value)}>
                        <option value="">— Select drug —</option>
                        {(drugs as any[]).map((d) => <option key={d.id} value={d.id}>{d.drug_name}</option>)}
                    </select>
                    <Input placeholder="Batch / lot number" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
                    <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                    <Input type="number" min={0} placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                    <Input placeholder="Manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
                </div>
                <Button onClick={addBatch} disabled={createBatch.isPending} className="mt-3 gap-2 bg-violet-600 hover:bg-violet-700">
                    <Plus size={14} /> Receive batch
                </Button>
            </div>

            <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                    Expiry alerts ({expiring.length} expiring, {expired.length} expired)
                </p>
                <div className="space-y-2">
                    {report.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs text-gray-400">
                            Nothing expiring in the next 90 days. 🎉
                        </p>
                    )}
                    {report.map((r) => (
                        <div key={r.batchId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3">
                            <div>
                                <p className="text-sm font-bold text-gray-900">
                                    {r.drugName} <span className="ml-1 font-mono text-[10px] text-gray-400">{r.batchNumber}</span>
                                </p>
                                <p className="text-xs text-gray-500">
                                    Expires {r.expiryDate} · stock {r.quantity}
                                </p>
                            </div>
                            <Badge variant={r.status === "expired" ? "destructive" : "secondary"}>
                                {r.status === "expired" ? `Expired ${Math.abs(r.daysUntilExpiry)}d ago` : `Expires in ${r.daysUntilExpiry}d`}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">All batches</p>
                <div className="space-y-2">
                    {batches.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs text-gray-400">No batches received yet.</p>
                    )}
                    {batches.map((b) => (
                        <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs">
                            <span className="font-bold text-gray-800">{b.drug_name ?? "Drug"}</span>
                            <span className="font-mono text-gray-500">{b.batch_number}</span>
                            <span className="text-gray-500">Exp {b.expiry_date}</span>
                            <Badge variant="outline">{b.quantity} in stock</Badge>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
