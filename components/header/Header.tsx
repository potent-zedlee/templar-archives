"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"
import { useAuth } from "@/components/AuthProvider"
import { signOut } from "@/lib/auth"
import { isAdmin, isReporterOrAdmin } from "@/lib/admin"
import { NotificationBell } from "@/components/NotificationBell"
import { HeaderLogo } from "./HeaderLogo"
import { HeaderDesktopNav } from "./HeaderDesktopNav"
import { HeaderUserMenu } from "./HeaderUserMenu"
import { HeaderMobileMenu } from "./HeaderMobileMenu"
import type { NavLink } from "./HeaderDesktopNav"

export function Header() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [isUserReporter, setIsUserReporter] = useState(false)

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
    { href: "/news", label: "NEWS" },
    { href: "/live-reporting", label: "LIVE" },
    { href: "/search", label: "SEARCH" },
    { href: "/archive/tournament", label: "TOURNAMENT" },
    { href: "/archive/cash-game", label: "CASH GAME" },
    { href: "/players", label: "PLAYER" },
    { href: "/community", label: "FORUM" },
  ]

  return (
    <>
      {/* Flowbite Navbar - Dark Mode */}
      <nav className="sticky top-0 z-[100] w-full border-b-[3px] border-gold-500 bg-gray-900" role="banner">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          {/* Left: Logo + Navigation Menu */}
          <div className="flex items-center gap-8">
            <HeaderLogo />
            <HeaderDesktopNav navLinks={navLinks} />
          </div>

          {/* Right: Notification, Profile */}
          <div className="flex items-center gap-3">
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
                  <button
                    type="button"
                    data-testid="login-button"
                    className="hidden md:inline-flex text-gray-100 bg-transparent border border-gray-600 hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-700 font-medium rounded-lg text-sm px-4 py-2 transition-colors"
                    onClick={() => router.push("/auth/login")}
                  >
                    LOGIN
                  </button>
                )}
              </>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center p-2 w-9 h-9 justify-center text-gray-400 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Toggle menu</span>
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
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
      </nav>
    </>
  )
}
