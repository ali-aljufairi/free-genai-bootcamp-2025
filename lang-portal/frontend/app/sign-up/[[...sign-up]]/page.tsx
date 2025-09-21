"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Sparkles, ArrowRight } from "lucide-react";
import { useSignUp } from "@clerk/nextjs";
import { toast } from "sonner";

export default function Page() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { signUp, setActive, isLoaded } = useSignUp();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        setIsLoading(true);
        try {
            const result = await signUp.create({
                emailAddress: email,
                password,
                username,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                router.push("/study");
                toast.success("Welcome to Sorami! Your account has been created.");
            } else {
                toast.error("Sign up failed. Please try again.");
            }
        } catch (err: any) {
            toast.error(err?.errors?.[0]?.longMessage || "An error occurred during sign up");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuthSignUp = async (strategy: "oauth_google" | "oauth_github") => {
        if (!isLoaded) return;

        try {
            const result = await signUp.authenticateWithRedirect({
                strategy,
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/study",
            });
        } catch (err: any) {
            toast.error("OAuth sign up failed. Please try again.");
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
                <Card className="glass-card border-0 shadow-2xl bg-background/80 backdrop-blur-xl rounded-3xl overflow-hidden">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                            <GraduationCap className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Create your account
                        </CardTitle>
                        <CardDescription className="text-lg">
                            Welcome! Please fill in the details to get started.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-10 sm:p-12">
                        {/* OAuth signup options with clear message */}
                        <div className="text-center mb-6">
                            <p className="text-blue-200/80 mb-4">Sign up directly with your social accounts</p>
                            <div className="flex gap-4">
                                <Button
                                    onClick={() => handleOAuthSignUp("oauth_google")}
                                    variant="outline"
                                    className="flex-1 h-12 rounded-lg bg-[#0A1120]/40 border border-blue-700/40 text-white hover:bg-[#0A1120]/60 hover:border-blue-600/50 transition-all duration-200 flex items-center justify-center gap-2"
                                    disabled={isLoading}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 6.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 6.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Google
                                </Button>

                                <Button
                                    onClick={() => handleOAuthSignUp("oauth_github")}
                                    variant="outline"
                                    className="flex-1 h-12 rounded-lg bg-[#0A1120]/40 border border-blue-700/40 text-white hover:bg-[#0A1120]/60 hover:border-blue-600/50 transition-all duration-200 flex items-center justify-center gap-2"
                                    disabled={isLoading}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.303 1.23.957.407 1.988.61 3.022.615 1.034-.005 2.065-.208 3.022-.615 2.296-1.552 3.303-1.23 3.303-1.23.653 1.652.241 2.873.118 3.176.766.84 1.236 1.91 1.236 3.221 0 4.597-2.802 5.626-5.467 5.931.433.373.815.883 1.086 1.487.271.604.393 1.284.393 1.984v3.048c0 .314.194.688.798.573C20.563 21.8 24 17.302 24 12c0-6.627-5.373-12-12-12z" fill="#FFFFFF" />
                                    </svg>
                                    GitHub
                                </Button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-blue-100/90 font-medium">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Create a password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 bg-[#0A1120]/40 text-white placeholder:text-blue-200/60 border border-blue-700/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 rounded-lg backdrop-blur-sm"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-purple-900/30 transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                {isLoading ? "Creating account..." : "Sign Up"}
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
