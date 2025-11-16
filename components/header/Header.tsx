"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Menu, X } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/components/auth-provider"
import { signOut } from "@/lib/auth"
import { isAdmin, isReporterOrAdmin } from "@/lib/admin"
import { NotificationBell } from "@/components/notification-bell"
import { HeaderLogo } from "./HeaderLogo"
import { HeaderDesktopNav } from "./HeaderDesktopNav"
import { HeaderUserMenu } from "./HeaderUserMenu"
import { HeaderMobileMenu } from "./HeaderMobileMenu"
import type { NavLink } from "./HeaderDesktopNav"

export function Header() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, profile, loading: authLoading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [isUserReporter, setIsUserReporter] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        const adminStatus = await isAdmin(user.id)
        setIsUserAdmin(adminStatus)
      } else {
        setIsUserAdmin(false)
      }
    }
    checkAdmin()
  }, [user])

  useEffect(() => {
    async function checkReporter() {
      if (user) {
        const reporterStatus = await isReporterOrAdmin(user.id)
        setIsUserReporter(reporterStatus)
      } else {
        setIsUserReporter(false)
      }
    }
    checkReporter()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const getUserInitials = () => {
    if (profile?.nickname) {
      return profile.nickname.charAt(0).toUpperCase()
    }
    if (!user?.user_metadata?.full_name && !user?.email) return "U"
    const name = user.user_metadata?.full_name || user.email
    return name.charAt(0).toUpperCase()
  }

  const getDisplayName = () => {
    if (profile?.nickname) return profile.nickname
    return user?.user_metadata?.full_name || "User"
  }

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url
    return user?.user_metadata?.avatar_url
  }

  const navLinks: NavLink[] = [
    { href: "/about", label: "ABOUT" },
    { href: "/news", label: "NEWS" },
    { href: "/live-reporting", label: "LIVE" },
    {
      label: "ARCHIVE",
      subItems: [
        { href: "/search", label: "Search" },
        { href: "/archive/tournament", label: "Tournament" },
        { href: "/archive/cash-game", label: "Cash Game" },
      ]
    },
    { href: "/players", label: "PLAYERS" },
    { href: "/community", label: "FORUM" },
  ]

  return (
    <>
      <header className="sticky top-0 z-[100] w-full border-b-[3px] border-gold-600 bg-black-0" role="banner">
        <div className="container max-w-7xl mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <HeaderLogo />
            <HeaderDesktopNav navLinks={navLinks} />
          </div>

          <div className="flex items-center gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-9 w-9"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}

            <NotificationBell />

            {/* Login/Profile UI */}
            {!authLoading && (
              <>
                {user ? (
                  <HeaderUserMenu
                    user={user}
                    profile={profile}
                    isUserAdmin={isUserAdmin}
                    isUserReporter={isUserReporter}
                    onSignOut={handleSignOut}
                    getUserInitials={getUserInitials}
                    getDisplayName={getDisplayName}
                    getAvatarUrl={getAvatarUrl}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden md:inline-flex"
                    onClick={() => router.push("/auth/login")}
                  >
                    LOGIN
                  </Button>
                )}
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>

        <HeaderMobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          navLinks={navLinks}
          user={user}
          profile={profile}
          isUserAdmin={isUserAdmin}
          isUserReporter={isUserReporter}
          authLoading={authLoading}
          onSignOut={handleSignOut}
          getUserInitials={getUserInitials}
          getDisplayName={getDisplayName}
          getAvatarUrl={getAvatarUrl}
        />
      </header>
    </>
  )
}
