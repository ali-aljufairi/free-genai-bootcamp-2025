"use client";

import { SignIn } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight } from "lucide-react";

export default function Page() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50/80 via-blue-50/60 to-indigo-50/70 dark:from-slate-900/90 dark:via-blue-950/80 dark:to-indigo-950/90">
            <div className="w-full max-w-md">
                <Card className="glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                    <CardContent className="p-8">
                        {/* Header Section */}
                        <div className="mb-8 text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                                <BookOpen className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Welcome Back
                            </h1>
                            <p className="text-muted-foreground">
                                Sign in to continue your language learning journey
                            </p>
                        </div>

                        {/* Clerk Sign-In Component */}
                        <div className="space-y-6">
                            <SignIn
                                appearance={{
                                    elements: {
                                        rootBox: "w-full",
                                        card: "bg-transparent shadow-none border-0 p-0",
                                        headerTitle: "hidden",
                                        headerSubtitle: "hidden",
                                        socialButtonsBlockButton: 
                                            "bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors",
                                        socialButtonsBlockButtonText: 
                                            "text-gray-900 dark:text-gray-100 font-medium",
                                        formButtonPrimary:
                                            "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 transition-all duration-200",
                                        formFieldInput:
                                            "bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                                        formFieldLabel:
                                            "text-gray-700 dark:text-gray-300 font-medium",
                                        identityPreviewText:
                                            "text-gray-600 dark:text-gray-400",
                                        formHeaderTitle:
                                            "text-gray-900 dark:text-gray-100",
                                        formHeaderSubtitle:
                                            "text-gray-600 dark:text-gray-400",
                                        footerAction: 
                                            "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
                                        footerActionText:
                                            "text-gray-600 dark:text-gray-400",
                                        dividerLine: 
                                            "bg-gray-200 dark:bg-gray-700",
                                        dividerText: 
                                            "text-gray-500 dark:text-gray-400",
                                        alternativeMethodsBlockButton:
                                            "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
                                    },
                                    layout: {
                                        socialButtonsPlacement: "top",
                                        showOptionalFields: false,
                                    }
                                }}
                                afterSignInUrl="/study"
                                signUpUrl="/sign-up"
                                redirectUrl="/study"
                            />
                        </div>

                        {/* Footer */}
                        <div className="mt-8 text-center">
                            <div className="flex items-center justify-center text-sm text-muted-foreground">
                                <span>Ready to learn?</span>
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}