"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to Sentry with additional context
        Sentry.captureException(error, {
            tags: {
                location: 'global-error-boundary',
                component: 'GlobalError',
            },
            extra: {
                errorMessage: error.message,
                errorStack: error.stack,
                errorDigest: error.digest,
                timestamp: new Date().toISOString(),
                userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
            },
        });

        // Log to console for development
        console.error('Global error caught:', error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                                <svg
                                    className="h-6 w-6 text-red-600 dark:text-red-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                            <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                                Something went wrong
                            </h2>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                We're experiencing some technical difficulties. This might be related to our ongoing database migration.
                            </p>
                            <div className="mt-6">
                                <button
                                    onClick={reset}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Try again
                                </button>
                            </div>
                            <div className="mt-4">
                                <a
                                    href="/"
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500"
                                >
                                    Return to home
                                </a>
                            </div>
                            {process.env.NODE_ENV === 'development' && (
                                <details className="mt-4 text-left">
                                    <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
                                        Error details (development only)
                                    </summary>
                                    <pre className="mt-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                                        {error.message}
                                        {error.stack && `\n\n${error.stack}`}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
