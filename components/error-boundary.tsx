/**
 * Error Boundary Component
 * Catches errors in component tree and displays fallback UI
 */

"use client";

import React, { ReactNode } from "react";
import { useErrorStore, useNotificationStore } from "@/store/store";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Error caught by boundary:", error, errorInfo);
    }

    reset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            return (
                this.props.fallback?.(this.state.error, this.reset) || (
                    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
                            <h1 className="text-2xl font-bold text-red-600 mb-4">
                                Something went wrong
                            </h1>
                            <p className="text-gray-600 mb-6">
                                {this.state.error.message}
                            </p>
                            <button
                                onClick={this.reset}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
