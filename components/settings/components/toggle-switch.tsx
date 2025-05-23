"use client";

import React from "react";

interface ToggleSwitchProps {
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    disabled?: boolean;
}

export function ToggleSwitch({ id, checked, onChange, label, disabled = false }: ToggleSwitchProps) {
    return (
        <div className="flex items-center justify-between w-full">
            <label
                htmlFor={id}
                className="text-gray-900 font-medium select-none"
                style={{
                    color: '#1f2937', // Tailwind gray-800: strong dark text for label 
                    userSelect: 'none'
                }}
            >
                {label}
            </label>

            <button
                id={id}
                aria-checked={checked}
                role="switch"
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                className={`
          relative inline-flex h-8 w-16 items-center rounded-full
          transition-colors duration-300 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${checked
                        ? "bg-blue-700 focus:ring-blue-600"
                        : "bg-gray-400 hover:bg-gray-500 focus:ring-gray-500"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
            >
                <span
                    className={`
            inline-block h-6 w-6 transform rounded-full bg-white shadow-md
            ring-1 ring-black ring-opacity-10
            transition-transform duration-300 ease-in-out
            ${checked ? "translate-x-8" : "translate-x-1"}
          `}
                />
                <span
                    className={`
            absolute left-3 top-1 text-xs font-semibold select-none pointer-events-none
            text-white transition-opacity duration-300 ease-in-out
            ${checked ? "opacity-100" : "opacity-0"}
          `}
                >
                    ON
                </span>
                <span
                    className={`
            absolute right-3 top-1 text-xs font-semibold select-none pointer-events-none
            text-gray-900 transition-opacity duration-300 ease-in-out
            ${checked ? "opacity-0" : "opacity-100"}
          `}
                >
                    OFF
                </span>
            </button>
        </div>
    );
}
