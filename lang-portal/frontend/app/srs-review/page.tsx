"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, FileText, RotateCcw, ArrowRight } from "lucide-react"

export default function SRSReviewPage() {
    const router = useRouter()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground">SRS Review</h1>
                <p className="text-muted-foreground">
                    Review items that are due for spaced repetition practice
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
                {/* Grammar SRS Review Card */}
                <Card className="glass-card border-border/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl">Grammar Review</CardTitle>
                        </div>
                        <CardDescription>
                            Review grammar questions that are due for spaced repetition practice
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            className="w-full" 
                            size="lg"
                            onClick={() => router.push("/srs-review/grammar")}
                        >
                            Start Grammar Review
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Vocabulary SRS Review Card */}
                <Card className="glass-card border-border/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl">Vocabulary Review</CardTitle>
                        </div>
                        <CardDescription>
                            Review vocabulary words that are due for spaced repetition practice
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            className="w-full" 
                            size="lg"
                            onClick={() => router.push("/srs-review/vocabulary")}
                        >
                            Start Vocabulary Review
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Info Section */}
            <Card className="glass-card border-border/50 shadow-lg max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <RotateCcw className="w-5 h-5 text-primary" />
                        <CardTitle>About SRS Review</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                        The Spaced Repetition System (SRS) helps you review content at optimal intervals to maximize retention.
                    </p>
                    <p>
                        Items that need review are automatically scheduled based on your performance. Review them regularly to maintain your progress.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

