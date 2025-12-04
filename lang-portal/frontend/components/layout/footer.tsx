"use client"

import Link from "next/link"

export default function Footer() {
    return (
        <footer className="border-t border-blue-100/50 dark:border-blue-900/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">Sorami</span>
                        <span className="text-xs text-muted-foreground">空見</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                        <a
                            href="mailto:support@aljufairi.org"
                            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                            support@aljufairi.org
                        </a>
                        <span>•</span>
                        <Link href="/pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            Pricing
                        </Link>
                        <span>•</span>
                        <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            Terms of Service
                        </Link>
                        <span>•</span>
                        <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            Privacy Policy
                        </Link>
                    </div>
                </div>
                <div className="mt-4 text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} Sorami. All rights reserved.
                </div>
            </div>
        </footer>
    )
}

