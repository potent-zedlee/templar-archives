"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { User, LogOut, Shield, Users, LayoutDashboard, FileText, Edit, Bookmark, Newspaper, Radio, Folder, Archive } from "lucide-react"
import type { AuthUser } from "@/lib/auth"
import type { Profile } from "@/lib/types/profile"

interface HeaderUserMenuProps {
  user: AuthUser
  profile: Profile | null
  isUserAdmin: boolean
  isUserReporter: boolean
  onSignOut: () => void
  getUserInitials: () => string
  getDisplayName: () => string
  getAvatarUrl: () => string | undefined
}

export function HeaderUserMenu({
  user,
  profile,
  isUserAdmin,
  isUserReporter,
  onSignOut,
  getUserInitials,
  getDisplayName,
  getAvatarUrl,
}: HeaderUserMenuProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<any>(null)

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
            placement: 'bottom',
            triggerType: 'click',
            offsetSkidding: 0,
            offsetDistance: 10,
            delay: 300,
          }

          dropdownRef.current = new Dropdown(targetEl, triggerEl, options)
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
        className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-700 transition-all hover:ring-2 hover:ring-gray-600"
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
            <span className="text-sm font-semibold text-gray-900">{initials}</span>
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      <div
        id="user-menu-dropdown"
        className="z-50 hidden bg-gray-800 divide-y divide-gray-700 rounded-lg shadow-lg w-56 border border-gray-700"
      >
        {/* User Info */}
        <div className="px-4 py-3">
          <span className="block text-sm text-gray-100 font-medium">{displayName}</span>
          <span className="block text-xs text-gray-400 truncate">{user.email}</span>
        </div>

        {/* Main Menu */}
        <ul className="py-2 text-sm text-gray-200">
          <li>
            <button
              onClick={() => router.push("/profile")}
              className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </button>
          </li>
          <li>
            <button
              onClick={() => router.push("/bookmarks")}
              className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Bookmarks
            </button>
          </li>
        </ul>

        {/* Reporter Menu */}
        {isUserReporter && (
          <>
            <div className="px-4 py-2">
              <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wider">
                Reporter Menu
              </span>
            </div>
            <ul className="py-2 text-sm text-gray-200">
              <li>
                <button
                  onClick={() => router.push("/reporter/news")}
                  className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <Newspaper className="mr-2 h-4 w-4" />
                  My News
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/reporter/live")}
                  className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <Radio className="mr-2 h-4 w-4" />
                  My Live Reports
                </button>
              </li>
            </ul>
          </>
        )}

        {/* Admin Menu */}
        {isUserAdmin && (
          <>
            <div className="px-4 py-2">
              <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wider">
                Admin Menu
              </span>
            </div>
            <ul className="py-2 text-sm text-gray-200">
              <li>
                <button
                  onClick={() => router.push("/admin/dashboard")}
                  className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/admin/users")}
                  className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Users
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/admin/claims")}
                  className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Claims
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/admin/content")}
                  className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Content
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/admin/edit-requests")}
                  className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Requests
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/admin/archive")}
                  className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/admin/categories")}
                  className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <Folder className="mr-2 h-4 w-4" />
                  Categories
                </button>
              </li>
            </ul>
          </>
        )}

        {/* Logout */}
        <ul className="py-2 text-sm text-gray-200">
          <li>
            <button
              onClick={onSignOut}
              className="w-full flex items-center px-4 py-2 hover:bg-gray-700 transition-colors text-left"
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
