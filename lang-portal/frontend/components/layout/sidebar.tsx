"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, GraduationCap, LayoutDashboard, Menu, Settings, X, ChevronLeft, ChevronRight, Users, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/hooks/use-sidebar"
import Logo from "@/components/ui/Logo"

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { isExpanded, setIsExpanded } = useSidebar()

  // Hide mobile burger menu on study session pages (they have their own)
  const isStudySessionActive = pathname?.startsWith("/study/") && pathname !== "/study"

  const routes = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Study",
      path: "/study",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      name: "Vocabulary",
      path: "/vocabulary",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      name: "Grammar",
      path: "/grammar",
      icon: <FileText className="h-5 w-5" />,
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
      {/* Mobile burger menu - hidden on active study sessions */}
      {!isStudySessionActive && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden absolute top-4 left-4 z-50">
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <nav className="flex flex-col h-full bg-white/90 dark:bg-slate-900/90 paper-texture backdrop-blur-sm overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Logo width={20} height={20} />
                  <span className="font-bold text-lg">Sorami</span>
                  <span className="text-xs text-muted-foreground">空見</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
              <div className="flex-1 py-4">
                <ul className="space-y-1 px-2">
                  {routes.map((route) => (
                    <li key={route.path}>
                      <Link
                        href={route.path}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${pathname === route.path
                          ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-50"
                          : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          }`}
                      >
                        {route.icon}
                        {route.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 border-t flex items-center justify-between">
                <Link href="/" className="text-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400">
                  Back to Home
                </Link>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      )}

      <div className={cn(
        "hidden md:flex flex-col h-screen border-r bg-white/90 dark:bg-slate-900/90 paper-texture backdrop-blur-sm transition-all duration-300",
        !isExpanded ? "w-20" : "w-64"
      )}>
        <div className="flex items-center gap-2 p-4 border-b">
          <Logo width={20} height={20} />
          {isExpanded && (
            <>
              <span className="font-bold text-lg">Sorami</span>
              <span className="text-xs text-muted-foreground">空見</span>
            </>
          )}
          {isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-8 w-8 ml-auto"
              onClick={toggleSidebar}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {!isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-8 w-8"
              onClick={toggleSidebar}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {routes.map((route) => (
              <li key={route.path}>
                <Link
                  href={route.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    pathname === route.path
                      ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-50"
                      : "hover:bg-blue-50 dark:hover:bg-blue-900/20",
                    !isExpanded && "justify-center px-2"
                  )}
                  title={!isExpanded ? route.name : undefined}
                >
                  {route.icon}
                  {isExpanded && route.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className={cn(
          "p-4 border-t flex items-center",
          !isExpanded ? "justify-center" : "justify-between"
        )}>
          {isExpanded && (
            <Link href="/" className="text-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400">
              Back to Home
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

