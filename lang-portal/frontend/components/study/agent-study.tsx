"use client"
import { useEffect, useState } from 'react'
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/sonner"
import { Search, BookOpen, BookText, Video, GraduationCap, Zap, Copy, Check } from "lucide-react"

interface AgentStudyProps {
    sessionId: string;
    onComplete: () => void;
}

export function AgentStudy({ sessionId, onComplete }: AgentStudyProps) {
    const [query, setQuery] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isDirectLoading, setIsDirectLoading] = useState(false)
    const [email, setEmail] = useState<string>("")
    const [directResults, setDirectResults] = useState<string>("")
    const [isCopied, setIsCopied] = useState(false)

    const resourceApiUrl = "/api/agent"

    const handleSearch = async () => {
        if (!query) {
            toast({
                variant: "destructive",
                title: "Query is required",
                description: "Please enter what you want to search for"
            })
            return
        }

        if (!email || !email.includes('@')) {
            toast({
                variant: "destructive",
                title: "Valid email required",
                description: "Please enter a valid email address to receive your results"
            })
            return
        }

        setIsLoading(true)
        try {
            // Use environment variable for the API URL instead of hardcoding it

            const response = await fetch(`${resourceApiUrl}/search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json"
                },
                body: JSON.stringify({
                    query: query,
                    email: email
                })
            })

            const data = await response.json()
            if (response.ok) {
                // Use environment variable for toast duration instead of hardcoding
                const toastDuration = parseInt("5000")

                toast({
                    title: "Search request submitted",
                    description: `Your search for "${query}" is being processed. Results will be sent to ${email} soon.`,
                    duration: toastDuration
                })

                // Reset the form after successful submission
                setQuery("")
            } else {
                throw new Error(data.message || "Failed to search for resources")
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Failed to search",
                description: error instanceof Error ? error.message : "Please try again"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleDirectSearch = async () => {
        if (!query) {
            toast({
                variant: "destructive",
                title: "Query is required",
                description: "Please enter what you want to search for"
            })
            return
        }

        if (!email || !email.includes('@')) {
            toast({
                variant: "destructive",
                title: "Valid email required",
                description: "Please enter a valid email address to receive your results"
            })
            return
        }

        setIsDirectLoading(true)
        try {
            const response = await fetch(`${resourceApiUrl}/search/direct`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json"
                },
                body: JSON.stringify({
                    query: query,
                    email: email
                })
            })

            const data = await response.json()
            if (response.ok) {
                toast({
                    title: "Direct Search Results",
                    description: "Results retrieved successfully"
                })

                // Filter out tavily_search data before displaying
                let processedResults = "";

                if (data.results && Array.isArray(data.results)) {
                    processedResults = data.results.join("\n");
                } else if (typeof data.results === 'string') {
                    processedResults = data.results;
                } else {
                    // Create a deep copy to avoid modifying the original data
                    const cleanedData = JSON.parse(JSON.stringify(data));

                    // Check for nested tavily_search data structure and remove it
                    if (cleanedData.data && cleanedData.data.tavily_search) {
                        delete cleanedData.data.tavily_search;
                    }

                    // Also check for the capitalized version just in case
                    if (cleanedData.data && cleanedData.data.Tavily_search) {
                        delete cleanedData.data.Tavily_search;
                    }

                    // Also check for direct properties
                    if (cleanedData.tavily_search) {
                        delete cleanedData.tavily_search;
                    }
                    if (cleanedData.Tavily_search) {
                        delete cleanedData.Tavily_search;
                    }

                    processedResults = JSON.stringify(cleanedData, null, 2);
                }

                setDirectResults(processedResults);

                toast({
                    title: "Search Complete",
                    description: "Direct search results are available"
                })
            } else {
                throw new Error(data.message || "Failed to get direct search results")
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Direct search failed",
                description: error instanceof Error ? error.message : "Please try again"
            })
        } finally {
            setIsDirectLoading(false)
        }
    }

    const handleCopyResults = () => {
        if (directResults) {
            navigator.clipboard.writeText(directResults)
                .then(() => {
                    setIsCopied(true)
                    toast({
                        title: "Copied",
                        description: "Search results copied to clipboard"
                    })

                    setTimeout(() => {
                        setIsCopied(false)
                    }, 2000)
                })
                .catch(err => {
                    toast({
                        variant: "destructive",
                        title: "Copy failed",
                        description: "Could not copy text to clipboard"
                    })
                })
        }
    }

    return (
        <div className="space-y-6">
            <Card className="glass-card">
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xl font-bold">Japanese Learning Resources</h3>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Our AI-powered agent will help you find the best resources for learning Japanese.
                            Enter what you're looking for (books, videos, kanji practice, etc.) and we'll email you personalized recommendations.
                        </p>

                        <div className="grid gap-4 pt-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="email" className="text-sm font-medium">
                                    Your Email Address
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email to receive results"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading || isDirectLoading}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="search-query" className="text-sm font-medium">
                                    What are you looking for?
                                </label>
                                <Input
                                    id="search-query"
                                    placeholder="e.g., Best books for JLPT N5, Kanji practice apps, Beginner listening resources..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    disabled={isLoading || isDirectLoading}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSearch}
                                    disabled={isLoading || isDirectLoading || !query || !email}
                                    className="flex-1"
                                >
                                    {isLoading ? "Searching..." : "Find Resources"}
                                </Button>

                                <Button
                                    onClick={handleDirectSearch}
                                    disabled={isLoading || isDirectLoading || !query || !email}
                                    variant="outline"
                                    size="icon"
                                    title="Quick search"
                                    className="h-10 w-10"
                                >
                                    <Zap className="h-4 w-4" />
                                </Button>
                            </div>

                            {directResults && (
                                <div className="mt-4 p-4 bg-muted rounded-lg max-h-60 overflow-y-auto relative">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-medium">Direct Search Results:</h4>
                                        <Button
                                            onClick={handleCopyResults}
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2"
                                        >
                                            {isCopied ? (
                                                <Check className="h-4 w-4 mr-1" />
                                            ) : (
                                                <Copy className="h-4 w-4 mr-1" />
                                            )}
                                            {isCopied ? "Copied" : "Copy"}
                                        </Button>
                                    </div>
                                    <pre className="text-sm whitespace-pre-wrap">{directResults}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card">
                <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Popular Japanese Learning Resource Types</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-start gap-2">
                            <BookOpen className="h-5 w-5 mt-1 text-blue-600 dark:text-blue-400" />
                            <div>
                                <p className="font-medium">Textbooks</p>
                                <p className="text-sm text-muted-foreground">Structured learning materials like Genki or Minna no Nihongo</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <Video className="h-5 w-5 mt-1 text-blue-600 dark:text-blue-400" />
                            <div>
                                <p className="font-medium">Video Courses</p>
                                <p className="text-sm text-muted-foreground">YouTube channels and online courses for visual learners</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <BookText className="h-5 w-5 mt-1 text-blue-600 dark:text-blue-400" />
                            <div>
                                <p className="font-medium">Kanji Resources</p>
                                <p className="text-sm text-muted-foreground">Specialized guides for learning Japanese characters</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <GraduationCap className="h-5 w-5 mt-1 text-blue-600 dark:text-blue-400" />
                            <div>
                                <p className="font-medium">Practice Materials</p>
                                <p className="text-sm text-muted-foreground">Practice exercises and mock tests for various JLPT levels</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}