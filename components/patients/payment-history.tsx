"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    usePaymentsByPatient,
    useCreatePayment,
    useUpdatePayment,
} from "@/hooks/emr/use-payment";
import { mapPaymentsForHistory } from "@/lib/utils/map-payment-history";
import { exportPatientInvoice, type InvoicePatientInfo } from "@/lib/utils/invoice";
import type { Payment as DbPayment } from "@/types/models";
import {
    SettleBillModal, SettleAllBillsModal, DepositModal, PayerBadge,
} from "./billing-modals";
import { resolvePayerFromPatient, PAYMENT_TYPE_CONFIG } from "@/lib/utils/billing";
import {
    Plus, Printer, Loader2, Pencil,
    AlertTriangle, Wallet, Layers, CalendarDays, ChevronDown,
    ChevronsUpDown, Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentStatus   = "pending" | "paid" | "partial" | "waived" | "refunded";
export type PaymentCategory = "consultation" | "lab" | "radiology" | "pharmacy" | "procedure" | "admission" | "deposit" | "other";

export interface Payment {
    id:           string;
    patient_id:   string;
    category:     PaymentCategory;
    description:  string;
    amount_kobo:  number;
    amount_paid_kobo: number;
    status:       PaymentStatus;
    payment_type?: "full" | "partial" | "deposit";
    payer?:       "private" | "hmo" | "company" | null;
    payer_reference?: string | null;
    payer_code?:  string | null;
    discount_kobo?: number;
    discount_percent?: number | null;
    applied_kobo?: number;
    lab_request_id?: string | null;
    deposit_available_kobo?: number;
    payment_date: string | null;
    invoice_no:   string;
    collected_by: string | null;
    notes:        string | null;
    created_at:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNaira(kobo: number): string {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(kobo / 100);
}

const STATUS_STYLE: Record<PaymentStatus, string> = {
    pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
    paid:     "bg-green-50  text-green-700  border-green-200",
    partial:  "bg-blue-50   text-blue-700   border-blue-200",
    waived:   "bg-slate-50  text-slate-500  border-slate-200",
    refunded: "bg-rose-50   text-rose-600   border-rose-200",
};

const CATEGORY_LABELS: Record<PaymentCategory, string> = {
    consultation: "Consultation",
    lab:          "Lab Test",
    radiology:    "Radiology",
    pharmacy:     "Pharmacist",
    procedure:    "Procedure",
    admission:    "Admission",
    deposit:      "Deposit",
    other:        "Other",
};

/** Local calendar-day key — one "session" per visit day. */
function sessionKeyOf(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "unknown";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sessionLabel(iso: string): { title: string; relative: string | null } {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { title: "Unknown date", relative: null };
    return {
        title: format(d, "EEE, d MMM yyyy"),
        relative: isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : null,
    };
}

function sessionTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "h:mm a");
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function PaymentSummary({ payments }: { payments: Payment[] }) {
    const bills    = payments.filter((p) => p.category !== "deposit");
    const deposits = payments.filter((p) => p.category === "deposit");
    const total    = bills.reduce((s, p) => s + p.amount_kobo, 0);
    const paid     = bills.reduce((s, p) => s + p.amount_paid_kobo, 0);
    const discount = bills.reduce((s, p) => s + (p.discount_kobo ?? 0), 0);
    const pending  = bills.filter((p) => p.status === "pending" || p.status === "partial").reduce((s, p) => s + (p.amount_kobo - p.amount_paid_kobo), 0);
    const creditAvailable = deposits.reduce((s, p) => s + (p.deposit_available_kobo ?? 0), 0);

    const cards = [
        { label: "Total Billed", value: formatNaira(total), box: "bg-slate-50 border-slate-100", labelCls: "text-slate-500", valueCls: "text-slate-800" },
        { label: "Discounts Given", value: formatNaira(discount), box: "bg-teal-50 border-teal-100", labelCls: "text-teal-600", valueCls: "text-teal-700" },
        { label: "Total Paid", value: formatNaira(paid), box: "bg-green-50 border-green-100", labelCls: "text-green-600", valueCls: "text-green-700" },
        { label: "Outstanding", value: formatNaira(pending), box: pending > 0 ? "bg-yellow-50 border-yellow-100" : "bg-slate-50 border-slate-100", labelCls: pending > 0 ? "text-yellow-600" : "text-slate-500", valueCls: pending > 0 ? "text-yellow-700" : "text-slate-400" },
        { label: "Deposit Credit", value: formatNaira(creditAvailable), box: creditAvailable > 0 ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100", labelCls: creditAvailable > 0 ? "text-emerald-600" : "text-slate-500", valueCls: creditAvailable > 0 ? "text-emerald-700" : "text-slate-400" },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {cards.map((c) => (
                <Card key={c.label} className={cn("rounded-xl shadow-none", c.box)}>
                    <CardContent className="p-4">
                        <p className={cn("text-xs font-medium uppercase tracking-wide", c.labelCls)}>{c.label}</p>
                        <p className={cn("text-lg font-bold mt-1", c.valueCls)}>{c.value}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

interface PaymentRowProps {
    payment:    Payment;
    canManage:  boolean;
    onEdit?:    (payment: Payment) => void;
    onSettle?:  (payment: Payment) => void;
}

function PaymentRow({ payment, canManage, onEdit, onSettle }: PaymentRowProps) {
    const balance = payment.amount_kobo - payment.amount_paid_kobo;
    const outstanding = payment.status === "pending" || payment.status === "partial";
    const isDeposit = payment.category === "deposit";
    const discountKobo = payment.discount_kobo ?? 0;

    return (
        <TableRow className={cn(isDeposit && "bg-emerald-50/40 hover:bg-emerald-50/60")}>
            <TableCell>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-medium text-slate-800">{payment.description}</div>
                    {payment.payment_type && (
                        <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full",
                            payment.payment_type === "deposit" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : payment.payment_type === "partial" ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                            {PAYMENT_TYPE_CONFIG[payment.payment_type]?.short ?? payment.payment_type}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400">{payment.invoice_no}</span>
                    {payment.payer && (
                        <PayerBadge payer={payment.payer} reference={payment.payer_reference ?? null} />
                    )}
                </div>
                {payment.payer_code && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {payment.payer_code}</div>
                )}
            </TableCell>
            <TableCell>
                <Badge variant="secondary" className="text-xs font-medium bg-slate-100 text-slate-600 rounded">
                    {CATEGORY_LABELS[payment.category] ?? "Other"}
                </Badge>
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
                {formatNaira(payment.amount_kobo)}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
                {discountKobo > 0 ? (
                    <span className="text-teal-700 font-semibold" title={payment.discount_percent ? `${payment.discount_percent}% discount` : "Flat discount"}>
                        −{formatNaira(discountKobo)}
                    </span>
                ) : (
                    <span className="text-slate-300">—</span>
                )}
            </TableCell>
            <TableCell className="text-green-700 text-right whitespace-nowrap">
                {formatNaira(payment.amount_paid_kobo)}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
                {isDeposit ? (
                    (payment.deposit_available_kobo ?? 0) > 0 ? (
                        <span className="text-emerald-600 font-semibold">{formatNaira(payment.deposit_available_kobo!)} credit</span>
                    ) : (
                        <span className="text-slate-400">applied</span>
                    )
                ) : balance > 0
                    ? <span className="text-yellow-600">{formatNaira(balance)}</span>
                    : <span className="text-slate-400">—</span>
                }
            </TableCell>
            <TableCell>
                <Badge variant="outline" className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", STATUS_STYLE[payment.status])}>
                    {payment.status}
                </Badge>
            </TableCell>
            <TableCell className="text-xs text-slate-400 whitespace-nowrap print:hidden">
                {sessionTime(payment.created_at)}
            </TableCell>
            <TableCell className="print:hidden">
                {outstanding && canManage && (
                    <div className="flex items-center gap-2">
                        {/* Edit the bill (price/description) before settling */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit?.(payment)}
                            title="Edit bill price & details"
                            className="h-7 px-2 gap-1 text-xs text-slate-500 hover:text-teal-700 font-medium"
                        >
                            <Pencil size={11} /> Edit
                        </Button>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => onSettle?.(payment)}
                            title="Settle this bill — full / part payment, discount, or deposit"
                            className="h-7 px-1 text-xs text-teal-600 font-bold"
                        >
                            Settle
                        </Button>
                    </div>
                )}
            </TableCell>
        </TableRow>
    );
}

// ─── Session group (one encounter/visit day, collapsible) ─────────────────────

interface SessionGroupProps {
    sessionKey: string;
    bills: Payment[];
    open: boolean;
    onToggle: () => void;
    canManage: boolean;
    onEdit?: (payment: Payment) => void;
    onSettle?: (payment: Payment) => void;
    readOnly: boolean;
}

function SessionGroup({ sessionKey, bills, open, onToggle, canManage, onEdit, onSettle, readOnly }: SessionGroupProps) {
    const nonDeposits = bills.filter((p) => p.category !== "deposit");
    const billed = nonDeposits.reduce((s, p) => s + p.amount_kobo, 0);
    const discount = nonDeposits.reduce((s, p) => s + (p.discount_kobo ?? 0), 0);
    const paid = nonDeposits.reduce((s, p) => s + p.amount_paid_kobo, 0);
    const outstanding = nonDeposits
        .filter((p) => p.status === "pending" || p.status === "partial")
        .reduce((s, p) => s + (p.amount_kobo - p.amount_paid_kobo), 0);
    const { title, relative } = sessionLabel(bills[0]?.created_at ?? "");

    return (
        <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden print:shadow-none">
            <Collapsible open={open} onOpenChange={onToggle}>
                <CollapsibleTrigger asChild>
                    <button type="button" className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-slate-50/60 transition-colors">
                        <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                            outstanding > 0 ? "bg-amber-50 border-amber-100" : "bg-green-50 border-green-100"
                        )}>
                            <CalendarDays size={16} className={outstanding > 0 ? "text-amber-600" : "text-green-600"} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-slate-800">Session — {title}</p>
                                {relative && (
                                    <Badge variant="outline" className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border-teal-200">
                                        {relative}
                                    </Badge>
                                )}
                                <Badge variant="secondary" className="text-[10px] font-bold bg-slate-100 text-slate-600 rounded-full">
                                    {bills.length} bill{bills.length === 1 ? "" : "s"}
                                </Badge>
                                {outstanding > 0 ? (
                                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border-amber-200">
                                        {formatNaira(outstanding)} outstanding
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border-green-200">
                                        Cleared
                                    </Badge>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Billed {formatNaira(billed)}
                                {discount > 0 && <> · <span className="text-teal-600 font-semibold">−{formatNaira(discount)} discount</span></>}
                                {" · "}Paid {formatNaira(paid)}
                            </p>
                        </div>
                        <ChevronDown size={16} className={cn("text-slate-400 shrink-0 transition-transform print:hidden", open && "rotate-180")} />
                    </button>
                </CollapsibleTrigger>
                {/* forceMount + print override so a printed history always shows every session, open or not. */}
                <CollapsibleContent forceMount className="print:!block print:!h-auto print:!overflow-visible data-[state=closed]:print:animate-none">
                    <Separator />
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide print:bg-transparent">
                                <TableHead className="font-medium">Description</TableHead>
                                <TableHead className="font-medium">Category</TableHead>
                                <TableHead className="text-right font-medium">Billed</TableHead>
                                <TableHead className="text-right font-medium">Discount</TableHead>
                                <TableHead className="text-right font-medium">Paid</TableHead>
                                <TableHead className="text-right font-medium">Balance</TableHead>
                                <TableHead className="font-medium">Status</TableHead>
                                <TableHead className="font-medium print:hidden">Time</TableHead>
                                {!readOnly && <TableHead className="print:hidden"><span className="sr-only">Actions</span></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bills.map((p) => (
                                <PaymentRow
                                    key={p.id}
                                    payment={p}
                                    canManage={canManage}
                                    onEdit={onEdit}
                                    onSettle={onSettle}
                                />
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="bg-slate-50/70 font-semibold">
                                <TableCell colSpan={2} className="text-xs text-slate-500">
                                    Session total · {sessionKey}
                                </TableCell>
                                <TableCell className="text-right text-xs">{formatNaira(billed)}</TableCell>
                                <TableCell className="text-right text-xs text-teal-700">
                                    {discount > 0 ? `−${formatNaira(discount)}` : "—"}
                                </TableCell>
                                <TableCell className="text-right text-xs text-green-700">{formatNaira(paid)}</TableCell>
                                <TableCell className="text-right text-xs text-yellow-700">
                                    {outstanding > 0 ? formatNaira(outstanding) : "—"}
                                </TableCell>
                                <TableCell colSpan={readOnly ? 2 : 3} />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

// ─── Edit Bill Modal (before settling) ────────────────────────────────────────

interface EditBillModalProps {
    payment: Payment;
    onClose: () => void;
}

function EditBillModal({ payment, onClose }: EditBillModalProps) {
    const { mutate: updateBill, isPending } = useUpdatePayment();

    const [description, setDescription] = useState(payment.description ?? "");
    const [category, setCategory] = useState<PaymentCategory>(payment.category ?? "other");
    const [amount, setAmount] = useState<string>(String(payment.amount_kobo / 100));

    const parsed = Number(amount);
    const valid = description.trim().length > 0 && amount.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;

    function handleSave(e?: React.FormEvent) {
        e?.preventDefault();
        if (!valid || isPending) return;
        updateBill(
            {
                id: payment.id,
                description: description.trim(),
                category,
                amount: parsed,
            },
            {
                onSuccess: () => {
                    toast.success("Bill updated.");
                    onClose();
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update bill."),
            }
        );
    }

    return (
        <Dialog open onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
            <DialogContent
                className="print:hidden p-0 gap-0 overflow-hidden rounded-3xl border-slate-100 sm:max-w-md max-h-[92vh] flex-col"
                onEscapeKeyDown={(e) => { if (isPending) e.preventDefault(); }}
                onPointerDownOutside={(e) => { if (isPending) e.preventDefault(); }}
                onInteractOutside={(e) => { if (isPending) e.preventDefault(); }}
            >
                <DialogHeader className="flex flex-row items-center gap-2.5 px-6 py-4 border-b border-slate-100 text-left space-y-0 pr-12">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <Pencil size={14} className="text-slate-500" />
                    </div>
                    <div>
                        <DialogTitle className="font-bold text-slate-800 text-sm">Edit Bill</DialogTitle>
                        <DialogDescription className="text-[10px] text-slate-400">
                            {payment.invoice_no} · changes apply before settling
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-bill-desc" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</Label>
                        <Input
                            id="edit-bill-desc"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isPending}
                            className="rounded-xl border-slate-200 focus-visible:ring-teal-400"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                            <Select value={category} onValueChange={(v) => setCategory(v as PaymentCategory)} disabled={isPending}>
                                <SelectTrigger className="rounded-xl border-slate-200 focus:ring-teal-400">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(CATEGORY_LABELS) as PaymentCategory[]).map((c) => (
                                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-bill-amount" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price (NGN)</Label>
                            <Input
                                id="edit-bill-amount"
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={isPending}
                                className="rounded-xl border-slate-200 focus-visible:ring-teal-400"
                            />
                        </div>
                    </div>
                    {payment.amount_paid_kobo > 0 && (
                        <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                            This bill is partially paid ({formatNaira(payment.amount_paid_kobo)}). The price cannot be lowered below the amount already collected.
                        </p>
                    )}
                    <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-1">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}
                            className="text-slate-500 hover:text-slate-700 font-semibold">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!valid || isPending}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl">
                            {isPending ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Add Bill Modal ───────────────────────────────────────────────────────────

interface AddBillModalProps {
    onClose: () => void;
    onSubmit: (bill: { description: string; amount: number; category: PaymentCategory }) => void;
    isSaving: boolean;
}

function AddBillModal({ onClose, onSubmit, isSaving }: AddBillModalProps) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState<PaymentCategory>("other");

    const valid = description.trim().length > 0 && amount.trim() !== "" && Number(amount) > 0;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!valid || isSaving) return;
        onSubmit({ description: description.trim(), amount: Number(amount), category });
    }

    return (
        <Dialog open onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
            <DialogContent
                className="print:hidden p-0 gap-0 overflow-hidden rounded-3xl border-slate-100 sm:max-w-md max-h-[92vh] flex-col"
                onEscapeKeyDown={(e) => { if (isSaving) e.preventDefault(); }}
                onPointerDownOutside={(e) => { if (isSaving) e.preventDefault(); }}
                onInteractOutside={(e) => { if (isSaving) e.preventDefault(); }}
            >
                <DialogHeader className="flex flex-row items-center gap-2.5 px-6 py-4 border-b border-slate-100 text-left space-y-0 pr-12">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                        <Receipt size={14} className="text-teal-600" />
                    </div>
                    <div>
                        <DialogTitle className="font-bold text-slate-800 text-sm">Add Custom Bill</DialogTitle>
                        <DialogDescription className="text-[10px] text-slate-400">
                            Raises a new pending bill for this patient
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="space-y-1.5">
                        <Label htmlFor="add-bill-desc" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</Label>
                        <Input
                            id="add-bill-desc"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Syringes, Extra Dressing"
                            disabled={isSaving}
                            className="rounded-xl border-slate-200 focus-visible:ring-teal-400"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                            <Select value={category} onValueChange={(v) => setCategory(v as PaymentCategory)} disabled={isSaving}>
                                <SelectTrigger className="rounded-xl border-slate-200 focus:ring-teal-400">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(CATEGORY_LABELS) as PaymentCategory[]).map((c) => (
                                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="add-bill-amount" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount (NGN)</Label>
                            <Input
                                id="add-bill-amount"
                                required
                                type="number"
                                min="1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                disabled={isSaving}
                                className="rounded-xl border-slate-200 focus-visible:ring-teal-400"
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <Button type="submit" disabled={isSaving || !valid}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-200 rounded-xl">
                            {isSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Bill"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PaymentHistoryProps {
    patientId:  string;
    patient?:   InvoicePatientInfo | null;
    readOnly?:  boolean;
    /** Staff id recorded as the cashier on settled payments. */
    cashierId?: string;
    /**
     * Optional external settle handler. When omitted (default), the built-in
     * Settle Bill modal is used, which lets the cashier adjust the final price
     * and pick a payment method before confirming.
     */
    onSettle?:  (paymentId: string) => void;
}

export default function PaymentHistory({ patientId, patient = null, readOnly = false, cashierId = "", onSettle }: PaymentHistoryProps) {
    const [categoryFilter, setCategoryFilter] = useState<PaymentCategory | "all">("all");
    const [statusFilter,   setStatusFilter]   = useState<PaymentStatus   | "all">("all");
    const [isAddBillOpen, setIsAddBillOpen] = useState(false);
    const [settleTarget, setSettleTarget] = useState<Payment | null>(null);
    const [editTarget, setEditTarget] = useState<Payment | null>(null);
    const [settleAllOpen, setSettleAllOpen] = useState(false);
    const [depositOpen, setDepositOpen] = useState(false);
    // Collapsible session groups — most recent session starts open.
    const [openSessions, setOpenSessions] = useState<Set<string>>(new Set());
    const [sessionsSeeded, setSessionsSeeded] = useState(false);

    const { data: raw = [], isLoading, isError } = usePaymentsByPatient(patientId);
    const { mutate: createPayment, isPending: isCreatingBill } = useCreatePayment();

    // Payer auto-identified from the patient's registration (HMO / Company / Private).
    const payerHint = useMemo(() => resolvePayerFromPatient(patient as any), [patient]);

    const handleAddBill = (bill: { description: string; amount: number; category: PaymentCategory }) => {
        createPayment({
            patient_id: patientId,
            description: bill.description,
            amount: bill.amount,
            category: bill.category,
            status: "pending"
        }, {
            onSuccess: () => {
                toast.success("Bill added.");
                setIsAddBillOpen(false);
            },
            onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add bill."),
        });
    };

    const payments = useMemo(() => mapPaymentsForHistory(raw as DbPayment[]), [raw]);

    const outstandingPayments = useMemo(
        () => payments.filter((p) =>
            (p.status === "pending" || p.status === "partial") && p.category !== "deposit"
        ),
        [payments]
    );

    const filtered = payments.filter((p) => {
        const matchCat    = categoryFilter === "all" || p.category === categoryFilter;
        const matchStatus = statusFilter   === "all" || p.status   === statusFilter;
        return matchCat && matchStatus;
    });

    // Sort: unpaid first, then by date desc
    const sorted = useMemo(() => [...filtered].sort((a, b) => {
        const aUrgent = a.status === "pending" || a.status === "partial" ? 0 : 1;
        const bUrgent = b.status === "pending" || b.status === "partial" ? 0 : 1;
        if (aUrgent !== bUrgent) return aUrgent - bUrgent;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }), [filtered]);

    // Group into per-day sessions (one encounter/session per visit date),
    // newest session first; bills within a session keep the urgent-first order.
    const sessions = useMemo(() => {
        const groups = new Map<string, Payment[]>();
        for (const p of sorted) {
            const key = sessionKeyOf(p.created_at);
            const list = groups.get(key) ?? [];
            list.push(p);
            groups.set(key, list);
        }
        return [...groups.entries()].sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0));
    }, [sorted]);

    // Open the most recent session on first load.
    useEffect(() => {
        if (!sessionsSeeded && sessions.length > 0) {
            setOpenSessions(new Set([sessions[0][0]]));
            setSessionsSeeded(true);
        }
    }, [sessions, sessionsSeeded]);

    const allOpen = sessions.length > 0 && openSessions.size >= sessions.length;

    function toggleSession(key: string) {
        setOpenSessions((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function toggleAllSessions() {
        if (allOpen) setOpenSessions(new Set());
        else setOpenSessions(new Set(sessions.map(([key]) => key)));
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Payment History</h3>
                    <span className="text-xs text-slate-400">{payments.length} record{payments.length !== 1 ? "s" : ""}</span>
                    <PayerBadge payer={payerHint.type} reference={payerHint.reference || null} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportPatientInvoice({ patientId, patient, payments })}
                        disabled={isLoading}
                        title="Download a branded invoice with all paid and pending items"
                        className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent text-xs font-bold"
                    >
                        <Printer size={13} /> Export Invoice
                    </Button>
                    {!readOnly && (
                        <>
                            <Button
                                size="sm"
                                onClick={() => setDepositOpen(true)}
                                title="Collect an advance deposit — held as credit on the patient's account"
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 text-xs font-bold"
                            >
                                <Wallet size={13} /> Take Deposit
                            </Button>
                            {outstandingPayments.length > 0 && (
                                <Button
                                    size="sm"
                                    onClick={() => setSettleAllOpen(true)}
                                    title="Settle every outstanding bill for this patient in one go"
                                    className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm shadow-orange-200 text-xs font-bold"
                                >
                                    <Layers size={13} /> Settle All ({outstandingPayments.length})
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={() => setIsAddBillOpen(true)}
                                className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-200 text-xs font-bold"
                            >
                                <Plus size={13} /> Add Bill
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Summary */}
            {payments.length > 0 && (
                <div className="print:mb-8">
                    <PaymentSummary payments={payments} />
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 print:hidden">
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as PaymentCategory | "all")}>
                    <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-white text-sm focus:ring-teal-400">
                        <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {(Object.keys(CATEGORY_LABELS) as PaymentCategory[]).map((c) => (
                            <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus | "all")}>
                    <SelectTrigger className="w-[160px] rounded-xl border-slate-200 bg-white text-sm focus:ring-teal-400">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        {(["all","pending","partial","paid","waived","refunded"] as const).map((s) => (
                            <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {sessions.length > 1 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAllSessions}
                        className="rounded-xl border-slate-200 text-xs font-semibold text-slate-500"
                    >
                        <ChevronsUpDown size={13} /> {allOpen ? "Collapse all" : "Expand all"}
                    </Button>
                )}
            </div>

            {/* Editable-billing hint */}
            {!readOnly && sorted.some((p) => p.status === "pending" || p.status === "partial") && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-teal-50/70 border border-teal-100 rounded-xl">
                    <Pencil size={12} className="text-teal-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-teal-800 leading-relaxed">
                        <span className="font-bold">Prices are editable:</span> use <strong>Edit</strong> to correct a bill, or click{" "}
                        <strong>Settle</strong> to review and adjust the final amount before confirming payment.
                    </p>
                </div>
            )}

            {/* Sessions */}
            {isLoading ? (
                <div className="text-sm text-slate-400 py-8 text-center">Loading payment history…</div>
            ) : isError ? (
                <div className="flex items-center justify-center gap-2 text-sm text-red-400 py-8 text-center">
                    <AlertTriangle size={14} /> Failed to load payments
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                    No payment records found
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map(([key, bills]) => (
                        <SessionGroup
                            key={key}
                            sessionKey={key}
                            bills={bills}
                            open={openSessions.has(key)}
                            onToggle={() => toggleSession(key)}
                            canManage={!readOnly}
                            readOnly={readOnly}
                            onEdit={!readOnly ? setEditTarget : undefined}
                            onSettle={!readOnly
                                ? (onSettle ? (payment) => onSettle(payment.id) : setSettleTarget)
                                : undefined}
                        />
                    ))}
                </div>
            )}

            {/* Settle Bill Modal — full / part / deposit + discount + auto-identified payer */}
            {settleTarget && !readOnly && !onSettle && (
                <SettleBillModal
                    payment={settleTarget}
                    patient={patient as any}
                    payerHint={payerHint}
                    cashierId={cashierId}
                    onClose={() => setSettleTarget(null)}
                />
            )}

            {/* Settle ALL accumulated bills for this patient */}
            {settleAllOpen && !readOnly && (
                <SettleAllBillsModal
                    payments={payments}
                    patientId={patientId}
                    patient={patient as any}
                    payerHint={payerHint}
                    cashierId={cashierId}
                    onClose={() => setSettleAllOpen(false)}
                />
            )}

            {/* Take an advance deposit */}
            {depositOpen && !readOnly && (
                <DepositModal
                    patientId={patientId}
                    patient={patient as any}
                    payerHint={payerHint}
                    cashierId={cashierId}
                    onClose={() => setDepositOpen(false)}
                />
            )}

            {/* Edit Bill Modal — adjust price/description/category while pending */}
            {editTarget && !readOnly && (
                <EditBillModal
                    payment={editTarget}
                    onClose={() => setEditTarget(null)}
                />
            )}

            {/* Add Bill Modal */}
            {isAddBillOpen && (
                <AddBillModal
                    onClose={() => setIsAddBillOpen(false)}
                    onSubmit={handleAddBill}
                    isSaving={isCreatingBill}
                />
            )}
        </div>
    );
}
