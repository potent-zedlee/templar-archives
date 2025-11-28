"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { User, LogOut, LayoutDashboard, Bookmark } from "lucide-react"
import type { AuthUser } from "@/lib/auth"
import type { UserProfile } from "@/lib/user-profile"

interface HeaderUserMenuProps {
  user: AuthUser
  profile: UserProfile | null
  isUserAdmin: boolean
  onSignOut: () => void
  getUserInitials: () => string
  getDisplayName: () => string
  getAvatarUrl: () => string | undefined
}

interface DropdownInstance {
  show?: () => void
  hide?: () => void
  toggle?: () => void
  destroyAndRemoveInstance?: () => void
}

export function HeaderUserMenu({
  user,
  isUserAdmin,
  onSignOut,
  getUserInitials,
  getDisplayName,
  getAvatarUrl,
}: HeaderUserMenuProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<DropdownInstance | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Flowbite Dropdown 초기화
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return

    const initDropdown = async () => {
      try {
        const { Dropdown } = await import('flowbite')

        const targetEl = document.getElementById('user-menu-dropdown')
        const triggerEl = document.getElementById('user-menu-button')

        if (targetEl && triggerEl) {
          const options = {
            placement: 'bottom' as const,
            triggerType: 'click' as const,
            offsetSkidding: 0,
            offsetDistance: 10,
            delay: 300,
          }

          dropdownRef.current = new Dropdown(targetEl, triggerEl, options) as DropdownInstance
        }
      } catch (error) {
        console.error('Flowbite Dropdown initialization failed:', error)
      }
    }

    initDropdown()

    return () => {
      if (dropdownRef.current && dropdownRef.current.destroyAndRemoveInstance) {
        dropdownRef.current.destroyAndRemoveInstance()
      }
    }
  }, [mounted])

  if (!mounted) return null

  const avatarUrl = getAvatarUrl()
  const displayName = getDisplayName()
  const initials = getUserInitials()

  return (
    <div className="relative hidden md:block">
      {/* Dropdown Toggle Button */}
      <button
        id="user-menu-button"
        type="button"
        className="flex text-sm bg-muted rounded-full focus:ring-4 focus:ring-border transition-all hover:ring-2 hover:ring-border"
        aria-expanded="false"
      >
        <span className="sr-only">Open user menu</span>
        {avatarUrl ? (
          <img
            className="w-8 h-8 rounded-full object-cover"
            src={avatarUrl}
            alt={displayName}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center">
            <span className="text-sm font-semibold text-background">{initials}</span>
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      <div
        id="user-menu-dropdown"
        className="z-50 hidden bg-muted divide-y divide-border rounded-lg shadow-lg w-56 border border-border"
      >
        {/* User Info */}
        <div className="px-4 py-3">
          <span className="block text-sm text-foreground font-medium">{displayName}</span>
          <span className="block text-xs text-muted-foreground truncate">{user.email}</span>
        </div>

        {/* Main Menu - 모든 사용자에게 표시 */}
        <ul className="py-2 text-sm text-foreground">
          <li>
            <button
              onClick={() => router.push("/profile")}
              className="w-full flex items-center px-4 py-2 hover:bg-muted transition-colors text-left"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </button>
          </li>
          <li>
            <button
              onClick={() => router.push("/bookmarks")}
              className="w-full flex items-center px-4 py-2 hover:bg-muted transition-colors text-left"
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Bookmarks
            </button>
          </li>
        </ul>

        {/* Admin Menu - 간소화된 단일 메뉴 */}
        {isUserAdmin && (
          <ul className="py-2 text-sm text-foreground">
            <li>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="w-full flex items-center px-4 py-2 hover:bg-muted transition-colors text-left"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Admin Dashboard
              </button>
            </li>
          </ul>
        )}

        {/* Logout */}
        <ul className="py-2 text-sm text-foreground">
          <li>
            <button
              onClick={onSignOut}
              className="w-full flex items-center px-4 py-2 hover:bg-muted transition-colors text-left"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}
