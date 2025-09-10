"use client";

import { SignUp } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Sparkles } from "lucide-react";

export default function Page() {
    return (
        <div className="flex items-center justify-center min-h-[80vh] w-full">
            <div className="w-full max-w-md">
                <Card className="glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                    <CardContent className="p-8">
                        <div className="mb-8 text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                                <GraduationCap className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Create your account
                            </h1>
                            <p className="text-muted-foreground">
                                Welcome! Please fill in the details to get started.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <SignUp
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
                                            "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 transition-all duration-200",
                                        formFieldInput:
                                            "bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                                        formFieldLabel:
                                            "text-gray-700 dark:text-gray-300 font-medium",
                                        identityPreviewText:
                                            "text-gray-600 dark:text-gray-400",
                                        formHeaderTitle:
                                            "text-gray-900 dark:text-gray-100",
                                        formHeaderSubtitle:
                                            "text-gray-600 dark:text-gray-400",
                                        footerAction:
                                            "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300",
                                        footerActionText:
                                            "text-gray-600 dark:text-gray-400",
                                        dividerLine:
                                            "bg-gray-200 dark:bg-gray-700",
                                        dividerText:
                                            "text-gray-500 dark:text-gray-400",
                                        alternativeMethodsBlockButton:
                                            "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300",
                                        otpCodeFieldInput:
                                            "bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100",
                                    },
                                    layout: {
                                        socialButtonsPlacement: "top",
                                        showOptionalFields: false,
                                    }
                                }}
                                afterSignUpUrl="/study"
                                signInUrl="/sign-in"
                                redirectUrl="/study"
                            />
                        </div>

                        <div className="mt-8 text-center">
                            <div className="flex items-center justify-center text-sm text-muted-foreground">
                                <Sparkles className="w-4 h-4 mr-2" />
                                <span>Join thousands of learners</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

