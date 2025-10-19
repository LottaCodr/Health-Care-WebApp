"use client";

export default function Loading() {
    return (
        <main className="flex flex-col min-h-screen items-center justify-center bg-white dark:bg-black/90">
            <HospitalSpinner />
            <span className="mt-6 text-blue-700 text-lg font-semibold">Loading hospital dashboard...</span>
        </main>
    );
}

// A simple hospital spinner with a cross icon (SVG), animated to spin and pulse.
function HospitalSpinner() {
    return (
        <div className="flex flex-col items-center">
            <svg
                className="animate-spin-slow text-blue-600 w-16 h-16 drop-shadow-lg"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 64 64"
            >
                <circle
                    className="opacity-20"
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="8"
                />
                <path
                    className="animate-pulse"
                    fill="currentColor"
                    d="M26 18a2 2 0 012-2h8a2 2 0 012 2v8h8a2 2 0 012 2v8a2 2 0 01-2 2h-8v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8h-8a2 2 0 01-2-2v-8a2 2 0 012-2h8v-8z"
                />
            </svg>
        </div>
    );
}

// Add slow-spin animation style to global styles (or Tailwind config):
// .animate-spin-slow { animation: spin 2s linear infinite; }
 // .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

