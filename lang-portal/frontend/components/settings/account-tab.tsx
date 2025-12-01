"use client"

import { useState, useEffect } from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { useUserProfile } from "@/hooks/api/useGroup"
import { User, Shield, CreditCard, Mail, UserCircle, Save, Loader2, Link2, Trash2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { userApi } from "@/services/api"

export function AccountTab() {
    const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
    const { data: userProfile, isLoading: profileLoading, refetch } = useUserProfile()
    const [isSaving, setIsSaving] = useState(false)
    const [displayName, setDisplayName] = useState("")

    // Initialize display name from user profile
    useEffect(() => {
        if (userProfile?.user?.display_name) {
            setDisplayName(userProfile.user.display_name)
        } else if (clerkUser?.fullName) {
            setDisplayName(clerkUser.fullName)
        }
    }, [userProfile?.user?.display_name, clerkUser?.fullName])

    const handleSaveProfile = async () => {
        if (!userProfile?.id) {
            toast.error("User ID not found")
            return
        }

        setIsSaving(true)
        try {
            await userApi.updateUser(userProfile.id.toString(), {
                display_name: displayName || null,
            })
            toast.success("Profile updated successfully")
            refetch()
        } catch (error) {
            toast.error("Failed to update profile", {
                description: error instanceof Error ? error.message : "Unknown error"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const primaryEmail = clerkUser?.emailAddresses?.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
        clerkUser?.emailAddresses?.[0]?.emailAddress ||
        "No email"

    if (!clerkLoaded || profileLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Billing Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                    <CreditCard className="w-6 h-6 text-primary" />
                    <div>
                        <h3 className="text-lg font-medium">Billing</h3>
                        <p className="text-sm text-muted-foreground">Manage your subscription and payment methods</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {userProfile?.subscription ? (
                        <div className="p-4 rounded-lg border border-border/50 bg-muted/50">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium">Subscription Status</h4>
                                    <span className={`text-xs px-2 py-1 rounded ${userProfile.subscription.status === 'active'
                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                        }`}>
                                        {userProfile.subscription.status}
                                    </span>
                                </div>
                                {userProfile.subscription.current_period_end && (
                                    <p className="text-xs text-muted-foreground">
                                        Current period ends: {new Date(userProfile.subscription.current_period_end).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg border border-border/50 bg-muted/50">
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">No Active Subscription</h4>
                                <p className="text-xs text-muted-foreground">
                                    You're currently on the free plan. Upgrade to unlock premium features.
                                </p>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="/pricing">View Plans</a>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Separator className="my-6" />

            {/* Connected Accounts Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                    <Link2 className="w-6 h-6 text-primary" />
                    <div>
                        <h3 className="text-lg font-medium">Connected Accounts</h3>
                        <p className="text-sm text-muted-foreground">Manage your social login connections</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {clerkUser?.externalAccounts && clerkUser.externalAccounts.length > 0 ? (
                        clerkUser.externalAccounts.map((account) => (
                            <div
                                key={account.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-xs font-semibold text-primary">
                                            {account.provider.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium capitalize">{account.provider}</p>
                                        {account.emailAddress && (
                                            <p className="text-xs text-muted-foreground">{account.emailAddress}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {account.verification?.status === "verified" && (
                                        <span className="text-xs text-green-600 dark:text-green-400">Verified</span>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                            try {
                                                await account.destroy()
                                                toast.success("Account disconnected")
                                                await clerkUser.reload()
                                            } catch (error) {
                                                toast.error("Failed to disconnect account", {
                                                    description: error instanceof Error ? error.message : "Unknown error"
                                                })
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 rounded-lg border border-border/50 bg-muted/50">
                            <p className="text-sm text-muted-foreground">
                                No connected accounts. Connect your social accounts for easier sign-in.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <Separator className="my-6" />

            {/* Profile Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                    <User className="w-6 h-6 text-primary" />
                    <div>
                        <h3 className="text-lg font-medium">Profile</h3>
                        <p className="text-sm text-muted-foreground">Manage your profile information</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="display-name">Display Name</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="display-name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Enter your display name"
                                    className="pl-9"
                                />
                            </div>
                            <Button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="shrink-0"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-muted/50">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{primaryEmail}</span>
                            {clerkUser?.primaryEmailAddressId && (
                                <span className="ml-auto text-xs text-muted-foreground">Primary</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Email is managed through your Clerk account. To change it, please use the account management portal.
                        </p>
                    </div>

                    {clerkUser?.emailAddresses && clerkUser.emailAddresses.length > 1 && (
                        <div className="space-y-2">
                            <Label>Additional Email Addresses</Label>
                            <div className="space-y-2">
                                {clerkUser.emailAddresses
                                    .filter(e => e.id !== clerkUser.primaryEmailAddressId)
                                    .map((email) => (
                                        <div
                                            key={email.id}
                                            className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-muted/50"
                                        >
                                            <Mail className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm">{email.emailAddress}</span>
                                            {email.verification?.status === "verified" && (
                                                <span className="ml-auto text-xs text-green-600 dark:text-green-400">Verified</span>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Separator className="my-6" />

            {/* Security Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                    <Shield className="w-6 h-6 text-primary" />
                    <div>
                        <h3 className="text-lg font-medium">Security</h3>
                        <p className="text-sm text-muted-foreground">Manage your account security settings</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/50">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Password</h4>
                            <p className="text-xs text-muted-foreground">
                                Change your password to keep your account secure. Password management is handled through Clerk.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // Redirect to Clerk's password reset page
                                    window.location.href = '/sign-in?redirect_url=/settings'
                                }}
                            >
                                Reset Password
                            </Button>
                        </div>
                    </div>

                    {clerkUser?.twoFactorEnabled && (
                        <div className="p-4 rounded-lg border border-border/50 bg-muted/50">
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Two-Factor Authentication</h4>
                                <p className="text-xs text-muted-foreground">
                                    Two-factor authentication is enabled for your account.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}
