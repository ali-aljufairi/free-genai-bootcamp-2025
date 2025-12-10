"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, GraduationCap, LayoutDashboard, ChevronLeft, ChevronRight, Users, FileText, Settings, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/hooks/use-sidebar"
import Logo from "@/components/ui/Logo"
import MobileBottomNav from "./mobile-bottom-nav"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function Sidebar() {
  const pathname = usePathname()
  const { isExpanded, setIsExpanded } = useSidebar()

  // Hide mobile bottom nav on study session pages (they have their own)
  const isStudySessionActive = pathname?.startsWith("/study/") && pathname !== "/study"

  const routes = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Vocabulary",
      path: "/vocabulary",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      name: "Study",
      path: "/study",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      name: "Grammar",
      path: "/grammar",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      name: "SRS Review",
      path: "/srs-review",
      icon: <RotateCcw className="h-5 w-5" />,
    },
    {
      name: "Groups",
      path: "/groups",
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <>
      {/* Mobile bottom navigation - hidden on active study sessions */}
      {!isStudySessionActive && <MobileBottomNav />}

      <TooltipProvider>
        <div className={cn(
          "hidden md:flex flex-col h-screen border-r bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm transition-all duration-300",
          !isExpanded ? "w-20" : "w-64"
        )}>
          <div className={cn(
            "flex items-center gap-2 p-4 border-b",
            !isExpanded ? "justify-center" : "justify-between"
          )}>
            <div className="flex items-center gap-2">
              <Logo width={20} height={20} />
              {isExpanded && (
                <>
                  <span className="font-bold text-lg">Sorami</span>
                  <span className="text-xs text-muted-foreground">空見</span>
                </>
              )}
            </div>
            {isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-8 w-8"
                onClick={toggleSidebar}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-1 px-2">
              {routes.map((route) => (
                <li key={route.path}>
                  {!isExpanded ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={route.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors justify-center",
                            pathname === route.path
                              ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-50"
                              : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          )}
                        >
                          {route.icon}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="z-[9999]">
                        <p>{route.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link
                      href={route.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        pathname === route.path
                          ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-50"
                          : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      )}
                    >
                      {route.icon}
                      {route.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className={cn(
            "p-4 border-t flex items-center",
            !isExpanded ? "justify-center" : "justify-start"
          )}>
            {!isExpanded && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-8 w-8"
                    onClick={toggleSidebar}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="z-[9999]">
                  <p>Expand sidebar</p>
                </TooltipContent>
              </Tooltip>
            )}
            {isExpanded && (
              <Link href="/" className="text-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400">
                Back to Home
              </Link>
            )}
          </div>
        </div>
      </TooltipProvider>
    </>
  )
}

