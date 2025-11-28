"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { NotificationBell } from "@/components/common/NotificationBell"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/components/layout/AuthProvider"

export function AdminHeader() {
  const { theme, setTheme } = useTheme()
  const { user, profile } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        {/* Sidebar Toggle (Mobile) */}
        <SidebarTrigger className="mr-4" />

        {/* Title */}
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Templar Archives Index Admin</h1>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <NotificationBell />

          {/* User Info */}
          {profile && (
            <div className="ml-2 text-sm">
              <span className="font-medium">{user?.displayName || profile.nickname || "Admin"}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
