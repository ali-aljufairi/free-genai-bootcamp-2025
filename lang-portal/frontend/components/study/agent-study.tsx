"use client"
import { useState } from 'react'
import { useUser, useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/sonner"
import {
    Zap,
    Sparkles,
    AlertCircle,
    CheckCircle2
} from "lucide-react"
import { getCachedToken } from "@/lib/token-cache"

interface AgentStudyProps {
    sessionId: string;
    onComplete: () => void;
}


export function AgentStudy({ sessionId, onComplete }: AgentStudyProps) {
    const { user } = useUser()
    const { getToken } = useAuth()
    const [learningGoal, setLearningGoal] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [emailSent, setEmailSent] = useState(false)
    const [emailRecipient, setEmailRecipient] = useState<string | null>(null)

    const resourceApiUrl = "/api/agent"

    const getAuthHeaders = async () => {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
            "accept": "application/json"
        }

        // Get token from Clerk using useAuth hook
        try {
            const token = await getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            } else {
                console.warn('No token available from Clerk');
            }
        } catch (error) {
            console.error('Failed to get auth token:', error);
            // Fallback to window.Clerk if useAuth fails
            if (typeof window !== 'undefined') {
                try {
                    const clerk: any = (window as any).Clerk;
                    const session = clerk?.session;
                    if (session) {
                        const fallbackToken = await getCachedToken(session);
                        if (fallbackToken) {
                            headers['Authorization'] = `Bearer ${fallbackToken}`;
                        }
                    }
                } catch (fallbackError) {
                    console.error('Fallback token retrieval also failed:', fallbackError);
                }
            }
        }

        return headers
    }

    const handleGeneratePlan = async () => {
        setIsLoading(true)
        setError(null)
        setEmailSent(false)
        setEmailRecipient(null)

        try {
            const headers = await getAuthHeaders()
            const response = await fetch(`${resourceApiUrl}/plan/generate`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    learning_goal: learningGoal || undefined
                })
            })

            const responseData = await response.json()

            if (!response.ok) {
                const errorMessage = responseData.detail || responseData.message || "Failed to generate learning plan"
                setError(errorMessage)
                throw new Error(errorMessage)
            }

            // Handle API response structure: {status: "success", data: {...}}
            const data = responseData.data || responseData

            if (!data) {
                throw new Error("No data received from server")
            }

            // Check if email was sent
            const wasEmailSent = data.email_sent === true
            const recipient = data.email_recipient || null

            setEmailSent(wasEmailSent)
            setEmailRecipient(recipient)

            // Show success message
            const emailMessage = wasEmailSent
                ? `Your personalized learning plan has been sent to ${recipient || 'your email'}!`
                : "Your personalized learning plan has been generated and sent to your email!"

            toast({
                title: "Learning Plan Generated",
                description: emailMessage,
                duration: 5000
            })

            // Reset form after successful generation
            setLearningGoal("")

            // Call onComplete to close the session after a delay
            if (onComplete) {
                setTimeout(() => {
                    onComplete()
                }, 3000) // Give user time to see the success message
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Please try again"
            setError(errorMessage)
            toast({
                variant: "destructive",
                title: "Failed to generate plan",
                description: errorMessage,
                duration: 5000
            })
        } finally {
            setIsLoading(false)
        }
    }


    return (
        <div className="space-y-6">
            <Card className="glass-card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <CardTitle className="text-xl">Personalized Learning Plan</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Our AI-powered agent analyzes your learning progress and creates a personalized study plan
                        tailored to your strengths, weaknesses, and goals. The plan will be sent to your email.
                    </p>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="learning-goal" className="text-sm font-medium">
                            Learning Goal (Optional)
                        </label>
                        <Input
                            id="learning-goal"
                            placeholder="e.g., Improve kanji recognition, Prepare for JLPT N3, Master grammar patterns..."
                            value={learningGoal}
                            onChange={(e) => setLearningGoal(e.target.value)}
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading && user) {
                                    handleGeneratePlan()
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground">
                            Leave blank for a general improvement plan, or specify a specific goal
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {emailSent && (
                        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                                        Learning Plan Sent Successfully!
                                    </p>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        Your personalized learning plan has been sent to {emailRecipient || 'your email'}.
                                        Please check your inbox to view your customized study plan.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!user && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Please sign in to generate your personalized learning plan.
                            </p>
                        </div>
                    )}

                    <Button
                        onClick={handleGeneratePlan}
                        disabled={isLoading || !user}
                        className="w-full"
                        size="lg"
                    >
                        {isLoading ? (
                            <>
                                <Zap className="h-4 w-4 mr-2 animate-spin" />
                                Generating Plan...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate My Learning Plan
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
