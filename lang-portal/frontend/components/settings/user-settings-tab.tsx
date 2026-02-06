"use client"

import { useState, useEffect, useRef } from "react"
import { useUserProfile } from "@/hooks/api/useGroup"
import { useDailyMissionConfig, useUpdateDailyMissionConfig } from "@/hooks/api/useDashboard"
import { useQueryClient } from "@tanstack/react-query"
import { Settings, Globe, Clock, Target, GraduationCap, CheckCircle2, LayoutDashboard } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { userApi } from "@/services/api"
import { useUserSettingsStore } from "@/stores/user-settings-store"
import Link from "next/link"

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
    const { data: dailyMissionConfig } = useDailyMissionConfig()
    const updateDailyMissionConfigMutation = useUpdateDailyMissionConfig()
    const queryClient = useQueryClient()
    const [hasInitialized, setHasInitialized] = useState(false)
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
    const initializationRef = useRef(false)
    const missionInitializationRef = useRef(false)
    const lastSavedSettingsRef = useRef<{
        hide_english?: boolean
        ui_language?: string
        timezone?: string
        daily_review_target?: number
        current_jlpt_level?: number
    } | null>(null)

    // Form state
    const [hideEnglish, setHideEnglish] = useState(false)
    const [uiLanguage, setUILanguage] = useState("en")
    const [timezone, setTimezone] = useState("UTC")
    const [dailyReviewTarget, setDailyReviewTarget] = useState(20)
    const [currentJLPTLevel, setCurrentJLPTLevel] = useState(5)
    const [dailyMissionVariant, setDailyMissionVariant] = useState<"mission" | "planner" | "analytics">("mission")

    const setJlptInStore = useUserSettingsStore((s) => s.setFromSettings)

    // Initialize form from user profile (only once on mount)
    useEffect(() => {
        if (userProfile?.user?.id && !initializationRef.current) {
            // Initialize even if settings don't exist yet
            const settings = userProfile.settings || {}
            setHideEnglish(settings.hide_english ?? false)
            setUILanguage(settings.ui_language ?? "en")
            setTimezone(settings.timezone ?? "UTC")
            setDailyReviewTarget(settings.daily_review_target ?? 20)
            setCurrentJLPTLevel(settings.current_jlpt_level ?? 5)
            setHasInitialized(true)
            initializationRef.current = true
            // Store the initial values
            lastSavedSettingsRef.current = {
                hide_english: settings.hide_english ?? false,
                ui_language: settings.ui_language ?? "en",
                timezone: settings.timezone ?? "UTC",
                daily_review_target: settings.daily_review_target ?? 20,
                current_jlpt_level: settings.current_jlpt_level ?? 5,
            }
        }
        // Only initialize once - don't overwrite user changes when profile refetches
    }, [userProfile?.id, userProfile?.settings])

    useEffect(() => {
        if (dailyMissionConfig?.active_variant && !missionInitializationRef.current) {
            setDailyMissionVariant(dailyMissionConfig.active_variant)
            missionInitializationRef.current = true
        }
    }, [dailyMissionConfig?.active_variant])

    const handleMissionVariantChange = async (variant: "mission" | "planner" | "analytics") => {
        const previousVariant = dailyMissionVariant
        setDailyMissionVariant(variant)
        try {
            await updateDailyMissionConfigMutation.mutateAsync({ active_variant: variant })
            toast.success("Daily mission experience updated")
        } catch (error) {
            setDailyMissionVariant(previousVariant)
            toast.error("Failed to update daily mission experience", {
                description: error instanceof Error ? error.message : "Unknown error"
            })
        }
    }

    // Auto-save all settings immediately on change
    useEffect(() => {
        if (!userProfile?.user?.id || !hasInitialized) return

        // Check if values have changed from what we last saved
        const lastSaved = lastSavedSettingsRef.current
        if (lastSaved &&
            hideEnglish === lastSaved.hide_english &&
            uiLanguage === lastSaved.ui_language &&
            timezone === lastSaved.timezone &&
            dailyReviewTarget === lastSaved.daily_review_target &&
            currentJLPTLevel === lastSaved.current_jlpt_level) {
            // No changes, don't save
            return
        }

        // Save immediately - no debounce needed for discrete user actions
        const saveSettings = async () => {
            try {
                setSaveStatus("saving")

                const settingsToSave = {
                    hide_english: hideEnglish,
                    ui_language: uiLanguage,
                    timezone: timezone,
                    daily_review_target: dailyReviewTarget,
                    current_jlpt_level: currentJLPTLevel,
                }

                await userApi.updateUserSettings(userProfile.user.id.toString(), settingsToSave)

                setJlptInStore(currentJLPTLevel)

                // Update our ref to track what we just saved
                lastSavedSettingsRef.current = settingsToSave

                // Invalidate queries so other components see the update
                // But our initialization guard prevents overwriting local state
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
        }

        saveSettings()
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
                                min={1}
                                max={100}
                                value={dailyReviewTarget}
                                onChange={(e) => {
                                    const parsed = parseInt(e.target.value, 10);
                                    if (Number.isNaN(parsed)) return;
                                    setDailyReviewTarget(Math.min(100, Math.max(1, parsed)));
                                }}
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

            {/* Daily Mission Lab Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                    <LayoutDashboard className="w-6 h-6 text-primary" />
                    <div>
                        <h3 className="text-lg font-medium">Daily Mission Experience</h3>
                        <p className="text-sm text-muted-foreground">Choose how your daily dashboard motivates you</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="daily-mission-variant">Dashboard Variant</Label>
                    <Select
                        value={dailyMissionVariant}
                        onValueChange={(value) => handleMissionVariantChange(value as "mission" | "planner" | "analytics")}
                        disabled={updateDailyMissionConfigMutation.isPending}
                    >
                        <SelectTrigger id="daily-mission-variant" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mission">Mission-First</SelectItem>
                            <SelectItem value="planner">Planner Grid</SelectItem>
                            <SelectItem value="analytics">Analytics-First</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        You can compare all three versions in the dashboard lab and pick what feels most motivating.
                    </p>
                    <Link
                        href="/dashboard/lab"
                        className="inline-flex text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Open dashboard lab
                    </Link>
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
