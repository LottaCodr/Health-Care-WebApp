"use client";

import { useMemo } from "react";
import { Printer, Microscope } from "lucide-react";
import {
    parseLabResult,
    categoryDef,
    ensureFlag,
    formatAgeLabel,
    resolveHematologyCategory,
    ANALYZER_RESULT_FOOTER,
    type HematologyCategory,
} from "@/lib/clinical/hematology-reference-ranges";

interface HematologyAnalyzerReportProps {
    /** Lab request row with `patients` attached (as returned by the lab services). */
    request: any;
    className?: string;
}

function fmtDateTime(iso?: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", {
        day: "numeric", month: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
    }).replace(/,/, "");
}

/**
 * Renders a completed hematology analyzer result exactly like the instrument
 * printout: Sample ID / Mode / Gender / Age / Test Time header, a
 * Para | Flag | Result | Unit | Ref. Range table, and the mandated footer.
 * Also exposes a printer-friendly export (opens a clean HTML print window).
 */
export default function HematologyAnalyzerReport({ request, className }: HematologyAnalyzerReportProps) {
    const parsed = useMemo(() => parseLabResult(request?.result), [request?.result]);
    const patient = request?.patients ?? {};
    const patientAge = patient?.birth_date
        ? Math.max(0, (Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 86400000))
        : null;

    const resolved = useMemo(
        () => resolveHematologyCategory(patientAge, patient?.gender ?? null),
        [patientAge, patient?.gender],
    );

    if (!parsed || parsed.kind !== "hematology-analyzer") return null;

    const category: HematologyCategory | undefined =
        resolved.category ?? undefined;

    const rows = parsed.rows.map((row) => ({
        ...row,
        flag: ensureFlag(row, category),
    }));

    const testTime = fmtDateTime(request?.completed_at ?? request?.created_at);
    const sampleId = parsed.sampleId ?? request?.visit_id ?? request?.id ?? "—";
    const mode = parsed.mode ?? "Whole Blood";
    const referenceSet = parsed.referenceSet ?? (resolved.category ? categoryDef(resolved.category).label : "—");

    const printHtml = () => {
        const trs = rows
            .map((r) =>
                `<tr${r.flag === "H" ? ' class="h"' : r.flag === "L" ? ' class="l"' : ""}>` +
                `<td class="p">${r.label}</td>` +
                `<td class="f">${r.flag}</td>` +
                `<td class="v">${r.value || "—"}</td>` +
                `<td>${r.unit}</td>` +
                `<td>${r.ref || ""}</td></tr>`
            )
            .join("");
        const notes = parsed.note
            ? `<div class="notes">${parsed.note.replace(/\n/g, "<br/>")}</div>`
            : "";
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Hematology Analyzer Report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #111; margin: 40px; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px; }
  .title { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
  .sub { font-size: 12px; color: #444; margin-top: 2px; }
  .meta { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; border: 1px solid #999; border-radius: 6px; padding: 10px 12px; margin-bottom: 18px; font-size: 12px; }
  .meta b { display: block; font-size: 9px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #eee; border: 1px solid #888; padding: 6px 8px; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  td { border: 1px solid #bbb; padding: 5px 8px; }
  td.p { font-weight: 700; }
  td.f { text-align: center; font-weight: 800; }
  td.v { font-family: Consolas, monospace; font-weight: 700; }
  tr.h td.v { color: #b00020; }
  tr.l td.v { color: #0b57d0; }
  .footer { text-align: center; font-size: 11px; color: #333; margin-top: 16px; font-style: italic; }
  .notes { margin-top: 14px; font-size: 12px; border-top: 1px solid #ccc; padding-top: 10px; white-space: pre-wrap; }
  .sig { display: flex; justify-content: space-between; margin-top: 48px; font-size: 12px; }
  .sig span { border-top: 1px solid #333; padding-top: 4px; width: 200px; text-align: center; }
</style></head><body>
  <div class="head">
    <div>
      <div class="title">Hematology Analyzer Report</div>
      <div class="sub">Full Blood Count (FBC) · 5-Part Differential</div>
    </div>
    <div class="sub" style="text-align:right">Reference set: <b>${referenceSet}</b><br/>Flagged: ${rows.filter((r) => r.flag).map((r) => r.label + " " + r.flag).join(", ") || "None"}</div>
  </div>
  <div class="meta">
    <div><b>Sample ID</b>${sampleId}</div>
    <div><b>Mode</b>${mode}</div>
    <div><b>Gender</b>${patient?.gender ?? "—"}</div>
    <div><b>Age</b>${patientAge !== null ? formatAgeLabel(patientAge) : "—"}</div>
    <div><b>Test Time</b>${testTime}</div>
  </div>
  <table>
    <thead><tr><th>Para</th><th>Flag</th><th>Result</th><th>Unit</th><th>Ref. Range</th></tr></thead>
    <tbody>${trs}</tbody>
  </table>
  <div class="footer">${ANALYZER_RESULT_FOOTER}</div>
  ${notes}
  <div class="sig"><span>Lab Scientist</span><span>Reviewed By</span></div>
  <script>window.onload = function(){ window.print(); };</script>
</body></html>`;

        const win = window.open("", "_blank", "width=900,height=700");
        if (!win) return;
        win.document.open();
        win.document.write(html);
        win.document.close();
    };

    return (
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className ?? ""}`}>
            {/* Report header */}
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-gray-800 bg-gradient-to-r from-gray-50 to-white">
                <div>
                    <p className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                        <Microscope size={15} className="text-indigo-600" />
                        Hematology Analyzer Report
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Full Blood Count (FBC) · 5-Part Differential</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 max-w-[220px] truncate">
                        Ref set: {referenceSet}
                    </span>
                    <button
                        onClick={printHtml}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-gray-200 bg-white text-[11px] font-bold text-gray-700 hover:bg-gray-50 hover:border-indigo-200 transition-colors"
                    >
                        <Printer size={12} /> Print
                    </button>
                </div>
            </div>

            {/* Run meta strip (mirrors the printout header row) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-gray-200 border-b border-gray-200 text-xs">
                {[
                    ["Sample ID", sampleId],
                    ["Mode", mode],
                    ["Gender", patient?.gender ?? "—"],
                    ["Age", patientAge !== null ? formatAgeLabel(patientAge) : "—"],
                    ["Test Time", testTime],
                ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{k}</p>
                        <p className="text-xs font-mono font-bold text-gray-800 mt-0.5">{v}</p>
                    </div>
                ))}
            </div>

            {/* Results table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="text-left px-4 py-2 font-black uppercase tracking-widest text-gray-600">Para</th>
                            <th className="text-center px-2 py-2 font-black uppercase tracking-widest text-gray-600 w-12">Flag</th>
                            <th className="text-left px-4 py-2 font-black uppercase tracking-widest text-gray-600">Result</th>
                            <th className="text-left px-4 py-2 font-black uppercase tracking-widest text-gray-600">Unit</th>
                            <th className="text-left px-4 py-2 font-black uppercase tracking-widest text-gray-600">Ref. Range</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white font-mono">
                        {rows.map((r, i) => (
                            <tr key={i} className={r.flag ? "bg-red-50/40" : "hover:bg-gray-50/50"}>
                                <td className="px-4 py-1.5 font-sans font-bold text-gray-800">{r.label}</td>
                                <td className="px-2 py-1.5 text-center">
                                    {r.flag && (
                                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-black border ${
                                            r.flag === "H" ? "bg-red-50 text-red-700 border-red-200" : "bg-sky-50 text-sky-700 border-sky-200"
                                        }`}>
                                            {r.flag}
                                        </span>
                                    )}
                                </td>
                                <td className={`px-4 py-1.5 font-bold ${r.flag === "H" ? "text-red-700" : r.flag === "L" ? "text-sky-700" : "text-gray-900"}`}>
                                    {r.value || "—"}
                                </td>
                                <td className="px-4 py-1.5 font-sans text-gray-500">{r.unit}</td>
                                <td className="px-4 py-1.5 font-sans text-gray-600">{r.ref}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer — must appear on every printed report */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
                <p className="text-[11px] text-gray-600 italic">[{ANALYZER_RESULT_FOOTER.replace(/^\[|\]$/g, "")}]</p>
            </div>

            {parsed.note && (
                <div className="px-4 py-3 border-t border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Notes</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{parsed.note}</p>
                </div>
            )}
        </div>
    );
}
