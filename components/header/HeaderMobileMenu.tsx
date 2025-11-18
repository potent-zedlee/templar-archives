"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { User, LogOut, Shield, Users, LayoutDashboard, FileText, Edit, Bookmark, ChevronDown, Newspaper, Radio, Folder, Archive } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Profile } from "@/lib/types/profile"
import type { NavLink } from "./HeaderDesktopNav"

interface HeaderMobileMenuProps {
  isOpen: boolean
  onClose: () => void
  navLinks: NavLink[]
  user: SupabaseUser | null
  profile: Profile | null
  isUserAdmin: boolean
  isUserReporter: boolean
  authLoading: boolean
  onSignOut: () => void
  getUserInitials: () => string
  getDisplayName: () => string
  getAvatarUrl: () => string | undefined
}

export function HeaderMobileMenu({
  isOpen,
  onClose,
  navLinks,
  user,
  profile,
  isUserAdmin,
  isUserReporter,
  authLoading,
  onSignOut,
  getUserInitials,
  getDisplayName,
  getAvatarUrl,
}: HeaderMobileMenuProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [archiveExpandedMobile, setArchiveExpandedMobile] = useState(false)

  if (!isOpen) return null

  const handleSignOut = () => {
    onSignOut()
    onClose()
  }

  const avatarUrl = getAvatarUrl()
  const displayName = getDisplayName()
  const initials = getUserInitials()

  return (
    <div
      id="mobile-menu"
      className="md:hidden border-b border-gray-700 bg-gray-900"
    >
      <div className="w-full px-4 py-4 space-y-2">
        {/* Navigation Links */}
        {navLinks.map((link, index) => {
          // Accordion for ARCHIVE menu
          if ('subItems' in link && link.subItems) {
            const isActive = pathname.startsWith("/archive") ||
                           pathname.startsWith("/search")

            return (
              <div key={index} className="space-y-1">
                <button
                  onClick={() => setArchiveExpandedMobile(!archiveExpandedMobile)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gold-900/20 text-gold-400"
                      : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
                  )}
                >
                  <span>{link.label}</span>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    archiveExpandedMobile && "rotate-180"
                  )} />
                </button>

                <AnimatePresence>
                  {archiveExpandedMobile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 space-y-1 pt-1">
                        {link.subItems.map((subItem) => {
                          const subIsActive = pathname === subItem.href ||
                                            pathname.startsWith(subItem.href)
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={onClose}
                              className={cn(
                                "block px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                subIsActive
                                  ? "bg-gold-900/20 text-gold-400"
                                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                              )}
                            >
                              {subItem.label}
                            </Link>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          // Regular link
          const isActive = pathname === link.href || (pathname !== "/" && pathname.startsWith(link.href!))

          return (
            <Link
              key={link.href}
              href={link.href!}
              onClick={onClose}
              className={cn(
                "block px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-gold-900/20 text-gold-400"
                  : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
              )}
            >
              {link.label}
            </Link>
          )
        })}

        {/* User Section */}
        {!authLoading && (
          <>
            {user ? (
              <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                {/* User Info */}
                <div className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <img
                        className="w-10 h-10 rounded-full object-cover"
                        src={avatarUrl}
                        alt={displayName}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-900">{initials}</span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-gray-100">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* User Menu Items */}
                <button
                  onClick={() => {
                    router.push("/profile")
                    onClose()
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    router.push("/bookmarks")
                    onClose()
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Bookmarks
                </button>

                {/* Reporter Menu */}
                {isUserReporter && (
                  <>
                    <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      Reporter Menu
                    </div>
                    <button
                      onClick={() => {
                        router.push("/reporter/news")
                        onClose()
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Newspaper className="mr-2 h-4 w-4" />
                      My News
                    </button>
                    <button
                      onClick={() => {
                        router.push("/reporter/live")
                        onClose()
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Radio className="mr-2 h-4 w-4" />
                      My Live Reports
                    </button>
                  </>
                )}

                {/* Admin Menu */}
                {isUserAdmin && (
                  <>
                    <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      Admin Menu
                    </div>
                    <button
                      onClick={() => {
                        router.push("/admin/dashboard")
                        onClose()
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        router.push("/admin/users")
                        onClose()
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Users
                    </button>
                    <button
                      onClick={() => {
                        router.push("/admin/claims")
                        onClose()
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Claims
                    </button>
                    <button
                      onClick={() => {
                        router.push("/admin/content")
                        onClose()
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Content
                    </button>
                    <button
                      onClick={() => {
                        router.push("/admin/edit-requests")
                        onClose()
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Requests
                    </button>
                    <button
                      onClick={() => {
                        router.push("/admin/archive")
                        onClose()
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </button>
                    <button
                      onClick={() => {
                        router.push("/admin/categories")
                        onClose()
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Folder className="mr-2 h-4 w-4" />
                      Categories
                    </button>
                  </>
                )}

                {/* Logout */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  router.push("/auth/login")
                  onClose()
                }}
                className="w-full mt-4 text-gray-100 bg-transparent border border-gray-600 hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-700 font-medium rounded-lg text-sm px-4 py-2 transition-colors"
              >
                LOGIN
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
