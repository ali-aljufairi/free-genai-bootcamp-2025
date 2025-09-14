"use client";

import { SignIn } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight } from "lucide-react";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function Page() {
    return (
        <div className="flex items-center justify-center min-h-[80vh] w-full">
            <div className="w-full max-w-md">
                <Card className="glass-card border-0 shadow-lg bg-background/60 backdrop-blur-sm">
                    <CardContent className="p-8">
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

                        <div className="space-y-6">
                            <SignIn
                                appearance={clerkAppearance}
                                afterSignInUrl="/study"
                                signUpUrl="/sign-up"
                                redirectUrl="/study"
                            />
                        </div>

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
