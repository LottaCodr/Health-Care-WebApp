"use client";

export default function Loading() {
    return (
        <div
            role="alert"
            aria-live="assertive"
            className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50"
        >
            <svg
                className="animate-spin -ml-1 mr-3 h-10 w-10 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                ></circle>
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
            </svg>

            <p className="mt-4 text-lg font-semibold text-gray-700 select-none">
                Loading, please wait...
            </p>
        </div>
    );
}
