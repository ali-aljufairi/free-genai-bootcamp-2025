"use client"

import { useState, useEffect, useRef } from "react"
import { useUserProfile } from "@/hooks/api/useGroup"
import { useQueryClient } from "@tanstack/react-query"
import { Settings, Globe, Clock, Target, GraduationCap, CheckCircle2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { userApi } from "@/services/api"

const JLPT_LEVELS = [
    { value: 5, label: "N5 (Beginner)" },
    { value: 4, label: "N4 (Elementary)" },
    { value: 3, label: "N3 (Intermediate)" },
    { value: 2, label: "N2 (Upper Intermediate)" },
    { value: 1, label: "N1 (Advanced)" },
]

const UI_LANGUAGES = [
    { value: "en", label: "English" },
    { value: "ja", label: "日本語" },
]

// Common timezones
const TIMEZONES = [
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "Europe/London", label: "London (GMT)" },
    { value: "Europe/Paris", label: "Paris (CET)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" },
]

export function UserSettingsTab() {
    const { data: userProfile, isLoading: profileLoading } = useUserProfile()
    const queryClient = useQueryClient()
    const [hasInitialized, setHasInitialized] = useState(false)
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Form state
    const [hideEnglish, setHideEnglish] = useState(false)
    const [uiLanguage, setUILanguage] = useState("en")
    const [timezone, setTimezone] = useState("UTC")
    const [dailyReviewTarget, setDailyReviewTarget] = useState(20)
    const [currentJLPTLevel, setCurrentJLPTLevel] = useState(5)

    // Initialize form from user profile
    useEffect(() => {
        if (userProfile?.settings) {
            setHideEnglish(userProfile.settings.hide_english ?? false)
            setUILanguage(userProfile.settings.ui_language ?? "en")
            setTimezone(userProfile.settings.timezone ?? "UTC")
            setDailyReviewTarget(userProfile.settings.daily_review_target ?? 20)
            setCurrentJLPTLevel(userProfile.settings.current_jlpt_level ?? 5)
            setHasInitialized(true)
        }
    }, [userProfile?.settings])

    // Auto-save all settings with debouncing
    useEffect(() => {
        if (!userProfile?.id || !hasInitialized) return

        // Clear any existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        setSaveStatus("saving")

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await userApi.updateUserSettings(userProfile.id.toString(), {
                    hide_english: hideEnglish,
                    ui_language: uiLanguage,
                    timezone: timezone,
                    daily_review_target: dailyReviewTarget,
                    current_jlpt_level: currentJLPTLevel,
                })

                // Invalidate queries to refresh user profile
                queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })

                setSaveStatus("saved")

                // Reset status after 2 seconds
                setTimeout(() => setSaveStatus("idle"), 2000)
            } catch (error) {
                setSaveStatus("idle")
                toast.error("Failed to update settings", {
                    description: error instanceof Error ? error.message : "Unknown error"
                })
            }
        }, 500) // Debounce 500ms

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [hideEnglish, uiLanguage, timezone, dailyReviewTarget, currentJLPTLevel, hasInitialized, userProfile?.id, queryClient])

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Study Preferences Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                    <Settings className="w-6 h-6 text-primary" />
                    <div>
                        <h3 className="text-lg font-medium">Study Preferences</h3>
                        <p className="text-sm text-muted-foreground">Customize your learning experience</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="hide-english" className="text-sm font-medium">Hide English Translations</Label>
                            <Switch
                                id="hide-english"
                                checked={hideEnglish}
                                onCheckedChange={setHideEnglish}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Hide English translations to challenge yourself more
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="daily-review-target">Daily Review Target</Label>
                        <div className="relative">
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="daily-review-target"
                                type="number"
                                min="1"
                                max="100"
                                value={dailyReviewTarget}
                                onChange={(e) => setDailyReviewTarget(parseInt(e.target.value) || 20)}
                                className="pl-9"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Number of items to review per day (1-100)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="current-jlpt-level">Current JLPT Level</Label>
                        <Select
                            value={currentJLPTLevel.toString()}
                            onValueChange={(value) => setCurrentJLPTLevel(parseInt(value))}
                        >
                            <SelectTrigger id="current-jlpt-level" className="w-full">
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {JLPT_LEVELS.map((level) => (
                                    <SelectItem key={level.value} value={level.value.toString()}>
                                        {level.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Your current Japanese proficiency level
                        </p>
                    </div>
                </div>
            </div>

            <Separator className="my-6" />

            {/* Localization Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                    <Globe className="w-6 h-6 text-primary" />
                    <div>
                        <h3 className="text-lg font-medium">Localization</h3>
                        <p className="text-sm text-muted-foreground">Language and regional settings</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="ui-language">Interface Language</Label>
                        <Select
                            value={uiLanguage}
                            onValueChange={setUILanguage}
                        >
                            <SelectTrigger id="ui-language" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {UI_LANGUAGES.map((lang) => (
                                    <SelectItem key={lang.value} value={lang.value}>
                                        {lang.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Language for the user interface
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                            value={timezone}
                            onValueChange={setTimezone}
                        >
                            <SelectTrigger id="timezone" className="w-full">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {TIMEZONES.map((tz) => (
                                    <SelectItem key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Your local timezone for scheduling reviews
                        </p>
                    </div>
                </div>
            </div>

            {/* Auto-save status indicator */}
            {hasInitialized && (
                <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        {saveStatus === "saving" && (
                            <>
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span>Saving...</span>
                            </>
                        )}
                        {saveStatus === "saved" && (
                            <>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-green-500">Settings saved</span>
                            </>
                        )}
                        {saveStatus === "idle" && (
                            <span className="text-xs">Changes are saved automatically</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

