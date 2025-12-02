"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BookOpen, GraduationCap, LayoutDashboard, Settings, MoreVertical, FileText, Users, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export default function MobileBottomNav() {
    const pathname = usePathname()
    const router = useRouter()

    // Primary navigation items
    const primaryRoutes = [
        {
            name: "Dashboard",
            path: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            name: "Vocabulary",
            path: "/vocabulary",
            icon: BookOpen,
        },
        {
            name: "Study",
            path: "/study",
            icon: GraduationCap,
        },
        {
            name: "Settings",
            path: "/settings",
            icon: Settings,
        },
    ]

    // Extra navigation items (in dropdown)
    const extraRoutes = [
        {
            name: "SRS Review",
            path: "/srs-review",
            icon: RotateCcw,
        },
        {
            name: "Grammar",
            path: "/grammar",
            icon: FileText,
        },
        {
            name: "Groups",
            path: "/groups",
            icon: Users,
        },
    ]

    const handleNavigation = (path: string) => {
        router.push(path)
    }

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="flex items-center justify-around h-16 px-2">
                {primaryRoutes.map((route) => {
                    const Icon = route.icon
                    const isActive = pathname === route.path

                    return (
                        <Link
                            key={route.path}
                            href={route.path}
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-md transition-colors min-w-0",
                                isActive
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn(
                                "h-5 w-5 transition-colors shrink-0",
                                isActive && "text-blue-600 dark:text-blue-400"
                            )} />
                            <span className="text-xs font-medium truncate w-full text-center">{route.name}</span>
                            {isActive && (
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                            )}
                        </Link>
                    )
                })}

                {/* More options dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-md transition-colors min-w-0",
                                pathname === "/grammar" || pathname === "/groups"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MoreVertical className={cn(
                                "h-5 w-5 transition-colors shrink-0",
                                (pathname === "/grammar" || pathname === "/groups") && "text-blue-600 dark:text-blue-400"
                            )} />
                            <span className="text-xs font-medium truncate w-full text-center">More</span>
                            {(pathname === "/grammar" || pathname === "/groups") && (
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="end" className="mb-2">
                        {extraRoutes.map((route) => {
                            const Icon = route.icon
                            const isActive = pathname === route.path

                            return (
                                <DropdownMenuItem
                                    key={route.path}
                                    onClick={() => handleNavigation(route.path)}
                                    className={cn(
                                        "flex items-center gap-2 cursor-pointer",
                                        isActive && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{route.name}</span>
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    )
}

