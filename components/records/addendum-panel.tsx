"use client";

/**
 * Append-only correction notes.
 *
 * What makes the 24-hour freeze acceptable in a real hospital: the chart stops
 * changing, but the truth can still catch up. A note is dated, signed, and
 * impossible to edit or delete — so a reviewer sees "the discharge summary said
 * X, corrected to Y two days later by the same doctor", which is exactly the
 * paper-spill practice medical records teams already trust.
 */

import { useState } from "react";
import { Loader2, MessageSquarePlus, PenLine, ShieldCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { AMENDMENT_REASONS, amendmentReasonLabel } from "@/lib/records/amendment-policy";
import { getRecordDef, type AmendableRecordType } from "@/lib/records/registry";
import {
    amendmentErrorMessage, useAddRecordAddendum, useRecordAddenda,
} from "@/hooks/emr/use-amendments";
import { fmtDate, fmtFull } from "@/lib/utils";
import { toast } from "sonner";

type QueryKey = readonly (string | number)[];

export interface RecordAddendumPanelProps {
    type: AmendableRecordType;
    id: string;
    patientId?: string | null;
    /** Show the composer without a toggle (inside a dialog). */
    autoOpen?: boolean;
    /** Query keys to refresh after a note is attached. */
    invalidateKeys?: QueryKey[];
    /** Viewers outside the owning department can read notes but not add them. */
    readOnly?: boolean;
    className?: string;
}

export function RecordAddendumPanel({
    type, id, patientId, autoOpen, invalidateKeys, readOnly, className,
}: RecordAddendumPanelProps) {
    const def = getRecordDef(type);
    const [open, setOpen] = useState(Boolean(autoOpen));
    const [content, setContent] = useState("");
    const [reason, setReason] = useState<string>("other");

    const query = useRecordAddenda(type, id, { enabled: true });
    const add = useAddRecordAddendum({ type, id, invalidateKeys });
    const notes = query.data ?? [];

    async function handleSubmit() {
        const text = content.trim();
        if (text.length < 3) {
            toast.error("Write what needs correcting first.");
            return;
        }
        try {
            await add.mutateAsync({ type, id, content: text, reason, patientId: patientId ?? null });
            setContent("");
            setOpen(false);
        } catch (error) {
            // Surface it here too: the composer must not look like it ate the text.
            toast.error(amendmentErrorMessage(error, "Could not attach the correction."));
        }
    }

    return (
        <div className={className}>
            <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    Corrections ({notes.length})
                </p>
                {!open && !readOnly && (
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                        <MessageSquarePlus size={11} /> Add correction note
                    </button>
                )}
            </div>

            {query.isLoading && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Loader2 size={11} className="animate-spin" /> Loading corrections…
                </p>
            )}

            {!query.isLoading && !notes.length && !open && (
                <p className="mt-2 text-[11px] italic text-gray-400">
                    {readOnly
                        ? `No corrections attached to this ${def.label.toLowerCase()}.`
                        : `No corrections yet — attach one if anything above needs correcting.`}
                </p>
            )}

            {notes.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {notes.map((note) => (
                        <li
                            key={note.id}
                            className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm"
                        >
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 uppercase tracking-widest text-gray-600">
                                    {amendmentReasonLabel(note.reason)}
                                </span>
                                <span>{fmtDate(note.created_at)} · {fmtFull(note.created_at)}</span>
                                <span className="text-gray-300">·</span>
                                <span className="text-gray-600">
                                    {note.author_name ?? "Staff"}
                                    {note.author_role ? <span className="text-gray-400"> ({note.author_role})</span> : null}
                                </span>
                            </div>
                            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                                {note.content}
                            </p>
                        </li>
                    ))}
                </ul>
            )}

            {open && (
                <div className="mt-3 space-y-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
                    <p className="text-[11px] leading-relaxed text-emerald-800">
                        The original {def.label.toLowerCase()} stays untouched. This note is signed with your name,
                        dated, and cannot be edited or deleted afterwards.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {AMENDMENT_REASONS.map(r => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => setReason(r.value)}
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                                    reason === r.value
                                        ? "border-emerald-300 bg-white text-emerald-700"
                                        : "border-gray-200 bg-white/60 text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={4}
                        maxLength={4000}
                        autoFocus
                        placeholder={`What is wrong in the ${def.label.toLowerCase()}, and what should the reader know?`}
                        className="rounded-xl border-emerald-200 bg-white text-xs leading-relaxed focus-visible:ring-2 focus-visible:ring-emerald-100"
                    />
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-gray-400">{content.length}/4000</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => { setOpen(false); setContent(""); }}
                                className="h-8 px-3 rounded-lg text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={add.isPending}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {add.isPending ? <Loader2 size={12} className="animate-spin" /> : <PenLine size={12} />}
                                Attach correction
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
