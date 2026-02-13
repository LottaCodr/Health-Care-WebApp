'use client';

import { Patient, SortConfig } from "@/context/patients/types";
import { FaSortUp, FaSortDown } from "react-icons/fa";

interface Props {
    sortConfig: SortConfig | null;
    onSortChange: (key: keyof Patient) => void;
}

const headers: { key: keyof Patient; label: string }[] = [
    { key: 'name', label: 'Full Name' },
    { key: 'gender', label: 'Gender' },
    { key: 'created_at', label: 'Admission Date' },
    { key: 'genoType', label: 'Geno Type' },
    { key: 'allergies', label: 'Allergies' },
    { key: 'status', label: 'Status' },
];

export default function PatientsTableHeader({ sortConfig, onSortChange }: Props) {
    return (
        <thead className="bg-white dark:bg-muted/30">
            <tr>
                {headers.map(({ key, label }) => {
                    const isActive = sortConfig?.key === key;
                    const direction = isActive ? sortConfig?.direction : null;
                    return (
                        <th
                            key={key}
                            scope="col"
                            tabIndex={0}
                            aria-sort={
                                isActive
                                    ? direction === "asc"
                                        ? "ascending"
                                        : "descending"
                                    : "none"
                            }
                            className={`px-5 py-3 text-left font-semibold text-gray-800 dark:text-white select-none transition-colors duration-150
                                ${isActive ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-inner" : "hover:bg-red-100 dark:hover:bg-red-900/20"}
                                rounded-tl-lg first:rounded-tl-xl last:rounded-tr-xl focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer group`}
                            onClick={() => onSortChange(key)}
                            onKeyDown={e => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onSortChange(key);
                                }
                            }}
                            title={`Sort by ${label}`}
                        >
                            <span className="flex items-center gap-1">
                                <span>{label}</span>
                                <span
                                    className={`inline-flex flex-col ml-1 transition-opacity duration-150 ${isActive ? "opacity-100 text-red-600 dark:text-red-300" : "opacity-40 group-hover:opacity-80 text-gray-400"
                                        }`}
                                    aria-hidden="true"
                                >
                                    <FaSortUp
                                        className={`h-3 w-3 mb-[-2px] ${isActive && direction === "asc" ? "text-red-600 dark:text-red-300" : ""
                                            }`}
                                    />
                                    <FaSortDown
                                        className={`h-3 w-3 mt-[-2px] ${isActive && direction === "desc" ? "text-red-600 dark:text-red-300" : ""
                                            }`}
                                    />
                                </span>
                            </span>
                            {isActive && (
                                <span className="sr-only">
                                    {direction === "asc" ? "sorted ascending" : "sorted descending"}
                                </span>
                            )}
                        </th>
                    );
                })}
            </tr>
        </thead>
    );
}
