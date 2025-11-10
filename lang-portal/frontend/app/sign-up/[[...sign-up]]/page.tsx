"use client";

import { SignUp } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Sparkles } from "lucide-react";
import { clerkAppearance } from "@/lib/clerk-appearance";

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
                                appearance={clerkAppearance}
                                afterSignUpUrl="/study"
                                signInUrl="/sign-in"
                                redirectUrl="/study"
                            />
                        </div>

                        <div className="mt-8 text-center">
                            <div className="flex items-center justify-center text-sm text-muted-foreground">
                                <Sparkles className="w-4 h-4 mr-2" />
                                <span>Start your Japanese learning journey</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
